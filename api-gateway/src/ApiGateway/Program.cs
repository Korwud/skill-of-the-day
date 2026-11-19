using SkillDay.ServiceDefaults;
using Yarp.ReverseProxy.Forwarder;

if (args.Contains("--healthcheck"))
{
    try
    {
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(4) };
        Environment.ExitCode = (await client.GetAsync("http://127.0.0.1:8080/health/ready")).IsSuccessStatusCode ? 0 : 1;
    }
    catch { Environment.ExitCode = 1; }
    return;
}

var builder = WebApplication.CreateBuilder(args);
builder.AddServiceTelemetry("api-gateway");
var authAddress = builder.Configuration["ReverseProxy:Clusters:auth:Destinations:primary:Address"];
if (!Uri.TryCreate(authAddress, UriKind.Absolute, out var authUri) ||
    authUri.Scheme is not ("http" or "https") || !string.IsNullOrEmpty(authUri.UserInfo) ||
    authUri.AbsolutePath != "/" || !string.IsNullOrEmpty(authUri.Query) || !string.IsNullOrEmpty(authUri.Fragment))
    throw new InvalidOperationException("Set ReverseProxy:Clusters:auth:Destinations:primary:Address to the Auth Service HTTP(S) origin.");

builder.Services.AddReverseProxy().LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));
builder.Services.AddProblemDetails();
builder.Services.AddHttpClient("auth-readiness", client =>
{
    client.BaseAddress = authUri;
    client.Timeout = TimeSpan.FromSeconds(3);
});

var app = builder.Build();
app.UseServiceRequestLogging();
app.UseExceptionHandler();
app.Use(async (http, next) =>
{
    await next();
    var error = http.Features.Get<IForwarderErrorFeature>();
    if (error is not null && !http.Response.HasStarted && !http.RequestAborted.IsCancellationRequested)
    {
        var status = http.Response.StatusCode == StatusCodes.Status504GatewayTimeout
            ? StatusCodes.Status504GatewayTimeout
            : StatusCodes.Status502BadGateway;
        http.Response.Clear();
        http.Response.Headers.CacheControl = "no-store";
        await Results.Problem(
            statusCode: status,
            title: status == 504 ? "Сервис не ответил вовремя." : "Сервис временно недоступен.",
            extensions: new Dictionary<string, object?> { ["requestId"] = http.TraceIdentifier }
        ).ExecuteAsync(http);
    }
});

app.MapGet("/health/live", () => Results.Ok(new { status = "ok" }));
app.MapGet("/health/ready", Readiness);
app.MapGet("/api/health/live", () => Results.Ok(new { status = "ok" }));
app.MapGet("/api/health/ready", Readiness);

// Auth Service validates credentials, JWTs, session revocation, roles and Origin.
// YARP transports Authorization, Cookie, Set-Cookie, query strings and status codes.
app.MapReverseProxy();
app.MapFallback("/{**path}", (HttpContext http) => Results.Problem(
    statusCode: 404,
    title: "Маршрут API не найден.",
    extensions: new Dictionary<string, object?> { ["requestId"] = http.TraceIdentifier }
));

await app.RunAsync();

static async Task<IResult> Readiness(IHttpClientFactory clients, CancellationToken cancellation)
{
    try
    {
        using var response = await clients.CreateClient("auth-readiness").GetAsync("health/ready", cancellation);
        if (response.IsSuccessStatusCode) return Results.Ok(new { status = "ready" });
    }
    catch (Exception exception) when (exception is HttpRequestException or OperationCanceledException) { }
    return Results.Json(new { status = "unavailable" }, statusCode: 503);
}

public partial class Program;
