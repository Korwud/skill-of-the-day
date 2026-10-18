using Microsoft.AspNetCore.Mvc;
using MarketAnalysisService.Application.Services;

namespace MarketAnalysisService.Api.Controllers;

[ApiController]
[Route("api/directions")]
public class DirectionsController : ControllerBase
{
    private readonly DirectionService _service;

    public DirectionsController(DirectionService service)
    {
        _service = service;
    }
    
    [HttpPost]
    public async Task<IActionResult> StartSync(CancellationToken cancellationToken)
    {
        await _service.SyncDirections(cancellationToken);
        
        return Ok(new { Message = "Профессии добавлены!" });
    }
    
    [HttpGet]
    public async Task<IActionResult> GetDirection(Int64 id, CancellationToken cancellationToken)
    {
        var direction = await _service.GetDirection(id, cancellationToken);
        
        if (direction != null && !string.IsNullOrWhiteSpace(direction.Name))
        {
            return Ok(new { Message = "Профессия: " +  direction.Name });
        } 
        else
        {
            return NotFound(new { Message = "Профессия не найдена." });
        }
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteDirections(CancellationToken cancellationToken)
    {
        await _service.DeleteDirections(cancellationToken);
        return Ok(new { Message = "Профессии удалены." });
    }
}