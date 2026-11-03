using SkillService.Application.Interfaces;
using SkillService.Domain.Models;
using VacancyService.Application.Interfaces;
using VacancyService.Domain.Dto;
using VacancyService.Domain.Models;

namespace VacancyService.Application.Services;

public class VacancyService(
    IVacancyRepository vacancyRepository, 
    IVacancySnapshotRepository vacancySnapshotRepository,
    IVacancySkillRepository vacancySkillRepository,
    IVacancyClient vacancyClient,
    ISkillClient skillClient)
{
    /// <summary>
    /// Временный метод до интеграции c кафкой
    /// </summary>
    public async Task AddVacancies(string profession, CancellationToken cancellationToken)
    {
        var generalVacanciesList = new List<VacancyDto>();
        var vacanciesList = new List<Vacancy>();
        var skillList = new List<string>();
        var vacanciesSkills = new Dictionary<long, List<string>>();

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

        var found = 950;
        var vacancyChecked = 0;

        while (found > vacancyChecked)
        {
            var generalVacancies = await vacancyClient.FetchGeneralVacancies(profession, queryParams, cancellationToken);
            found = generalVacancies.Found;

            if (generalVacancies.Items != null)
            {
                generalVacanciesList.AddRange(generalVacancies.Items);
            }
            
            vacancyChecked += 1000;
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
                    skillList = skillList.Concat(vacancyDetails.KeySkills.Select(skill => skill.Name)).ToList();
                    vacanciesSkills[externalId] = skillList;
                }
            }
        }
        
        var vacancyIdPairs = await vacancyRepository.AddVacancies(vacanciesList, cancellationToken);

        await skillClient.AddSkills(skillList, cancellationToken);

        var skillsForVacancies = await skillClient.GetSkillsByName(skillList, cancellationToken);

        var allVacancySkills = GetAllVacancySkills(vacancyIdPairs, vacanciesSkills, skillsForVacancies);
        
        var uniqueVacancySkills = allVacancySkills
            .GroupBy(vacancySkill => new { vacancySkill.VacancyId, vacancySkill.SkillId })
            .Select(group => group.First());

        await vacancySkillRepository.AddVacancySkills(uniqueVacancySkills, cancellationToken);
    }

    private IEnumerable<VacancySkill> GetAllVacancySkills(
        Dictionary<long, long> pairs, 
        Dictionary<long, List<string>> vacanciesSkills,
        Dictionary<string, long>? allSkills)
    {
        var vacancySkillList = new List<VacancySkill>();
        
        var externalIds = pairs.Keys.ToList();

        foreach (var externalId in externalIds)
        {
            var skills = vacanciesSkills[externalId];
            
            var vacancyId = pairs[externalId];

            foreach (var skill in skills)
            {
                vacancySkillList.Add(new VacancySkill
                {
                    VacancyId = vacancyId,
                    SkillId = allSkills[skill.ToLower()],
                    Category = "REQUIRED"
                });
            }
        }

        return vacancySkillList;
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