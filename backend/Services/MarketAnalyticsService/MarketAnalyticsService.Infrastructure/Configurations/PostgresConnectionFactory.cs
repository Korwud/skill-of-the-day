using System.Data;
using Npgsql;

namespace MarketAnalyticsService.Infrastructure.Configurations;

public class PostgresConnectionFactory
{
    private readonly string _connectionString;

    public PostgresConnectionFactory(string connectionString)
    {
        _connectionString = connectionString ?? throw new ArgumentNullException();
    }

    public IDbConnection GetConnection() => new NpgsqlConnection(_connectionString);
}