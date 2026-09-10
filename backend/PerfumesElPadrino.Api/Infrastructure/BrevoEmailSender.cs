using System.Net;
using System.Net.Http.Json;
using PerfumesElPadrino.Api.Application;
using PerfumesElPadrino.Api.Models;
using PerfumesElPadrino.Api.Services;

namespace PerfumesElPadrino.Api.Infrastructure;

public sealed class BrevoEmailSender(HttpClient client, SecretCipher cipher) : IEmailSender
{
    public async Task SendAsync(CommerceSettings settings, EmailDelivery delivery, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(settings.BrevoApiKeyEncrypted))
            throw new InvalidOperationException("Configura la clave API de Brevo.");
        var payload = new Dictionary<string, object>
        {
            ["sender"] = new { email = settings.SenderEmail, name = settings.SenderName },
            ["to"] = new[] { new { email = delivery.Recipient } },
            ["subject"] = delivery.Subject,
            ["htmlContent"] = delivery.HtmlBody,
            ["textContent"] = delivery.TextBody
        };
        if (delivery.Pdf is not null)
            payload["attachment"] = new[] { new { name = delivery.AttachmentName ?? "Recibo.pdf", content = Convert.ToBase64String(delivery.Pdf) } };

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
        request.Headers.Add("api-key", cipher.Decrypt(settings.BrevoApiKeyEncrypted));
        request.Headers.Accept.ParseAdd("application/json");
        request.Content = JsonContent.Create(payload);
        using var response = await client.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
            // Never persist provider bodies: they may contain credentials or customer information.
            throw new BrevoEmailException(response.StatusCode);
    }
}

public sealed class BrevoEmailException(HttpStatusCode status) : Exception(status switch
{
    HttpStatusCode.Unauthorized => "Brevo rechazó la clave API. Revisa que esté completa y activa.",
    HttpStatusCode.Forbidden => "Brevo denegó el envío. Revisa la activación de correo transaccional y las IP autorizadas en Brevo.",
    HttpStatusCode.BadRequest => "Brevo rechazó los datos. Revisa el remitente verificado, el destinatario y los adjuntos.",
    HttpStatusCode.TooManyRequests => "Se alcanzó el límite de Brevo. El correo permanece pendiente de reintento.",
    _ when (int)status >= 500 => "Brevo está temporalmente fuera de servicio. Se reintentará el envío.",
    _ => $"Brevo rechazó la solicitud (HTTP {(int)status}). Revisa la configuración de la cuenta."
});
