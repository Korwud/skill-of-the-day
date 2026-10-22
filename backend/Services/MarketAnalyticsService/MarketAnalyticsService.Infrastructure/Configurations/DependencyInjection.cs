using Core.Configurations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MarketAnalyticsService.Application.Interfaces;
using MarketAnalyticsService.Application.Services;
using MarketAnalyticsService.Infrastructure.Repositories;

namespace MarketAnalyticsService.Infrastructure.Configurations;

public static class DependencyInjection
{
    public static IServiceCollection AddMarketAnalysisInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddSharedInfrastructure(configuration);
        
        services.AddScoped<DirectionService>();
        services.AddScoped<RegionService>();
        
        services.AddScoped<IDirectionRepository, DirectionRepository>();
        services.AddScoped<IRegionRepository, RegionRepository>();

        return services;
    }
}