using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProfileService.Application.Dto;
using ProfileService.Application.Services;

namespace ProfileService.Api.Controllers;

[ApiController]
[Route("api/v1/profile")]
[Authorize]
public class ProfileController(ProfileManager profileManager) : ControllerBase
{
    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile(CancellationToken cancellationToken)
    {
        var userIdStr = User.FindFirstValue("sub");
        
        if (string.IsNullOrEmpty(userIdStr) || !long.TryParse(userIdStr, out var userId))
        {
            return Unauthorized("Неверный формат ID в токене");
        }

        var profile = await profileManager.GetProfile(userId, cancellationToken);
        
        if (profile == null)
            return NotFound();

        return Ok(profile);
    }
    
    [HttpPut("me")]
    public async Task<IActionResult> UpdateMyProfile([FromBody] ProfileDto dto, CancellationToken cancellationToken)
    {
        var userIdStr = User.FindFirstValue("sub");
        
        if (string.IsNullOrEmpty(userIdStr) || !long.TryParse(userIdStr, out var userId))
            return Unauthorized();
        
        dto.UserId = userId; 

        await profileManager.UpdateProfile(dto, cancellationToken);
        
        return Ok(new { Message = "Профиль обновлен" });
    }
    
    [HttpGet("admin")]
    [Authorize(Roles = "Admin")] 
    public IActionResult AdminOnly()
    {
        return Ok("Hello, admin!");
    }
}