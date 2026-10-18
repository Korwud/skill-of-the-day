using MarketAnalysisService.Domain.Models;

namespace MarketAnalysisService.Application.Interfaces;

public interface IDirectionRepository
{
    Task AddDirections(List<Direction> directions, CancellationToken cancellationToken);
    
    Task<Direction?> GetDirection(Int64 id, CancellationToken cancellationToken);

    Task DeleteDirections(CancellationToken cancellationToken);
}