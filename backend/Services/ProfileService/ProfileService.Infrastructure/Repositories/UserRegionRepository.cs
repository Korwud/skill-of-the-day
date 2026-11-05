using Core.Configurations;
using Dapper;
using ProfileService.Application.Interfaces;

namespace ProfileService.Infrastructure.Repositories;

public class UserRegionRepository(PostgresConnectionFactory connectionFactory) : IUserRegionRepository
{
    public async Task<IEnumerable<long>> GetUserRegions(long userId, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  SELECT region_id FROM profile.user_regions
                  WHERE user_id = @userId
                  """;
        
        var command = new CommandDefinition(
            sql, 
            new { userId }, 
            cancellationToken: cancellationToken);
        
        return await connection.QueryAsync<long>(command);
    }

    public async Task ReplaceUserRegions(long userId, IEnumerable<long> regionIds, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        using var transaction = connection.BeginTransaction();
        
        try 
        {
            var deleteSql = "DELETE FROM profile.user_regions WHERE user_id = @userId";

            var deleteCommand = new CommandDefinition(
                deleteSql,
                new { userId },
                transaction: transaction,
                cancellationToken: cancellationToken);
            
            await connection.ExecuteAsync(deleteCommand);
            
            var ids = regionIds.Distinct().ToArray();
            if (ids.Length == 0)
                return;
            
            var insertSql = """
                            INSERT INTO profile.user_regions (user_id, region_id)
                            VALUES (@userId, @regionId)
                            """;
            
            var parameters = ids.Select(regionId => new { userId, regionId });

            var insertCommand = new CommandDefinition(
                insertSql, 
                parameters,
                transaction: transaction,
                cancellationToken: cancellationToken);
            
            await connection.ExecuteAsync(insertCommand);
            
            transaction.Commit();
        }
        catch 
        {
            transaction.Rollback();
            throw;
        }
    }
}