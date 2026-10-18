using System.Net.Http.Json;
using MarketAnalysisService.Application.Interfaces;
using MarketAnalysisService.Domain.Dto;

namespace MarketAnalysisService.Infrastructure.Clients;

public class DirectionClient : IDirectionClient
{
    private readonly HttpClient _httpClient;
    private const String ENDPOINT = "professional_roles";

    public DirectionClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }
    
    public async Task<DirectionApiDto> FetchDirections(CancellationToken cancellationToken)
    {
        var response = _httpClient.GetAsync(ENDPOINT, cancellationToken);

        if (response.Result.IsSuccessStatusCode)
        {
            var data = await response.Result.Content.ReadFromJsonAsync<DirectionApiDto>(cancellationToken);

            return data ?? new DirectionApiDto();
        }
        else
        {
            throw new HttpRequestException(response.Result.ReasonPhrase);
        }
    }
}