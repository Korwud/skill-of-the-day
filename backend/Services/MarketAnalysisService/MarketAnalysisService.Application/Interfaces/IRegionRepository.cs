using MarketAnalysisService.Domain.Models;

namespace MarketAnalysisService.Application.Interfaces;

public interface IRegionRepository
{
    Task AddRegions(List<Region> regions, CancellationToken cancellationToken);
    
    Task<Region?> GetRegion(Int64 id, CancellationToken cancellationToken);

    Task DeleteRegions(CancellationToken cancellationToken);
}