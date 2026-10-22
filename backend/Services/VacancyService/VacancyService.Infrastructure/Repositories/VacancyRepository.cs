using Core.Configurations;
using Dapper;
using VacancyService.Application.Interfaces;
using VacancyService.Domain.Models;

namespace VacancyService.Infrastructure.Repositories;

public class VacancyRepository(PostgresConnectionFactory connectionFactory) : IVacancyRepository
{
    public async Task<IEnumerable<long>> AddVacancies(List<Vacancy> vacancies, CancellationToken cancellationToken)
    {
        if (vacancies.Count == 0)
            return Enumerable.Empty<long>();

        var connection = connectionFactory.GetConnection();
        var parameters = new DynamicParameters();
        var valuesSql = new List<string>();

        for (int i = 0; i < vacancies.Count; i++)
        {
            var vacancy = vacancies[i];
            
            Console.WriteLine($"ExternalId={vacancy.ExternalId}, Title={vacancy.Title}, SnapshotId={vacancy.SnapshotId}, PublishedAt={vacancy.PublishedAt}");

            
            valuesSql.Add($"(@ExternalId{i}, @SnapshotId{i}, @DirectionId{i}, @RegionId{i}, " +
                          $"@Title{i}, @Employer{i}, @WorkFormat{i}, @Experience{i}, " +
                          $"@PublishedAt{i}, @Description{i}, @Url{i})");

            parameters.Add($"ExternalId{i}", vacancy.ExternalId);      
            parameters.Add($"SnapshotId{i}", vacancy.SnapshotId);
            parameters.Add($"DirectionId{i}", vacancy.DirectionId);
            parameters.Add($"RegionId{i}", vacancy.RegionId);
            parameters.Add($"Title{i}", vacancy.Title);
            parameters.Add($"Employer{i}", vacancy.Employer);
            parameters.Add($"WorkFormat{i}", vacancy.WorkFormat);
            parameters.Add($"Experience{i}", vacancy.Experience);
            parameters.Add($"PublishedAt{i}", vacancy.PublishedAt);
            parameters.Add($"Description{i}", vacancy.Description);
            parameters.Add($"Url{i}", vacancy.Url);
        }

        var sql = $"""
                  INSERT INTO vacancy.vacancies 
                      (external_id, snapshot_id, direction_id, region_id, 
                       title, employer, work_format, experience, 
                       published_at, description, url)
                  VALUES {string.Join(", ", valuesSql)}
                  RETURNING id
                  """;

        var command = new CommandDefinition(
            sql,
            parameters,
            cancellationToken: cancellationToken);
        
        var ids = await connection.QueryAsync<long>(command);
        return ids;
    }

    public async Task<IEnumerable<Vacancy>> GetVacancies(CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  SELECT * FROM vacancy.vacancies
                  """;
        
        var command = new CommandDefinition(
            sql,
            cancellationToken: cancellationToken);
        
        return await connection.QueryAsync<Vacancy>(command);
    }

    public async Task DeleteVacancies(CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  DELETE FROM vacancy.vacancies
                  """;

        var command = new CommandDefinition(
            sql,
            cancellationToken: cancellationToken);
        
        await connection.ExecuteAsync(command);
    }
}