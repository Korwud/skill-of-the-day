using System.Net.Http.Headers;
using VacancyService.Application.Interfaces;
using VacancyService.Infrastructure.Clients;
using VacancyService.Infrastructure.Configurations;
using Core.Web;

Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddVacancyInfrastructure(builder.Configuration);

builder.Services.AddHttpClient<IVacancyClient, VacancyClient>(client =>
{
    client.BaseAddress = new Uri("https://api.hh.ru/");
    client.DefaultRequestHeaders.Add("HH-User-Agent", "skill-of-the-day/1.0 (nlovnas@mail.ru)");
    client.DefaultRequestHeaders.Add("User-Agent", "skill-of-the-day/1.0 (nlovnas@mail.ru)");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
    client.DefaultRequestHeaders.Authorization = 
        new AuthenticationHeaderValue("Bearer", builder.Configuration["Authorization"]);
});

var app = builder.BuildCommonWebApp();

app.Run();