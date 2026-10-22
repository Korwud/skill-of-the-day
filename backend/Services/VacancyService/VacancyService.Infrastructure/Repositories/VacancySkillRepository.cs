using Core.Configurations;
using Dapper;
using VacancyService.Application.Interfaces;
using VacancyService.Domain.Models;

namespace VacancyService.Infrastructure.Repositories;

public class VacancySkillRepository(PostgresConnectionFactory connectionFactory) : IVacancySkillRepository
{
    public async Task AddVacancySkill(VacancySkill vacancySkill, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  INSERT INTO vacancy.vacancy_skills (vacancy_id, skill_id, category, requirement_quote)
                  VALUES (@VacancyId, @SkillId, @Category, @RequirementQuote)
                  """;

        var command = new CommandDefinition(
            sql,
            vacancySkill,
            cancellationToken: cancellationToken);
        
        await connection.ExecuteAsync(command);
    }

    public async Task<IEnumerable<VacancySkill>> GetVacancySkills(long vacancyId, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  SELECT
                  vacancy_id as VacancyId,
                  skill_id as SkillId,
                  category as Category,
                  requirement_quote as RequirementQuote
                  FROM vacancy.vacancy_skills
                  WHERE vacancy_id = @vacancyId
                  """;

        var command = new CommandDefinition(
            sql,
            vacancyId,
            cancellationToken: cancellationToken);

        return await connection.QueryAsync<VacancySkill>(command);
    }

    public async Task DeleteVacancySkills(long vacancyId, CancellationToken cancellationToken)
    {
        var connection = connectionFactory.GetConnection();
        
        var sql = """
                  DELETE FROM vacancy.vacancy_skills
                  WHERE vacancy_id = @vacancyId
                  """;

        var command = new CommandDefinition(
            sql,
            vacancyId,
            cancellationToken: cancellationToken);
        
        await connection.ExecuteAsync(command);
    }
}