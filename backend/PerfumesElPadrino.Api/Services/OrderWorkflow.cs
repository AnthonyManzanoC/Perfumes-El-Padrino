using System.Data;
using System.Net;
using Microsoft.EntityFrameworkCore;
using PerfumesElPadrino.Api.Contracts;
using PerfumesElPadrino.Api.Data;
using PerfumesElPadrino.Api.Models;

namespace PerfumesElPadrino.Api.Services;

public sealed class OrderWorkflow(StoreDbContext db)
{
    public static readonly string[] Statuses = ["Pendiente de pago", "En verificación", "Pago rechazado", "Pagado", "Preparando envío", "Enviado", "Entregado", "Cancelado"];
    public static bool HoldsStock(Order order) => order.Status is "Pendiente de pago" or "En verificación" or "Pago rechazado";
    public static readonly string[] HoldingStatuses = ["Pendiente de pago", "En verificación", "Pago rechazado"];
    public static string StatusMessage(string status) => status switch
    {
        "Pendiente de pago" => "Recibimos tu pedido. Realiza la transferencia y sube el comprobante desde el seguimiento del pedido.",
        "En verificación" => "Recibimos tu comprobante. Estamos verificando el ingreso en nuestra cuenta bancaria.",
        "Pago rechazado" => "No pudimos confirmar el pago. Revisa la observación y envía un nuevo comprobante desde tu pedido.",
        "Pagado" => "Tu pago fue confirmado. Pronto comenzaremos a preparar tu compra.",
        "Preparando envío" => "Estamos preparando y empacando tus perfumes.",
        "Enviado" => "Tu pedido fue despachado. Consulta la transportadora y la guía de envío.",
        "Entregado" => "Tu pedido figura como entregado. Gracias por elegirnos.",
        "Cancelado" => "Tu pedido fue cancelado. Si realizaste un pago, la tienda coordinará contigo su revisión o devolución.",
        _ => "El estado de tu pedido fue actualizado."
    };

    public async Task<Dictionary<Guid, int>> ReservedAsync(CancellationToken ct) => await db.OrderItems
        .Where(x => x.ProductId != null && HoldingStatuses.Contains(x.Order.Status)
            && (x.Order.Status == "En verificación" || x.Order.ExpiresAt > DateTimeOffset.UtcNow))
        .GroupBy(x => x.ProductId!.Value).Select(x => new { Id = x.Key, Quantity = x.Sum(y => y.Quantity) })
        .ToDictionaryAsync(x => x.Id, x => x.Quantity, ct);

    // The event and both messages are persisted in the same transaction as the order.
    public async Task QueueEventAsync(Order order, string message, string? accessToken, CancellationToken ct)
    {
        var settings = await db.CommerceSettings.SingleAsync(x => x.Id == 1, ct);
        var brand = await db.SiteSettings.SingleAsync(x => x.Id == 1, ct);
        var evt = new OrderEvent { OrderId = order.Id, Status = order.Status, Message = message };
        db.OrderEvents.Add(evt);
        order.UpdatedAt = evt.CreatedAt;
        var pdf = ReceiptPdf.Create(order, brand.StoreName);
        var link = accessToken is null ? null : $"{settings.StoreUrl.TrimEnd('/')}/pedido/{order.OrderNumber}#token={Uri.EscapeDataString(accessToken)}";
        string E(string value) => WebUtility.HtmlEncode(value);
        var detail = $"{message}\nPedido: {order.OrderNumber}\nEstado: {order.Status}\nTotal: {order.Currency} {order.Total:0.00}\n";
        if (order.Carrier is not null) detail += $"Transporte: {order.Carrier}\nGuía: {order.TrackingNumber}\n{order.TrackingUrl}\n";
        var body = $"<div style='background:#f4f0e7;padding:24px;font-family:Arial,sans-serif;color:#27251f'><div style='max-width:600px;margin:auto;background:white;padding:28px;border-radius:16px'><p style='color:#80601f;letter-spacing:2px'>{E(brand.StoreName)}</p><h1 style='font-family:Georgia,serif'>{E(order.Status)}</h1><p>Hola, {E(order.CustomerName)}.</p><p style='white-space:pre-line;line-height:1.7'>{E(detail)}</p>";
        if (link is not null) body += $"<p><a style='display:inline-block;background:#171611;color:#e3c87f;padding:14px 22px;border-radius:24px' href='{E(link)}'>Ver mi pedido y subir comprobante</a></p>";
        else body += "<p>Puedes consultar tu pedido con el enlace privado del correo inicial.</p>";
        body += $"<p style='font-size:13px;color:#615b4e'>{E(settings.EmailFooter)}</p></div></div>";
        if (!string.IsNullOrWhiteSpace(order.CustomerEmail)) db.EmailDeliveries.Add(new EmailDelivery
        {
            OrderId = order.Id, EventId = evt.Id, Recipient = order.CustomerEmail,
            Subject = $"{brand.StoreName} | {order.OrderNumber} | {order.Status}",
            HtmlBody = body, TextBody = detail + (link is not null ? $"\nVer pedido: {link}" : "\nConsulta el enlace privado del correo inicial.") + "\n" + settings.EmailFooter,
            Pdf = pdf, AttachmentName = $"{(order.PaidAt is null ? "Resumen" : "Recibo")}-{order.OrderNumber}.pdf"
        });
        // Separate messages avoid exposing customer addresses through CC/BCC.
        if (!settings.AdminEmail.Equals(order.CustomerEmail, StringComparison.OrdinalIgnoreCase)) db.EmailDeliveries.Add(new EmailDelivery
        {
            OrderId = order.Id, EventId = evt.Id, Recipient = settings.AdminEmail,
            Subject = $"Pedido {order.OrderNumber} | {order.Status}",
            HtmlBody = $"<p>{E(order.CustomerName)} · {E(order.CustomerEmail)}</p><p>{E(detail)}</p><a href='{E(settings.StoreUrl.TrimEnd('/') + "/admin")}'>Gestionar pedido</a>",
            TextBody = detail + "\nAdministrar: " + settings.StoreUrl.TrimEnd('/') + "/admin"
        });
    }

