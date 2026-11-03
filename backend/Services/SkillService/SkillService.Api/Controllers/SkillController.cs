using Microsoft.AspNetCore.Mvc;
using SkillService.Domain.Models;

namespace SkillService.Api.Controllers;

[ApiController]
[Route("api/v1/skills")]
public class SkillController(Application.Services.SkillService service) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> AddSkills(
        [FromBody] IEnumerable<string> skillNames, 
        CancellationToken cancellationToken)
    {
        var skills = skillNames.Select(name => new SkillName { Name = name.Trim().ToLower() });
        
        await service.AddSkills(skills, cancellationToken);
        
        return Ok(); 
    }

    [HttpPost("names")]
    public async Task<IActionResult> GetSkills(
        [FromBody] IEnumerable<string> names, 
        CancellationToken cancellationToken)
    {
        var skills = await service.GetSkillsByName(names, cancellationToken);
        
        return Ok(skills);
    }
}