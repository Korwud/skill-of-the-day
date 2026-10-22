using System.Net.Http.Json;
using MarketAnalyticsService.Application.Interfaces;
using MarketAnalyticsService.Domain.Dto;

namespace MarketAnalyticsService.Infrastructure.Clients;

public class DirectionClient(HttpClient httpClient) : IDirectionClient
{
    private const string Endpoint = "professional_roles";
    
    public async Task<DirectionApiDto> FetchDirections(CancellationToken cancellationToken)
    {
        var response = httpClient.GetAsync(Endpoint, cancellationToken);

        if (response.Result.IsSuccessStatusCode)
        {
            var data = await response.Result.Content.ReadFromJsonAsync<DirectionApiDto>(cancellationToken);

            return data ?? new DirectionApiDto();
        }
        
        throw new HttpRequestException(response.Result.ReasonPhrase);
    }
}