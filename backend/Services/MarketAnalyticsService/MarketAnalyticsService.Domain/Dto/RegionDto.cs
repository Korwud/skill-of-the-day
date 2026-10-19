using System.Text.Json.Serialization;

namespace MarketAnalyticsService.Domain.Dto;

public class RegionDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
    
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
    
    [JsonPropertyName("areas")]
    public List<RegionDto> Areas { get; set; } = new List<RegionDto>();
}