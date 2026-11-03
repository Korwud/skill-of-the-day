using SkillService.Application.Interfaces;
using SkillService.Domain.Models;

namespace SkillService.Application.Services;

public class EducationalResourcesService(
    IEducationalResourcesRepository educationalResourcesRepository
)
{
    public async Task<long> AddEducationalResource(EducationalResource educationalResource, CancellationToken cancellationToken)
    {
        var id = await educationalResourcesRepository.AddEducationalResource(educationalResource, cancellationToken);
        
        return id;
    }

    public async Task<EducationalResource?> GetEducationalResource(long id, CancellationToken cancellationToken)
    {
        var educationalResource = await educationalResourcesRepository.GetEducationalResource(id, cancellationToken);
        
        return educationalResource;
    }

    public async Task DeleteEducationalResource(long id, CancellationToken cancellationToken)
    {
        await educationalResourcesRepository.DeleteEducationalResource(id, cancellationToken);
    }
}