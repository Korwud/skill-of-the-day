namespace ProfileService.Application.Dto;

public class ProfileDto
{
    public long UserId { get; set; }
    public long? DirectionId { get; set; }
    public bool RemoteWork { get; set; }
    
    public List<long> SkillIds { get; set; } = [];
    public List<long> RegionIds { get; set; } = [];
}