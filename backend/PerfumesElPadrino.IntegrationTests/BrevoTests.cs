using System.Net;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;
using PerfumesElPadrino.Api.Infrastructure;
using PerfumesElPadrino.Api.Models;
using PerfumesElPadrino.Api.Services;

internal static class BrevoTests
{
    public static async Task RunAsync()
    {
        var cipher = new SecretCipher(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        { ["Commerce:EncryptionKey"] = Convert.ToBase64String(new byte[32]) }).Build());
        var handler = new CaptureHandler();
        using var client = new HttpClient(handler);
        var sender = new BrevoEmailSender(client, cipher);
        var settings = new CommerceSettings { BrevoApiKeyEncrypted = cipher.Encrypt("test-key") };
        var mail = new EmailDelivery { Recipient = "customer@example.test", Subject = "Pedido", HtmlBody = "<p>Hola</p>", TextBody = "Hola", Pdf = [37, 80, 68, 70], AttachmentName = "Pedido.pdf" };
        await sender.SendAsync(settings, mail, default);
        Assert(handler.Url == "https://api.brevo.com/v3/smtp/email" && handler.Method == HttpMethod.Post && handler.Key == "test-key", "HTTPS endpoint and API authentication");
        Assert(handler.Body!["attachment"]![0]!["content"]!.GetValue<string>() == Convert.ToBase64String(mail.Pdf), "PDF bytes encoded as Base64");
        Assert(handler.Body["attachment"]![0]!["name"]!.GetValue<string>() == "Pedido.pdf" && handler.Body["to"]![0]!["email"]!.GetValue<string>() == mail.Recipient, "Attachment name and recipient");
        Assert(handler.Body["htmlContent"]!.GetValue<string>() == mail.HtmlBody && handler.Body["textContent"]!.GetValue<string>() == mail.TextBody, "HTML and plain text preserved");
        mail.Pdf = null;
        await sender.SendAsync(settings, mail, default);
        Assert(handler.Body!["attachment"] is null, "No attachment for test email without PDF");
        foreach (var code in new[] { HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden, HttpStatusCode.BadRequest, HttpStatusCode.TooManyRequests, HttpStatusCode.ServiceUnavailable })
        {
            handler.Status = code;
            try { await sender.SendAsync(settings, mail, default); throw new Exception("Failure marked sent"); }
            catch (BrevoEmailException ex) { Assert(!EmailSender.SafeError(ex).Contains("provider-secret"), $"Safe failure for HTTP {(int)code}"); }
        }
        Console.WriteLine("Brevo HTTP checks passed (10); no real emails sent.");
    }
    private static void Assert(bool condition, string label) { if (!condition) throw new Exception(label); }
    private sealed class CaptureHandler : HttpMessageHandler
    {
        public HttpStatusCode Status = HttpStatusCode.Created;
        public string? Url, Key;
        public HttpMethod? Method;
        public JsonNode? Body;
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Url = request.RequestUri!.ToString(); Method = request.Method;
            Key = request.Headers.GetValues("api-key").Single();
            Body = JsonNode.Parse(await request.Content!.ReadAsStringAsync(ct));
            return new HttpResponseMessage(Status) { Content = new StringContent("{\"message\":\"provider-secret\"}") };
        }
    }
}
