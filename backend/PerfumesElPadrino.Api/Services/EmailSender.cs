using Microsoft.EntityFrameworkCore;
using PerfumesElPadrino.Api.Data;
namespace PerfumesElPadrino.Api.Services;

public static class EmailSender
{
    public static string SafeError(Exception error) => error switch
    {
        PerfumesElPadrino.Api.Infrastructure.BrevoEmailException => error.Message,
        System.Security.Cryptography.CryptographicException => "La clave de cifrado del servidor no corresponde a la clave API guardada.",
        InvalidOperationException or FormatException => "Configura la clave API de Brevo y Commerce:EncryptionKey en el servidor.",
        OperationCanceledException => "Brevo no respondió a tiempo. El envío queda pendiente de reintento.",
        _ => "No se pudo conectar con Brevo por HTTPS. El envío queda pendiente de reintento."
    };
}

public sealed class EmailWorker(IServiceScopeFactory scopes, ILogger<EmailWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<StoreDbContext>();
                var now = DateTimeOffset.UtcNow;
                var expired = await db.Orders.Where(x => (x.Status == "Pendiente de pago" || x.Status == "Pago rechazado") && x.ExpiresAt < now).Select(x => x.Id).Take(20).ToListAsync(stoppingToken);
                foreach (var id in expired)
                {
                    try { await scope.ServiceProvider.GetRequiredService<OrderWorkflow>().ChangeStatusAsync(id, new() { Status = "Cancelado", Message = "Venció el plazo de 24 horas para enviar el comprobante. Puedes crear un nuevo pedido." }, stoppingToken, expiredOnly: true); }
                    catch (InvalidOperationException) { /* A concurrent proof or admin transition already handled it. */ }
                }
                db.ChangeTracker.Clear();
                var candidates = await db.EmailDeliveries.AsNoTracking().Where(x => x.SentAt == null && x.NextAttemptAt <= now && (x.LockedUntil == null || x.LockedUntil < now)
                    && (x.OrderId == null || !db.EmailDeliveries.Any(earlier => earlier.OrderId == x.OrderId && earlier.Recipient == x.Recipient && earlier.CreatedAt < x.CreatedAt && earlier.SentAt == null)))
                    .OrderBy(x => x.CreatedAt).Select(x => x.Id).Take(10).ToListAsync(stoppingToken);
                foreach (var id in candidates)
                {
                    now = DateTimeOffset.UtcNow;
                    var claimed = await db.EmailDeliveries.Where(x => x.Id == id && x.SentAt == null && (x.LockedUntil == null || x.LockedUntil < now))
                        .ExecuteUpdateAsync(s => s.SetProperty(x => x.LockedUntil, now.AddMinutes(3)), stoppingToken);
                    if (claimed == 0) continue;
                    var delivery = await db.EmailDeliveries.SingleAsync(x => x.Id == id, stoppingToken);
                    var settings = await db.CommerceSettings.AsNoTracking().SingleAsync(x => x.Id == 1, stoppingToken);
                    delivery.Attempts++;
                    try
                    {
                        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
                        timeout.CancelAfter(TimeSpan.FromSeconds(45));
                        await scope.ServiceProvider.GetRequiredService<PerfumesElPadrino.Api.Application.IEmailSender>().SendAsync(settings, delivery, timeout.Token);
                        delivery.SentAt = DateTimeOffset.UtcNow;
                        delivery.LastError = null;
                    }
                    catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
                    {
                        delivery.LastError = EmailSender.SafeError(ex);
                        delivery.NextAttemptAt = DateTimeOffset.UtcNow.AddMinutes(Math.Min(360, Math.Pow(2, Math.Min(9, delivery.Attempts))));
                        logger.LogWarning("Email {DeliveryId} pending retry: {Reason}", id, delivery.LastError);
                    }
                    delivery.LockedUntil = null;
                    await db.SaveChangesAsync(stoppingToken);
                    db.ChangeTracker.Clear();
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception) { logger.LogWarning("Email queue temporarily unavailable; will retry."); }
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
        }
    }
}
