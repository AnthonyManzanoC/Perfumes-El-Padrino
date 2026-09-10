using System.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using PerfumesElPadrino.Api.Contracts;
using PerfumesElPadrino.Api.Data;
using PerfumesElPadrino.Api.Models;
using PerfumesElPadrino.Api.Security;
using PerfumesElPadrino.Api.Services;

namespace PerfumesElPadrino.Api.Controllers;

[ApiController, Route("api/checkout"), EnableRateLimiting("checkout")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class CheckoutController(StoreDbContext db, OrderWorkflow workflow) : ControllerBase
{
    [HttpGet("settings")]
    public async Task<IActionResult> Settings(CancellationToken ct)
    {
        var s = await db.CommerceSettings.AsNoTracking().SingleAsync(x => x.Id == 1, ct);
        return Ok(new { s.CheckoutEnabled, s.BankName, s.AccountType, s.AccountNumber, s.AccountHolder, s.Identification, s.PaymentInstructions });
    }

    [HttpPost("orders"), EnableRateLimiting("create-order")]
    public async Task<IActionResult> Create(CreateOrderRequest request, CancellationToken ct)
    {
        if (request.CheckoutKey == Guid.Empty) return BadRequest(new { message = "Vuelve a cargar el carrito e inténtalo de nuevo." });
        try
        {
            Order? result = null;
            await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
            {
                db.ChangeTracker.Clear();
                await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
                var existing = await db.Orders.SingleOrDefaultAsync(x => x.CheckoutKey == request.CheckoutKey, ct);
                if (existing is not null)
                {
                    if (existing.AccessTokenHash != PasswordSecurity.HashToken(request.AccessToken)) throw new InvalidOperationException("No se pudo recuperar el pedido.");
                    result = existing;
                    return;
                }
                var s = await db.CommerceSettings.SingleAsync(x => x.Id == 1, ct);
                if (!s.CheckoutEnabled || string.IsNullOrWhiteSpace(s.AccountNumber)) throw new InvalidOperationException("La tienda está terminando de configurar las transferencias. Intenta más tarde.");
                var quantities = request.Items.GroupBy(x => x.ProductId).ToDictionary(x => x.Key, x => x.Sum(y => y.Quantity));
                if (quantities.Values.Any(x => x > 20)) throw new InvalidOperationException("El máximo por perfume es de 20 unidades.");
                var products = await db.Products.Where(x => quantities.Keys.Contains(x.Id) && x.IsActive).OrderBy(x => x.Id).ToListAsync(ct);
                if (products.Count != quantities.Count) throw new InvalidOperationException("Uno de los perfumes ya no está disponible.");
                var reserved = await workflow.ReservedAsync(ct);
                foreach (var p in products)
                    if (p.Stock - reserved.GetValueOrDefault(p.Id) < quantities[p.Id]) throw new InvalidOperationException($"No quedan suficientes unidades disponibles de {p.Name}.");
                var brand = await db.SiteSettings.SingleAsync(x => x.Id == 1, ct);
                var order = new Order
                {
                    OrderNumber = $"PAD-{DateTimeOffset.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..29].ToUpperInvariant(),
                    CustomerName = request.CustomerName.Trim(), CustomerPhone = request.CustomerPhone.Trim(),
                    CustomerEmail = request.CustomerEmail.Trim().ToLowerInvariant(), ShippingAddress = request.ShippingAddress.Trim(),
                    City = request.City?.Trim(), Notes = request.Notes?.Trim(), CheckoutKey = request.CheckoutKey,
                    AccessTokenHash = PasswordSecurity.HashToken(request.AccessToken), Status = "Pendiente de pago",
                    Currency = brand.Currency, ExpiresAt = DateTimeOffset.UtcNow.AddHours(24),
                    BankSnapshot = $"{s.BankName}\n{s.AccountType}\nCuenta: {s.AccountNumber}\nTitular: {s.AccountHolder}\nIdentificación: {s.Identification}\n{s.PaymentInstructions}",
                    Items = products.Select(p => new OrderItem { ProductId = p.Id, ProductName = $"{p.Brand} {p.Name}", UnitPrice = p.Price, Quantity = quantities[p.Id] }).ToList()
                };
                order.Subtotal = order.Items.Sum(x => x.UnitPrice * x.Quantity);
                order.ShippingTotal = products.Sum(p => p.FreeShipping ? 0 : p.ShippingFee ?? 0);
                order.Total = order.Subtotal + order.ShippingTotal;
                db.Orders.Add(order);
                await workflow.QueueEventAsync(order, OrderWorkflow.StatusMessage(order.Status), request.AccessToken, ct);
                await db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
                result = order;
            });
            return Ok(new CreateOrderResponse(result!.OrderNumber, result.Subtotal, result.ShippingTotal, result.Total));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    private Task<Order?> FindOrder(string number, CancellationToken ct)
    {
        var token = Request.Headers["X-Order-Token"].ToString();
        if (token.Length != 64) return Task.FromResult<Order?>(null);
        var hash = PasswordSecurity.HashToken(token);
        return db.Orders.Include(x => x.Items).SingleOrDefaultAsync(x => x.OrderNumber == number && x.AccessTokenHash == hash, ct);
    }

    [HttpGet("orders/{number}")]
    public async Task<IActionResult> Get(string number, CancellationToken ct)
    {
        var o = await FindOrder(number, ct);
        if (o is null) return NotFound(new { message = "El enlace privado del pedido no es válido." });
        return Ok(new
        {
            o.OrderNumber, o.CustomerName, o.CustomerEmail, o.CustomerPhone, o.ShippingAddress, o.City, o.Status,
            o.Subtotal, o.ShippingTotal, o.Total, o.Currency, o.BankSnapshot, o.Carrier, o.TrackingNumber, o.TrackingUrl,
            o.CreatedAt, o.UpdatedAt, o.PaidAt, o.ExpiresAt,
            items = o.Items.Select(x => new { x.ProductName, x.Quantity, x.UnitPrice }),
            events = await db.OrderEvents.Where(x => x.OrderId == o.Id).OrderBy(x => x.CreatedAt).Select(x => new { x.Status, x.Message, x.CreatedAt }).ToListAsync(ct),
            hasProof = await db.PaymentProofs.AnyAsync(x => x.OrderId == o.Id, ct)
        });
    }

    [HttpGet("orders/{number}/receipt")]
    public async Task<IActionResult> Receipt(string number, CancellationToken ct)
    {
        var order = await FindOrder(number, ct);
        if (order is null) return NotFound();
        var brand = await db.SiteSettings.SingleAsync(x => x.Id == 1, ct);
        return File(ReceiptPdf.Create(order, brand.StoreName), "application/pdf", $"{order.OrderNumber}.pdf");
    }

    [HttpPost("orders/{number}/proof"), RequestSizeLimit(2_300_000)]
    public async Task<IActionResult> Proof(string number, IFormFile file, CancellationToken ct)
    {
        if (file.Length is < 16 or > 2_000_000) return BadRequest(new { message = "Sube una imagen JPG, PNG o WebP de hasta 2 MB." });
        using var stream = new MemoryStream();
        await file.CopyToAsync(stream, ct);
        var content = stream.ToArray();
        var type = content[0] == 0xff && content[1] == 0xd8 && content[2] == 0xff ? "image/jpeg"
            : content.Take(8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }) ? "image/png"
            : System.Text.Encoding.ASCII.GetString(content, 0, 4) == "RIFF" && System.Text.Encoding.ASCII.GetString(content, 8, 4) == "WEBP" ? "image/webp" : null;
        if (type is null) return BadRequest(new { message = "El archivo no es una imagen JPG, PNG o WebP válida." });
        try
        {
            await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
            {
                db.ChangeTracker.Clear();
                await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
                var order = await FindOrder(number, ct) ?? throw new InvalidOperationException("El enlace privado del pedido no es válido.");
                if (order.Status == "En verificación") return;
                if (order.Status is not ("Pendiente de pago" or "Pago rechazado") || order.ExpiresAt <= DateTimeOffset.UtcNow)
                    throw new InvalidOperationException("Este pedido ya no admite comprobantes. Consulta su estado o contacta a la tienda.");
                if (await db.PaymentProofs.CountAsync(x => x.OrderId == order.Id, ct) >= 5) throw new InvalidOperationException("Se alcanzó el límite de comprobantes. Contacta a la tienda.");
                db.PaymentProofs.Add(new PaymentProof { OrderId = order.Id, Content = content, ContentType = type });
                order.Status = "En verificación";
                order.ExpiresAt = null; // Never expire a transfer awaiting human bank review.
                await workflow.QueueEventAsync(order, OrderWorkflow.StatusMessage(order.Status), null, ct);
                await db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
            });
            return Ok(new { message = "Comprobante recibido. Te avisaremos por correo cuando el pago sea verificado." });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
