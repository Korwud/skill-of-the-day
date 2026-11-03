using System.Net.Http.Json;
using SkillService.Application.Interfaces;
using SkillService.Domain.Models;

namespace SkillService.Infrastructure.Clients;

public class SkillClient(HttpClient httpClient) : ISkillClient
{
    public async Task AddSkills(IEnumerable<string> skillNames, CancellationToken cancellationToken)
    {
        var response = await httpClient.PostAsJsonAsync("api/v1/skills", skillNames, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task<Dictionary<string, long>?> GetSkillsByName(IEnumerable<string> skillNames, CancellationToken cancellationToken)
    {
        var response = await httpClient.PostAsJsonAsync("api/v1/skills/names", skillNames, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<Dictionary<string, long>?>(cancellationToken);
    }
}