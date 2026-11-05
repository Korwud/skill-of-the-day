namespace ProfileService.Domain.Models;

public class UserProfile
{
    public long UserId { get; set; }
    public long? DirectionId { get; set; }
    public bool RemoteWork = false;
}