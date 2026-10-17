using FluentMigrator;

namespace SkillService.Infrastructure.Migrations;

[Migration(20261017212600)]
public class InitialCreateSkillScheme : Migration
{
    public override void Up()
    {
        Execute.Sql("CREATE SCHEMA IF NOT EXISTS skill;");

        Create.Table("skills").InSchema("skill")
            .WithColumn("id").AsInt64().Identity().PrimaryKey()
            .WithColumn("name").AsString(255).NotNullable();
        
        Create.Table("skill_synonyms").InSchema("skill")
            .WithColumn("id").AsInt64().Identity().PrimaryKey()
            .WithColumn("skill_id").AsInt64().NotNullable()
            .WithColumn("synonym").AsString(255).NotNullable();
        
        Create.ForeignKey("fk_skill_synonyms_skill_id_skills")
            .FromTable("skill_synonyms").InSchema("skill").ForeignColumn("skill_id")
            .ToTable("skills").InSchema("skill").PrimaryColumn("id")
            .OnDelete(System.Data.Rule.Cascade);
        
        Create.Table("educational_resources").InSchema("skill")
            .WithColumn("id").AsInt64().Identity().PrimaryKey()
            .WithColumn("skill_id").AsInt64().NotNullable()
            .WithColumn("title").AsString(255)
            .WithColumn("url").AsString(int.MaxValue).NotNullable()
            .WithColumn("is_active").AsBoolean().NotNullable().WithDefaultValue(false);
        
        Create.ForeignKey("fk_educational_resources_skill_id_skills")
            .FromTable("educational_resources").InSchema("skill").ForeignColumn("skill_id")
            .ToTable("skills").InSchema("skill").PrimaryColumn("id")
            .OnDelete(System.Data.Rule.Cascade);
    }

    public override void Down()
    {
        Delete.Table("educational_resources").InSchema("skill");
        Delete.Table("skill_synonyms").InSchema("skill");
        Delete.Table("skills").InSchema("skill");
        Execute.Sql("DROP SCHEMA IF EXISTS skill CASCADE;");
    }
}