using VacancyService.Domain.Models;

namespace VacancyService.Application.Interfaces;

public interface IVacancyRepository
{
    public Task<IEnumerable<long>> AddVacancies(List<Vacancy> vacancies, CancellationToken cancellationToken);
    
    public Task<IEnumerable<Vacancy>> GetVacancies(CancellationToken cancellationToken);
    
    public Task DeleteVacancies(CancellationToken cancellationToken);
}