using Microsoft.AspNetCore.Mvc;
using MarketAnalyticsService.Application.Services;

namespace MarketAnalyticsService.Api.Controllers;

[ApiController]
[Route("api/v1/directions")]
public class DirectionsController(DirectionService service) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> StartSync(CancellationToken cancellationToken)
    {
        await service.SyncDirections(cancellationToken);
        
        return Ok(new { Message = "Профессии добавлены!" });
    }
    
    [HttpGet]
    public async Task<IActionResult> GetDirection(long id, CancellationToken cancellationToken)
    {
        var direction = await service.GetDirection(id, cancellationToken);
        
        if (direction != null && !string.IsNullOrWhiteSpace(direction.Name))
        {
            return Ok(new { Message = "Профессия: " +  direction.Name });
        } 
        
        return NotFound(new { Message = "Профессия не найдена." });
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteDirections(CancellationToken cancellationToken)
    {
        await service.DeleteDirections(cancellationToken);
        
        return Ok(new { Message = "Профессии удалены." });
    }
}