using System.Text.Json;
using AuthService.Data;
using AuthService.Security;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MimeKit;

namespace AuthService.Mail;

public sealed record MailMessage(string To, string Subject, string Text);

public sealed class MailOutbox(AuthDbContext db, IDataProtectionProvider protection, AuthOptions options)
{
    private readonly IDataProtector protector = protection.CreateProtector("skill-day.auth.mail.v1");
    public void Add(AppUser user, string subject, string route, Dictionary<string, string> parameters, string? recipient = null)
    {
        var query = string.Join("&", parameters.Select(p => $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value)}"));
        var link = $"{options.PublicOrigin}/#/{route}?{query}";
        var text = $"{subject}\n\nОткройте ссылку и выполните действие:\n{link}\n\nСсылка действует один час. Если вы не запрашивали это действие, проигнорируйте письмо.";
        db.OutgoingMails.Add(new OutgoingMail { UserId = user.Id, Payload = protector.Protect(JsonSerializer.Serialize(new MailMessage(recipient ?? user.Email!, subject, text))) });
    }
    public static string Encode(string code) => Base64UrlEncoder.Encode(System.Text.Encoding.UTF8.GetBytes(code));
    public static string? Decode(string? code)
    {
        if (code is null || code.Length > 8192) return null;
        try { return System.Text.Encoding.UTF8.GetString(Base64UrlEncoder.DecodeBytes(code)); } catch (FormatException) { return null; }
    }
}

public sealed class MailWorker(IServiceScopeFactory scopes, IDataProtectionProvider protection, SmtpSettings smtp, ILogger<MailWorker> logger) : BackgroundService
{
    private readonly IDataProtector protector = protection.CreateProtector("skill-day.auth.mail.v1");
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
                await using var transaction = await db.Database.BeginTransactionAsync(stoppingToken);
                // Multiple workers may run safely; only one claims each pending message.
                var messages = await db.OutgoingMails.FromSqlRaw("SELECT * FROM auth.\"OutgoingMails\" WHERE \"SentAt\" IS NULL AND \"Attempts\" < 8 AND \"NextAttemptAt\" <= now() ORDER BY \"CreatedAt\" LIMIT 10 FOR UPDATE SKIP LOCKED").ToListAsync(stoppingToken);
                foreach (var item in messages)
                {
                    item.Attempts++;
                    try
                    {
                        var payload = JsonSerializer.Deserialize<MailMessage>(protector.Unprotect(item.Payload))!;
                        var message = new MimeMessage();
                        message.From.Add(new MailboxAddress(smtp.Name, smtp.From));
                        message.To.Add(MailboxAddress.Parse(payload.To));
                        message.Subject = payload.Subject;
                        message.Body = new TextPart("plain") { Text = payload.Text };
                        using var client = new MailKit.Net.Smtp.SmtpClient { Timeout = 10000 };
                        await smtp.ConnectAsync(client, stoppingToken);
                        await client.SendAsync(message, stoppingToken);
                        await client.DisconnectAsync(true, stoppingToken);
                        item.SentAt = DateTimeOffset.UtcNow;
                        item.Payload = ""; // Do not retain delivered action tokens in the database.
                    }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        item.NextAttemptAt = DateTimeOffset.UtcNow.AddSeconds(Math.Min(900, Math.Pow(2, item.Attempts) * 5));
                        // Never log exception messages: SMTP errors may contain addresses or tokens.
                        logger.LogWarning("Mail {Id} delivery failed ({Type}), attempt {Attempt}", item.Id, ex.GetType().Name, item.Attempts);
                    }
                }
                await db.SaveChangesAsync(stoppingToken);
                await transaction.CommitAsync(stoppingToken);
                await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                logger.LogWarning("Mail outbox unavailable ({Type})", ex.GetType().Name);
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }
}
