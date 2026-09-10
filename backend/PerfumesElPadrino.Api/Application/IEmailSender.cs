using PerfumesElPadrino.Api.Models;

namespace PerfumesElPadrino.Api.Application;

public interface IEmailSender
{
    Task SendAsync(CommerceSettings settings, EmailDelivery delivery, CancellationToken ct);
}
