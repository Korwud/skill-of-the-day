namespace ProfileService.Application.Interfaces;

public interface IUserRegionRepository
{
    Task<IEnumerable<long>> GetUserRegions(long userId, CancellationToken cancellationToken);
    
    Task ReplaceUserRegions(long userId, IEnumerable<long> regionIds, CancellationToken cancellationToken);
}