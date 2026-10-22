using VacancyService.Domain.Dto;

namespace VacancyService.Application.Interfaces;

public interface IVacancyClient
{
    public Task<VacancyAnswerDto> FetchGeneralVacancies(string profession, Dictionary<string, string?> queryParams, CancellationToken cancellationToken);
    
    public Task<VacancyDetailsDto?> FetchVacancyDetails(long vacancyId, CancellationToken cancellationToken);
}