using FluentMigrator;

namespace AuthService.Infrastructure.Migrations;

[Migration(20261017225400)]
public class InitialCreateAuthScheme : Migration
{
    public override void Up()
    {
        Execute.Sql("CREATE SCHEMA IF NOT EXISTS auth;");
        
        Create.Table("users").InSchema("auth")
            .WithColumn("id").AsInt64().PrimaryKey().Identity()
            .WithColumn("email").AsString(255).NotNullable().Unique()
            .WithColumn("password_hash").AsString(255).NotNullable()
            .WithColumn("role").AsString(20).NotNullable()
            .WithColumn("created_at").AsDateTime().NotNullable().WithDefault(SystemMethods.CurrentUTCDateTime);
    }

    public override void Down()
    {
        Delete.Table("users").InSchema("auth");
        Execute.Sql("DROP SCHEMA IF EXISTS auth CASCADE;");
    }
}