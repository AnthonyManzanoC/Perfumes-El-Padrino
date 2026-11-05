using System.Security.Cryptography;
using System.Text;

namespace PerfumesElPadrino.Api.Services;

public sealed class QuickOrderLinks(IConfiguration config, IWebHostEnvironment environment)
{
    private readonly byte[]? key = ResolveKey(config, environment.IsDevelopment());

    private static byte[]? ResolveKey(IConfiguration config, bool local)
    {
        var configured = ReadKey(config["QUICK_ACTION_SECRET"]);
        if (configured is not null) return configured;
        var commerceKey = ReadKey(config["Commerce:EncryptionKey"]);
        if (commerceKey is not null)
            return HMACSHA256.HashData(commerceKey, "padrino:quick-action:signing-key:v1"u8);
        return local ? RandomNumberGenerator.GetBytes(32) : null;
    }

    private static byte[]? ReadKey(string? encoded)
    {
        if (string.IsNullOrWhiteSpace(encoded)) return null;
        try
        {
            var value = Convert.FromBase64String(encoded);
            return value.Length >= 32 ? value : null;
        }
        catch (FormatException) { return null; }
    }

    public string? Create(string orderNumber)
    {
        if (key is null || !Uri.TryCreate(config["QUICK_ACTION_BASE_URL"], UriKind.Absolute, out var origin) ||
            !(origin.Scheme == "https" || (environment.IsDevelopment() && origin.IsLoopback && origin.Scheme == "http")) ||
            origin.PathAndQuery != "/" || origin.UserInfo != "" || origin.Fragment != "") return null;

        var expires = DateTimeOffset.UtcNow.AddDays(7).ToUnixTimeSeconds();
        return $"{origin.GetLeftPart(UriPartial.Authority)}/despacho-rapido/{Uri.EscapeDataString(orderNumber)}#key={expires}.{Convert.ToHexString(Sign(orderNumber, expires))}";
    }

    public bool Valid(string orderNumber, string? token)
    {
        if (key is null || token is null || token.Length > 80) return false;
        var parts = token.Split('.', 2);
        if (parts.Length != 2 || parts[1].Length != 64 || !long.TryParse(parts[0], out var expires) ||
            expires <= DateTimeOffset.UtcNow.ToUnixTimeSeconds()) return false;
        try { return CryptographicOperations.FixedTimeEquals(Convert.FromHexString(parts[1]), Sign(orderNumber, expires)); }
        catch (FormatException) { return false; }
    }

    private byte[] Sign(string number, long expires) => HMACSHA256.HashData(key!,
        Encoding.UTF8.GetBytes(FormattableString.Invariant($"order-dispatch:v1:{number}:{expires}")));
}
