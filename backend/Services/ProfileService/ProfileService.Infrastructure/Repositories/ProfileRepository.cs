using Core.Configurations;
using Dapper;
using ProfileService.Application.Interfaces;
using ProfileService.Domain.Models;

namespace ProfileService.Infrastructure.Repositories;

public class ProfileRepository(PostgresConnectionFactory connectionFactory) : IProfileRepository
{
    public async Task<UserProfile?> GetUserProfile(long id, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  SELECT user_id, direction_id, remote_work FROM profile.user_profiles
                  WHERE user_id = @id";"
                  """;
        
        var command = new CommandDefinition(
            sql, 
            new { id }, 
            cancellationToken: cancellationToken);
        
        return await connection.QueryFirstOrDefaultAsync<UserProfile?>(command);
    }

    public async Task UpsertUserProfile(UserProfile profile, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  INSERT INTO profile.user_profiles (user_id, direction_id, remote_work)
                  VALUES (@UserId, @DirectionId, @RemoteWork)
                  ON CONFLICT (user_id) DO UPDATE 
                  SET direction_id = EXCLUDED.direction_id,
                      remote_work = EXCLUDED.remote_work
                  """;
        
        var command = new CommandDefinition(
            sql, 
            profile, 
            cancellationToken: cancellationToken);
        
        await connection.ExecuteAsync(command);
    }

    public async Task DeleteUserProfile(long id, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  DELETE FROM profile.user_profiles
                  WHERE user_id = @id
                  """;
        
        var command = new CommandDefinition(
            sql, 
            new { id }, 
            cancellationToken: cancellationToken);
        
        await connection.ExecuteAsync(command);
    }
}