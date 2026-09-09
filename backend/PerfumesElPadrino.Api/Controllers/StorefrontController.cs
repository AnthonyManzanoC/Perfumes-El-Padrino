using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PerfumesElPadrino.Api.Contracts;
using PerfumesElPadrino.Api.Data;
using PerfumesElPadrino.Api.Models;

namespace PerfumesElPadrino.Api.Controllers;

[ApiController]
[Route("api/storefront")]
public sealed class StorefrontController(StoreDbContext db) : ControllerBase
{
    [HttpGet]
    [ResponseCache(Duration = 30, Location = ResponseCacheLocation.Any)]
    public async Task<ActionResult<StorefrontDto>> Get(CancellationToken cancellationToken)
    {
        var settings = await db.SiteSettings.AsNoTracking().SingleAsync(x => x.Id == 1, cancellationToken);
        var categories = await db.Categories.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.SortOrder).ThenBy(x => x.Name).ToListAsync(cancellationToken);
        var products = await db.Products.AsNoTracking().Include(x => x.Category).Include(x => x.Images).Where(x => x.IsActive).OrderBy(x => x.SortOrder).ThenBy(x => x.Name).ToListAsync(cancellationToken);
        return Ok(new StorefrontDto(settings.ToDto(), categories.Select(x => x.ToDto()).ToList(), products.Select(x => x.ToDto()).ToList()));
    }

    [HttpGet("products/{slug}")]
    [ResponseCache(Duration = 30, Location = ResponseCacheLocation.Any)]
    public async Task<ActionResult<ProductDto>> GetProduct(string slug, CancellationToken cancellationToken)
    {
        var product = await db.Products.AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.Images)
            .FirstOrDefaultAsync(x => x.Slug == slug && x.IsActive, cancellationToken);
        return product is null ? NotFound(new { message = "Este perfume ya no está disponible." }) : Ok(product.ToDto());
    }

    [HttpPost("orders")]
    public async Task<ActionResult<CreateOrderResponse>> CreateOrder([FromBody] CreateOrderRequest request, CancellationToken cancellationToken)
    {
        var requestedItems = request.Items.GroupBy(x => x.ProductId).ToDictionary(x => x.Key, x => x.Sum(item => item.Quantity));
        var products = await db.Products.Where(x => requestedItems.Keys.Contains(x.Id) && x.IsActive).ToListAsync(cancellationToken);

        if (products.Count != requestedItems.Count)
            return BadRequest(new { message = "Uno o más productos ya no están disponibles." });

        foreach (var product in products)
        {
            if (product.Stock < requestedItems[product.Id])
                return BadRequest(new { message = $"Solo quedan {product.Stock} unidades de {product.Name}." });
        }

        var order = new Order
        {
            OrderNumber = $"PAD-{DateTimeOffset.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}",
            CustomerName = request.CustomerName.Trim(),
            CustomerPhone = request.CustomerPhone.Trim(),
            City = request.City?.Trim(),
            Notes = request.Notes?.Trim(),
            Items = products.Select(product => new OrderItem
            {
                ProductId = product.Id,
                ProductName = product.Name,
                UnitPrice = product.Price,
                Quantity = requestedItems[product.Id]
            }).ToList()
        };
        order.Subtotal = order.Items.Sum(x => x.UnitPrice * x.Quantity);
        order.ShippingTotal = products.Sum(product => product.FreeShipping ? 0 : product.ShippingFee ?? 0);
        order.Total = order.Subtotal + order.ShippingTotal;
        db.Orders.Add(order);
        await db.SaveChangesAsync(cancellationToken);

        var settings = await db.SiteSettings.AsNoTracking().SingleAsync(x => x.Id == 1, cancellationToken);
        var message = new StringBuilder()
            .AppendLine(settings.WhatsAppGreeting)
            .AppendLine()
            .AppendLine($"Pedido: {order.OrderNumber}");
        foreach (var item in order.Items)
            message.AppendLine($"• {item.Quantity}x {item.ProductName} — ${(item.UnitPrice * item.Quantity):0.00}");
        message.AppendLine($"Subtotal: ${order.Subtotal:0.00}")
            .AppendLine(order.ShippingTotal == 0 ? "Envío: Gratis" : $"Envío: ${order.ShippingTotal:0.00}")
            .AppendLine($"Total: ${order.Total:0.00}")
            .AppendLine($"Cliente: {order.CustomerName}")
            .AppendLine($"Teléfono: {order.CustomerPhone}");
        if (!string.IsNullOrWhiteSpace(order.City)) message.AppendLine($"Ciudad: {order.City}");
        if (!string.IsNullOrWhiteSpace(order.Notes)) message.AppendLine($"Notas: {order.Notes}");

        var phone = new string(settings.WhatsAppNumber.Where(char.IsDigit).ToArray());
        var whatsappUrl = $"https://wa.me/{phone}?text={Uri.EscapeDataString(message.ToString())}";
        return Ok(new CreateOrderResponse(order.OrderNumber, order.Subtotal, order.ShippingTotal, order.Total, whatsappUrl));
    }
}
