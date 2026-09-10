using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using PerfumesElPadrino.Api.Data;
using PerfumesElPadrino.Api.Models;
using PerfumesElPadrino.Api.Services;

await BrevoTests.RunAsync();

var baseConnection = Environment.GetEnvironmentVariable("TEST_POSTGRES") ?? throw new Exception("Set TEST_POSTGRES; tests create and remove a separate schema only.");
baseConnection = new NpgsqlConnectionStringBuilder(baseConnection) { Timeout = 15, CommandTimeout = 30 }.ConnectionString;
Console.WriteLine("Opening isolated test database...");
var schema = "checkout_test_" + Guid.NewGuid().ToString("N");
var cs = new NpgsqlConnectionStringBuilder(baseConnection) { SearchPath = schema, Pooling = false };
await using var connection = new NpgsqlConnection(baseConnection);
await connection.OpenAsync();
Console.WriteLine("Connected to test database.");
await using (var create = new NpgsqlCommand($"CREATE SCHEMA \"{schema}\"", connection)) await create.ExecuteNonQueryAsync();
// EF8 checks history existence across schemas; create the empty history in our isolated schema.
await using (var historyTable = new NpgsqlCommand($"CREATE TABLE \"{schema}\".\"__EFMigrationsHistory\" (\"MigrationId\" varchar(150) PRIMARY KEY, \"ProductVersion\" varchar(32) NOT NULL)", connection)) await historyTable.ExecuteNonQueryAsync();
Environment.SetEnvironmentVariable("ConnectionStrings__Postgres", cs.ConnectionString);
Environment.SetEnvironmentVariable("Commerce__DisableWorker", "true");
Environment.SetEnvironmentVariable("Commerce__EncryptionKey", Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)));
Environment.SetEnvironmentVariable("Brevo__ApiKey", "integration-test-only");
Environment.SetEnvironmentVariable("AdminSeed__Email", "admin@example.test");
Environment.SetEnvironmentVariable("AdminSeed__Password", "Test-only-password-!2026");
Environment.SetEnvironmentVariable("Logging__LogLevel__Default", "Warning");
var passed = 0;
void Check(bool value, string label) { if (!value) throw new Exception("FAILED: " + label); passed++; Console.WriteLine("PASS: " + label); }
try
{
    await using var factory = new WebApplicationFactory<OrderWorkflow>().WithWebHostBuilder(builder => builder.UseContentRoot(Path.GetFullPath("backend/PerfumesElPadrino.Api")));
    Console.WriteLine("Starting isolated application...");
    using var client = factory.CreateClient();
    using var admin = factory.CreateClient();
    var login = await admin.PostAsJsonAsync("/api/admin/login", new { email = "admin@example.test", password = "Test-only-password-!2026" });
    var loginData = JsonNode.Parse(await login.Content.ReadAsStringAsync())!;
    admin.DefaultRequestHeaders.Authorization = new("Bearer", loginData["token"]!.GetValue<string>());
    Check((await client.GetAsync("/api/admin/commerce")).StatusCode == HttpStatusCode.Unauthorized, "Brevo settings require admin authentication");
    var settings = (await admin.GetFromJsonAsync<JsonObject>("/api/admin/commerce"))!;
    Check(settings["hasApiKey"]!.GetValue<bool>() && settings["brevoApiKeyEncrypted"] is null && settings["brevoApiKey"] is null, "Brevo password is write-only");
    Check(!(await client.GetStringAsync("/api/checkout/settings")).Contains("smtp", StringComparison.OrdinalIgnoreCase), "Public checkout exposes no Brevo settings");
    settings["checkoutEnabled"] = true;
    Check((await admin.PutAsJsonAsync("/api/admin/commerce", settings)).IsSuccessStatusCode, "Admin can configure transfer checkout");
    settings["brevoApiKey"] = "replacement-test-key";
    var savedKey = await admin.PutAsJsonAsync("/api/admin/commerce", settings);
    Check(savedKey.IsSuccessStatusCode && !(await savedKey.Content.ReadAsStringAsync()).Contains("replacement-test-key"), "Brevo key can be saved without disclosure");
    settings["brevoApiKey"] = "";
    Check((await admin.PutAsJsonAsync("/api/admin/commerce", settings)).IsSuccessStatusCode, "Blank Brevo key preserves configuration");
    await using (var keyScope = factory.Services.CreateAsyncScope())
    {
        var encrypted = (await keyScope.ServiceProvider.GetRequiredService<StoreDbContext>().CommerceSettings.SingleAsync()).BrevoApiKeyEncrypted!;
        Check(encrypted != "replacement-test-key" && keyScope.ServiceProvider.GetRequiredService<SecretCipher>().Decrypt(encrypted) == "replacement-test-key", "Brevo key is encrypted and preserved on blank update");
    }
    Guid productId;
    await using (var scope = factory.Services.CreateAsyncScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<StoreDbContext>();
        var product = new Product { Name = "Perfume de prueba", Brand = "Prueba", Slug = "prueba", Price = 35.50m, Stock = 3, FreeShipping = false, ShippingFee = 4.50m, ImageUrl = "/test.webp" };
        db.Products.Add(product); await db.SaveChangesAsync(); productId = product.Id;
    }
    var access = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
    var checkoutKey = Guid.NewGuid();
    object payload = new { customerName = "Cliente de prueba", customerPhone = "0991234567", customerEmail = "customer@example.test", shippingAddress = "Calle de prueba 123", city = "Quito", checkoutKey, accessToken = access, items = new[] { new { productId, quantity = 2 } } };
    var created = await client.PostAsJsonAsync("/api/checkout/orders", payload);
    if (!created.IsSuccessStatusCode) throw new Exception("Create failed: " + await created.Content.ReadAsStringAsync());
    var data = (await created.Content.ReadFromJsonAsync<JsonObject>())!;
    var number = data["orderNumber"]!.GetValue<string>();
    Check(data["total"]!.GetValue<decimal>() == 75.50m, "Totals and shipping are calculated on the server");
    var repeat = await client.PostAsJsonAsync("/api/checkout/orders", payload);
    Check((await repeat.Content.ReadFromJsonAsync<JsonObject>())!["orderNumber"]!.GetValue<string>() == number, "Checkout retry returns the same order");
    Check((await client.GetAsync($"/api/checkout/orders/{number}")).StatusCode == HttpStatusCode.NotFound, "Order details require the private access token");
    client.DefaultRequestHeaders.Add("X-Order-Token", access);
    var detail = await client.GetFromJsonAsync<JsonObject>($"/api/checkout/orders/{number}");
    Check(detail!["status"]!.GetValue<string>() == "Pendiente de pago", "Order starts unpaid");
    var store = await client.GetFromJsonAsync<JsonObject>("/api/storefront");
    Check(store!["products"]![0]!["stock"]!.GetValue<int>() == 1, "Unpaid order reserves stock without committing it");
    using var invalid = new MultipartFormDataContent(); invalid.Add(new ByteArrayContent("<script>not an image</script>"u8.ToArray()), "file", "proof.jpg");
    Check((await client.PostAsync($"/api/checkout/orders/{number}/proof", invalid)).StatusCode == HttpStatusCode.BadRequest, "Fake image upload is rejected");
    byte[] png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=");
    using var form = new MultipartFormDataContent(); form.Add(new ByteArrayContent(png), "file", "proof.png");
    Check((await client.PostAsync($"/api/checkout/orders/{number}/proof", form)).IsSuccessStatusCode, "Valid proof is stored privately");
    Guid id;
    await using (var scope = factory.Services.CreateAsyncScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<StoreDbContext>();
        var order = await db.Orders.SingleAsync(); id = order.Id;
        Check(order.Status == "En verificación" && order.PaidAt is null && !order.InventoryCommitted, "Proof never automatically confirms payment");
        Check(await db.EmailDeliveries.CountAsync() == 4, "Each event queues separate customer and administrator emails");
        var proofId = await db.PaymentProofs.Select(x => x.Id).SingleAsync();
        Check((await client.GetAsync($"/api/admin/commerce/proofs/{proofId}")).StatusCode == HttpStatusCode.Unauthorized, "Proof downloads require administrator authentication");
    }
    Check((await admin.PatchAsJsonAsync($"/api/admin/orders/{id}/status", new { status = "Pagado" })).StatusCode == HttpStatusCode.BadRequest, "Payment approval requires explicit bank verification");
    Check((await admin.PatchAsJsonAsync($"/api/admin/orders/{id}/status", new { status = "Enviado" })).StatusCode == HttpStatusCode.BadRequest, "Unpaid order cannot be shipped");
    var approvals = await Task.WhenAll(Enumerable.Range(0, 2).Select(_ => admin.PatchAsJsonAsync($"/api/admin/orders/{id}/status", new { status = "Pagado", bankVerified = true })));
    Check(approvals.All(x => x.IsSuccessStatusCode), "Concurrent payment approvals are idempotent");
    await using (var scope = factory.Services.CreateAsyncScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<StoreDbContext>();
        Check((await db.Products.SingleAsync()).Stock == 1, "Stock is deducted exactly once");
        Check(await db.EmailDeliveries.CountAsync() == 6, "Duplicate approval does not duplicate notifications");
        var order = await db.Orders.Include(x => x.Items).SingleAsync();
        var pdfDirectory = Path.GetFullPath($"work/checkout-pdfs-{Guid.NewGuid():N}"); Directory.CreateDirectory(pdfDirectory);
        var output = Path.Combine(pdfDirectory, "receipt-test.pdf");
        await File.WriteAllBytesAsync(output, ReceiptPdf.Create(order, "Perfumes El Padrino"));
        order.Items = Enumerable.Range(1, 50).Select(i => new OrderItem { ProductName = $"Perfume de presentación extensa para comprobar saltos de página {i}", Quantity = 1, UnitPrice = 35.50m }).ToList();
        order.Subtotal = order.Items.Sum(x => x.UnitPrice * x.Quantity);
        order.Total = order.Subtotal + order.ShippingTotal;
        await File.WriteAllBytesAsync(Path.Combine(pdfDirectory, "receipt-multipage-test.pdf"), ReceiptPdf.Create(order, "Perfumes El Padrino"));
        Console.WriteLine("PDF QA directory: " + pdfDirectory);
    }
    Check((await admin.PatchAsJsonAsync($"/api/admin/orders/{id}/status", new { status = "Preparando envío" })).IsSuccessStatusCode, "Paid order can be prepared");
    Check((await admin.PatchAsJsonAsync($"/api/admin/orders/{id}/status", new { status = "Enviado" })).StatusCode == HttpStatusCode.BadRequest, "Shipping requires carrier and tracking number");
    Check((await admin.PatchAsJsonAsync($"/api/admin/orders/{id}/status", new { status = "Enviado", carrier = "Transporte de prueba", trackingNumber = "TEST-123", trackingUrl = "javascript:alert(1)" })).StatusCode == HttpStatusCode.BadRequest, "Unsafe tracking URL is rejected");
    Check((await admin.PatchAsJsonAsync($"/api/admin/orders/{id}/status", new { status = "Enviado", carrier = "Transporte de prueba", trackingNumber = "TEST-123", trackingUrl = "https://example.test/tracking/123" })).IsSuccessStatusCode, "Shipped order records carrier and guide");
    Check((await admin.PatchAsJsonAsync($"/api/admin/orders/{id}/status", new { status = "Entregado" })).IsSuccessStatusCode, "Shipped order can be delivered");
    Check((await admin.DeleteAsync($"/api/admin/orders/{id}")).StatusCode == HttpStatusCode.Conflict, "Order history cannot be deleted");
    var receipt = await client.GetByteArrayAsync($"/api/checkout/orders/{number}/receipt");
    Check(System.Text.Encoding.ASCII.GetString(receipt.Take(5).ToArray()) == "%PDF-", "Private receipt endpoint returns a PDF");
    await using (var scope = factory.Services.CreateAsyncScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<StoreDbContext>();
        Check(await db.OrderEvents.CountAsync() == 6 && await db.EmailDeliveries.CountAsync() == 12, "All six lifecycle events have durable customer and admin notifications");
    }
    var edit = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/products"))![0]!.DeepClone().AsObject();
    edit["name"] = "Perfume editado"; edit["stock"] = 3; edit["originalStock"] = 3;
    Check((await admin.PutAsJsonAsync($"/api/admin/products/{productId}", edit)).IsSuccessStatusCode, "Editing product text preserves stock changed by orders");
    var edited = (await admin.GetFromJsonAsync<JsonArray>("/api/admin/products"))![0]!;
    Check(edited["stock"]!.GetValue<int>() == 1, "Old product form does not restore sold units");
    edit["stock"] = 2;
    Check((await admin.PutAsJsonAsync($"/api/admin/products/{productId}", edit)).StatusCode == HttpStatusCode.Conflict, "Stale inventory adjustment is rejected");
    var contenders = Enumerable.Range(0, 2).Select(_ => new { key = Guid.NewGuid(), token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant() }).ToArray();
    var racingOrders = await Task.WhenAll(contenders.Select(c => client.PostAsJsonAsync("/api/checkout/orders", new
    {
        customerName = "Prueba concurrente", customerPhone = "0991234567", customerEmail = "concurrent@example.test", shippingAddress = "Dirección de prueba 123", city = "Quito",
        checkoutKey = c.key, accessToken = c.token, items = new[] { new { productId, quantity = 1 } }
    })));
    Check(racingOrders.Count(x => x.IsSuccessStatusCode) == 1 && racingOrders.Count(x => x.StatusCode == HttpStatusCode.BadRequest) == 1, "Concurrent checkout cannot oversell the last unit");
    var winner = Array.FindIndex(racingOrders, x => x.IsSuccessStatusCode);
    var winnerNumber = (await racingOrders[winner].Content.ReadFromJsonAsync<JsonObject>())!["orderNumber"]!.GetValue<string>();
    using var winnerClient = factory.CreateClient(); winnerClient.DefaultRequestHeaders.Add("X-Order-Token", contenders[winner].token);
    Guid winnerId;
    await using (var scope = factory.Services.CreateAsyncScope()) winnerId = await scope.ServiceProvider.GetRequiredService<StoreDbContext>().Orders.Where(x => x.OrderNumber == winnerNumber).Select(x => x.Id).SingleAsync();
    async Task UploadWinner()
    {
        using var f = new MultipartFormDataContent(); f.Add(new ByteArrayContent(png), "file", "proof.png");
        if (!(await winnerClient.PostAsync($"/api/checkout/orders/{winnerNumber}/proof", f)).IsSuccessStatusCode) throw new Exception("Proof re-upload failed");
    }
    await UploadWinner();
    Check((await admin.PatchAsJsonAsync($"/api/admin/orders/{winnerId}/status", new { status = "Pago rechazado", message = "Importe por revisar" })).IsSuccessStatusCode, "Rejected proof records the reason");
    await UploadWinner();
    Check((await admin.PatchAsJsonAsync($"/api/admin/orders/{winnerId}/status", new { status = "Pagado", bankVerified = true })).IsSuccessStatusCode, "Corrected proof can be approved");
    await using (var scope = factory.Services.CreateAsyncScope())
    {
        var workflow = scope.ServiceProvider.GetRequiredService<OrderWorkflow>();
        await workflow.ChangeStatusAsync(winnerId, new() { Status = "Cancelado" }, default, expiredOnly: true);
        var db = scope.ServiceProvider.GetRequiredService<StoreDbContext>();
        Check((await db.Orders.SingleAsync(x => x.Id == winnerId)).Status == "Pagado", "Stale expiration job cannot cancel a paid order");
    }
    Check((await admin.PatchAsJsonAsync($"/api/admin/orders/{winnerId}/status", new { status = "Cancelado" })).IsSuccessStatusCode, "Paid order can be cancelled before dispatch");
    await admin.PatchAsJsonAsync($"/api/admin/orders/{winnerId}/status", new { status = "Cancelado" });
    await using (var scope = factory.Services.CreateAsyncScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<StoreDbContext>();
        Check((await db.Products.SingleAsync()).Stock == 1, "Cancellation returns stock exactly once");
        Check(await db.PaymentProofs.CountAsync(x => x.OrderId == winnerId) == 2, "Both proof revisions remain available for audit");
    }
    Console.WriteLine($"Integration suite passed: {passed} checks. No customer emails sent.");
}
catch (Exception ex)
{
    Console.Error.WriteLine(ex.ToString());
    Environment.ExitCode = 1;
}
finally
{
    // Only the uniquely generated test schema is removed; production tables are untouched.
    if (!System.Text.RegularExpressions.Regex.IsMatch(schema, "^checkout_test_[a-f0-9]{32}$")) throw new Exception("Invalid test schema");
    await using var cleanup = new NpgsqlCommand($"DROP SCHEMA \"{schema}\" CASCADE", connection);
    await cleanup.ExecuteNonQueryAsync();
}

