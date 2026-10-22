using System.Data;
using Npgsql;

namespace Core.Configurations;

public class PostgresConnectionFactory(string connectionString)
{
    public IDbConnection GetConnection() => new NpgsqlConnection(connectionString);
}