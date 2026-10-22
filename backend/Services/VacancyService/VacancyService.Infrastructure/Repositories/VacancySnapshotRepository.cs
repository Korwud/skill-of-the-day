using Core.Configurations;
using Dapper;
using Microsoft.Extensions.Configuration;
using VacancyService.Application.Interfaces;
using VacancyService.Domain.Models;

namespace VacancyService.Infrastructure.Repositories;

public class VacancySnapshotRepository(PostgresConnectionFactory connectionFactory) : IVacancySnapshotRepository
{
    public async Task<long> AddSnapshot(VacancySnapshot snapshot, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();

        var sql = """
                  INSERT INTO vacancy.vacancy_snapshots (collected_at)    
                  VALUES (@CollectedAt)
                  RETURNING id
                  """;

        var command = new CommandDefinition(
            sql,
            snapshot,
            cancellationToken: cancellationToken);
        
        return await connection.ExecuteScalarAsync<long>(command);
    }
}