using System.Text.Json.Serialization;

namespace VacancyService.Domain.Dto;

public class VacancyAnswerDto 
{
    [JsonPropertyName("items")]
    public IEnumerable<VacancyDto>? Items { get; set; }
    
    [JsonPropertyName("found")]
    public int Found { get; set; }
}

public class VacancyDto
{
    [JsonPropertyName("id")]
    public string ExternalId { get; set; } = string.Empty;
    
    [JsonPropertyName("professional_roles")]
    public IEnumerable<ProfessionDto>? Directions { get; set; }
    
    [JsonPropertyName("area")]
    public AreaDto? Region { get; set; }
    
    [JsonPropertyName("name")]
    public string Title { get; set; } = string.Empty;
    
    [JsonPropertyName("employer")]
    public EmployerDto? Employer { get; set; }
    
    [JsonPropertyName("work_format")]
    public IEnumerable<WorkFormatDto>? WorkFormat  { get; set; }
    
    [JsonPropertyName("experience")]
    public ExperienceDto? Experience { get; set; }
    
    [JsonPropertyName("published_at")]
    public string? PublishedAt { get; set; }
    
    [JsonPropertyName("alternate_url")]
    public string Url { get; set; } = string.Empty;
}

public class VacancyDetailsDto
{
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    
    [JsonPropertyName("key_skills")]
    public IEnumerable<KeySkillDto>? KeySkills { get; set; }
}

public class KeySkillDto
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}

public class ProfessionDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
}

public class AreaDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
}

public class EmployerDto
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}

public class WorkFormatDto
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}

public class ExperienceDto
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}