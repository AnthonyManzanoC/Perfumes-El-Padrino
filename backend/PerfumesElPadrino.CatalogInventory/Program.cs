using System.Data;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PerfumesElPadrino.Api.Contracts;
using PerfumesElPadrino.Api.Data;
using PerfumesElPadrino.Api.Services;

// Narrow fallback for a deployed legacy API that rewrites slugs on every PUT.
// No host, migrations, seeds, customers, order mutations or background/email workers.
// ONLY Stock and UpdatedAt of the 74 explicitly reviewed legacy products can change.
var apply = args.Contains("--apply");
if (File.Exists("catalog/inventory-availability-review-2026-10-18.json"))
    throw new Exception("The owner superseded this inventory cut. Use scripts/reconcile-availability-2026-10-18.mjs against the deployed stable-URL API; do not reapply the old stock snapshot.");
var connection = Environment.GetEnvironmentVariable("CATALOG_POSTGRES") ?? throw new Exception("Set CATALOG_POSTGRES in the process environment.");
var json = new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true };
var manifest = JsonSerializer.Deserialize<InventoryManifest>(await File.ReadAllTextAsync("catalog/inventory-2026-10-18.json"), json)!;
if (manifest.Date != "2026-10-18" || manifest.Existing.Count != 60 || manifest.UnavailableSlugs.Count != 14) throw new Exception("Unexpected inventory manifest.");
var known = manifest.Existing.Select(p => p.Slug).Concat(manifest.UnavailableSlugs).ToArray();
if (known.Distinct().Count() != 74) throw new Exception("Duplicate or conflicting inventory targets.");
var options = new DbContextOptionsBuilder<StoreDbContext>().UseNpgsql(connection, o => o.CommandTimeout(45)).Options;
await using var db = new StoreDbContext(options);
using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(45) };
var storefront = await http.GetFromJsonAsync<StorefrontDto>("https://perfumes-el-padrino-api.onrender.com/api/storefront") ?? throw new Exception("Cannot verify the production database identity.");
await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
var products = await db.Products.Include(p => p.Category).Include(p => p.Images).Where(p => known.Contains(p.Slug)).ToListAsync();
if (products.Count != 74) throw new Exception("Expected exactly 74 reviewed legacy products in this database.");
foreach (var p in products)
    if (!storefront.Products.Any(x => x.Id == p.Id && x.Slug == p.Slug)) throw new Exception("Database does not match the public production catalog: " + p.Slug);
foreach (var row in manifest.Existing)
{
    var p = products.Single(p => p.Slug == row.Slug);
    if (!p.IsActive || p.Price != row.Price || p.CompareAtPrice != row.CompareAtPrice || p.SizeMl != row.SizeMl)
        throw new Exception("Review non-stock differences through the API before continuing: " + row.Slug);
}
var reserved = await new OrderWorkflow(db).ReservedAsync(default);
var changes = products.Select(p => new { Product = p, Target = manifest.UnavailableSlugs.Contains(p.Slug) ? 0 : Math.Max(1, p.Stock) }).Where(x => x.Target != x.Product.Stock).ToList();
foreach (var c in changes)
    if (c.Target < reserved.GetValueOrDefault(c.Product.Id)) throw new Exception("Refusing to remove reserved stock: " + c.Product.Slug);
Console.WriteLine($"{(apply ? "Apply" : "Read-only plan")}: {changes.Count} stock changes; all 74 published URLs preserved.");
foreach (var c in changes) Console.WriteLine($"{c.Product.Slug}: {c.Product.Stock} -> {c.Target}");
if (!apply) { await tx.RollbackAsync(); return; }
var backup = Path.Combine("work", "catalog-backups", "stock-2026-10-18-" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
Directory.CreateDirectory(backup);
await File.WriteAllTextAsync(Path.Combine(backup, "before-products.json"), JsonSerializer.Serialize(products.Select(p => p.ToDto()), json));
var previous = products.ToDictionary(p => p.Id, p => p.Slug);
foreach (var c in changes) { c.Product.Stock = c.Target; c.Product.UpdatedAt = DateTimeOffset.UtcNow; }
await db.SaveChangesAsync(); // Stock is an EF concurrency token; conflicting sales abort the entire transaction.
await tx.CommitAsync();
db.ChangeTracker.Clear();
var after = await db.Products.Include(p => p.Category).Include(p => p.Images).Where(p => known.Contains(p.Slug)).ToListAsync();
if (after.Count != 74 || after.Any(p => previous[p.Id] != p.Slug)) throw new Exception("Legacy URL verification failed.");
foreach (var c in changes)
    if (after.Single(p => p.Id == c.Product.Id).Stock != c.Target) throw new Exception("Stock changed after commit; inspect live orders before retrying.");
await File.WriteAllTextAsync(Path.Combine(backup, "after-products.json"), JsonSerializer.Serialize(after.Select(p => p.ToDto()), json));
Console.WriteLine($"Verified: {changes.Count} stock updates, 14 unavailable products, 74 URLs preserved. Backup: {backup}");

sealed record InventoryManifest(string Date, List<InventoryRow> Existing, List<string> UnavailableSlugs);
sealed record InventoryRow(string Slug, int? SizeMl, decimal Price, decimal? CompareAtPrice);
