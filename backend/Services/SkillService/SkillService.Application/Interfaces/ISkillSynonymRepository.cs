using SkillService.Domain.Models;

namespace SkillService.Application.Interfaces;

public interface ISkillSynonymRepository
{
    public Task<long> AddSkillSynonym(SkillSynonym synonym, CancellationToken cancellationToken);
    
    public Task<SkillSynonym?> GetSkillSynonym(long id, CancellationToken cancellationToken);
    
    public Task DeleteSkillSynonym(long id, CancellationToken cancellationToken);
}