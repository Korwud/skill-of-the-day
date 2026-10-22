using MarketAnalyticsService.Domain.Dto;
using MarketAnalyticsService.Domain.Models;
using MarketAnalyticsService.Application.Interfaces;

namespace MarketAnalyticsService.Application.Services;

public class DirectionService(IDirectionClient client, IDirectionRepository repository)
{
    public async Task SyncDirections(CancellationToken cancellationToken)
    {
        var directions = client.FetchDirections(cancellationToken);
        
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
        
        await repository.AddDirections(result, cancellationToken);
    }
    
    public async Task<Direction?> GetDirection(long directionId, CancellationToken cancellationToken)
    {
        var result = await repository.GetDirection(directionId, cancellationToken);
        
        return result;
    }

    public async Task DeleteDirections(CancellationToken cancellationToken)
    {
        await repository.DeleteDirections(cancellationToken);
    }
}