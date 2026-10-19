using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MarketAnalyticsService.Application.Interfaces;
using MarketAnalyticsService.Infrastructure.Repositories;

namespace MarketAnalyticsService.Infrastructure.Configurations;

public static class DependencyInjection
{
    public static IServiceCollection AddMarketAnalysisInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
                               ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
        
        services.AddSingleton(new PostgresConnectionFactory(connectionString));
        
        services.AddScoped<IDirectionRepository, DirectionRepository>();
        services.AddScoped<IRegionRepository, RegionRepository>();

        return services;
    }
}