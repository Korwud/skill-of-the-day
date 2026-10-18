using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MarketAnalysisService.Infrastructure.Repositories;
using MarketAnalysisService.Application.Interfaces;

namespace MarketAnalysisService.Infrastructure.Configurations;

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