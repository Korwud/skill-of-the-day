namespace AuthService.Security;

public sealed class AuthOptions
{
    public string Issuer { get; set; } = "skill-day-auth";
    public string Audience { get; set; } = "skill-day-api";
    public int AccessTokenMinutes { get; set; } = 10;
    public int SessionDays { get; set; } = 30;
    public string PublicOrigin { get; set; } = "http://127.0.0.1:8080";
    public string KeyDirectory { get; set; } = "/var/lib/skill-day-auth";
    public bool AutoMigrate { get; set; }
    public string[] AllowedOrigins { get; set; } = [];
}
