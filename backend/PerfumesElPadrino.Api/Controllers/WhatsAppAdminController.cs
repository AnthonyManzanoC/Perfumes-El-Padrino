using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PerfumesElPadrino.Api.Data;
using PerfumesElPadrino.Api.Services;

namespace PerfumesElPadrino.Api.Controllers;

[ApiController, Route("api/admin/commerce/whatsapp")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class WhatsAppAdminController(StoreDbContext db, GreenApiWhatsApp gateway, QuickOrderLinks links) : ControllerBase
{
    public sealed record Settings(bool Enabled, [StringLength(40)] string? Primary, [StringLength(40)] string? Secondary);

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var settings = await db.CommerceSettings.AsNoTracking().SingleAsync(x => x.Id == 1, ct);
        return Ok(new
        {
            Enabled = gateway.Enabled(settings), Primary = gateway.Primary(settings), Secondary = settings.WhatsAppSecondary ?? "",
            gateway.Configured,
            QuickLinksReady = links.Create("configuration-check") is not null,
            BackupConfigured = true,
            Activity = await db.OrderDispatchJobs.AsNoTracking().OrderByDescending(x => x.CreatedAt).Take(12)
                .Select(x => new { x.Id, x.Recipient, x.CreatedAt, x.FinishedAt, x.Result }).ToListAsync(ct)
        });
    }

    [HttpPut]
    public async Task<IActionResult> Save(Settings input, CancellationToken ct)
    {
        var primary = GreenApiWhatsApp.NormalizePhone(input.Primary);
        var secondary = GreenApiWhatsApp.NormalizePhone(input.Secondary);
        if ((input.Enabled || !string.IsNullOrWhiteSpace(input.Primary)) && !gateway.Permitted(primary))
            return BadRequest(new { message = "Ingresa el número principal habilitado para este entorno." });
        if (!string.IsNullOrWhiteSpace(input.Secondary) && (!gateway.Permitted(secondary) || primary == secondary))
            return BadRequest(new { message = "El número secundario debe estar habilitado y ser distinto al principal." });

        var settings = await db.CommerceSettings.SingleAsync(x => x.Id == 1, ct);
        settings.WhatsAppEnabled = input.Enabled;
        settings.WhatsAppPrimary = primary;
        settings.WhatsAppSecondary = secondary == "" ? null : secondary;
        await db.SaveChangesAsync(ct);
        return await Get(ct);
    }

    [HttpPost("test")]
    public async Task<IActionResult> Test(CancellationToken ct)
    {
        var settings = await db.CommerceSettings.AsNoTracking().SingleAsync(x => x.Id == 1, ct);
        var result = await gateway.SendAsync(gateway.Primary(settings),
            "Perfumes El Padrino · Mensaje de prueba. Tu número está configurado para recibir avisos de pedidos.", ct);
        return result.Accepted ? Ok(new { message = result.Message }) : BadRequest(new { message = result.Message });
    }
}
