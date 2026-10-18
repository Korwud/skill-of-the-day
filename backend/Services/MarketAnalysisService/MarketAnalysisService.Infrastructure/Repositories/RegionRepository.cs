using MarketAnalysisService.Application.Interfaces;
using MarketAnalysisService.Domain.Models;
using Dapper;
using MarketAnalysisService.Infrastructure.Configurations;

namespace MarketAnalysisService.Infrastructure.Repositories;

public class RegionRepository : IRegionRepository
{
    private PostgresConnectionFactory _connectionFactory;

    public RegionRepository(PostgresConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }
    
    public async Task AddRegions(List<Region> regions, CancellationToken cancellationToken)
    {
        using var connection = _connectionFactory.GetConnection();

        var sql = """
                  INSERT INTO dictionary.regions (id, name)
                  VALUES (@Id, @Name)
                  """;
        
        var command = new CommandDefinition(
            sql,
            regions,
            cancellationToken: cancellationToken);
        
        await connection.ExecuteAsync(command);
    }

    public async Task<Region?> GetRegion(Int64 id, CancellationToken cancellationToken)
    {
        using var connection = _connectionFactory.GetConnection();

        var sql = """
                  SELECT
                  id AS Id,
                  name AS Name
                  FROM dictionary.regions
                  WHERE id = @Id
                  """;

        var command = new CommandDefinition(
            sql,
            new { Id = id },
            cancellationToken: cancellationToken);
        
        return await connection.QuerySingleOrDefaultAsync<Region>(command);
    }

    public async Task DeleteRegions(CancellationToken cancellationToken)
    {
        using var connection = _connectionFactory.GetConnection();

        var sql = """
                  DELETE FROM dictionary.regions
                  """;
        
        var command = new CommandDefinition(
            sql,
            cancellationToken: cancellationToken);
        
        await connection.ExecuteAsync(command);
    }
}