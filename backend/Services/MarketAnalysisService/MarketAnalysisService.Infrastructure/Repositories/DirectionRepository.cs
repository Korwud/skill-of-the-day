using MarketAnalysisService.Application.Interfaces;
using MarketAnalysisService.Domain.Models;
using Dapper;
using MarketAnalysisService.Infrastructure.Configurations;

namespace MarketAnalysisService.Infrastructure.Repositories;

public class DirectionRepository : IDirectionRepository
{
    private PostgresConnectionFactory _connectionFactory;

    public DirectionRepository(PostgresConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }
    
    public async Task AddDirections(List<Direction> directions, CancellationToken cancellationToken)
    {
        using var connection = _connectionFactory.GetConnection();

        var sql = """
                  INSERT INTO dictionary.directions (id, name)
                  VALUES (@Id, @Name)
                  ON CONFLICT (id) DO NOTHING
                  """;
        
        var command = new CommandDefinition(
            sql,
            directions,
            cancellationToken: cancellationToken);
        
        await connection.ExecuteAsync(command);
    }

    public async Task<Direction?> GetDirection(Int64 id, CancellationToken cancellationToken)
    {
        using var connection = _connectionFactory.GetConnection();

        var sql = """
                  SELECT
                  id AS Id,
                  name AS Name
                  FROM dictionary.directions
                  WHERE id = @Id
                  """;

        var command = new CommandDefinition(
            sql,
            new { Id = id },
            cancellationToken: cancellationToken);
        
        return await connection.QuerySingleOrDefaultAsync<Direction>(command);
    }

    public async Task DeleteDirections(CancellationToken cancellationToken)
    {
        using var connection = _connectionFactory.GetConnection();

        var sql = """
                  DELETE FROM dictionary.directions
                  """;
        
        var command = new CommandDefinition(
            sql,
            cancellationToken: cancellationToken);
        
        await connection.ExecuteAsync(command);
    }
}