using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Diagnostics;
using Yuzu.Data.Services;

namespace Yuzu.Data.Postgresql
{
    /// <summary>
    /// Service for initializing the PostgreSQL database
    /// </summary>
    public class DatabaseInitializer
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<DatabaseInitializer> _logger;
        private readonly BackgroundImageSeederService _backgroundImageSeeder;
        
        /// <summary>
        /// Initializes a new instance of the DatabaseInitializer class
        /// </summary>
        /// <param name="logger">Logger for recording information and errors</param>
        /// <param name="backgroundImageSeeder">Service to seed background images</param>
        /// <param name="serviceProvider">Service provider to resolve the correct DbContext</param>
        public DatabaseInitializer(
            ILogger<DatabaseInitializer> logger,
            BackgroundImageSeederService backgroundImageSeeder,
            IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _backgroundImageSeeder = backgroundImageSeeder ?? throw new ArgumentNullException(nameof(backgroundImageSeeder));
        }
        
        /// <summary>
        /// Initializes the database by applying migrations
        /// </summary>
        public async Task InitializeDatabaseAsync()
        {
            try
            {
                var stopwatch = Stopwatch.StartNew();
                _logger.LogInformation("Starting database initialization");
                
                // Use direct service provider to get DbContext
                var dbContext = _serviceProvider.GetService(typeof(Yuzu.Data.YuzuDbContext)) as Yuzu.Data.YuzuDbContext;
                
                if (dbContext == null)
                {
                    throw new InvalidOperationException("Could not resolve YuzuDbContext from service provider");
                }
                
                _logger.LogInformation("Successfully resolved YuzuDbContext for database initialization");
                
                // Apply any pending migrations
                await dbContext.Database.EnsureCreatedAsync();
                _logger.LogInformation("Successfully created database");
                
                // Seed system background images
                await SeedBackgroundImagesAsync();
                
                stopwatch.Stop();
                _logger.LogInformation("Database initialization completed in {ElapsedMilliseconds}ms", stopwatch.ElapsedMilliseconds);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while initializing the database: {Message}", ex.Message);
                if (ex.InnerException != null)
                {
                    _logger.LogError("Inner exception: {Message}", ex.InnerException.Message);
                }
                throw;
            }
        }
        
        /// <summary>
        /// Creates all necessary database objects (tables, indexes, etc.)
        /// </summary>
        public async Task EnsureCreatedAsync()
        {
            try
            {
                var stopwatch = Stopwatch.StartNew();
                _logger.LogInformation("Ensuring database is created");
                
                // Use the service provider to get the DbContext
                var dbContext = _serviceProvider.GetService(typeof(Yuzu.Data.YuzuDbContext)) as Yuzu.Data.YuzuDbContext;
                
                if (dbContext == null)
                {
                    throw new InvalidOperationException("Could not resolve YuzuDbContext from service provider");
                }
                
                // Get the connection string from the DbContext
                var connectionString = dbContext.Database.GetConnectionString() ?? string.Empty;
                if (string.IsNullOrEmpty(connectionString))
                {
                    throw new InvalidOperationException("Connection string not found in DbContext");
                }
                
                // Create a connection builder from the connection string
                var builder = new Npgsql.NpgsqlConnectionStringBuilder(connectionString);
                var databaseName = builder.Database;
                
                // Create a new connection string to connect to the postgres database temporarily
                builder.Database = "postgres";
                var masterConnectionString = builder.ConnectionString;
                
                _logger.LogInformation("Creating database '{DatabaseName}' if it doesn't exist", databaseName);
                
                // Create the database if it doesn't exist
                using (var connection = new Npgsql.NpgsqlConnection(masterConnectionString))
                {
                    await connection.OpenAsync();
                    
                    // Check if database exists
                    using (var checkCommand = connection.CreateCommand())
                    {
                        checkCommand.CommandText = $"SELECT 1 FROM pg_database WHERE datname = '{databaseName}'";
                        var exists = await checkCommand.ExecuteScalarAsync();
                        
                        if (exists == null)
                        {
                            _logger.LogInformation("Database {DatabaseName} does not exist. Creating now...", databaseName);
                            
                            // Create the database
                            using (var createCommand = connection.CreateCommand())
                            {
                                // Properly escape database name and handle permissions
                                createCommand.CommandText = $"CREATE DATABASE \"{databaseName?.Replace("\"", "\"\"")}\" ENCODING 'UTF8'";
                                await createCommand.ExecuteNonQueryAsync();
                                _logger.LogInformation("Database {DatabaseName} created successfully", databaseName);
                            }
                        }
                        else
                        {
                            _logger.LogInformation("Database {DatabaseName} already exists", databaseName);
                        }
                    }
                }
                
                // Apply migrations to create the schema
                await dbContext.Database.EnsureCreatedAsync();
                _logger.LogInformation("Applied migrations to ensure proper schema creation");
                
                // Seed system background images
                await SeedBackgroundImagesAsync();
                
                stopwatch.Stop();
                _logger.LogInformation("Database creation completed in {ElapsedMilliseconds}ms", stopwatch.ElapsedMilliseconds);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while creating the database");
                throw;
            }
        }
        
        /// <summary>
        /// Seeds system background images into the database
        /// </summary>
        private async Task SeedBackgroundImagesAsync()
        {
            try
            {
                _logger.LogInformation("===> DatabaseInitializer: Starting to seed system background images <===");
                
                // Get the background image initializer from the service provider
                var backgroundImageInitializer = _serviceProvider.GetService(typeof(Yuzu.Data.Services.SystemBackgroundImageInitializer)) 
                    as Yuzu.Data.Services.SystemBackgroundImageInitializer;
                
                if (backgroundImageInitializer == null)
                {
                    _logger.LogError("SystemBackgroundImageInitializer is not available! Cannot seed background images.");
                    return;
                }
                
                await backgroundImageInitializer.InitializeAsync();
                _logger.LogInformation("===> DatabaseInitializer: Completed seeding system background images <===");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error seeding system background images");
                // We don't want to fail the entire initialization process if seeding fails
                // Just log the error and continue
            }
        }
    }
}