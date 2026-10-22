using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Core.Configurations;

public static class DependencyInjection
{
    public static IServiceCollection AddSharedInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
                               ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
        
        services.AddSingleton(new PostgresConnectionFactory(connectionString));
        
        return services;
    }
}