using System.ComponentModel.DataAnnotations;
using System.Net;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using PerfumesElPadrino.Api.Contracts;
using PerfumesElPadrino.Api.Data;
using PerfumesElPadrino.Api.Models;
using PerfumesElPadrino.Api.Services;

namespace PerfumesElPadrino.Api.Controllers;

[ApiController, Route("despacho-rapido/{number}"), EnableRateLimiting("checkout")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class QuickDispatchController(StoreDbContext db, QuickOrderLinks links, OrderWorkflow workflow) : ControllerBase
{
    private const string CookieName = "padrino_dispatch";

    private string? Key => Request.Cookies[CookieName];

    [HttpGet]
    public async Task<IActionResult> ViewOrder(string number, CancellationToken ct)
    {
        if (!links.Valid(number, Key)) return Page("Abrir pedido", """
            <h1>Gestión de pedidos</h1>
            <p id="status">Abre el enlace privado recibido por WhatsApp. Si venció, gestiona el pedido desde el panel.</p>
            <script>
              const key = new URLSearchParams(location.hash.slice(1)).get('key');
              if (key) {
                history.replaceState(null, '', location.pathname);
                document.getElementById('status').textContent = 'Verificando acceso…';
                fetch(location.pathname + '/access', {
                  method: 'POST', body: new URLSearchParams({ key })
                }).then(response => {
                  if (response.ok) location.reload();
                  else throw new Error();
                }).catch(() => {
                  document.getElementById('status').textContent = 'El enlace privado no es válido o ya venció.';
                });
              }
            </script>
            """);

        var order = await FindAsync(number, ct);
        return order is null ? NotFound() : await ShowAsync(order, null, ct);
    }

    [HttpPost("access"), RequestSizeLimit(2048)]
    public IActionResult Access(string number, [FromForm, StringLength(80)] string key)
    {
        if (!links.Valid(number, key)) return NotFound();
        Response.Cookies.Append(CookieName, key, new CookieOptions
        {
            Path = $"/despacho-rapido/{Uri.EscapeDataString(number)}",
            HttpOnly = true, SameSite = SameSiteMode.Strict, Secure = Request.IsHttps
        });
        return NoContent();
    }

    [HttpGet("proof/{proofId:guid}")]
    public async Task<IActionResult> Proof(string number, Guid proofId, CancellationToken ct)
    {
        if (!links.Valid(number, Key)) return NotFound();
        var proof = await db.PaymentProofs.AsNoTracking().SingleOrDefaultAsync(
            p => p.Id == proofId && db.Orders.Any(o => o.Id == p.OrderId && o.OrderNumber == number), ct);
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return proof is null ? NotFound() : File(proof.Content, proof.ContentType);
    }

    [HttpPost("update"), RequestSizeLimit(8192)]
    public async Task<IActionResult> Update(string number, [FromForm] OrderStatusRequest request,
        [FromForm, StringLength(80)] string key, CancellationToken ct)
    {
        if (Key != key || !links.Valid(number, key)) return NotFound();
        var order = await FindAsync(number, ct);
        if (order is null) return NotFound();
        if (request.Status is not ("Enviado" or "Entregado" or "Cancelado"))
            return BadRequest();
        request.DirectDispatch = true;
        try
        {
            await workflow.ChangeStatusAsync(order.Id, request, ct);
            if (request.Status == "Enviado" && await FindAsync(number, ct) is { } dispatched &&
                GreenApiWhatsApp.CustomerChat(dispatched) is { } chat)
                return Redirect(chat);

            return RedirectToAction(nameof(ViewOrder), new { number });
        }
        catch (InvalidOperationException ex)
        {
            var current = await FindAsync(number, ct);
            return current is null ? NotFound() : await ShowAsync(current, ex.Message, ct);
        }
    }

    private Task<Order?> FindAsync(string number, CancellationToken ct) => db.Orders.AsNoTracking()
        .Include(o => o.Items).ThenInclude(i => i.Product).SingleOrDefaultAsync(o => o.OrderNumber == number, ct);

    private static string E(string? value) => WebUtility.HtmlEncode(value) ?? "";

    private async Task<IActionResult> ShowAsync(Order order, string? error, CancellationToken ct)
    {
        var proof = await db.PaymentProofs.AsNoTracking().Where(p => p.OrderId == order.Id)
            .OrderByDescending(p => p.CreatedAt).Select(p => (Guid?)p.Id).FirstOrDefaultAsync(ct);
        var path = $"/despacho-rapido/{Uri.EscapeDataString(order.OrderNumber)}";
        var items = string.Join("", order.Items.Select(i =>
            $"<li>{i.Quantity} × {E(i.ProductName)} · {E(order.Currency)} {i.UnitPrice:0.00} c/u · Existencias: {i.Product?.Stock.ToString() ?? "sin producto"}</li>"));
        var picture = proof is Guid id
            ? $"<section id='comprobante'><h2>Último comprobante</h2><a href='{path}/proof/{id}'><img src='{path}/proof/{id}' alt='Comprobante de transferencia'></a><p><a href='{path}/proof/{id}'>Ver comprobante en tamaño original</a></p></section>"
            : "<p>Este pedido todavía no tiene comprobante.</p>";
        var review = order.Status == "En verificación";
        var ship = order.Status is "En verificación" or "Pagado" or "Preparando envío" or "Confirmado";
        var cancel = OrderWorkflow.HoldsStock(order) || order.Status is "Pagado" or "Preparando envío" or "Pendiente" or "Contactado" or "Confirmado";
        var hidden = $"<input type='hidden' name='key' value='{E(Key)}'><input type='hidden' name='ExpectedStatus' value='{E(order.Status)}'>";
        var form = $"<form method='post' action='{path}/update'>{hidden}";
        var verify = review
            ? $"<input type='hidden' name='ExpectedProofId' value='{proof}'><label class='check'><input type='checkbox' name='BankVerified' value='true' required> Verifiqué el ingreso en el banco.</label>"
            : "";
        var dispatch = ship ? $"""
            {form}{verify}
            <label>Transportadora (opcional)<input name="Carrier" maxlength="100"></label>
            <label>Número de guía (opcional)<input name="TrackingNumber" maxlength="120"></label>
            <label>Enlace HTTPS de seguimiento (opcional)<input type="url" name="TrackingUrl" maxlength="500"></label>
            <button name="Status" value="Enviado">{(review ? "Aprobar pago y despachar" : "Marcar como despachado")}</button></form>
            """ : "";
        var finish = order.Status == "Enviado" ? $"{form}<button name='Status' value='Entregado'>Marcar como entregado</button></form>" : "";
        var stop = cancel ? $"""
            <details><summary>Cancelar pedido y liberar stock</summary>{form}
            <label>Motivo (opcional)<textarea name="Message" maxlength="600"></textarea></label>
            <label class="check"><input type="checkbox" required> Confirmo la cancelación.</label>
            <button class="danger" name="Status" value="Cancelado">Confirmar cancelación</button></form></details>
            """ : "";
        var contact = GreenApiWhatsApp.CustomerChat(order) is { } chat
            ? $"<a class='chat' href='{E(chat)}' rel='noreferrer'>Hablar con el cliente por WhatsApp</a>" : "";
        var alert = error is null ? "" : $"<p class='error' role='alert'>{E(error)}</p>";
        return Page(order.OrderNumber, $"""
            <p class="eyebrow">PERFUMES EL PADRINO · DESPACHO RÁPIDO</p>
            <h1>Pedido {E(order.OrderNumber)}</h1>
            <p class="status">{E(order.Status)}</p>{alert}
            <section><h2>{E(order.CustomerName)}</h2><p>{E(order.ShippingAddress)} · {E(order.City)}, Ecuador<br>{E(order.Notes)}</p>
            <ul>{items}</ul><strong>Total {E(order.Currency)} {order.Total:0.00}</strong></section>
            {picture}{dispatch}{finish}{contact}{stop}
            """);
    }

    private IActionResult Page(string title, string body)
    {
        Response.Headers["Referrer-Policy"] = "no-referrer";
        Response.Headers["X-Robots-Tag"] = "noindex, nofollow";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        var nonce = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16));
        Response.Headers["Content-Security-Policy"] = $"default-src 'none'; script-src 'nonce-{nonce}'; style-src 'unsafe-inline'; img-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";
        return Content($$"""
            <!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <title>{{E(title)}} · Perfumes El Padrino</title>
            <style>
            *{box-sizing:border-box}body{margin:0;background:#F7F4EF;color:#12100E;font:16px/1.55 system-ui,sans-serif}
            main{max-width:680px;margin:auto;padding:clamp(16px,5vw,36px)}h1,h2{font-family:Georgia,serif;overflow-wrap:anywhere}
            h1{line-height:1.12}h2{margin-top:0}.eyebrow{font-size:.78rem;color:#725619;letter-spacing:.12em}
            section,form,details{background:#fffdf7;border:1px solid #dfd3b8;border-radius:16px;padding:18px;margin:16px 0}
            label{display:grid;gap:5px;margin-bottom:12px}.check{display:flex;align-items:baseline;gap:10px}
            input:not([type=checkbox]),textarea{font:inherit;width:100%;padding:9px;border:1px solid #a69878;border-radius:8px}
            input[type=checkbox]{accent-color:#725619}button,.chat{font:inherit;font-weight:650;display:inline-block;padding:10px 15px;border:0;border-radius:9px;background:#211d14;color:white;cursor:pointer}
            .chat{background:#126247;text-decoration:none}.danger,.error{color:#8a201c;background:#fae9e4}.error{padding:10px}
            img{display:block;width:100%;max-height:420px;object-fit:contain}.status{display:inline-block;background:#e9d6a0;padding:4px 12px;border-radius:25px}summary{cursor:pointer}
            </style></head><body><main>{{body.Replace("<script>", $"<script nonce='{nonce}'>")}}</main></body></html>
            """, "text/html; charset=utf-8");
    }
}
