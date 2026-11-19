using System.Diagnostics;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace SkillDay.ServiceDefaults;

public static class TelemetryExtensions
{
    public static WebApplicationBuilder AddServiceTelemetry(this WebApplicationBuilder builder, string serviceName)
    {
        var export = !string.IsNullOrWhiteSpace(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]);
        builder.Logging.AddJsonConsole(options => options.IncludeScopes = true);
        builder.Logging.AddOpenTelemetry(options =>
        {
            options.IncludeFormattedMessage = true;
            options.IncludeScopes = true;
            options.ParseStateValues = true;
            options.SetResourceBuilder(ResourceBuilder.CreateDefault().AddService(serviceName));
            if (export) options.AddOtlpExporter();
        });
        builder.Services.AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService(serviceName))
            .WithTracing(tracing =>
            {
                tracing.SetSampler(new AlwaysOnSampler())
                    .AddAspNetCoreInstrumentation(options => options.Filter = http => !IsHealth(http.Request.Path))
                    .AddHttpClientInstrumentation(options => options.FilterHttpRequestMessage = request =>
                        request.RequestUri is not { } uri || !IsHealth(new PathString(uri.AbsolutePath)))
                    .AddSource("Yarp.ReverseProxy")
                    .AddProcessor(new RemoveQueryProcessor());
                if (export) tracing.AddOtlpExporter();
            })
            .WithMetrics(metrics =>
            {
                metrics.AddMeter("Microsoft.AspNetCore.Hosting", "Microsoft.AspNetCore.Server.Kestrel", "System.Net.Http");
                if (export) metrics.AddOtlpExporter();
            });
        return builder;
    }

    public static WebApplication UseServiceRequestLogging(this WebApplication app)
    {
        app.Use(async (http, next) =>
        {
            // One standard trace ID across Gateway, HttpClient and Auth Service.
            var traceId = Activity.Current?.TraceId.ToString() ?? Guid.NewGuid().ToString("N");
            http.TraceIdentifier = traceId;
            http.Request.Headers["X-Request-ID"] = traceId;
            http.Response.OnStarting(() =>
            {
                http.Response.Headers["X-Request-ID"] = traceId;
                http.Response.Headers["X-Trace-ID"] = traceId;
                return Task.CompletedTask;
            });
            using var scope = app.Logger.BeginScope(new Dictionary<string, object?> { ["RequestId"] = traceId });
            var started = Stopwatch.GetTimestamp();
            var failed = false;
            try { await next(); }
            catch { failed = true; throw; }
            finally
            {
                if (!IsHealth(http.Request.Path))
                {
                    var status = failed ? 500 : http.Response.StatusCode;
                    var level = status >= 500 ? LogLevel.Error : status >= 400 ? LogLevel.Warning : LogLevel.Information;
                    // No bodies, query values, passwords, cookies or Authorization headers.
                    app.Logger.Log(level, "HTTP {Method} {Path} returned {StatusCode} in {ElapsedMs} ms; RequestId {RequestId}",
                        http.Request.Method, http.Request.Path.Value, status,
                        Math.Round(Stopwatch.GetElapsedTime(started).TotalMilliseconds), traceId);
                }
            }
        });
        return app;
    }

    private static bool IsHealth(PathString path) => path.StartsWithSegments("/health") || path.StartsWithSegments("/api/health");

    // Auth links may contain codes. Keep paths useful while dropping query strings.
    private sealed class RemoveQueryProcessor : BaseProcessor<Activity>
    {
        public override void OnEnd(Activity activity)
        {
            activity.SetTag("url.query", null);
            foreach (var key in new[] { "url.full", "http.url" })
                if (activity.GetTagItem(key) is string value && Uri.TryCreate(value, UriKind.Absolute, out var uri))
                    activity.SetTag(key, uri.GetLeftPart(UriPartial.Path));
            if (activity.GetTagItem("http.target") is string target)
                activity.SetTag("http.target", target.Split('?')[0]);
        }
    }
}
