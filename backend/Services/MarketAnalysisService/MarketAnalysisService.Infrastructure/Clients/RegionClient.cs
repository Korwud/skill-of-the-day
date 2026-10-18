using System.Net.Http.Json;
using MarketAnalysisService.Application.Interfaces;
using MarketAnalysisService.Domain.Dto;

namespace MarketAnalysisService.Infrastructure.Clients;

public class RegionClient : IRegionClient
{
    private readonly HttpClient _httpClient;
    private const String ENDPOINT = "areas";

    public RegionClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }
    
    public async Task<IEnumerable<RegionDto>> FetchRegions(CancellationToken cancellationToken)
    {
        var response = _httpClient.GetAsync(ENDPOINT, cancellationToken);

        if (response.Result.IsSuccessStatusCode)
        {
            var data = await response.Result.Content.ReadFromJsonAsync<List<RegionDto>>(cancellationToken);

            return data ?? new List<RegionDto>();
        }
        else
        {
            throw new HttpRequestException(response.Result.ReasonPhrase);
        }
    }
}