using System.Threading.RateLimiting;
using AuthService.Data;
using AuthService.Endpoints;
using AuthService.Mail;
using AuthService.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

if (args.Contains("--healthcheck"))
{
    try { using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(3) }; Environment.ExitCode = (await client.GetAsync("http://127.0.0.1:8080/health/ready")).IsSuccessStatusCode ? 0 : 1; }
    catch { Environment.ExitCode = 1; }
    return;
}

var builder = WebApplication.CreateBuilder(args);
var smtp = builder.Configuration.GetSection("Smtp").Get<SmtpSettings>() ?? new();
var checkSmtp = args.Contains("--check-smtp");
try { smtp.Validate(builder.Environment.IsDevelopment()); }
catch (InvalidOperationException ex) when (checkSmtp)
{
    Console.Error.WriteLine(ex.Message);
    Environment.ExitCode = 1;
    return;
}
if (checkSmtp)
{
    try
    {
        using var client = new MailKit.Net.Smtp.SmtpClient { Timeout = 15000 };
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        await smtp.ConnectAsync(client, timeout.Token);
        await client.DisconnectAsync(true, timeout.Token);
        Console.WriteLine("SMTP connection check succeeded. No email was sent.");
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"SMTP check failed ({ex.GetType().Name}). Check server, app password and network access.");
        Environment.ExitCode = 1;
    }
    return;
}
builder.Services.AddSingleton(smtp);
var options = builder.Configuration.GetSection("Auth").Get<AuthOptions>() ?? new();
if (!Uri.TryCreate(options.PublicOrigin, UriKind.Absolute, out var origin) || origin.Scheme is not ("http" or "https") || origin.AbsolutePath != "/" || !string.IsNullOrEmpty(origin.Query) || !string.IsNullOrEmpty(origin.Fragment) || !string.IsNullOrEmpty(origin.UserInfo))
    throw new InvalidOperationException("Auth:PublicOrigin must be a single HTTP(S) origin without a path.");
