using Microsoft.AspNetCore.Mvc;
using MarketAnalyticsService.Application.Services;

namespace MarketAnalysisService.Api.Controllers;

[ApiController]
[Route("api/regions")]
public class RegionsController : ControllerBase
{
    private readonly RegionService _service;

    public RegionsController(RegionService service)
    {
        _service = service;
    }
    
    [HttpPost]
    public async Task<IActionResult> AddRegions(CancellationToken cancellationToken)
    {
        await _service.AddRegions(cancellationToken);
        
        return Ok(new { Message = "Регионы добавлены!" });
    }

    [HttpGet]
    public async Task<IActionResult> GetRegion(Int64 id, CancellationToken cancellationToken)
    {
        var region = await _service.GetRegion(id, cancellationToken);
        
        if (region != null && !string.IsNullOrWhiteSpace(region.Name))
        {
            return Ok(new { Message = "Регион: " +  region.Name });
        } else
        {
            return NotFound(new { Message = "Регион не найден." });
        }
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteRegions(CancellationToken cancellationToken)
    {
        await _service.DeleteRegions(cancellationToken);
        
        return Ok(new { Message = "Регионы удалены." });
    }
}