namespace PerfumesElPadrino.Api.Models;

public sealed class OrderDispatchJob
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EventId { get; set; }
    public Guid OrderId { get; set; }
    public Guid? ProofId { get; set; }
    public string? Recipient { get; set; }
    public string? BackupSnapshot { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset NextAttemptAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? FinishedAt { get; set; }
    public int Attempts { get; set; }
    public string? Result { get; set; }
}
