using MarketAnalysisService.Domain.Dto;

namespace MarketAnalysisService.Application.Interfaces;

public interface IDirectionClient
{
    Task<DirectionApiDto> FetchDirections(CancellationToken cancellationToken);
}