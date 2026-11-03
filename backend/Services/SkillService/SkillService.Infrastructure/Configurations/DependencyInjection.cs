using Core.Configurations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SkillService.Application.Interfaces;
using SkillService.Infrastructure.Repositories;

namespace SkillService.Infrastructure.Configurations;

public static class DependencyInjection
{
    public static IServiceCollection AddSkillInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddSharedInfrastructure(configuration);

        services.AddScoped<Application.Services.SkillService>();
        services.AddScoped<Application.Services.SkillSynonymService>();
        services.AddScoped<Application.Services.EducationalResourcesService>();

        services.AddScoped<ISkillRepository, SkillRepository>();
        services.AddScoped<ISkillSynonymRepository, SkillSynonymRepository>();
        services.AddScoped<IEducationalResourcesRepository, EducationalResourceRepository>();

        return services;
    }
}