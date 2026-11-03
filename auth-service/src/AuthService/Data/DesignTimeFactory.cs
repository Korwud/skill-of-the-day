using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace AuthService.Data;

public sealed class DesignTimeFactory : IDesignTimeDbContextFactory<AuthDbContext>
{
    public AuthDbContext CreateDbContext(string[] args) => new(new DbContextOptionsBuilder<AuthDbContext>()
        .UseNpgsql(Environment.GetEnvironmentVariable("ConnectionStrings__AuthDb") ?? "Host=localhost;Database=skill_day_auth;Username=auth", p => p.MigrationsHistoryTable("__EFMigrationsHistory", "auth"))
        .Options);
}
