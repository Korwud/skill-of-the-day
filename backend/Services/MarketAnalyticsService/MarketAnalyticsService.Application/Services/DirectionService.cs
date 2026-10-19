using MarketAnalyticsService.Domain.Dto;
using MarketAnalyticsService.Domain.Models;
using MarketAnalyticsService.Application.Interfaces;

namespace MarketAnalyticsService.Application.Services;

public class DirectionService
{
    private readonly IDirectionClient _client;
    private readonly IDirectionRepository _repository;

    public DirectionService(IDirectionClient client, IDirectionRepository repository)
    {
        _client = client;
        _repository = repository;
    }

    public async Task SyncDirections(CancellationToken cancellationToken)
    {
        var directions = _client.FetchDirections(cancellationToken);
        
        var result = new List<Direction>();

        foreach (var category in directions.Result.Categories)
        {
            foreach (var role in category.Roles)
            {
                var direction = new Direction
                {
                    Id = long.Parse(role.Id),
                    Name = role.Name
                };
            
                result.Add(direction);
            }
        }
        
        await _repository.AddDirections(result, cancellationToken);
    }
    
    public async Task<Direction?> GetDirection(Int64 directionId, CancellationToken cancellationToken)
    {
        var result = await _repository.GetDirection(directionId, cancellationToken);
        
        return result;
    }

    public async Task DeleteDirections(CancellationToken cancellationToken)
    {
        await _repository.DeleteDirections(cancellationToken);
    }
}