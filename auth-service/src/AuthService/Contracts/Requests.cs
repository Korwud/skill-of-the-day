namespace AuthService.Contracts;

public sealed record Credentials(string Email, string Password);
public sealed record EmailRequest(string Email);
public sealed record ConfirmEmailRequest(string UserId, string Code);
public sealed record ResetPasswordRequest(string UserId, string Code, string NewPassword);
public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public sealed record ChangeEmailRequest(string NewEmail, string CurrentPassword);
public sealed record ConfirmEmailChangeRequest(string UserId, string NewEmail, string Code);
public sealed record DeleteAccountRequest(string CurrentPassword);
public sealed record UserResponse(Guid Id, string Email, bool EmailConfirmed, IList<string> Roles);
public sealed record TokenResponse(string AccessToken, string TokenType, int ExpiresIn, UserResponse User);
