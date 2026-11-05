using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PerfumesElPadrino.Api.Data;
using PerfumesElPadrino.Api.Services;

internal static class QuickDispatchTests
{
    public static async Task<Guid> RunAsync(WebApplicationFactory<OrderWorkflow> factory, HttpClient client, HttpClient admin,
        Guid productId, byte[] png, Action<bool, string> check)
    {
        const string settings = "/api/admin/commerce/whatsapp";
        check((await client.GetAsync(settings)).StatusCode == HttpStatusCode.Unauthorized, "WhatsApp settings require an admin session");
        check((await admin.PutAsJsonAsync(settings, new { enabled = true, primary = "0989089718" })).StatusCode == HttpStatusCode.BadRequest,
            "Local WhatsApp rejects destinations outside the allowlist");
        check((await admin.PutAsJsonAsync(settings, new { enabled = true, primary = "093-947-3099" })).IsSuccessStatusCode,
            "Admin can save the allowed WhatsApp destination in Ecuadorian local format");

        var accessToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        var create = await client.PostAsJsonAsync("/api/checkout/orders", new
        {
            customerName = "Comprador de prueba", customerPhone = "093-947-3099", customerEmail = "quick@example.test",
            shippingAddress = "Dirección de prueba 456", city = "Quito",
            checkoutKey = Guid.NewGuid(), accessToken, items = new[] { new { productId, quantity = 1 } }
        });
        create.EnsureSuccessStatusCode();
        var number = (await create.Content.ReadFromJsonAsync<JsonObject>())!["orderNumber"]!.GetValue<string>();
        using var buyer = factory.CreateClient();
        buyer.DefaultRequestHeaders.Add("X-Order-Token", accessToken);
        using var file = new MultipartFormDataContent();
        file.Add(new ByteArrayContent(png), "file", "proof.png");
        (await buyer.PostAsync($"/api/checkout/orders/{number}/proof", file)).EnsureSuccessStatusCode();

        var link = new Uri(factory.Services.GetRequiredService<QuickOrderLinks>().Create(number)!);
        var key = link.Fragment["#key=".Length..];
        var path = link.AbsolutePath;
        using var mobile = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        check(!(await mobile.GetStringAsync(path)).Contains("Comprador de prueba"), "Link previews do not expose buyer data");
        var wrongOrder = await mobile.PostAsync(path + "X/access", Form(("key", key)));
        check(wrongOrder.StatusCode == HttpStatusCode.NotFound, "The signed link is scoped to one order");
        check((await mobile.PostAsync(path + "/access", Form(("key", key)))).StatusCode == HttpStatusCode.NoContent,
            "Signed link opens a scoped session without admin login");
        var page = await mobile.GetStringAsync(path);
        check(page.Contains("Aprobar pago y despachar") && page.Contains("https://wa.me/593939473099?text="),
            "Mobile page shows the correct action and normalized buyer WhatsApp");

        Guid orderId, proofId;
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StoreDbContext>();
            orderId = await db.Orders.Where(o => o.OrderNumber == number).Select(o => o.Id).SingleAsync();
            proofId = await db.PaymentProofs.Where(p => p.OrderId == orderId).Select(p => p.Id).SingleAsync();
        }
        check((await client.GetAsync($"{path}/proof/{proofId}")).StatusCode == HttpStatusCode.NotFound &&
            (await mobile.GetByteArrayAsync($"{path}/proof/{proofId}")).SequenceEqual(png), "Only the scoped session can access the proof");

