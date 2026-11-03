using System.ComponentModel.DataAnnotations;
using MailKit.Security;

namespace AuthService.Mail;

public sealed class SmtpSettings
{
    public string Host { get; set; } = "mailpit";
    public int Port { get; set; } = 1025;
    public SecureSocketOptions Security { get; set; } = SecureSocketOptions.None;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string From { get; set; } = "no-reply@skill-day.test";
    public string Name { get; set; } = "Навык дня";

    public void Validate(bool development)
    {
        if (string.IsNullOrWhiteSpace(Host) || Uri.CheckHostName(Host) == UriHostNameType.Unknown)
            throw new InvalidOperationException("Smtp:Host must be a valid SMTP hostname or IP address.");
        if (Port is < 1 or > 65535)
            throw new InvalidOperationException("Smtp:Port must be between 1 and 65535.");
        if (string.IsNullOrWhiteSpace(From) || From.Contains('\r') || From.Contains('\n') || !new EmailAddressAttribute().IsValid(From))
            throw new InvalidOperationException("Set SMTP_FROM to the sender email address.");
        var local = Host.Equals("mailpit", StringComparison.OrdinalIgnoreCase) || Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || Host is "127.0.0.1" or "::1";
        if (development && local) return;
        if (Security is not (SecureSocketOptions.StartTls or SecureSocketOptions.SslOnConnect))
            throw new InvalidOperationException("External SMTP requires SMTP_SECURITY=StartTls or SslOnConnect.");
        if (string.IsNullOrWhiteSpace(Username) || string.IsNullOrWhiteSpace(Password))
            throw new InvalidOperationException("Set SMTP_USERNAME and SMTP_PASSWORD to the SMTP account and app password.");
        if (From.EndsWith(".test", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("SMTP_FROM must be a real sender address for external SMTP.");
    }

    public async Task ConnectAsync(MailKit.Net.Smtp.SmtpClient client, CancellationToken cancellationToken)
    {
        await client.ConnectAsync(Host, Port, Security, cancellationToken);
        if (!string.IsNullOrEmpty(Username)) await client.AuthenticateAsync(Username, Password, cancellationToken);
    }
}
