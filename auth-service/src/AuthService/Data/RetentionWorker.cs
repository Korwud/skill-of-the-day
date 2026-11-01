using Microsoft.EntityFrameworkCore;

namespace AuthService.Data;

public sealed class RetentionWorker(IServiceScopeFactory scopes, ILogger<RetentionWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
                var now = DateTimeOffset.UtcNow;
                await db.Sessions.Where(x => x.ExpiresAt < now.AddDays(-1)).ExecuteDeleteAsync(stoppingToken);
                await db.OutgoingMails.Where(x => x.CreatedAt < now.AddDays(-2)).ExecuteDeleteAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException) { logger.LogWarning("Auth retention unavailable ({Type})", ex.GetType().Name); }
            try { await Task.Delay(TimeSpan.FromHours(6), stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
        }
    }
}
