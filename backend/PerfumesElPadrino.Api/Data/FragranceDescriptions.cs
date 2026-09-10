using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace PerfumesElPadrino.Api.Data;

public static class FragranceDescriptions
{
    private sealed record Entry(string Name, string Brand, string Description, string NotesCsv);
    public static async Task ApplyAsync(StoreDbContext db, CancellationToken ct)
    {
        using var stream = typeof(FragranceDescriptions).Assembly.GetManifestResourceStream("PerfumesElPadrino.Api.Data.fragrance-notes.json")
            ?? throw new InvalidOperationException("Missing embedded fragrance descriptions.");
        var entries = await JsonSerializer.DeserializeAsync<List<Entry>>(stream, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }, ct) ?? [];
        var products = await db.Products.ToListAsync(ct);
        foreach (var entry in entries)
        {
            var product = products.FirstOrDefault(p => p.Name.Equals(entry.Name, StringComparison.OrdinalIgnoreCase) && p.Brand.Equals(entry.Brand, StringComparison.OrdinalIgnoreCase));
            if (product is null) continue;
            // Never overwrite later editorial changes made by the store administrator.
            if (string.IsNullOrWhiteSpace(product.Description) || product.Description.Contains("Consulta con nosotros para conocer más sobre esta fragancia"))
                product.Description = entry.Description;
            if (string.IsNullOrWhiteSpace(product.NotesCsv)) product.NotesCsv = entry.NotesCsv;
        }
        await db.SaveChangesAsync(ct);
    }
}
