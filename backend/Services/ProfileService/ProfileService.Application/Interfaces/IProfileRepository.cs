using ProfileService.Domain.Models;

namespace ProfileService.Application.Interfaces;

public interface IProfileRepository
{
    public Task<UserProfile?> GetUserProfile(long id, CancellationToken cancellationToken);
    
    public Task UpsertUserProfile(UserProfile profile, CancellationToken cancellationToken);
    
    public Task DeleteUserProfile(long id, CancellationToken cancellationToken);
}