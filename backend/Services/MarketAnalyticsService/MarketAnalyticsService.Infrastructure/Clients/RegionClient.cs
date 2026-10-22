using System.Net.Http.Json;
using MarketAnalyticsService.Application.Interfaces;
using MarketAnalyticsService.Domain.Dto;

namespace MarketAnalyticsService.Infrastructure.Clients;

public class RegionClient(HttpClient httpClient) : IRegionClient
{
    private const string Endpoint = "areas";
    
    public async Task<IEnumerable<RegionDto>> FetchRegions(CancellationToken cancellationToken)
    {
        var response = httpClient.GetAsync(Endpoint, cancellationToken);

        if (response.Result.IsSuccessStatusCode)
        {
            var data = await response.Result.Content.ReadFromJsonAsync<List<RegionDto>>(cancellationToken);

            return data ?? new List<RegionDto>();
        }
        
        throw new HttpRequestException(response.Result.ReasonPhrase);
    }
}