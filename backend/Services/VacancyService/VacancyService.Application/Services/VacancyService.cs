using VacancyService.Application.Interfaces;
using VacancyService.Domain.Dto;
using VacancyService.Domain.Models;

namespace VacancyService.Application.Services;

public class VacancyService(
    IVacancyRepository vacancyRepository, 
    //ISkillRepository skillRepository,
    IVacancySkillRepository vacancySkillRepository,
    IVacancySnapshotRepository vacancySnapshotRepository,
    IVacancyClient vacancyClient )
{
    /// <summary>
    /// Временный метод до интеграции c кафкой
    /// </summary>
    public async Task AddVacancies(string profession, CancellationToken cancellationToken)
    {
        var generalVacanciesList = new List<VacancyDto>();
        
        var vacanciesList = new List<Vacancy>();

        var skills = new List<IEnumerable<string>>();

        var snapshotId = await vacancySnapshotRepository.AddSnapshot(
            new VacancySnapshot { CollectedAt = DateTime.UtcNow }, 
            cancellationToken);
        
        var queryParams = new Dictionary<string, string?>
        {
            { "text", profession },
            { "search_field", "name" },
            { "page", "0" },
            { "per_page", "100" }
        };

        var found = 100;
        var vacancyChecked = 0;

        while (found > vacancyChecked)
        {
            var generalVacancies = await vacancyClient.FetchGeneralVacancies(profession, queryParams, cancellationToken);
            found = generalVacancies.Found;

            if (generalVacancies.Items != null)
            {
                generalVacanciesList.AddRange(generalVacancies.Items);
            }
            
            vacancyChecked += 100;
            queryParams["page"] = (vacancyChecked / 100).ToString();
        }
        
        if (generalVacanciesList.Count > 0)
        {
            foreach (var generalVacancy in generalVacanciesList)
            {
                if (!long.TryParse(generalVacancy.ExternalId, out var externalId) || externalId <= 0)
                    continue;
                
                long.TryParse(generalVacancy.Directions!.First().Id, out var directionId);

                long.TryParse(generalVacancy.Region!.Id, out var regionId);
                
                var workFormat = generalVacancy.WorkFormat?.FirstOrDefault()?.Name ?? "Не указан";
                
                var vacancyDetails = await vacancyClient.FetchVacancyDetails(externalId, cancellationToken);

                if (vacancyDetails == null)
                    continue;
                
                var vacancy = new Vacancy
                {
                    ExternalId = generalVacancy.ExternalId,
                    SnapshotId = snapshotId,
                    DirectionId = directionId,
                    RegionId = regionId,
                    Title = generalVacancy.Title,
                    Employer = generalVacancy.Employer!.Name,
                    WorkFormat = workFormat,
                    Experience = generalVacancy.Experience!.Name,
                    PublishedAt = DateTimeOffset.Parse(generalVacancy.PublishedAt!).DateTime,
                    Description = vacancyDetails.Description,
                    Url = generalVacancy.Url,
                };
                
                vacanciesList.Add(vacancy);

                if (vacancyDetails.KeySkills != null)
                {
                    skills.Add(vacancyDetails.KeySkills.Select(skill => skill.Name));
                }
            }
        }
        
        var vacancyIds = await vacancyRepository.AddVacancies(vacanciesList, cancellationToken);

        
    }

    private async Task<List<VacancySkill>> GetVacancySkills(IEnumerable<long> vacancyIds, List<IEnumerable<string>> skills)
    {
        for (var i = 0; i < skills.Count; i++)
        {
            var vacancyId = vacancyIds.ElementAt(i);
            
            // var skill = skillRepository.GetSkill(name);
        }

        return new List<VacancySkill>();
    }

    public async Task<IEnumerable<Vacancy>> GetVacancies(CancellationToken cancellationToken)
    {
        return await vacancyRepository.GetVacancies(cancellationToken);
    }

    public async Task DeleteVacancies(CancellationToken cancellationToken)
    {
        await vacancyRepository.DeleteVacancies(cancellationToken);
    }
}