using Core.Configurations;
using Dapper;
using SkillService.Application.Interfaces;
using SkillService.Domain.Models;

namespace SkillService.Infrastructure.Repositories;

public class SkillSynonymRepository(PostgresConnectionFactory connectionFactory) : ISkillSynonymRepository
{
    public async Task<long> AddSkillSynonym(SkillSynonym synonym, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  INSERT INTO skill.skill_synonyms (skill_id, synonym)
                  VALUES (@SkillId, @Synonym)
                  RETURNING id
                  ON CONFLICT DO NOTHING
                  """;

        var command = new CommandDefinition(
            sql,
            synonym,
            cancellationToken: cancellationToken);
        
        return await connection.ExecuteScalarAsync<long>(command);
    }

    public async Task<SkillSynonym?> GetSkillSynonym(long id, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  SELECT id, skill_id, synonym FROM skill.skill_synonyms
                  WHERE id = @id
                  """;

        var command = new CommandDefinition(
            sql,
            id,
            cancellationToken: cancellationToken);
        
        return await connection.ExecuteScalarAsync<SkillSynonym>(command);
    }

    public async Task DeleteSkillSynonym(long id, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  DELETE FROM skill.skill_synonyms
                  WHERE id = @id
                  """;

        var command = new CommandDefinition(
            sql,
            id,
            cancellationToken: cancellationToken);
        
        await connection.ExecuteAsync(command);
    }
}