    public async Task ChangeStatusAsync(Guid id, OrderStatusRequest request, CancellationToken ct, bool expiredOnly = false)
    {
        await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
            var order = await db.Orders.Include(x => x.Items).ThenInclude(x => x.Product).SingleOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new InvalidOperationException("El pedido no existe.");
            var next = request.Status;
            if (expiredOnly && (order.Status is not ("Pendiente de pago" or "Pago rechazado") || order.ExpiresAt is null || order.ExpiresAt > DateTimeOffset.UtcNow)) return;
            if (order.Status == next) return; // Retried clicks must not duplicate inventory or email.
            string[] allowed = order.Status switch
            {
                "Pendiente de pago" => ["Cancelado"],
                "En verificación" => ["Pagado", "Pago rechazado", "Cancelado"],
                "Pago rechazado" => ["Cancelado"],
                "Pagado" => ["Preparando envío", "Cancelado"],
                "Preparando envío" => ["Enviado", "Cancelado"],
                "Enviado" => ["Entregado"],
                "Pendiente" or "Contactado" => ["Pagado", "Cancelado"],
                "Confirmado" => ["Preparando envío", "Cancelado"],
                _ => []
            };
            if (!allowed.Contains(next)) throw new InvalidOperationException("Ese cambio de estado no está permitido.");
            if (next == "Pagado")
            {
                if (!request.BankVerified) throw new InvalidOperationException("Confirma primero que verificaste el ingreso en el banco.");
                if (!order.InventoryCommitted)
                {
                    foreach (var item in order.Items)
                    {
                        if (item.Product is null || item.Product.Stock < item.Quantity) throw new InvalidOperationException($"Stock insuficiente de {item.ProductName}. Revisa el inventario antes de aprobar.");
                        item.Product.Stock -= item.Quantity;
                    }
                    order.InventoryCommitted = true;
                }
                order.PaidAt = DateTimeOffset.UtcNow;
                order.ExpiresAt = null;
            }
            if (next == "Cancelado" && order.InventoryCommitted)
            {
                foreach (var item in order.Items.Where(x => x.Product != null)) item.Product!.Stock += item.Quantity;
                order.InventoryCommitted = false;
            }
            if (next == "Enviado")
            {
                if (string.IsNullOrWhiteSpace(request.Carrier) || string.IsNullOrWhiteSpace(request.TrackingNumber)) throw new InvalidOperationException("Ingresa la transportadora y la guía antes de marcar como enviado.");
                if (!string.IsNullOrWhiteSpace(request.TrackingUrl) && (!Uri.TryCreate(request.TrackingUrl, UriKind.Absolute, out var uri) || uri.Scheme != "https")) throw new InvalidOperationException("El enlace de seguimiento debe comenzar por https://.");
                order.Carrier = request.Carrier.Trim(); order.TrackingNumber = request.TrackingNumber.Trim(); order.TrackingUrl = request.TrackingUrl?.Trim();
            }
            if (next == "Pago rechazado")
            {
                if (string.IsNullOrWhiteSpace(request.Message)) throw new InvalidOperationException("Explica al cliente por qué debe corregir el comprobante.");
                order.ExpiresAt = DateTimeOffset.UtcNow.AddHours(24);
            }
            order.Status = next;
            await QueueEventAsync(order, StatusMessage(next) + (string.IsNullOrWhiteSpace(request.Message) ? "" : "\n" + request.Message.Trim()), null, ct);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        });
    }
}
