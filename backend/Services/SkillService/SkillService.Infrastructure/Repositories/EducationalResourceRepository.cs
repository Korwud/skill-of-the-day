using Core.Configurations;
using Dapper;
using SkillService.Application.Interfaces;
using SkillService.Domain.Models;

namespace SkillService.Infrastructure.Repositories;

public class EducationalResourceRepository(PostgresConnectionFactory connectionFactory) : IEducationalResourcesRepository
{
    public async Task<long> AddEducationalResource(EducationalResource educationalResource, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  INSERT INTO skill.educational_resources (skill_id, title, url, is_active)
                  VALUES (@SkillId, @Title, @Url, @IsActive)
                  RETURNING id
                  ON CONFLICT DO NOTHING
                  """;

        var command = new CommandDefinition(
            sql,
            educationalResource,
            cancellationToken: cancellationToken);
        
        return await connection.ExecuteScalarAsync<long>(command);
    }

    public async Task<EducationalResource?> GetEducationalResource(long id, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  SELECT id, skill_id, title, url, is_active FROM skill.educational_resources
                  WHERE id = @id
                  """;

        var command = new CommandDefinition(
            sql,
            id,
            cancellationToken: cancellationToken);
        
        return await connection.ExecuteScalarAsync<EducationalResource>(command);
    }

    public async Task DeleteEducationalResource(long id, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  DELETE FROM skill.educational_resources
                  WHERE id = @id
                  """;

        var command = new CommandDefinition(
            sql,
            id,
            cancellationToken: cancellationToken);
        
        await connection.ExecuteAsync(command);
    }
}