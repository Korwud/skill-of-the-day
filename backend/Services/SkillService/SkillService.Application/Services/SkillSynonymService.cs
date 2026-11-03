using SkillService.Application.Interfaces;
using SkillService.Domain.Models;

namespace SkillService.Application.Services;

public class SkillSynonymService(
    ISkillSynonymRepository skillSynonymRepository
)
{
    public async Task<long> AddSkillSynonym(SkillSynonym skillSynonym, CancellationToken cancellationToken)
    {
        var id = await skillSynonymRepository.AddSkillSynonym(skillSynonym, cancellationToken);
        
        return id;
    }

    public async Task<SkillSynonym?> GetSkillSynonym(long id, CancellationToken cancellationToken)
    {
        var synonym = await skillSynonymRepository.GetSkillSynonym(id, cancellationToken);
        
        return synonym;
    }
}