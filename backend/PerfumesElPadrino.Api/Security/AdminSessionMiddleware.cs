using Microsoft.EntityFrameworkCore;
using PerfumesElPadrino.Api.Data;

namespace PerfumesElPadrino.Api.Security;

public sealed class AdminSessionMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, StoreDbContext db)
    {
        var path = context.Request.Path;
        var isProtectedAdminRoute = path.StartsWithSegments("/api/admin") && !path.StartsWithSegments("/api/admin/login");

        if (isProtectedAdminRoute)
        {
            var authorization = context.Request.Headers.Authorization.ToString();
            var token = authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                ? authorization[7..].Trim()
                : string.Empty;

            if (string.IsNullOrWhiteSpace(token))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { message = "Sesión administrativa requerida." });
                return;
            }

            var tokenHash = PasswordSecurity.HashToken(token);
            var session = await db.AdminSessions
                .AsNoTracking()
                .Include(x => x.AdminUser)
                .FirstOrDefaultAsync(x => x.TokenHash == tokenHash && x.ExpiresAt > DateTimeOffset.UtcNow && x.AdminUser.IsActive);

            if (session is null)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { message = "La sesión venció o no es válida." });
                return;
            }

            context.Items["AdminUserId"] = session.AdminUserId;
            context.Items["AdminSessionId"] = session.Id;
        }

        await next(context);
    }
}
