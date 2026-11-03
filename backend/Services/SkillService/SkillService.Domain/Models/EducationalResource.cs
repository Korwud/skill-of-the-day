namespace SkillService.Domain.Models;

public class EducationalResource
{
    public long SkillId { get; set; }
    public string? Title { get; set; }
    public string Url { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}