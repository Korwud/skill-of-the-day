namespace SkillService.Domain.Models;

public class SkillSynonym
{
    public long SkillId { get; set; }
    
    public string Synonym { get; set; } = string.Empty;
}