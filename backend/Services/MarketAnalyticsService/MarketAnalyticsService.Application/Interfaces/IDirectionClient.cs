using MarketAnalyticsService.Domain.Dto;

namespace MarketAnalyticsService.Application.Interfaces;

public interface IDirectionClient
{
    Task<DirectionApiDto> FetchDirections(CancellationToken cancellationToken);
}