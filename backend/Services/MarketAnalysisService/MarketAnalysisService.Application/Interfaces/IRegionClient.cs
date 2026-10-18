using MarketAnalysisService.Domain.Dto;

namespace MarketAnalysisService.Application.Interfaces;

public interface IRegionClient
{
    Task<IEnumerable<RegionDto>> FetchRegions(CancellationToken cancellationToken);
}