using Core.Configurations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using VacancyService.Application.Interfaces;
using VacancyService.Infrastructure.Repositories;

namespace VacancyService.Infrastructure.Configurations;

public static class DependencyInjection
{
    public static IServiceCollection AddVacancyInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddSharedInfrastructure(configuration);

        services.AddScoped<Application.Services.VacancyService>();

        services.AddScoped<IVacancyRepository, VacancyRepository>();
        services.AddScoped<IVacancySnapshotRepository, VacancySnapshotRepository>();
        services.AddScoped<IVacancySkillRepository, VacancySkillRepository>();

        return services;
    }
}