using Core.Web;
using SkillService.Infrastructure.Configurations;

Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSkillInfrastructure(builder.Configuration);

var app = builder.BuildCommonWebApp();

app.Run();