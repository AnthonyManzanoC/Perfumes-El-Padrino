using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PerfumesElPadrino.Api.Contracts;
using PerfumesElPadrino.Api.Data;
using PerfumesElPadrino.Api.Models;
using PerfumesElPadrino.Api.Services;

namespace PerfumesElPadrino.Api.Controllers;

[ApiController, Route("api/admin/commerce")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class CommerceAdminController(StoreDbContext db, SecretCipher cipher, PerfumesElPadrino.Api.Application.IEmailSender sender) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var s = await db.CommerceSettings.AsNoTracking().SingleAsync(x => x.Id == 1, ct);
        return Ok(new { s.CheckoutEnabled, s.BankName, s.AccountType, s.AccountNumber, s.AccountHolder, s.Identification, s.PaymentInstructions,
            hasApiKey = !string.IsNullOrEmpty(s.BrevoApiKeyEncrypted), s.SenderEmail, s.SenderName, s.AdminEmail, s.StoreUrl, s.EmailFooter });
    }

    [HttpPut]
    public async Task<IActionResult> Save(CommerceSettingsRequest request, CancellationToken ct)
    {
        if (request.CheckoutEnabled && new[] { request.BankName, request.AccountType, request.AccountNumber, request.AccountHolder, request.Identification }.Any(string.IsNullOrWhiteSpace))
            return BadRequest(new { message = "Completa todos los datos bancarios antes de activar las compras." });
        if (!Uri.TryCreate(request.StoreUrl, UriKind.Absolute, out var uri) || uri.Scheme != "https" && !uri.IsLoopback)
            return BadRequest(new { message = "La URL de la tienda debe usar HTTPS." });
        var s = await db.CommerceSettings.SingleAsync(x => x.Id == 1, ct);
        s.CheckoutEnabled = request.CheckoutEnabled; s.BankName = request.BankName.Trim(); s.AccountType = request.AccountType.Trim();
        s.AccountNumber = request.AccountNumber.Trim(); s.AccountHolder = request.AccountHolder.Trim(); s.Identification = request.Identification.Trim(); s.PaymentInstructions = request.PaymentInstructions.Trim();
        s.SenderEmail = request.SenderEmail.Trim(); s.SenderName = request.SenderName.Trim(); s.AdminEmail = request.AdminEmail.Trim();
        s.StoreUrl = request.StoreUrl.TrimEnd('/'); s.EmailFooter = request.EmailFooter.Trim();
        if (!string.IsNullOrWhiteSpace(request.BrevoApiKey))
        {
            try { s.BrevoApiKeyEncrypted = cipher.Encrypt(request.BrevoApiKey.Trim()); }
            catch (Exception) { return BadRequest(new { message = "Configura Commerce:EncryptionKey en el servidor antes de guardar la clave API." }); }
        }
        if (s.CheckoutEnabled && string.IsNullOrEmpty(s.BrevoApiKeyEncrypted)) return BadRequest(new { message = "Configura primero la clave API de Brevo para las notificaciones." });
        await db.SaveChangesAsync(ct);
        return await Get(ct);
    }

    [HttpPost("test-email")]
    public async Task<IActionResult> Test(CancellationToken ct)
    {
        var s = await db.CommerceSettings.AsNoTracking().SingleAsync(x => x.Id == 1, ct);
        var mail = new EmailDelivery { Recipient = s.AdminEmail, Subject = "Prueba de correo | Perfumes El Padrino", TextBody = "La configuración de correo de tu tienda funciona correctamente.", HtmlBody = "<h1>Correo conectado</h1><p>La configuración de correo de Perfumes El Padrino funciona correctamente.</p>" };
        try { await sender.SendAsync(s, mail, ct); mail.SentAt = DateTimeOffset.UtcNow; }
        catch (Exception ex) { mail.LastError = EmailSender.SafeError(ex); mail.NextAttemptAt = DateTimeOffset.UtcNow.AddHours(1); }
        mail.Attempts = 1; db.EmailDeliveries.Add(mail); await db.SaveChangesAsync(ct);
        return mail.SentAt is not null ? Ok(new { message = "Correo de prueba enviado al administrador." }) : BadRequest(new { message = mail.LastError });
    }

    [HttpGet("emails")]
    public async Task<IActionResult> Emails(CancellationToken ct) => Ok(await db.EmailDeliveries.AsNoTracking().OrderByDescending(x => x.CreatedAt).Take(200)
        .Select(x => new { x.Id, x.OrderId, x.Recipient, x.Subject, x.Attempts, x.LastError, x.CreatedAt, x.NextAttemptAt, x.SentAt }).ToListAsync(ct));

    [HttpPost("emails/{id:guid}/retry")]
    public async Task<IActionResult> Retry(Guid id, CancellationToken ct)
    {
        await db.EmailDeliveries.Where(x => x.Id == id && x.SentAt == null).ExecuteUpdateAsync(x => x.SetProperty(m => m.NextAttemptAt, DateTimeOffset.UtcNow), ct);
        return Ok(new { message = "Se reintentará el envío en unos segundos." });
    }

    [HttpGet("orders/{id:guid}/proofs")]
    public async Task<IActionResult> Proofs(Guid id, CancellationToken ct) => Ok(await db.PaymentProofs.Where(x => x.OrderId == id).OrderByDescending(x => x.CreatedAt).Select(x => new { x.Id, x.CreatedAt }).ToListAsync(ct));

    [HttpGet("proofs/{id:guid}")]
    public async Task<IActionResult> Proof(Guid id, CancellationToken ct)
    {
        var proof = await db.PaymentProofs.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return proof is null ? NotFound() : File(proof.Content, proof.ContentType);
    }

    [HttpGet("orders/{id:guid}/history")]
    public async Task<IActionResult> History(Guid id, CancellationToken ct) => Ok(await db.OrderEvents.Where(x => x.OrderId == id).OrderByDescending(x => x.CreatedAt).Select(x => new { x.Status, x.Message, x.CreatedAt }).ToListAsync(ct));

    [HttpGet("orders/{id:guid}/receipt")]
    public async Task<IActionResult> Receipt(Guid id, CancellationToken ct)
    {
        var order = await db.Orders.Include(x => x.Items).SingleOrDefaultAsync(x => x.Id == id, ct);
        if (order is null) return NotFound();
        var brand = await db.SiteSettings.SingleAsync(x => x.Id == 1, ct);
        return File(ReceiptPdf.Create(order, brand.StoreName), "application/pdf", $"{order.OrderNumber}.pdf");
    }
}
