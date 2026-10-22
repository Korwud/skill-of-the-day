using MarketAnalyticsService.Domain.Dto;
using MarketAnalyticsService.Domain.Models;
using MarketAnalyticsService.Application.Interfaces;

namespace MarketAnalyticsService.Application.Services;

public class RegionService(IRegionClient client, IRegionRepository repository)
{
    public async Task AddRegions(CancellationToken cancellationToken)
    {
        var regions = client.FetchRegions(cancellationToken);

        var result = new List<Region>();
        
        foreach (var region in regions.Result)
        {
            FlattenRegion(region, result);
        }
    
        await repository.AddRegions(result, cancellationToken);
    }

    public async Task<Region?> GetRegion(long regionId, CancellationToken cancellationToken)
    {
        var result = await repository.GetRegion(regionId, cancellationToken);
        
        return result;
    }

    public async Task DeleteRegions(CancellationToken cancellationToken)
    {
        await repository.DeleteRegions(cancellationToken);
    }
    
    private static void FlattenRegion(RegionDto dto, List<Region> result)
    {
        var parsedId = long.Parse(dto.Id);
        
        var region = new Region
        {
            Id = parsedId,
            Name = dto.Name
        };
    
        result.Add(region);
        
        foreach (var childDto in dto.Areas)
        {
            FlattenRegion(childDto, result);
        }
    }
}