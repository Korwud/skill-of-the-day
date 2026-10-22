using Core.Web;
using MarketAnalyticsService.Application.Interfaces;
using MarketAnalyticsService.Infrastructure.Clients;
using MarketAnalyticsService.Infrastructure.Configurations;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMarketAnalysisInfrastructure(builder.Configuration);

builder.Services.AddHttpClient<IDirectionClient, DirectionClient>(client =>
{
    client.BaseAddress = new Uri("https://api.hh.ru/");
    client.DefaultRequestHeaders.Add("User-Agent", "skill-of-the-day/1.0 (nlovnas@mail.ru)");
});

builder.Services.AddHttpClient<IRegionClient, RegionClient>(client =>
{
    client.BaseAddress = new Uri("https://api.hh.ru/");
    client.DefaultRequestHeaders.Add("User-Agent", "skill-of-the-day/1.0 (nlovnas@mail.ru)");
});

var app = builder.BuildCommonWebApp();

app.Run();