using Microsoft.EntityFrameworkCore;
using PerfumesElPadrino.Api.Models;
using PerfumesElPadrino.Api.Security;

namespace PerfumesElPadrino.Api.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(IServiceProvider services, IConfiguration configuration, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<StoreDbContext>();
        await db.Database.MigrateAsync(cancellationToken);
        if (!await db.SiteSettings.AnyAsync(cancellationToken))
            db.SiteSettings.Add(new SiteSettings());
        if (!await db.Categories.AnyAsync(cancellationToken))
            db.Categories.AddRange(
                new Category { Name = "Damas", Slug = "damas", SortOrder = 1 },
                new Category { Name = "Caballeros", Slug = "caballeros", SortOrder = 2 },
                new Category { Name = "Árabes", Slug = "arabes", SortOrder = 3 },
                new Category { Name = "Unisex", Slug = "unisex", SortOrder = 4 });
        // Never recreate demo products when the real catalog is empty.
        var email = configuration["AdminSeed:Email"]?.Trim().ToLowerInvariant();
        var password = configuration["AdminSeed:Password"];
        if (!string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(password) &&
            !await db.AdminUsers.AnyAsync(cancellationToken))
            db.AdminUsers.Add(new AdminUser { Email = email, PasswordHash = PasswordSecurity.Hash(password) });
        if (!await db.CommerceSettings.AnyAsync(cancellationToken))
        {
            var commerce = new CommerceSettings
            {
                BankName = "BANCO DE PRUEBA - NO TRANSFERIR", AccountType = "Ahorros (ejemplo)",
                AccountNumber = "0000000000", AccountHolder = "Titular de ejemplo", Identification = "0000000000",
                PaymentInstructions = "DATOS DE PRUEBA. El administrador debe reemplazarlos por los datos reales antes de activar las compras."
            };
            if (!string.IsNullOrWhiteSpace(configuration["Brevo:ApiKey"]))
                commerce.BrevoApiKeyEncrypted = scope.ServiceProvider.GetRequiredService<PerfumesElPadrino.Api.Services.SecretCipher>().Encrypt(configuration["Brevo:ApiKey"]!);
            db.CommerceSettings.Add(commerce);
        }
        await db.SaveChangesAsync(cancellationToken);
        await FragranceDescriptions.ApplyAsync(db, cancellationToken);
        await db.AdminSessions.Where(x => x.ExpiresAt < DateTimeOffset.UtcNow).ExecuteDeleteAsync(cancellationToken);
    }
}
