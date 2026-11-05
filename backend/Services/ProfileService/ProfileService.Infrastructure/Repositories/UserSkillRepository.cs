using Core.Configurations;
using Dapper;
using ProfileService.Application.Interfaces;
using ProfileService.Domain.Models;

namespace ProfileService.Infrastructure.Repositories;

public class UserSkillRepository(PostgresConnectionFactory connectionFactory) : IUserSkillRepository
{
    public async Task<IEnumerable<long>> GetUserSkill(long userId, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  SELECT user_id, direction_id, remote_work FROM profile.user_skills
                  WHERE user_id = @userId";"
                  """;
        
        var command = new CommandDefinition(
            sql, 
            new { userId }, 
            cancellationToken: cancellationToken);
        
        return await connection.QueryAsync<long>(command);
    }

    public async Task ReplaceUserSkills(long userId, IEnumerable<long> skillIds, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        using var transaction = connection.BeginTransaction();
        
        try 
        {
            var deleteSql = "DELETE FROM profile.user_skills WHERE user_id = @userId";

            var deleteCommand = new CommandDefinition(
                deleteSql,
                new { userId },
                transaction: transaction,
                cancellationToken: cancellationToken);
            
            await connection.ExecuteAsync(deleteCommand);
            
            var ids = skillIds.Distinct().ToArray();
            if (ids.Length == 0)
                return;
            
            var insertSql = """
                            INSERT INTO profile.user_skills (user_id, skill_id)
                            VALUES (@userId, @skillId)
                            """;
            
            var parameters = ids.Select(skillId => new { userId, skillId });

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

    public async Task RemoveUserSkill(long userId, long skillId, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  DELETE FROM profile.user_skills
                  WHERE user_id = @userId AND skill_id = @skillId";"
                  """;
        
        var command = new CommandDefinition(
            sql, 
            new { userId, skillId }, 
            cancellationToken: cancellationToken);
        
        await connection.ExecuteAsync(command);
    }
}