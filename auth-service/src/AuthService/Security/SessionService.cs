using System.Security.Claims;
using System.Security.Cryptography;
using AuthService.Contracts;
using AuthService.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace AuthService.Security;

public sealed class SessionService(AuthDbContext db, UserManager<AppUser> users, SigningKey key, AuthOptions options, TimeProvider clock)
{
    public const string CookieName = "skill-day.refresh";
    public DateTimeOffset Now => clock.GetUtcNow();
    public static string Hash(string token) => Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)));
    public static bool ValidRefresh(string? token) => token is { Length: 43 } && token.All(c => char.IsAsciiLetterOrDigit(c) || c is '-' or '_');

    public async Task<TokenResponse> LoginAsync(AppUser user, HttpContext http)
    {
        var session = new AuthSession { UserId = user.Id, SecurityStamp = user.SecurityStamp!, CreatedAt = Now, ExpiresAt = Now.AddDays(options.SessionDays) };
        db.Sessions.Add(session);
        var token = AddRefresh(session.Id);
        await db.SaveChangesAsync();
        SetCookie(http, token, session.ExpiresAt);
        return await IssueAsync(user, session);
    }

    public async Task<TokenResponse?> RefreshAsync(HttpContext http)
    {
        if (!http.Request.Cookies.TryGetValue(CookieName, out var value) || !ValidRefresh(value)) return null;
        var hash = Hash(value);
        await using var transaction = await db.Database.BeginTransactionAsync();
        // Row lock serialises token rotation. A replay revokes the entire session family.
        var refresh = await db.RefreshTokens.FromSqlInterpolated($"SELECT * FROM auth.\"RefreshTokens\" WHERE \"Hash\" = {hash} FOR UPDATE").SingleOrDefaultAsync();
        if (refresh is null) return null;
        var session = await db.Sessions.Include(x => x.User).SingleAsync(x => x.Id == refresh.SessionId);
        if (refresh.UsedAt is not null || session.RevokedAt is not null || session.ExpiresAt <= Now || !session.User.EmailConfirmed || session.SecurityStamp != session.User.SecurityStamp)
        {
            session.RevokedAt ??= Now;
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
            return null;
        }
        refresh.UsedAt = Now;
        var token = AddRefresh(session.Id);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        SetCookie(http, token, session.ExpiresAt);
        return await IssueAsync(session.User, session);
    }

    public async Task LogoutAsync(HttpContext http)
    {
        if (http.Request.Cookies.TryGetValue(CookieName, out var token) && ValidRefresh(token))
        {
            var hash = Hash(token);
            var id = await db.RefreshTokens.Where(x => x.Hash == hash).Select(x => (Guid?)x.SessionId).SingleOrDefaultAsync();
            if (id.HasValue) await db.Sessions.Where(x => x.Id == id && x.RevokedAt == null).ExecuteUpdateAsync(s => s.SetProperty(x => x.RevokedAt, Now));
        }
        ClearCookie(http);
    }

    public Task<int> RevokeAllAsync(Guid userId) => db.Sessions.Where(x => x.UserId == userId && x.RevokedAt == null).ExecuteUpdateAsync(s => s.SetProperty(x => x.RevokedAt, Now));

    public async Task<bool> ValidateAsync(ClaimsPrincipal principal)
    {
        if (!Guid.TryParse(principal.FindFirstValue("sub"), out var userId) || !Guid.TryParse(principal.FindFirstValue("sid"), out var sessionId)) return false;
        return await db.Sessions.AsNoTracking().AnyAsync(x => x.Id == sessionId && x.UserId == userId && x.RevokedAt == null && x.ExpiresAt > Now && x.SecurityStamp == x.User.SecurityStamp && x.User.EmailConfirmed);
    }

    public async Task<UserResponse> UserAsync(AppUser user) => new(user.Id, user.Email!, user.EmailConfirmed, await users.GetRolesAsync(user));
    private async Task<TokenResponse> IssueAsync(AppUser user, AuthSession session)
    {
        var roles = await users.GetRolesAsync(user);
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = options.Issuer,
            Audience = options.Audience,
            IssuedAt = Now.UtcDateTime,
            NotBefore = Now.UtcDateTime,
            Expires = Now.AddMinutes(options.AccessTokenMinutes).UtcDateTime,
            SigningCredentials = new SigningCredentials(key.Key, SecurityAlgorithms.RsaSha256),
            Claims = new Dictionary<string, object> { ["sub"] = user.Id.ToString(), ["sid"] = session.Id.ToString(), ["jti"] = Guid.NewGuid().ToString(), ["role"] = roles.ToArray() }
        };
        return new(new JsonWebTokenHandler().CreateToken(descriptor), "Bearer", options.AccessTokenMinutes * 60, new(user.Id, user.Email!, user.EmailConfirmed, roles));
    }
    private string AddRefresh(Guid sessionId)
    {
        var token = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
        db.RefreshTokens.Add(new RefreshToken { Hash = Hash(token), SessionId = sessionId, CreatedAt = Now });
        return token;
    }
    private static CookieOptions Cookie(HttpContext http) => new() { HttpOnly = true, Secure = !http.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment() || http.Request.IsHttps, SameSite = SameSiteMode.Strict, Path = "/", IsEssential = true };
    private static void SetCookie(HttpContext http, string value, DateTimeOffset expires)
    {
        var cookie = Cookie(http); cookie.Expires = expires;
        http.Response.Cookies.Append(CookieName, value, cookie);
    }
    public static void ClearCookie(HttpContext http) => http.Response.Cookies.Delete(CookieName, Cookie(http));
}
