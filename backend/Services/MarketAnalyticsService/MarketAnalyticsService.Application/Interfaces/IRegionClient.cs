using MarketAnalyticsService.Domain.Dto;

namespace MarketAnalyticsService.Application.Interfaces;

public interface IRegionClient
{
    Task<IEnumerable<RegionDto>> FetchRegions(CancellationToken cancellationToken);
}