options.PublicOrigin = origin.GetLeftPart(UriPartial.Authority);
if (!builder.Environment.IsDevelopment() && origin.Scheme != "https") throw new InvalidOperationException("HTTPS PublicOrigin is required outside Development.");
if (options.AccessTokenMinutes is < 1 or > 30 || options.SessionDays is < 1 or > 90) throw new InvalidOperationException("Invalid token/session lifetimes.");
builder.Services.AddSingleton(options);
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<SigningKey>();
builder.Services.AddDataProtection().SetApplicationName("skill-day-auth").PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(options.KeyDirectory, "data-protection")));
var connection = builder.Configuration.GetConnectionString("AuthDb") ?? throw new InvalidOperationException("ConnectionStrings:AuthDb is required.");
var database = new Npgsql.NpgsqlConnectionStringBuilder(connection);
if (builder.Configuration["Database:Password"] is { Length: > 0 } databasePassword) database.Password = databasePassword;
builder.Services.AddDbContext<AuthDbContext>(o => o.UseNpgsql(database.ConnectionString, p => p.MigrationsHistoryTable("__EFMigrationsHistory", "auth")));
builder.Services.AddIdentityCore<AppUser>(o =>
{
    o.User.RequireUniqueEmail = true;
    o.Password.RequiredLength = 12;
    o.Password.RequireDigit = false;
    o.Password.RequireLowercase = false;
    o.Password.RequireUppercase = false;
    o.Password.RequireNonAlphanumeric = false;
    o.SignIn.RequireConfirmedEmail = true;
    o.Lockout.MaxFailedAccessAttempts = 5;
    o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
}).AddRoles<IdentityRole<Guid>>().AddEntityFrameworkStores<AuthDbContext>().AddSignInManager().AddDefaultTokenProviders();
builder.Services.Configure<DataProtectionTokenProviderOptions>(o => o.TokenLifespan = TimeSpan.FromHours(1));
builder.Services.Configure<PasswordHasherOptions>(o => o.IterationCount = 210000);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme).Configure<SigningKey>((o, key) =>
{
    o.MapInboundClaims = false;
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = options.Issuer,
        ValidateAudience = true,
        ValidAudience = options.Audience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = key.Key,
        ValidateLifetime = true,
        RequireExpirationTime = true,
        RequireSignedTokens = true,
        ClockSkew = TimeSpan.FromSeconds(15),
        ValidAlgorithms = [SecurityAlgorithms.RsaSha256],
        RoleClaimType = "role",
        NameClaimType = "sub"
    };
    o.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            if (!await context.HttpContext.RequestServices.GetRequiredService<SessionService>().ValidateAsync(context.Principal!)) context.Fail("Session revoked or expired.");
        }
    };
});
builder.Services.AddAuthorizationBuilder().AddPolicy("Admin", p => p.RequireRole("Admin"));
builder.Services.AddScoped<SessionService>();
builder.Services.AddScoped<MailOutbox>();
builder.Services.AddHostedService<MailWorker>();
builder.Services.AddHostedService<RetentionWorker>();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.OnRejected = async (context, cancellation) =>
    {
        context.HttpContext.Response.Headers.RetryAfter = "60";
        await Results.Problem(statusCode: 429, title: "Слишком много запросов. Повторите через минуту.", extensions: new Dictionary<string, object?> { ["code"] = "RateLimited" }).ExecuteAsync(context.HttpContext);
    };
    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(http => RateLimitPartition.GetFixedWindowLimiter(http.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = 200, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.AddPolicy("auth", http => RateLimitPartition.GetFixedWindowLimiter(http.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = 100, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.AddPolicy("mail", http => RateLimitPartition.GetFixedWindowLimiter(http.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});

var app = builder.Build();
app.UseExceptionHandler();
app.Use(async (http, next) =>
{
    if (http.Request.Path.StartsWithSegments("/auth"))
    {
        http.Response.Headers.CacheControl = "no-store";
        http.Response.Headers.Pragma = "no-cache";
        if (http.Request.Method is not ("GET" or "HEAD" or "OPTIONS"))
        {
            var requestOrigin = http.Request.Headers.Origin.ToString();
            var allowed = requestOrigin == options.PublicOrigin || options.AllowedOrigins.Contains(requestOrigin, StringComparer.Ordinal);
            var cookieEndpoint = http.Request.Path is var path && (path == "/auth/refresh" || path == "/auth/logout");
            if ((requestOrigin.Length > 0 && !allowed) || (cookieEndpoint && requestOrigin.Length == 0) || http.Request.Headers["Sec-Fetch-Site"] == "cross-site")
            {
                await Results.Problem(statusCode: 403, title: "Недопустимый источник запроса.", extensions: new Dictionary<string, object?> { ["code"] = "InvalidOrigin" }).ExecuteAsync(http);
                return;
            }
        }
    }
    await next();
});
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapGet("/health/live", () => Results.Ok(new { status = "ok" }));
app.MapGet("/health/ready", async (AuthDbContext db, CancellationToken ct) =>
{
    try { return await db.Database.CanConnectAsync(ct) ? Results.Ok(new { status = "ready" }) : Results.StatusCode(503); }
    catch { return Results.StatusCode(503); }
});
app.MapAuthEndpoints();
if (app.Environment.IsDevelopment()) app.MapOpenApi("/auth/openapi/{documentName}.json");

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    if (options.AutoMigrate || args.Contains("--migrate")) await db.Database.MigrateAsync();
    if (args.Contains("--migrate")) return;
    var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
    foreach (var name in new[] { "User", "Admin" }) if (!await roles.RoleExistsAsync(name))
    {
        var result = await roles.CreateAsync(new IdentityRole<Guid>(name));
        if (!result.Succeeded) throw new InvalidOperationException("Unable to initialise roles.");
    }
    var adminEmail = builder.Configuration["BootstrapAdmin:Email"];
    var adminPassword = builder.Configuration["BootstrapAdmin:Password"];
    if (!string.IsNullOrEmpty(adminEmail) || !string.IsNullOrEmpty(adminPassword))
    {
        if (string.IsNullOrEmpty(adminEmail) || adminPassword is not { Length: >= 12 and <= 128 }) throw new InvalidOperationException("BootstrapAdmin requires an email and a 12–128 character password.");
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var admin = await users.FindByEmailAsync(adminEmail);
        if (admin is null)
        {
            admin = new AppUser { UserName = Guid.NewGuid().ToString(), Email = adminEmail, EmailConfirmed = true };
            if (!(await users.CreateAsync(admin, adminPassword)).Succeeded) throw new InvalidOperationException("Unable to create bootstrap administrator.");
            await users.AddToRoleAsync(admin, "User");
        }
        if (!await users.IsInRoleAsync(admin, "Admin") && !(await users.AddToRoleAsync(admin, "Admin")).Succeeded) throw new InvalidOperationException("Unable to assign administrator role.");
    }
}
await app.RunAsync();

public partial class Program;
