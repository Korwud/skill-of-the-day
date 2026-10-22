using System.Net.Http.Json;
using VacancyService.Application.Interfaces;
using VacancyService.Domain.Dto;
using Microsoft.AspNetCore.WebUtilities;

namespace VacancyService.Infrastructure.Clients;

public class VacancyClient(HttpClient httpClient) : IVacancyClient
{
    private const string Endpoint = "vacancies";
    private readonly List<string> _professions = ["C# разработчик", "Системный аналитик", "Тестировщик"];
    
    public async Task<VacancyAnswerDto> FetchGeneralVacancies(string profession, Dictionary<string, string?> queryParams, CancellationToken cancellationToken)
    {
        if (!_professions.Contains(profession))
        {
            throw new ArgumentException("Данная профессия пока не поддерживается сервисом.");
        }
        
        var url = QueryHelpers.AddQueryString(Endpoint, queryParams);

        var response = httpClient.GetAsync(url, cancellationToken);
        
        if (!response.Result.IsSuccessStatusCode)
        {
            throw new HttpRequestException(response.Result.ReasonPhrase);
        }
        
        var data = await response.Result.Content.ReadFromJsonAsync<VacancyAnswerDto>(cancellationToken);

        return data ?? new VacancyAnswerDto();
    }

    public async Task<VacancyDetailsDto?> FetchVacancyDetails(long vacancyId, CancellationToken cancellationToken)
    {
        var safeId = Uri.EscapeDataString(vacancyId.ToString());
        
        var url = $"{Endpoint}/{safeId}";
        
        var response = httpClient.GetAsync(url, cancellationToken);
        
        if (!response.Result.IsSuccessStatusCode)
        {
            if (response.Result.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return null;
            }
            
            throw new HttpRequestException(response.Result.ReasonPhrase);
        }
        
        var data = await response.Result.Content.ReadFromJsonAsync<VacancyDetailsDto>(cancellationToken);

        return data ?? new VacancyDetailsDto();
    }
}