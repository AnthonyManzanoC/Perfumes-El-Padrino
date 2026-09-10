using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.EntityFrameworkCore;
using MimeKit;
using PerfumesElPadrino.Api.Data;
using PerfumesElPadrino.Api.Models;

namespace PerfumesElPadrino.Api.Services;

public sealed class EmailSender(SecretCipher cipher)
{
    public async Task SendAsync(CommerceSettings settings, EmailDelivery delivery, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(settings.SmtpPasswordEncrypted)) throw new InvalidOperationException("Configura la contraseña SMTP en Administración > Compras y correo.");
        var message = new MimeMessage();
        message.MessageId = $"{delivery.Id:N}@perfumes-el-padrino";
        message.From.Add(new MailboxAddress(settings.SenderName, settings.SenderEmail));
        message.To.Add(MailboxAddress.Parse(delivery.Recipient));
        message.Subject = delivery.Subject;
        var body = new BodyBuilder { HtmlBody = delivery.HtmlBody, TextBody = delivery.TextBody };
        if (delivery.Pdf is not null) body.Attachments.Add(delivery.AttachmentName ?? "Recibo.pdf", delivery.Pdf, ContentType.Parse("application/pdf"));
        message.Body = body.ToMessageBody();
        using var client = new SmtpClient { Timeout = 20000 };
        await client.ConnectAsync(settings.SmtpHost, settings.SmtpPort,
            settings.SmtpPort == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls, ct);
        await client.AuthenticateAsync(settings.SmtpUsername, cipher.Decrypt(settings.SmtpPasswordEncrypted), ct);
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
    }

    public static string SafeError(Exception error) => error switch
    {
        MailKit.Security.AuthenticationException => "Gmail rechazó el acceso. Revisa el usuario y la contraseña de aplicación.",
        SslHandshakeException => "No se pudo validar el certificado TLS del servidor SMTP. Revisa los certificados y el acceso a los servicios de revocación del alojamiento.",
        System.Security.Cryptography.CryptographicException => "La clave de cifrado del servidor no corresponde a la contraseña guardada.",
        InvalidOperationException => "Falta la configuración SMTP o la clave de cifrado del servidor.",
        SmtpCommandException => "El servidor de correo rechazó el envío. Revisa el destinatario y los límites de la cuenta.",
        _ => "No se pudo conectar o completar el envío. Revisa la conexión y los puertos SMTP del alojamiento."
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
                        await scope.ServiceProvider.GetRequiredService<EmailSender>().SendAsync(settings, delivery, timeout.Token);
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