        FormUrlEncodedContent Dispatch(string confirmed) => Form(("key", key), ("Status", "Enviado"),
            ("ExpectedStatus", "En verificación"), ("ExpectedProofId", proofId.ToString()), ("BankVerified", confirmed));
        var unverified = await mobile.PostAsync(path + "/update", Dispatch("false"));
        check((await unverified.Content.ReadAsStringAsync()).Contains("verificaste el ingreso"), "Quick dispatch requires bank verification");
        var dispatched = await mobile.PostAsync(path + "/update", Dispatch("true"));
        var repeated = await mobile.PostAsync(path + "/update", Dispatch("true"));
        check(dispatched.StatusCode == HttpStatusCode.Redirect && dispatched.Headers.Location?.Host == "wa.me" &&
            Uri.UnescapeDataString(dispatched.Headers.Location.Query).Contains("Destino: Quito") &&
            repeated.StatusCode == HttpStatusCode.Redirect,
            "Quick dispatch opens the buyer chat after committing and handles duplicate submissions");
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StoreDbContext>();
            var order = await db.Orders.SingleAsync(o => o.Id == orderId);
            check(order.Status == "Enviado" && order.InventoryCommitted && order.PaidAt.HasValue &&
                await db.Products.Where(p => p.Id == productId).Select(p => p.Stock).SingleAsync() == 0,
                "Quick dispatch commits inventory exactly once");
            check(await db.OrderEvents.CountAsync(e => e.OrderId == orderId && (e.Status == "Pagado" || e.Status == "Enviado")) == 2 &&
                await db.EmailDeliveries.CountAsync(e => e.OrderId == orderId) == 8,
                "Quick dispatch records approval and dispatch and queues both customer and admin emails");
        }
        check((await mobile.PostAsync(path + "/update", Form(("key", key), ("Status", "Entregado"), ("ExpectedStatus", "Enviado"))))
            .StatusCode == HttpStatusCode.Redirect, "Quick dispatch page can complete delivery");
        return orderId;
    }

    public static async Task VerifyQueueAsync(IServiceProvider services, TestGateway gateway, Guid orderId,
        string directory, byte[] png, Action<bool, string> check)
    {
        using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(25));
        var ct = deadline.Token;
        using var worker = new OrderDispatchWorker(services.GetRequiredService<IServiceScopeFactory>(),
            services.GetRequiredService<IConfiguration>(), services.GetRequiredService<ILogger<OrderDispatchWorker>>());
        await worker.StartAsync(ct);
        try
        {
            await using var scope = services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<StoreDbContext>();
            var jobs = db.OrderDispatchJobs.AsNoTracking().Where(j => j.OrderId == orderId);
            while (await jobs.AnyAsync(j => j.FinishedAt == null, ct)) await Task.Delay(300, ct);
            var completed = await jobs.OrderBy(x => x.CreatedAt).ToListAsync(ct);
            check(completed.Count(x => x.Recipient is null && x.Result == "Respaldo cifrado guardado.") == 2,
                "The worker writes both backup files independently of Brevo");
            var proofBackup = completed.Single(x => x.ProofId != null && x.Recipient == null);
            var cipher = services.GetRequiredService<SecretCipher>();
            var encrypted = await File.ReadAllTextAsync(Path.Combine(directory, $"{proofBackup.EventId:N}.json.enc"), ct);
            check(proofBackup.BackupSnapshot == encrypted, "PostgreSQL retains the full encrypted backup after the temporary copy is written");
            var data = JsonNode.Parse(cipher.Decrypt(proofBackup.BackupSnapshot!))!;
            check(Convert.FromBase64String(data["Proof"]!["Content"]!.GetValue<string>()).SequenceEqual(png),
                "The encrypted proof backup contains the original image bytes");
            check(completed.Count(x => x.Recipient == "593939473099" && x.Result == "GREEN-API aceptó el mensaje para envío.") == 4 &&
                gateway.Sent.Count == 4 && gateway.Sent.All(x => x["chatId"]!.GetValue<string>() == "593939473099@c.us"),
                "New order, proof, dispatch and delivery use the test recipient only");
            var first = gateway.Sent.First()["message"]!.GetValue<string>();
            check(first.Contains("transferencia bancaria") && first.Contains("#key=") && first.Contains("https://wa.me/593939473099?text="),
                "The notification includes the private management link and buyer contact");
        }
        finally { await worker.StopAsync(default); }
    }

    public sealed class TestGateway : HttpMessageHandler
    {
        public ConcurrentQueue<JsonNode> Sent { get; } = new();

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            if (request.RequestUri?.Host != "7107.api.greenapi.com") throw new InvalidOperationException("Unexpected provider.");
            if (request.Method == HttpMethod.Get && request.RequestUri.AbsolutePath == "/waInstance1234/getWaSettings/testtoken")
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"stateInstance":"authorized","phone":"593992100232"}""", System.Text.Encoding.UTF8, "application/json")
                };
            if (request.Method != HttpMethod.Post || request.RequestUri.AbsolutePath != "/waInstance1234/sendMessage/testtoken")
                throw new InvalidOperationException("Unexpected provider route.");
            Sent.Enqueue(JsonNode.Parse(await request.Content!.ReadAsStringAsync(ct))!);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("""{"idMessage":"mock-message-id"}""", System.Text.Encoding.UTF8, "application/json")
            };
        }
    }

    private static FormUrlEncodedContent Form(params (string Key, string Value)[] fields) =>
        new(fields.Select(field => KeyValuePair.Create(field.Key, field.Value)));
}
