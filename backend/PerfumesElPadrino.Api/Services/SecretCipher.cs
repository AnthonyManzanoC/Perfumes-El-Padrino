using System.Security.Cryptography;
using System.Text;

namespace PerfumesElPadrino.Api.Services;

public sealed class SecretCipher(IConfiguration configuration)
{
    private byte[] Key => Convert.FromBase64String(configuration["Commerce:EncryptionKey"]
        ?? throw new InvalidOperationException("Falta la clave de cifrado del servidor Commerce:EncryptionKey."));
    public string Encrypt(string secret)
    {
        var nonce = RandomNumberGenerator.GetBytes(12);
        var plain = Encoding.UTF8.GetBytes(secret);
        var encrypted = new byte[plain.Length];
        var tag = new byte[16];
        using var aes = new AesGcm(Key, 16);
        aes.Encrypt(nonce, plain, encrypted, tag);
        return Convert.ToBase64String(nonce.Concat(tag).Concat(encrypted).ToArray());
    }
    public string Decrypt(string secret)
    {
        var data = Convert.FromBase64String(secret);
        var plain = new byte[data.Length - 28];
        using var aes = new AesGcm(Key, 16);
        aes.Decrypt(data.AsSpan(0, 12), data.AsSpan(28), data.AsSpan(12, 16), plain);
        return Encoding.UTF8.GetString(plain);
    }
}
