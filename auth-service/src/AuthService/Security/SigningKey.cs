using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;

namespace AuthService.Security;

public sealed class SigningKey : IDisposable
{
    private readonly RSA rsa;
    public RsaSecurityKey Key { get; }
    public object PublicJwks { get; }

    public SigningKey(AuthOptions options)
    {
        Directory.CreateDirectory(options.KeyDirectory);
        var path = Path.Combine(options.KeyDirectory, "signing-key.pem");
        rsa = RSA.Create(3072);
        if (File.Exists(path)) rsa.ImportFromPem(File.ReadAllText(path));
        else
        {
            using var file = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None);
            if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite);
            using var writer = new StreamWriter(file);
            writer.Write(rsa.ExportPkcs8PrivateKeyPem());
        }
        var parameters = rsa.ExportParameters(false);
        var kid = Base64UrlEncoder.Encode(SHA256.HashData(rsa.ExportSubjectPublicKeyInfo()));
        Key = new RsaSecurityKey(rsa) { KeyId = kid };
        PublicJwks = new
        {
            keys = new[] { new { kty = "RSA", use = "sig", alg = "RS256", kid,
            n = Base64UrlEncoder.Encode(parameters.Modulus!), e = Base64UrlEncoder.Encode(parameters.Exponent!) } }
        };
    }
    public void Dispose() => rsa.Dispose();
}
