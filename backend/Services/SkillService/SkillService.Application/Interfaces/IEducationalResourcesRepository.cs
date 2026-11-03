using SkillService.Domain.Models;

namespace SkillService.Application.Interfaces;

public interface IEducationalResourcesRepository
{
    public Task<long> AddEducationalResource(EducationalResource educationalResource, CancellationToken cancellationToken);
    
    public Task<EducationalResource?> GetEducationalResource(long id, CancellationToken cancellationToken);
    
    public Task DeleteEducationalResource(long id, CancellationToken cancellationToken);
}