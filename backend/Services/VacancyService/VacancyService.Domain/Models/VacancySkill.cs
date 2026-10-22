namespace VacancyService.Domain.Models;

public class VacancySkill
{
    public long VacancyId { get; set; }
    public long SkillId { get; set; }
    public string Category { get; set; } = String.Empty;
    public string? RequirementQuote { get; set; }
}