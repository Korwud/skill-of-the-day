using VacancyService.Domain.Models;

namespace VacancyService.Application.Interfaces;

public interface IVacancySkillRepository
{
    public Task AddVacancySkill(VacancySkill vacancySkill, CancellationToken cancellationToken);
    
    public Task<IEnumerable<VacancySkill>> GetVacancySkills(long vacancyId, CancellationToken cancellationToken);
    
    public Task DeleteVacancySkills(long vacancyId, CancellationToken cancellationToken);
}