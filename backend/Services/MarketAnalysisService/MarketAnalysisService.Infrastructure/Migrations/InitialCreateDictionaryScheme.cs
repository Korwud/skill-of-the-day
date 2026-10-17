using FluentMigrator;

namespace MarketAnalysisService.Infrastructure.Migrations;

[Migration(20261017214100)]
public class InitialCreateDictionaryScheme : Migration
{
    public override void Up()
    {
        Execute.Sql("CREATE SCHEMA IF NOT EXISTS dictionary;");

        Create.Table("directions").InSchema("dictionary")
            .WithColumn("id").AsInt64().PrimaryKey().Identity()
            .WithColumn("name").AsString(255).NotNullable().Unique();
        
        Create.Table("regions").InSchema("dictionary")
            .WithColumn("id").AsInt64().PrimaryKey().Identity()
            .WithColumn("name").AsString(255).NotNullable().Unique();
    }

    public override void Down()
    {
        Delete.Table("regions").InSchema("dictionary");
        Delete.Table("directions").InSchema("dictionary");
        Execute.Sql("DROP SCHEMA IF EXISTS dictionary CASCADE;");
    }
}