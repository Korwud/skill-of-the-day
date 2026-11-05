using Core.Configurations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ProfileService.Application.Interfaces;
using ProfileService.Infrastructure.Repositories;

namespace ProfileService.Infrastructure.Configurations;

public static class DependencyInjection
{
    public static IServiceCollection AddProfileInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddSharedInfrastructure(configuration);

        services.AddScoped<Application.Services.ProfileManager>();

        services.AddScoped<IProfileRepository, ProfileRepository>();
        services.AddScoped<IUserSkillRepository, UserSkillRepository>();
        services.AddScoped<IUserRegionRepository, UserRegionRepository>();

        return services;
    }
}