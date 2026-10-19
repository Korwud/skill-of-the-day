using System.Reflection;
using FluentMigrator.Runner;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

var configuration = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.Development.json", optional: false, reloadOnChange: true)
    .Build();

var connectionString = configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'Default Connection' not found.'");

var serviceProvider = new ServiceCollection()
    .AddFluentMigratorCore()
    .ConfigureRunner(runner => runner
        .AddPostgres()
        .WithGlobalConnectionString(connectionString)
        .ScanIn(
            Assembly.Load("VacancyService.Infrastructure"),
            Assembly.Load("AuthService.Infrastructure"),
            Assembly.Load("SkillService.Infrastructure"),
            Assembly.Load("ProfileService.Infrastructure"),
            Assembly.Load("MarketAnalyticsService.Infrastructure")
            ).For.Migrations())
        .AddLogging(logging => logging.AddFluentMigratorConsole())
        .BuildServiceProvider(false);

using (var scope = serviceProvider.CreateScope())
{
    var runner = scope.ServiceProvider.GetRequiredService<IMigrationRunner>();
    
    Console.WriteLine("Начинаем применение миграций...");
    
    runner.MigrateUp(); 
    
    Console.WriteLine("Миграции успешно применены!");
}