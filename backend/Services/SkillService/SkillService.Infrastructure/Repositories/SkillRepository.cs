using Core.Configurations;
using Dapper;
using SkillService.Application.Interfaces;
using SkillService.Domain.Models;

namespace SkillService.Infrastructure.Repositories;

public class SkillRepository(PostgresConnectionFactory connectionFactory) : ISkillRepository
{
    public async Task AddSkills(IEnumerable<SkillName> skillNames, CancellationToken cancellationToken)
    {
        using var connection = connectionFactory.GetConnection();
        
        var uniqueNames = skillNames
            .Select(s => s.Name)
            .Distinct()
            .ToArray();

        if (uniqueNames.Length == 0)
            return;
    
        var sql = """
                  INSERT INTO skill.skills (name)
                  SELECT unnest(@Names::varchar[])
                  ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                  """;

        var command = new CommandDefinition(
            sql,
            new { Names = uniqueNames }, 
            cancellationToken: cancellationToken);
        
        await connection.ExecuteAsync(command);
    }

    public async Task<SkillName?> GetSkillById(long id, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  SELECT id, name FROM skill.skills
                  WHERE id = @id
                  """;

        var command = new CommandDefinition(
            sql,
            id,
            cancellationToken: cancellationToken);
        
        return await connection.ExecuteScalarAsync<SkillName>(command);
    }
    
    public async Task<Dictionary<string, long>?> GetSkillsByName(IEnumerable<string> names, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  SELECT id, name FROM skill.skills
                  WHERE name = ANY(@NAMES)
                  """;

        var command = new CommandDefinition(
            sql,
            new { Names = names.Select(name => name.ToLower()).ToArray() },
            cancellationToken: cancellationToken);
        
        var skills = await connection.QueryAsync<Skill>(command);
        
        return skills.ToDictionary(skill => skill.Name, s => s.Id);
    }

    public async Task DeleteSkill(long id, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  DELETE FROM skill.skills
                  WHERE id = @id
                  """;

        var command = new CommandDefinition(
            sql,
            id,
            cancellationToken: cancellationToken);
        
        await connection.ExecuteAsync(command);
    }
}