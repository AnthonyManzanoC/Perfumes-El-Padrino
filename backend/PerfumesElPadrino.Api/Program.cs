using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using PerfumesElPadrino.Api.Data;
using PerfumesElPadrino.Api.Security;
using PerfumesElPadrino.Api.Services;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Postgres");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("Configure ConnectionStrings:Postgres using environment variables or .NET user secrets.");

builder.Services.AddDbContext<StoreDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql =>
    {
        npgsql.EnableRetryOnFailure(3);
        // Supabase Pooler is most reliable when each data-changing statement
        // receives its own affected-row result instead of a multiplexed batch.
        npgsql.MaxBatchSize(1);
    }));

builder.Services.AddControllers();
builder.Services.AddSingleton<SecretCipher>();
builder.Services.AddScoped<OrderWorkflow>();
builder.Services.AddScoped<EmailSender>();
if (!builder.Configuration.GetValue<bool>("Commerce:DisableWorker")) builder.Services.AddHostedService<EmailWorker>();
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
builder.Services.AddResponseCompression();
builder.Services.AddProblemDetails();
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("checkout", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions
        { PermitLimit = 120, Window = TimeSpan.FromMinutes(1), QueueLimit = 0, AutoReplenishment = true }));
    options.AddPolicy("create-order", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions
        { PermitLimit = 8, Window = TimeSpan.FromMinutes(1), QueueLimit = 0, AutoReplenishment = true }));
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("login", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 7,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        }));
});

var allowedOrigins = builder.Configuration.GetSection("CorsOrigins").Get<string[]>() ??
    ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"];
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});
app.UseExceptionHandler();
app.UseResponseCompression();
app.UseCors();
app.UseRateLimiter();
app.UseMiddleware<AdminSessionMiddleware>();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "Perfumes El Padrino API" }));

await DbInitializer.InitializeAsync(app.Services, app.Configuration);
var importIndex = Array.IndexOf(args, "--import-catalog");
if (importIndex >= 0)
{
    if (importIndex + 1 >= args.Length) throw new ArgumentException("Specify the catalog JSON file.");
    await CatalogImporter.ImportAsync(app.Services, args[importIndex + 1]);
    return;
}
await app.RunAsync();

public partial class Program { }
