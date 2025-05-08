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
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;
using Npgsql;
using Npgsql.EntityFrameworkCore.PostgreSQL;
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

// Apply Kubernetes configuration if running in Kubernetes environment
builder.Configuration.AddKubernetesSecretsConfiguration(
    secretName: "yuzu-app-secrets",
    @namespace: "default",
    logger: builder.Services.BuildServiceProvider().GetService<ILogger<IConfiguration>>());

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
    
    // Verify weather service functionality
    try
    {
        var weatherService = scope.ServiceProvider.GetRequiredService<WeatherService>();
        await weatherService.GetBasicWeatherInfoAsync("Europe/Berlin");
        app.Logger.LogInformation("Weather service check completed successfully");
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Error checking weather service");
    }
}

// Initialize database
using (var scope = app.Services.CreateScope())
{
    try
    {
        // Get database context
        var loggerFactory = LoggerFactory.Create(loggingBuilder =>
        {
            loggingBuilder.AddConfiguration(builder.Configuration.GetSection("Logging"));
            loggingBuilder.AddConsole();
            loggingBuilder.AddDebug();
        });
        var logger = loggerFactory.CreateLogger<IConfiguration>();

        builder.Configuration.AddKubernetesSecretsConfiguration(
            secretName: "yuzu-app-secrets",
            @namespace: "default",
            logger: logger);
        var dbContext = scope.ServiceProvider.GetRequiredService<Yuzu.Data.YuzuDbContext>();
        
        // Get connection string from configuration
        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
        
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
            // Skip database creation and connect directly to the existing database
            app.Logger.LogInformation("Using existing database '{DbName}', skipping database creation", targetDbName);
            
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
            
            // Skip database existence check and creation
            databaseExists = true; // Always assume database exists
            
            // Create the application data tables in the existing database
            app.Logger.LogInformation("Creating application data tables in database '{DbName}'...", targetDbName);
            
            try
            {
                // First, try to create tables directly with EF Core's ExecuteSqlRaw
                app.Logger.LogInformation("Generating and executing SQL script for table creation...");
                var sql = dbContext.Database.GenerateCreateScript();
                await dbContext.Database.ExecuteSqlRawAsync(sql);
                app.Logger.LogInformation("Direct SQL script execution completed");
                
                // Verify tables were created successfully
                var tableNames = await GetDbTableNamesAsync(dbContext);
                app.Logger.LogInformation("Tables in database: {TableNames}", 
                    string.Join(", ", tableNames));
                
                // Check for required Data_ tables
                var dataTableCount = tableNames.Count(t => t.StartsWith("Data_"));
                app.Logger.LogInformation("Data tables count: {Count}", dataTableCount);
                
                if (dataTableCount == 0)
                {
                    app.Logger.LogWarning("No Data_ tables were created - trying alternate approach");
                    
                    // Try using EnsureCreatedAsync method as a fallback
                    app.Logger.LogInformation("Using DbInitializer to create tables...");
                    var dbInitializer = scope.ServiceProvider.GetRequiredService<Yuzu.Data.DbInitializer>();
                    await dbInitializer.EnsureDatabaseCreatedAsync();
                    
                    // Verify tables again
                    tableNames = await GetDbTableNamesAsync(dbContext);
                    app.Logger.LogInformation("Tables after DbInitializer: {TableNames}", 
                        string.Join(", ", tableNames.Where(t => t.StartsWith("Data_"))));
                    
                    if (!tableNames.Any(t => t.StartsWith("Data_")))
                    {
                        // One more attempt with explicit table creation SQL
                        app.Logger.LogWarning("Still no Data_ tables - attempting explicit table creation");
                        
                        // Create the required Data_ tables explicitly
                        string createTablesScript = @"
                            -- Create Data_BackgroundImages table
                            CREATE TABLE ""Data_BackgroundImages"" (
                                id SERIAL PRIMARY KEY,
                                user_id TEXT NOT NULL,
                                file_name TEXT NOT NULL,
                                title TEXT NOT NULL,
                                thumbnail_path TEXT NOT NULL,
                                full_image_path TEXT NOT NULL,
                                thumbnail_url TEXT,
                                full_image_url TEXT,
                                uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                                is_system BOOLEAN NOT NULL DEFAULT false,
                                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                            );
                            
                            -- Create indexes for Data_BackgroundImages
                            CREATE INDEX idx_data_background_images_user_id ON ""Data_BackgroundImages""(user_id);
                            CREATE INDEX idx_data_background_images_file_name ON ""Data_BackgroundImages""(file_name);
                            
                            -- Create Data_BreakTypes table
                            CREATE TABLE ""Data_BreakTypes"" (
                                id SERIAL PRIMARY KEY,
                                user_id TEXT NOT NULL,
                                sort_order INTEGER NOT NULL,
                                name VARCHAR(100) NOT NULL,
                                default_duration_minutes INTEGER NOT NULL,
                                countdown_message VARCHAR(200) NOT NULL,
                                countdown_end_message VARCHAR(200) NOT NULL,
                                end_time_title VARCHAR(100) NOT NULL,
                                break_time_step_minutes INTEGER NOT NULL,
                                background_image_choices TEXT,
                                image_title TEXT,
                                usage_count BIGINT NOT NULL DEFAULT 0,
                                icon_name TEXT,
                                components TEXT,
                                is_locked BOOLEAN NOT NULL DEFAULT false,
                                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                            );
                            
                            -- Create indexes for Data_BreakTypes
                            CREATE INDEX idx_data_break_types_user_id ON ""Data_BreakTypes""(user_id);
                            
                            -- Create Data_UserData table
                            CREATE TABLE ""Data_UserData"" (
                                id SERIAL PRIMARY KEY,
                                user_id TEXT NOT NULL,
                                data_key TEXT NOT NULL,
                                value TEXT NOT NULL,
                                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                            );
                            
                            -- Create indexes for Data_UserData
                            CREATE INDEX idx_data_user_data_user_id ON ""Data_UserData""(user_id);
                            CREATE UNIQUE INDEX idx_data_user_data_user_id_data_key ON ""Data_UserData""(user_id, data_key);
                            
                            -- Create Data_Breaks table
                            CREATE TABLE ""Data_Breaks"" (
                                id SERIAL PRIMARY KEY,
                                user_id TEXT NOT NULL,
                                break_type_id INTEGER NOT NULL,
                                start_time TIMESTAMP WITH TIME ZONE NOT NULL,
                                end_time TIMESTAMP WITH TIME ZONE NOT NULL,
                                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                                CONSTRAINT fk_data_breaks_break_type FOREIGN KEY (break_type_id) 
                                    REFERENCES ""Data_BreakTypes""(id) ON DELETE CASCADE
                            );
                            
                            -- Create indexes for Data_Breaks
                            CREATE INDEX idx_data_breaks_user_id ON ""Data_Breaks""(user_id);
                            CREATE INDEX idx_data_breaks_break_type_id ON ""Data_Breaks""(break_type_id);
                        ";
                        
                        try
                        {
                            await dbContext.Database.ExecuteSqlRawAsync(createTablesScript);
                            app.Logger.LogInformation("Explicit table creation SQL executed");
                            
                            // Verify one more time
                            tableNames = await GetDbTableNamesAsync(dbContext);
                            app.Logger.LogInformation("Tables after explicit creation: {TableNames}", 
                                string.Join(", ", tableNames.Where(t => t.StartsWith("Data_"))));
                                
                            if (!tableNames.Any(t => t.StartsWith("Data_")))
                            {
                                app.Logger.LogError("Still unable to create Data_ tables despite multiple attempts");
                            }
                        }
                        catch (Exception ex)
                        {
                            app.Logger.LogError(ex, "Error during explicit table creation: {Message}", ex.Message);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                app.Logger.LogError(ex, "Error creating application tables: {Message}", ex.Message);
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
            
            // Verify database connection with target database
            app.Logger.LogInformation("Verifying connection to target database '{DbName}'", targetDbName);
            connBuilder.Database = targetDbName;
            using (var connection = new Npgsql.NpgsqlConnection(connBuilder.ConnectionString))
            {
                await connection.OpenAsync();
                app.Logger.LogInformation("Successfully connected to target database");
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
                    var userData = await userDataService.GetByUserIdAsync(testUserId);
                    var breakTypes = await breakTypeService.GetAllAsync(testUserId);
                    
                    if (userData?.Count > 0 && breakTypes?.Count > 0)
                    {
                        app.Logger.LogInformation("Default data successfully created");
                    }
                    else
                    {
                        app.Logger.LogWarning("Default data may not have been created properly");
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