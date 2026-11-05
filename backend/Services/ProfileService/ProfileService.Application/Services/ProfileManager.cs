using ProfileService.Application.Dto;
using ProfileService.Application.Interfaces;
using ProfileService.Domain.Models;

namespace ProfileService.Application.Services;

public class ProfileManager(
    IProfileRepository profileRepository,
    IUserSkillRepository userSkillRepository,
    IUserRegionRepository userRegionRepository
)
{
    public async Task<ProfileDto?> GetProfile(long userId, CancellationToken cancellationToken)
    {
        var profile = await profileRepository.GetUserProfile(userId, cancellationToken);
        
        if (profile == null) 
            return null;

        var skills = await userSkillRepository.GetUserSkill(userId, cancellationToken);
        var regions = await userRegionRepository.GetUserRegions(userId, cancellationToken);

        return new ProfileDto
        {
            UserId = profile.UserId,
            DirectionId = profile.DirectionId,
            RemoteWork = profile.RemoteWork,
            SkillIds = skills.ToList(),
            RegionIds = regions.ToList()
        };
    }
    
    public async Task UpdateProfile(ProfileDto dto, CancellationToken cancellationToken)
    {
        var profile = new UserProfile
        {
            UserId = dto.UserId,
            DirectionId = dto.DirectionId,
            RemoteWork = dto.RemoteWork
        };
        await profileRepository.UpsertUserProfile(profile, cancellationToken);
        
        if (dto.SkillIds.Count > 0)
        {
            await userSkillRepository.ReplaceUserSkills(dto.UserId, dto.SkillIds, cancellationToken);
        }
        
        if (dto.RegionIds.Count > 0)
        {
            await userRegionRepository.ReplaceUserRegions(dto.UserId, dto.RegionIds, cancellationToken);
        }
    }
}