using MarketAnalysisService.Application.Interfaces;
using MarketAnalysisService.Application.Services;
using MarketAnalysisService.Infrastructure.Clients;
using MarketAnalysisService.Infrastructure.Configurations;
using MarketAnalysisService.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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

builder.Services.AddScoped<DirectionService>();
builder.Services.AddScoped<RegionService>();

builder.Services.AddScoped<IDirectionRepository, DirectionRepository>();
builder.Services.AddScoped<IRegionRepository, RegionRepository>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();