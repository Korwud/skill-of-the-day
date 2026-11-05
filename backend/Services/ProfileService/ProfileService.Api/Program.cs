using Core.Web;
using ProfileService.Infrastructure.Configurations;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Security.Cryptography;

Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProfileInfrastructure(builder.Configuration);

var app = builder.BuildCommonWebApp(services =>
{
    var authSettings = builder.Configuration.GetSection("Auth");
    var issuer = authSettings["Issuer"] ?? "skill-day-auth";
    var audience = authSettings["Audience"] ?? "skill-day-api";
    var publicKeyPath = authSettings["PublicKeyPath"];

    services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.MapInboundClaims = false;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = issuer,
                ValidateAudience = true,
                ValidAudience = audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(15),
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = LoadPublicKey(publicKeyPath!),
                RoleClaimType = "role",
                NameClaimType = "sub"
            };
        });

    services.AddAuthorization();
});

app.Run();
return;

static RsaSecurityKey LoadPublicKey(string path)
{
    var rsa = RSA.Create();
    rsa.ImportFromPem(File.ReadAllText(path));
    return new RsaSecurityKey(rsa);
}