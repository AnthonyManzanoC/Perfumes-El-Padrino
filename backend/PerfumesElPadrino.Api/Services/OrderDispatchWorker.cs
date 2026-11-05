using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PerfumesElPadrino.Api.Data;
using PerfumesElPadrino.Api.Models;

namespace PerfumesElPadrino.Api.Services;

public sealed class OrderDispatchWorker(IServiceScopeFactory scopes, IConfiguration config, ILogger<OrderDispatchWorker> logger) : BackgroundService
{
    private static string BackupDirectory(IConfiguration config)
    {
        var path = config["ORDER_BACKUP_DIR"];
        return !string.IsNullOrWhiteSpace(path) && Path.IsPathFullyQualified(path)
            ? path : Path.Combine(Path.GetTempPath(), "order-backups");
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(5));
        do
        {
            try { await DispatchAsync(ct); }
            catch (Exception) when (!ct.IsCancellationRequested)
            {
                logger.LogWarning("La cola de avisos y respaldos se volverá a consultar.");
            }
        } while (await timer.WaitForNextTickAsync(ct));
    }

    private async Task DispatchAsync(CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<StoreDbContext>();
        var now = DateTimeOffset.UtcNow;
        var ids = await db.OrderDispatchJobs.AsNoTracking().Where(x => x.FinishedAt == null && x.NextAttemptAt <= now)
            .OrderBy(x => x.CreatedAt).Select(x => x.Id).Take(12).ToListAsync(ct);

        foreach (var id in ids)
        {
            // Claim before processing. A WhatsApp request may have reached the provider even if its reply was lost.
            var claimed = await db.OrderDispatchJobs.Where(x => x.Id == id && x.FinishedAt == null && x.NextAttemptAt <= now)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.NextAttemptAt, DateTimeOffset.UtcNow.AddMinutes(2))
                    .SetProperty(x => x.Attempts, x => x.Attempts + 1), ct);
            if (claimed == 0) continue;
            var job = await db.OrderDispatchJobs.SingleAsync(x => x.Id == id, ct);
            try
            {
                if (job.Recipient is null)
                {
                    job.Result = await BackupAsync(job, scope.ServiceProvider.GetRequiredService<SecretCipher>(), db, ct);
                    job.FinishedAt = DateTimeOffset.UtcNow;
                }
                else
                {
                    var result = await NotifyAsync(job, scope.ServiceProvider, db, ct);
                    job.Result = result.Message;
                    if (result.Retry && job.Attempts < 6)
                        job.NextAttemptAt = DateTimeOffset.UtcNow.AddMinutes(Math.Pow(2, job.Attempts - 1));
                    else
                        job.FinishedAt = DateTimeOffset.UtcNow;
                }
            }
            catch (Exception) when (!ct.IsCancellationRequested)
            {
                if (job.Recipient is null)
                {
                    job.Result = "Pedido conservado en PostgreSQL. Cifrado pendiente: verifica la clave del servidor.";
                    job.NextAttemptAt = DateTimeOffset.UtcNow.AddMinutes(Math.Min(60, 2 * job.Attempts));
                }
                else
                {
                    job.Result = "No se pudo confirmar el aviso de WhatsApp.";
                    job.FinishedAt = DateTimeOffset.UtcNow;
                }
                logger.LogWarning("No se pudo completar la tarea {JobId}.", id);
            }
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }
    }

    private static async Task<(string Message, bool Retry)> NotifyAsync(
        OrderDispatchJob job, IServiceProvider services, StoreDbContext db, CancellationToken ct)
    {
        var gateway = services.GetRequiredService<GreenApiWhatsApp>();
        var settings = await db.CommerceSettings.AsNoTracking().SingleAsync(x => x.Id == 1, ct);
        if (!gateway.Enabled(settings) || !gateway.Recipients(settings).Contains(job.Recipient!))
            return ("Omitido por configuración de destinatarios.", false);

        var order = await db.Orders.AsNoTracking().Include(x => x.Items).SingleAsync(x => x.Id == job.OrderId, ct);
        var evt = await db.OrderEvents.AsNoTracking().SingleAsync(x => x.Id == job.EventId, ct);
        var link = services.GetRequiredService<QuickOrderLinks>().Create(order.OrderNumber, settings.StoreUrl);
        if (job.ProofId is Guid id)
        {
            var proof = await db.PaymentProofs.AsNoTracking().SingleOrDefaultAsync(p => p.Id == id && p.OrderId == order.Id, ct);
            if (proof is null) return ("No se encontró el comprobante asociado al aviso.", false);
            var attachment = await gateway.SendProofAsync(job.Recipient!, order.OrderNumber, proof,
                GreenApiWhatsApp.ProofCaption(order, link), ct);
            return (attachment.Message, attachment.Retry);
        }

        var result = await gateway.SendAsync(job.Recipient!, GreenApiWhatsApp.FormatOrder(order, evt, link), ct);
        return (result.Message, result.Retry);
    }

    private async Task<string> BackupAsync(OrderDispatchJob job, SecretCipher cipher, StoreDbContext db, CancellationToken ct)
    {
        var proof = job.ProofId is Guid id
            ? await db.PaymentProofs.AsNoTracking().SingleAsync(x => x.Id == id && x.OrderId == job.OrderId, ct)
            : null;

        using var snapshot = JsonDocument.Parse(job.BackupSnapshot!);
        var json = JsonSerializer.Serialize(new { Version = 1, Snapshot = snapshot.RootElement, Proof = proof });
        var encrypted = cipher.Encrypt(json);
        var directory = BackupDirectory(config);
        var target = Path.Combine(directory, $"{job.EventId:N}.json.enc");
        var temporary = target + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            Directory.CreateDirectory(directory);
            try
            {
                await File.WriteAllTextAsync(temporary, encrypted, ct);
                File.Move(temporary, target, overwrite: true);
            }
            finally { File.Delete(temporary); }
            job.BackupSnapshot = encrypted;
            return "Respaldo cifrado guardado.";
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            job.BackupSnapshot = encrypted;
            return "Respaldo cifrado en PostgreSQL. Copia temporal no disponible.";
        }
    }
}
