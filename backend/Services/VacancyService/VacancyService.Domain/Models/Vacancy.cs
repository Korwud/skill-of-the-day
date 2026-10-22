namespace VacancyService.Domain.Models;

public class Vacancy
{
    public long Id { get; set; }
    public string ExternalId { get; set; } = String.Empty;
    public long SnapshotId { get; set; }
    public long DirectionId { get; set; }
    public long? RegionId { get; set; }
    public string Title { get; set; } = String.Empty;
    public string? Employer { get; set; }
    public string? WorkFormat { get; set; } 
    public string? Experience { get; set; } 
    public DateTime? PublishedAt { get; set; } 
    public string? Description { get; set; }
    public string Url { get; set; } = String.Empty;
}