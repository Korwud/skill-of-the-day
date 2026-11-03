using SkillService.Domain.Models;

namespace SkillService.Application.Interfaces;

public interface ISkillClient
{
    public Task AddSkills(IEnumerable<string> skillNames, CancellationToken cancellationToken);
    
    public Task<Dictionary<string, long>?> GetSkillsByName(IEnumerable<string> skillNames, CancellationToken cancellationToken);
}