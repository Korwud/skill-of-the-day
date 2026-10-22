using Microsoft.AspNetCore.Mvc;
using MarketAnalyticsService.Application.Services;

namespace MarketAnalyticsService.Api.Controllers;

[ApiController]
[Route("api/v1/regions")]
public class RegionsController(RegionService service) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> AddRegions(CancellationToken cancellationToken)
    {
        await service.AddRegions(cancellationToken);
        
        return Ok(new { Message = "Регионы добавлены!" });
    }

    [HttpGet]
    public async Task<IActionResult> GetRegion(long id, CancellationToken cancellationToken)
    {
        var region = await service.GetRegion(id, cancellationToken);
        
        if (region != null && !string.IsNullOrWhiteSpace(region.Name))
        {
            return Ok(new { Message = "Регион: " +  region.Name });
        } 
        
        return NotFound(new { Message = "Регион не найден." });
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteRegions(CancellationToken cancellationToken)
    {
        await service.DeleteRegions(cancellationToken);
        
        return Ok(new { Message = "Регионы удалены." });
    }
}