using System.Text.Json.Serialization;

namespace MarketAnalysisService.Domain.Dto;

public class RoleDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
    
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}

public class CategoryDto
{
    [JsonPropertyName("roles")]
    public List<RoleDto> Roles { get; set; } = new List<RoleDto>();
}

public class DirectionApiDto
{
    [JsonPropertyName("categories")]
    public List<CategoryDto> Categories { get; set; } = new List<CategoryDto>();
}