using SkillService.Application.Interfaces;
using SkillService.Domain.Models;

namespace SkillService.Application.Services;

public class SkillManager(
    ISkillRepository skillRepository
)
{
    public async Task AddSkills(IEnumerable<SkillName> skillNames, CancellationToken cancellationToken)
    {
        await skillRepository.AddSkills(skillNames, cancellationToken);
    }

    public async Task<SkillName?> GetSkillById(long id, CancellationToken cancellationToken)
    {
        var skill = await skillRepository.GetSkillById(id, cancellationToken);
        
        return skill;
    }
    
    public async Task<Dictionary<string, long>?> GetSkillsByName(IEnumerable<string> names, CancellationToken cancellationToken)
    {
        var skills = await skillRepository.GetSkillsByName(names, cancellationToken);
        
        return skills;
    }
}