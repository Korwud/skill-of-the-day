using Microsoft.AspNetCore.Mvc;

namespace VacancyService.Api.Controllers;

[ApiController]
[Route("api/v1/vacancies")]
public class VacancyController(Application.Services.VacancyManager manager) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> AddVacancies(CancellationToken cancellationToken, string profession = "Системный аналитик")
    {
        await manager.AddVacancies(profession, cancellationToken);
        
        return Ok(new { message = $"Вакансии профессии {profession} добавлены." });
    }

    [HttpGet]
    public async Task<IActionResult> GetVacancies(CancellationToken cancellationToken)
    {
        var vacancies = await manager.GetVacancies(cancellationToken);
        
        return Ok(vacancies);
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteVacancies(CancellationToken cancellationToken)
    {
        await manager.DeleteVacancies(cancellationToken);
        
        return Ok(new { message = $"Вакансии были удалены." });
    }
}