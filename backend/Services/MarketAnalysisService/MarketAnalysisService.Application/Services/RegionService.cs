using MarketAnalysisService.Application.Interfaces;
using MarketAnalysisService.Domain.Dto;
using MarketAnalysisService.Domain.Models;

namespace MarketAnalysisService.Application.Services;

public class RegionService
{
    private readonly IRegionClient _client;
    private readonly IRegionRepository _repository;

    public RegionService(IRegionClient client, IRegionRepository repository)
    {
        _client = client;
        _repository = repository;
    }

    public async Task AddRegions(CancellationToken cancellationToken)
    {
        var regions = _client.FetchRegions(cancellationToken);

        var result = new List<Region>();
        
        foreach (var region in regions.Result)
        {
            FlattenRegion(region, result);
        }
    
        await _repository.AddRegions(result, cancellationToken);
    }

    public async Task<Region?> GetRegion(Int64 regionId, CancellationToken cancellationToken)
    {
        var result = await _repository.GetRegion(regionId, cancellationToken);
        
        return result;
    }

    public async Task DeleteRegions(CancellationToken cancellationToken)
    {
        await _repository.DeleteRegions(cancellationToken);
    }
    
    private void FlattenRegion(RegionDto dto, List<Region> result)
    {
        var parsedId = long.Parse(dto.Id);
        
        var region = new Region
        {
            Id = parsedId,
            Name = dto.Name
        };
    
        result.Add(region);
        
        if (dto.Areas.Any())
        {
            foreach (var childDto in dto.Areas)
            {
                FlattenRegion(childDto, result);
            }
        }
    }
}