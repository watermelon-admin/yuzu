//   _____           _           _    __     __               
//  |  __ \         (_)         | |   \ \   / /               
//  | |__) | __ ___  _  ___  ___| |_   \ \_/ /   _ _____   _  
//  |  ___/ '__/ _ \| |/ _ \/ __| __|   \   / | | |_  / | | | 
//  | |   | | | (_) | |  __/ (__| |_     | || |_| |/ /| |_| | 
//  |_|   |_|  \___/| |\___|\___|\__|    |_| \__,_/___|\__,_| 
//                 _/ |                                       
//                |__/      

using Azure.Identity;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Yuzu.Data;
using Yuzu.Mail;
using Yuzu.Payments;
using Yuzu.Web;
using Yuzu.Web.Configuration;
using Yuzu.Configuration.S3;
using Yuzu.Configuration.Payments;
using Yuzu.Web.Tools;
using Yuzu.Web.Tools.StorageServices;
using IEmailSender = Yuzu.Mail.IEmailSender;

// Get application builder
var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.Services.AddControllers();

// Register all configuration
builder.Services.AddAppConfiguration(builder.Configuration);

// Configure authentication
builder.Services.AddRazorPages(options =>
{
    // Apply a default authorization policy to all Razor Pages
    options.Conventions.AuthorizeFolder("/");
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto |
        ForwardedHeaders.XForwardedHost;

    // Clear default networks since we're using Azure Front Door
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Configure cookie
builder.Services.ConfigureApplicationCookie(options =>
{
    // Specify the login page
    options.LoginPath = "/Account/Login";

    // Set the cookie expiration to 14 days
    options.ExpireTimeSpan = TimeSpan.FromDays(14);

    // Enable sliding expiration
    options.SlidingExpiration = true;

    // Ensure the authentication cookie is persistent if "Remember Me" is selected
    options.Cookie.IsEssential = true; // Required for GDPR features
});

// Add memory caching
builder.Services.AddMemoryCache();

// Add the cached timezone service
builder.Services.AddScoped<Yuzu.Time.CachedTimeZoneService>();

// Register storage services
builder.Services.AddScoped<S3StorageService>();
builder.Services.AddScoped<IStorageServiceFactory, StorageServiceFactory>();

// Register adapters for cross-project dependencies
builder.Services.AddScoped<Yuzu.Data.Services.Interfaces.IStorageServiceFactory>(sp => 
    new Yuzu.Data.Services.StorageServiceFactoryAdapter(sp.GetRequiredService<IStorageServiceFactory>()));
builder.Services.AddScoped<Yuzu.Data.Services.Interfaces.IStorageService>(sp => 
    new Yuzu.Data.Services.StorageServiceAdapter(sp.GetRequiredService<IStorageServiceFactory>().CreateStorageService()));

// Add data services (repositories)
builder.Services.AddDataServices(builder.Configuration);

// Add payment services
builder.Services.AddScoped<StripeService>();
builder.Services.AddScoped<StripeTools>();

// Add weather-related services
builder.Services.AddSingleton<TimeZoneGeolocator>();
builder.Services.AddHttpClient<WeatherService>();
builder.Services.AddScoped<WeatherService>();

// Configure Identity with PostgreSQL
// Add Yuzu Identity services (uses the same PostgreSQL database but different DbContext)
builder.Services.AddYuzuIdentity(builder.Configuration);

// Register mail sender
builder.Services.AddSingleton<IEmailSender>(sp =>
{
    var logger = sp.GetRequiredService<ILogger<EmailSender>>();
    var mailSettings = sp.GetRequiredService<IOptions<Yuzu.Web.Configuration.MailSettings>>().Value;
    
    return new EmailSender(
        mailSettings.SmtpServer,
        mailSettings.SenderName,
        mailSettings.SenderEmail,
        mailSettings.SmtpUsername,
        mailSettings.SmtpPassword,
        mailSettings.NoReplySenderName,
        mailSettings.NoReplySenderEmail,
        mailSettings.SmtpNoReplyUsername,
        mailSettings.SmtpNoReplyPassword,
        mailSettings.SmtpPort,
        logger);
});

// Build application
var app = builder.Build();

// First, initialize the database and Identity provider
using (var scope = app.Services.CreateScope())
{
    try
    {
        // Get the identity context
        var identityContext = scope.ServiceProvider.GetRequiredService<YuzuIdentityDbContext>();
        
        // Ensure identity database is created
        app.Logger.LogInformation("Ensuring Identity database is created before application starts...");
        await identityContext.Database.EnsureCreatedAsync();
        
        // Initialize identity
        var identityInitializer = scope.ServiceProvider.GetRequiredService<IdentityDbInitializer>();
        await identityInitializer.InitializeAsync();
        
        app.Logger.LogInformation("Identity initialization completed successfully");
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "An error occurred during Identity initialization");
        // We continue even if there's an error - the app will show a more specific error later if needed
    }
}

// Generate the time zone geolocation data if needed
using (var scope = app.Services.CreateScope())
{
    var geolocator = scope.ServiceProvider.GetRequiredService<TimeZoneGeolocator>();
    geolocator.GenerateTimeZoneGeoData();
    app.Logger.LogInformation("Time zone geolocation data generated/loaded");
    
    // Test a few specific time zones to verify data is correct
    app.Logger.LogInformation("Testing specific time zones for debugging:");
    geolocator.LogTimeZoneData("Europe/Berlin");
    geolocator.LogTimeZoneData("America/New_York");
    geolocator.LogTimeZoneData("Asia/Tokyo");
    
    // Test getting weather for a time zone
    try
    {
        var weatherService = scope.ServiceProvider.GetRequiredService<WeatherService>();
        var berlinWeather = await weatherService.GetBasicWeatherInfoAsync("Europe/Berlin");
        app.Logger.LogInformation("Test weather for Berlin: {Weather}", berlinWeather);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Error testing weather service");
    }
}

// Initialize database
using (var scope = app.Services.CreateScope())
{
    try
    {
        // Get database context
        var dbContext = scope.ServiceProvider.GetRequiredService<Yuzu.Data.YuzuDbContext>();
        
        // Get database settings
        var dataStorageSettings = scope.ServiceProvider.GetRequiredService<IOptions<Yuzu.Web.Configuration.DataStorageSettings>>().Value;
        var connectionString = dataStorageSettings.ConnectionString;
        
        // Get connection string to log database name
        try {
            var connStringBuilder = new Npgsql.NpgsqlConnectionStringBuilder(connectionString);
            var databaseName = connStringBuilder.Database;
            app.Logger.LogInformation("Using database name: '{DatabaseName}'", databaseName);
        }
        catch (Exception ex) {
            app.Logger.LogWarning("Could not determine database name: {Message}", ex.Message);
        }
        
        app.Logger.LogInformation("Full connection string: {ConnectionString}", connectionString);
        
        var connBuilder = new Npgsql.NpgsqlConnectionStringBuilder(connectionString);
        var targetDbName = connBuilder.Database;
        var host = connBuilder.Host;
        var port = connBuilder.Port;
        var username = connBuilder.Username;
        
        app.Logger.LogInformation("Database connection details from connection string:");
        app.Logger.LogInformation("- Database: '{DbName}'", targetDbName);
        app.Logger.LogInformation("- Host: '{Host}'", host);
        app.Logger.LogInformation("- Port: {Port}", port);
        app.Logger.LogInformation("- Username: '{Username}'", username);
        
        // Track if database is newly created
        bool databaseExists = false;
        
        try 
        {
            // Modify the connection string to connect to postgres DB first
            app.Logger.LogInformation("Attempting to connect to 'postgres' database to create '{DbName}'", targetDbName);
            connBuilder.Database = "postgres";
            var pgConnString = connBuilder.ConnectionString;
            
            // Check if PostgreSQL server is running
            app.Logger.LogInformation("Testing if PostgreSQL server is accessible at {Host}:{Port}...", host, port);
            
            using (var tcpClient = new System.Net.Sockets.TcpClient())
            {
                try
                {
                    await tcpClient.ConnectAsync(host ?? "localhost", port);
                    app.Logger.LogInformation("TCP connection to PostgreSQL server successful");
                }
                catch (Exception ex)
                {
                    app.Logger.LogError(ex, "Failed to connect to PostgreSQL server at {Host}:{Port}", host, port);
                    app.Logger.LogError("Please ensure PostgreSQL is running and accessible");
                    throw;
                }
            }
            
            // Connect to postgres database
            using (var connection = new Npgsql.NpgsqlConnection(pgConnString))
            {
                app.Logger.LogInformation("Opening connection to 'postgres' database...");
                await connection.OpenAsync();
                app.Logger.LogInformation("Connected to 'postgres' database successfully");
                
                // List existing databases
                app.Logger.LogInformation("Listing existing databases:");
                using (var cmd = connection.CreateCommand())
                {
                    cmd.CommandText = "SELECT datname FROM pg_database WHERE datistemplate = false;";
                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            app.Logger.LogInformation("- {DatabaseName}", reader.GetString(0));
                        }
                    }
                }
                
                // Check if database exists
                app.Logger.LogInformation("Checking if database '{DbName}' exists...", targetDbName);
                using (var cmd = connection.CreateCommand())
                {
                    cmd.CommandText = $"SELECT 1 FROM pg_database WHERE datname = '{targetDbName}';";
                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        databaseExists = await reader.ReadAsync();
                    }
                }
                
                if (databaseExists)
                {
                    app.Logger.LogInformation("Database '{DbName}' already exists, preserving data", targetDbName);
                }
                else
                {
                    // Create fresh database only if it doesn't exist
                    app.Logger.LogInformation("Creating database '{DbName}'...", targetDbName);
                    using (var cmd = connection.CreateCommand())
                    {
                        cmd.CommandText = $"CREATE DATABASE \"{targetDbName}\";";
                        await cmd.ExecuteNonQueryAsync();
                        app.Logger.LogInformation("CREATE DATABASE command executed successfully");
                    }
                }
                
                // Verify the database was created
                app.Logger.LogInformation("Verifying database creation:");
                using (var cmd = connection.CreateCommand())
                {
                    cmd.CommandText = "SELECT datname FROM pg_database WHERE datistemplate = false;";
                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            var dbName = reader.GetString(0);
                            if (dbName == targetDbName)
                            {
                                app.Logger.LogInformation("✓ Database '{DbName}' confirmed in pg_database", targetDbName);
                            }
                            else
                            {
                                app.Logger.LogInformation("- {DatabaseName}", dbName);
                            }
                        }
                    }
                }
            }
            
            // Now ensure the application data schema exists
            app.Logger.LogInformation("Ensuring application data schema in database '{DbName}' is up to date...", targetDbName);
            
            // Get list of existing tables in the database before creation
            var tableNames = await GetDbTableNamesAsync(dbContext);
            app.Logger.LogInformation("Current application tables before creation: {TableNames}", string.Join(", ", tableNames));
            
            // Initialize database context
            app.Logger.LogInformation("Creating application tables with DbContext...");
            await dbContext.Database.EnsureCreatedAsync();
            
            // Get list of tables after creation to verify
            tableNames = await GetDbTableNamesAsync(dbContext);
            app.Logger.LogInformation("Tables after creation: {TableNames}", string.Join(", ", tableNames));
            
            // Check if the Data_BackgroundImages table exists
            if (!tableNames.Contains("Data_BackgroundImages"))
            {
                app.Logger.LogWarning("Data_BackgroundImages table not created - schema synchronization issue detected");
                app.Logger.LogInformation("Attempting additional initialization...");
                
                // Try executing SQL directly if needed as a fallback
                var sql = dbContext.Database.GenerateCreateScript();
                await dbContext.Database.ExecuteSqlRawAsync(sql);
                
                // Check again
                tableNames = await GetDbTableNamesAsync(dbContext);
                app.Logger.LogInformation("Tables after script execution: {TableNames}", string.Join(", ", tableNames));
            }
            
            app.Logger.LogInformation("Application data schema creation completed");
            
            app.Logger.LogInformation("Application data schema check completed successfully");
            
            // Initialize Identity database schema
            app.Logger.LogInformation("Initializing Identity database schema...");
            try
            {
                // Create identity tables directly with the DbContext first to ensure they exist
                var identityContext = scope.ServiceProvider.GetRequiredService<YuzuIdentityDbContext>();
                await identityContext.Database.EnsureCreatedAsync();
                
                // Additional explicit call to ensure tables are created
                if (!await identityContext.Database.CanConnectAsync())
                {
                    app.Logger.LogWarning("Cannot connect to database via Identity context - ensuring created");
                    await identityContext.Database.EnsureCreatedAsync();
                }
                else
                {
                    app.Logger.LogInformation("Identity context can connect to database");
                    await identityContext.Database.EnsureCreatedAsync();
                }
                
                // Now initialize roles and other identity data
                var identityDbInitializer = scope.ServiceProvider.GetRequiredService<IdentityDbInitializer>();
                await identityDbInitializer.InitializeAsync();
                app.Logger.LogInformation("Identity database schema initialized successfully");
            }
            catch (Exception ex)
            {
                app.Logger.LogError(ex, "Error initializing Identity database schema: {Message}", ex.Message);
                if (ex.InnerException != null)
                {
                    app.Logger.LogError("Inner exception: {Message}", ex.InnerException.Message);
                }
                // Don't rethrow here - we still want the application to start even if identity fails
            }
            
            // List tables in the database
            app.Logger.LogInformation("Listing tables in the database:");
            connBuilder.Database = targetDbName;
            using (var connection = new Npgsql.NpgsqlConnection(connBuilder.ConnectionString))
            {
                await connection.OpenAsync();
                using (var cmd = connection.CreateCommand())
                {
                    cmd.CommandText = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';";
                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            app.Logger.LogInformation("- Table: {TableName}", reader.GetString(0));
                        }
                    }
                }
            }
            
            // Only initialize default data if the database was newly created
            if (!databaseExists)
            {
                app.Logger.LogInformation("Initializing default data for new database...");
                try
                {
                    var userDataService = scope.ServiceProvider.GetRequiredService<Yuzu.Data.Services.Interfaces.IUserDataService>();
                    var breakTypeService = scope.ServiceProvider.GetRequiredService<Yuzu.Data.Services.Interfaces.IBreakTypeService>();
                    
                    // Generate a test user ID
                    var testUserId = "test-user-" + Guid.NewGuid().ToString("N").Substring(0, 8);
                    app.Logger.LogInformation("Creating default data for test user ID: {UserId}", testUserId);
                    
                    // Initialize default user data
                    await userDataService.InitializeDefaultsAsync(testUserId, "Europe/Berlin");
                    app.Logger.LogInformation("Default user data initialization completed");
                    
                    // Initialize default break types
                    await breakTypeService.InitializeDefaultsAsync(testUserId);
                    app.Logger.LogInformation("Default break types initialization completed");
                    
                    // Verify data was created
                    app.Logger.LogInformation("Verifying data creation:");
                    
                    // Check user data
                    var userData = await userDataService.GetByUserIdAsync(testUserId);
                    app.Logger.LogInformation("User data count: {Count}", userData?.Count ?? 0);
                    
                    // Check break types
                    var breakTypes = await breakTypeService.GetAllAsync(testUserId);
                    app.Logger.LogInformation("Break types count: {Count}", breakTypes?.Count ?? 0);
                    
                    if (userData?.Count > 0 && breakTypes?.Count > 0)
                    {
                        app.Logger.LogInformation("✓ Default data successfully created");
                    }
                    else
                    {
                        app.Logger.LogWarning("⚠ Default data may not have been created properly");
                    }
                }
                catch (Exception ex)
                {
                    app.Logger.LogError(ex, "Error initializing default data: {Message}", ex.Message);
                }
            }
            else
            {
                app.Logger.LogInformation("Using existing database - skipping default data initialization");
            }
        }
        catch (Exception ex)
        {
            app.Logger.LogError(ex, "Error creating database: {Message}", ex.Message);
            throw; // Rethrow to stop application startup
        }
        
        // Skip legacy initializer as we're using a fresh PostgreSQL install
        app.Logger.LogInformation("Skipping legacy database initialization in PostgreSQL-only mode");
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "An error occurred while initializing the database");
    }
}


