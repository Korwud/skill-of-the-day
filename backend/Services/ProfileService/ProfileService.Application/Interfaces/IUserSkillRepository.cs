namespace ProfileService.Application.Interfaces;

public interface IUserSkillRepository
{
    Task<IEnumerable<long>> GetUserSkill(long userId, CancellationToken cancellationToken);
    
    Task ReplaceUserSkills(long userId, IEnumerable<long> skillIds, CancellationToken cancellationToken);
    
    Task RemoveUserSkill(long userId, long skillId, CancellationToken cancellationToken);
}