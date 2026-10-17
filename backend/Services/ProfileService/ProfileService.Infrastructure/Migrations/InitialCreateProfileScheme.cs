using FluentMigrator;

namespace ProfileService.Infrastructure.Migrations;

[Migration(20261017214700)]
public class InitialCreateProfileScheme : Migration
{
    public override void Up()
    {
        Execute.Sql("CREATE SCHEMA IF NOT EXISTS profile;");

        Create.Table("user_profiles").InSchema("profile")
            .WithColumn("user_id").AsInt64().PrimaryKey()
            .WithColumn("direction_id").AsInt64()
            .WithColumn("remote_work").AsBoolean().NotNullable().WithDefaultValue(false);

        Create.Table("user_skills").InSchema("profile")
            .WithColumn("user_id").AsInt64().NotNullable()
            .WithColumn("skill_id").AsInt64().NotNullable();
        
        Create.PrimaryKey("pk_user_skills")
            .OnTable("user_skills").WithSchema("profile")
            .Columns("user_id",  "skill_id");
        
        Create.Table("user_regions").InSchema("profile")
            .WithColumn("user_id").AsInt64().NotNullable()
            .WithColumn("region_id").AsInt64().NotNullable();
        
        Create.PrimaryKey("pk_user_regions")
            .OnTable("user_regions").WithSchema("profile")
            .Columns("user_id", "region_id");
    }

    public override void Down()
    {
        Delete.Table("user_regions").InSchema("profile");
        Delete.Table("user_skills").InSchema("profile");
        Delete.Table("user_profiles").InSchema("profile");
        Execute.Sql("DROP SCHEMA IF EXISTS profile CASCADE;");
    }
}