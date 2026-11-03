using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using AuthService.Contracts;
using AuthService.Data;
using AuthService.Mail;
using AuthService.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/auth").WithTags("Authentication").RequireRateLimiting("auth");
        group.MapPost("/register", Register);
        group.MapPost("/login", Login);
        group.MapPost("/refresh", Refresh);
        group.MapPost("/logout", Logout);
        group.MapGet("/me", async (ClaimsPrincipal principal, UserManager<AppUser> users, SessionService sessions) => Results.Ok(await sessions.UserAsync((await users.FindByIdAsync(principal.FindFirstValue("sub")!))!))).RequireAuthorization();
        group.MapPost("/logout-all", async (HttpContext http, SessionService sessions) =>
        {
            await sessions.RevokeAllAsync(UserId(http)); SessionService.ClearCookie(http); return Results.NoContent();
        }).RequireAuthorization();
        group.MapPost("/confirm-email", ConfirmEmail);
        group.MapPost("/resend-confirmation", Resend).RequireRateLimiting("mail");
        group.MapPost("/forgot-password", Forgot).RequireRateLimiting("mail");
        group.MapPost("/reset-password", Reset);
        group.MapPost("/change-password", ChangePassword).RequireAuthorization();
        group.MapPost("/change-email", ChangeEmail).RequireAuthorization().RequireRateLimiting("mail");
        group.MapPost("/confirm-email-change", ConfirmEmailChange);
        group.MapDelete("/account", DeleteAccount).RequireAuthorization();
        group.MapGet("/admin/check", () => Results.NoContent()).RequireAuthorization("Admin");
        group.MapGet("/.well-known/jwks.json", (HttpContext http, SigningKey key) =>
        {
            http.Response.Headers.CacheControl = "public, max-age=300"; return Results.Ok(key.PublicJwks);
        }).AllowAnonymous();
    }

    private static IResult Error(string code, string message, int status = 400) => Results.Problem(statusCode: status, title: message, extensions: new Dictionary<string, object?> { ["code"] = code });
    private static IResult IdentityError(IdentityResult result) => Results.ValidationProblem(result.Errors.GroupBy(x => x.Code).ToDictionary(g => g.Key, g => g.Select(x => x.Description).ToArray()));
    private static string? Email(string? value)
    {
        var email = value?.Trim();
        return email is { Length: > 0 and <= 254 } && !email.Contains('\r') && !email.Contains('\n') && new EmailAddressAttribute().IsValid(email) ? email : null;
    }
    private static bool Password(string? password) => password is { Length: >= 12 and <= 128 };
    private static Guid UserId(HttpContext http) => Guid.Parse(http.User.FindFirstValue("sub")!);
    private static Dictionary<string, string> Parameters(AppUser user, string code) => new() { ["userId"] = user.Id.ToString(), ["code"] = MailOutbox.Encode(code) };
    private static bool Duplicate(IdentityResult result) => result.Errors.Any(e => e.Code is "DuplicateEmail" or "DuplicateUserName");
    private static IResult InvalidLink() => Error("InvalidLink", "Ссылка недействительна или срок её действия истёк.");

    private static async Task<IResult> Register(Credentials request, UserManager<AppUser> users, AuthDbContext db, MailOutbox mail)
    {
        var email = Email(request.Email);
        if (email is null || !Password(request.Password)) return Error("InvalidInput", "Укажите корректную почту и пароль длиной от 12 до 128 символов.");
        // Same response for existing and new accounts, to avoid account enumeration.
        if (await users.FindByEmailAsync(email) is not null) return Results.Accepted();
        await using var transaction = await db.Database.BeginTransactionAsync();
        var user = new AppUser { UserName = Guid.NewGuid().ToString(), Email = email };
        IdentityResult result;
        try { result = await users.CreateAsync(user, request.Password); }
        catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException { SqlState: "23505" }) { return Results.Accepted(); }
        if (!result.Succeeded) return Duplicate(result) ? Results.Accepted() : IdentityError(result);
        var role = await users.AddToRoleAsync(user, "User");
        if (!role.Succeeded) throw new InvalidOperationException("Unable to assign the default role.");
        var code = await users.GenerateEmailConfirmationTokenAsync(user);
        mail.Add(user, "Подтвердите почту — Навык дня", "confirm-email", Parameters(user, code));
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return Results.Accepted();
    }

    private static async Task<IResult> Login(Credentials request, UserManager<AppUser> users, SignInManager<AppUser> signIn, SessionService sessions, HttpContext http)
    {
        var email = Email(request.Email);
        if (email is null || request.Password is not { Length: > 0 and <= 128 }) return Error("InvalidCredentials", "Неверная почта или пароль. Проверьте, что почта подтверждена.", 401);
        var user = await users.FindByEmailAsync(email);
        if (user is null)
        {
            // Match the password-hash work of a real login without inventing a user.
            new PasswordHasher<AppUser>().VerifyHashedPassword(new AppUser(), DummyHash.Value, request.Password);
            return Error("InvalidCredentials", "Неверная почта или пароль. Проверьте, что почта подтверждена.", 401);
        }
        var result = await signIn.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!result.Succeeded) return Error("InvalidCredentials", "Неверная почта или пароль. Проверьте, что почта подтверждена.", 401);
        return Results.Ok(await sessions.LoginAsync(user, http));
    }
    private static readonly Lazy<string> DummyHash = new(() => new PasswordHasher<AppUser>().HashPassword(new AppUser(), "not-an-account-password"));

    private static async Task<IResult> Refresh(HttpContext http, SessionService sessions)
    {
        var result = await sessions.RefreshAsync(http);
        if (result is not null) return Results.Ok(result);
        SessionService.ClearCookie(http);
        return Error("InvalidSession", "Войдите в учётную запись заново.", 401);
    }
    private static async Task<IResult> Logout(HttpContext http, SessionService sessions)
    {
        await sessions.LogoutAsync(http); return Results.NoContent();
    }
    private static async Task<IResult> ConfirmEmail(ConfirmEmailRequest request, UserManager<AppUser> users)
    {
        var code = MailOutbox.Decode(request.Code);
        if (code is null || !Guid.TryParse(request.UserId, out _)) return InvalidLink();
        var user = await users.FindByIdAsync(request.UserId);
        if (user is null) return InvalidLink();
        return (await users.ConfirmEmailAsync(user, code)).Succeeded ? Results.NoContent() : InvalidLink();
    }
    private static async Task<IResult> Resend(EmailRequest request, UserManager<AppUser> users, AuthDbContext db, MailOutbox mail)
    {
        var email = Email(request.Email);
        if (email is null) return Error("InvalidEmail", "Укажите корректную почту.");
        var user = await users.FindByEmailAsync(email);
        if (user is not null && !user.EmailConfirmed)
        {
            mail.Add(user, "Подтвердите почту — Навык дня", "confirm-email", Parameters(user, await users.GenerateEmailConfirmationTokenAsync(user)));
            await db.SaveChangesAsync();
        }
        return Results.Accepted();
    }
    private static async Task<IResult> Forgot(EmailRequest request, UserManager<AppUser> users, AuthDbContext db, MailOutbox mail)
    {
        var email = Email(request.Email);
        if (email is null) return Error("InvalidEmail", "Укажите корректную почту.");
        var user = await users.FindByEmailAsync(email);
        if (user is not null && user.EmailConfirmed)
        {
            mail.Add(user, "Восстановление пароля — Навык дня", "reset-password", Parameters(user, await users.GeneratePasswordResetTokenAsync(user)));
            await db.SaveChangesAsync();
        }
        return Results.Accepted();
    }
    private static async Task<IResult> Reset(ResetPasswordRequest request, UserManager<AppUser> users, SessionService sessions, AuthDbContext db)
    {
        var code = MailOutbox.Decode(request.Code);
        if (!Password(request.NewPassword)) return Error("InvalidPassword", "Пароль должен содержать от 12 до 128 символов.");
        if (code is null || !Guid.TryParse(request.UserId, out _)) return InvalidLink();
        var user = await users.FindByIdAsync(request.UserId);
        if (user is null || !user.EmailConfirmed) return InvalidLink();
        await using var transaction = await db.Database.BeginTransactionAsync();
        var result = await users.ResetPasswordAsync(user, code, request.NewPassword);
        if (!result.Succeeded) return InvalidLink();
        await sessions.RevokeAllAsync(user.Id);
        await transaction.CommitAsync();
        // Do not delete a cookie belonging to a different user who followed the link.
        return Results.NoContent();
    }
    private static async Task<IResult> ChangePassword(ChangePasswordRequest request, HttpContext http, UserManager<AppUser> users, SessionService sessions, AuthDbContext db)
    {
        if (!Password(request.NewPassword) || request.CurrentPassword is not { Length: > 0 and <= 128 }) return Error("InvalidInput", "Проверьте текущий пароль. Новый пароль должен содержать от 12 до 128 символов.");
        var user = (await users.FindByIdAsync(UserId(http).ToString()))!;
        await using var transaction = await db.Database.BeginTransactionAsync();
        var result = await users.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded) return Error("InvalidPassword", "Текущий пароль неверен или новый пароль не соответствует требованиям.");
        await sessions.RevokeAllAsync(user.Id);
        await transaction.CommitAsync();
        SessionService.ClearCookie(http);
        return Results.NoContent();
    }
    private static async Task<IResult> ChangeEmail(ChangeEmailRequest request, HttpContext http, UserManager<AppUser> users, MailOutbox mail, AuthDbContext db)
    {
        var email = Email(request.NewEmail);
        if (email is null || request.CurrentPassword is not { Length: > 0 and <= 128 }) return Error("InvalidInput", "Укажите корректную почту и текущий пароль.");
        var user = (await users.FindByIdAsync(UserId(http).ToString()))!;
        if (!await users.CheckPasswordAsync(user, request.CurrentPassword)) return Error("InvalidPassword", "Текущий пароль неверен.");
        if (await users.FindByEmailAsync(email) is null)
        {
            var parameters = Parameters(user, await users.GenerateChangeEmailTokenAsync(user, email));
            parameters["newEmail"] = email;
            mail.Add(user, "Подтвердите новую почту — Навык дня", "confirm-email-change", parameters, email);
            await db.SaveChangesAsync();
        }
        return Results.Accepted();
    }
    private static async Task<IResult> ConfirmEmailChange(ConfirmEmailChangeRequest request, UserManager<AppUser> users, SessionService sessions, AuthDbContext db)
    {
        var email = Email(request.NewEmail); var code = MailOutbox.Decode(request.Code);
        if (email is null || code is null || !Guid.TryParse(request.UserId, out _)) return InvalidLink();
        var user = await users.FindByIdAsync(request.UserId);
        if (user is null || await users.FindByEmailAsync(email) is not null) return InvalidLink();
        await using var transaction = await db.Database.BeginTransactionAsync();
        IdentityResult result;
        try { result = await users.ChangeEmailAsync(user, email, code); }
        catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException { SqlState: "23505" }) { return InvalidLink(); }
        if (!result.Succeeded) return InvalidLink();
        await sessions.RevokeAllAsync(user.Id);
        await transaction.CommitAsync();
        return Results.NoContent();
    }
    private static async Task<IResult> DeleteAccount([FromBody] DeleteAccountRequest request, HttpContext http, UserManager<AppUser> users, AuthDbContext db)
    {
        if (request.CurrentPassword is not { Length: > 0 and <= 128 }) return Error("InvalidPassword", "Введите текущий пароль.");
        var user = (await users.FindByIdAsync(UserId(http).ToString()))!;
        if (!await users.CheckPasswordAsync(user, request.CurrentPassword)) return Error("InvalidPassword", "Текущий пароль неверен.");
        var result = await users.DeleteAsync(user);
        if (!result.Succeeded) return IdentityError(result);
        SessionService.ClearCookie(http);
        return Results.NoContent();
    }
}
