using SkillService.Domain.Models;

namespace SkillService.Application.Interfaces;

public interface ISkillRepository
{
    public Task AddSkills(IEnumerable<SkillName> skillNames, CancellationToken cancellationToken);
    
    public Task<SkillName?> GetSkillById(long id, CancellationToken cancellationToken);
    
    public Task<Dictionary<string, long>?> GetSkillsByName(IEnumerable<string> names, CancellationToken cancellationToken);
    
    public Task DeleteSkill(long id, CancellationToken cancellationToken);
}