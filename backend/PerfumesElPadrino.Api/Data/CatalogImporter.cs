using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PerfumesElPadrino.Api.Contracts;
using PerfumesElPadrino.Api.Models;
using PerfumesElPadrino.Api.Utilities;

namespace PerfumesElPadrino.Api.Data;

public static class CatalogImporter
{
    public sealed record CatalogEntry(string Name, string Brand, string Gender, int? SizeMl,
        decimal Price, decimal? CompareAtPrice, string Category, string Description, string[] Images);

    public static async Task ImportAsync(IServiceProvider services, string filename)
    {
        var fullPath = Path.GetFullPath(filename);
        var entries = JsonSerializer.Deserialize<List<CatalogEntry>>(await File.ReadAllTextAsync(fullPath),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
        if (entries.Count != 67) throw new InvalidOperationException("Expected exactly 67 screenshot products.");
        if (entries.Select(x => TextTools.Slugify(x.Brand + " " + x.Name)).Distinct().Count() != entries.Count)
            throw new InvalidOperationException("Duplicate catalog identities.");
        foreach (var entry in entries)
        {
            if (entry.Price <= 0 || entry.CompareAtPrice <= entry.Price || entry.Images.Length < 3 ||
                entry.Images.Distinct().Count() != entry.Images.Length ||
                entry.Images.Any(x => !x.StartsWith("/catalog/", StringComparison.Ordinal) || x.Contains("..")))
                throw new InvalidOperationException($"Invalid price or gallery: {entry.Name}");
            foreach (var url in entry.Images)
            {
                var asset = Path.Combine(Path.GetDirectoryName(fullPath)!, "..", "public", url.TrimStart('/'));
                if (!File.Exists(asset) || new FileInfo(asset).Length < 1000)
                    throw new InvalidOperationException($"Missing image: {url}");
            }
        }
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<StoreDbContext>();
        var previous = await db.Products.AsNoTracking().Include(x => x.Images).Include(x => x.Category).ToListAsync();
        var backupDirectory = Path.Combine(Path.GetDirectoryName(fullPath)!, "..", "work", "catalog-backups");
        Directory.CreateDirectory(backupDirectory);
        var backup = Path.Combine(backupDirectory, $"products-{DateTimeOffset.UtcNow:yyyyMMdd-HHmmss}.json");
        await File.WriteAllTextAsync(backup, JsonSerializer.Serialize(previous.Select(x => x.ToDto()), new JsonSerializerOptions { WriteIndented = true }));
        await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            await using var transaction = await db.Database.BeginTransactionAsync();
            var categories = await db.Categories.ToDictionaryAsync(x => x.Slug, x => x.Id);
            // Preserve historical order snapshots when replacing the demo catalog.
            await db.OrderItems.Where(x => x.ProductId != null).ExecuteUpdateAsync(x => x.SetProperty(p => p.ProductId, (Guid?)null));
            await db.ProductImages.ExecuteDeleteAsync();
            await db.Products.ExecuteDeleteAsync();
            foreach (var (entry, index) in entries.Select((value, index) => (value, index)))
            {
                db.Products.Add(new Product
                {
                    Name = entry.Name, Brand = entry.Brand, Slug = TextTools.Slugify(entry.Brand + " " + entry.Name),
                    Description = entry.Description, Gender = entry.Gender, SizeMl = entry.SizeMl,
                    Price = entry.Price, CompareAtPrice = entry.CompareAtPrice, Stock = 1,
                    FreeShipping = true, ShippingFee = null, CategoryId = categories[entry.Category],
                    Featured = index is 0 or 1 or 34 or 39 or 41 or 42 or 46 or 52,
                    Bestseller = false, SortOrder = index + 1, ImageUrl = entry.Images[0],
                    Images = entry.Images.Select((url, order) => new ProductImage
                        { Url = url, AltText = $"{entry.Brand} {entry.Name} · foto {order + 1}", SortOrder = order }).ToList()
                });
            }
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
        });
        Console.WriteLine($"Imported {entries.Count} real products; previous catalog backed up to {backup}");
    }
}
