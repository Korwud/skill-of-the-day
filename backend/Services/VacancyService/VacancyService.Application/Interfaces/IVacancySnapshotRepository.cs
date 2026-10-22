using VacancyService.Domain.Models;

namespace VacancyService.Application.Interfaces;

public interface IVacancySnapshotRepository
{
    public Task<long> AddSnapshot(VacancySnapshot snapshot, CancellationToken cancellationToken);
}