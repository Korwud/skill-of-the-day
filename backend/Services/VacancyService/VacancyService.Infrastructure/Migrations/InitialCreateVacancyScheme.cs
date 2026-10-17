namespace VacancyService.Infrastructure.Migrations;

using FluentMigrator;

[Migration(20261017191900)]
public class InitialCreateVacancyScheme : Migration
{
    public override void Up()
    {
        Execute.Sql("CREATE SCHEMA IF NOT EXISTS vacancy;");
        
        Create.Table("vacancies").InSchema("vacancy")
            .WithColumn("id").AsInt64().PrimaryKey().Identity()
            .WithColumn("external_id").AsString(255).NotNullable()
            .WithColumn("snapshot_id").AsInt64().NotNullable()
            .WithColumn("direction_id").AsInt64().NotNullable()
            .WithColumn("region_id").AsInt64()
            .WithColumn("title").AsString(500).NotNullable()
            .WithColumn("employer").AsString(500)
            .WithColumn("work_format").AsString(100)
            .WithColumn("experience").AsString(100)
            .WithColumn("published_at").AsDateTime()
            .WithColumn("description").AsString(int.MaxValue)
            .WithColumn("url").AsString(int.MaxValue).NotNullable()
            .WithColumn("structure_required").AsBoolean().NotNullable().WithDefaultValue(false);

        Create.Table("vacancy_snapshots").InSchema("vacancy")
            .WithColumn("id").AsInt64().PrimaryKey().Identity()
            .WithColumn("collected_at").AsDateTime().NotNullable();
        
        Create.ForeignKey("fk_vacancy_snapshot_id_vacancy_snapshots")
            .FromTable("vacancies").InSchema("vacancy").ForeignColumn("snapshot_id")
            .ToTable("vacancy_snapshots").InSchema("vacancy").PrimaryColumn("id")
            .OnDelete(System.Data.Rule.Cascade);

        Create.Table("vacancy_skills").InSchema("vacancy")
            .WithColumn("vacancy_id").AsInt64()
            .WithColumn("skill_id").AsInt64()
            .WithColumn("category").AsString(20).NotNullable()
            .WithColumn("requirement_quote").AsString(int.MaxValue);
        
        Create.PrimaryKey("pk_vacancy_skills")
            .OnTable("vacancy_skills").WithSchema("vacancy")
            .Columns("vacancy_id", "skill_id");
        
        Create.ForeignKey("fk_vacancy_skills_vacancy_id_vacancies")
            .FromTable("vacancy_skills").InSchema("vacancy").ForeignColumn("vacancy_id")
            .ToTable("vacancies").InSchema("vacancy").PrimaryColumn("id")
            .OnDelete(System.Data.Rule.Cascade);

    }

    public override void Down()
    {
        Delete.Table("vacancy_skills").InSchema("vacancy");
        Delete.Table("vacancies").InSchema("vacancy");
        Delete.Table("vacancy_snapshots").InSchema("vacancy");
        Execute.Sql("DROP SCHEMA IF EXISTS vacancy CASCADE;");
    }
}