// Configure the HTTP request pipeline
if (!app.Environment.IsDevelopment())
{
    // PRODUCTION
    // ----------

    app.UseForwardedHeaders(); // Enable forwarded headers
    // Enable exception handler
    app.UseExceptionHandler("/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.();
    app.UseHsts();
}
else
{
    // Enable developer exception page
    app.UseDeveloperExceptionPage();
}

app.UseHttpsRedirection(); // Redirect HTTP to HTTPS
app.UseStaticFiles();

app.UseRouting(); // Enable routing
app.UseAuthentication(); // Enable authentication
app.UseAuthorization(); // Enable authorization

app.MapDefaultEndpoints();
app.MapControllers(); // Map controllers
app.MapStaticAssets(); // Map static assets

app.MapRazorPages() // Map Razor Pages
   .WithStaticAssets(); // Enable static assets

// Initialize system background images
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogInformation("Initializing system background images...");
        
        // Ensure database is created and migrated
        var dbContext = services.GetRequiredService<Yuzu.Data.YuzuDbContext>();
        
        // Create schema with context
        await dbContext.Database.EnsureCreatedAsync();
        logger.LogInformation("Database creation completed");
        
        // Initialize background images
        var backgroundImageInitializer = services.GetRequiredService<Yuzu.Data.Services.SystemBackgroundImageInitializer>();
        backgroundImageInitializer.InitializeAsync().GetAwaiter().GetResult();
        logger.LogInformation("Background image initialization completed");
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while initializing the system: {Message}", ex.Message);
        if (ex.InnerException != null)
        {
            logger.LogError("Inner exception: {Message}", ex.InnerException.Message);
        }
    }
}

app.Run(); // Run the application

// Helper method to get a list of table names in the database
static async Task<List<string>> GetDbTableNamesAsync(DbContext dbContext)
{
    var tableNames = new List<string>();
    
    try
    {
        // Query for table names in PostgreSQL
        var conn = dbContext.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
        {
            await conn.OpenAsync();
        }
        
        using var command = conn.CreateCommand();
        command.CommandText = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'";
        
        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            tableNames.Add(reader.GetString(0));
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error getting table names: {ex.Message}");
    }
    
    return tableNames;
}