// === YUZU BREAK TIMER APPLICATION - STARTUP SEQUENCE ===
// Hello! Welcome to Yuzu - Your friendly break timer application! 
// Today is: {DateTime.Now.ToString("D")} - Have a wonderful and productive day!

using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Yuzu.Configuration.S3;
using Yuzu.Data;
using Yuzu.Mail;
using Yuzu.Payments;
using Yuzu.Web;
using Yuzu.Web.Configuration;
using Yuzu.Web.HealthChecks;
using Yuzu.Web.Tools;
// Storage service implementation is now in Yuzu.Data.Services
using IEmailSender = Yuzu.Mail.IEmailSender;

// Get application builder
var builder = WebApplication.CreateBuilder(args);

// Apply Kubernetes configuration if running in Kubernetes environment
// Instead of BuildServiceProvider(), use a factory approach
var loggerFactory = LoggerFactory.Create(logging => 
{
    logging.AddConsole();
    logging.SetMinimumLevel(LogLevel.Information);
});
var logger = loggerFactory.CreateLogger<IConfiguration>();

builder.Configuration.AddKubernetesSecretsConfiguration(
    secretName: "yuzu-app-secrets",
    @namespace: "default",
    logger: logger);

// Add service defaults first, but we'll overwrite the health checks
builder.AddServiceDefaults();

// Clear out any existing health checks to avoid duplication
builder.Services.RemoveAll(sd => sd.ServiceType == typeof(Microsoft.Extensions.Diagnostics.HealthChecks.IHealthCheck));

// Add our custom health checks
builder.Services.AddYuzuHealthChecks();
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

// Health checks already registered earlier

// Register the simplified Scaleway S3 storage service
builder.Services.AddScoped<Yuzu.Data.Services.Interfaces.IStorageService, Yuzu.Data.Services.ScalewayS3StorageService>();

// Register the adapter for backward compatibility
builder.Services.AddScoped<Yuzu.Data.Services.StorageServiceAdapter>();

// Add data services (repositories)
builder.Services.AddDataServices(builder.Configuration);

// Add payment services
builder.Services.AddScoped<StripeService>();
builder.Services.AddScoped<StripeTools>();

// Add weather-related services
builder.Services.AddSingleton<TimeZoneGeolocator>();
builder.Services.AddHttpClient<WeatherService>();
builder.Services.AddScoped<WeatherService>();

// Note: TimeZone geolocation data is loaded on first use, not during startup

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

// Log friendly startup greeting
var appVersion = typeof(Program).Assembly.GetName().Version?.ToString() ?? "1.0.0";
var greeting = $@"
+==================================================================+
|                                                                  
|   YUZU BREAK TIMER - Your friendly productivity companion!       
|                                                                  
|   Version: {appVersion.PadRight(15)}       Started: {DateTime.Now:yyyy-MM-dd HH:mm:ss}   
|                                                                  
|   Take regular breaks for better productivity and wellbeing!     
|                                                                  
+==================================================================+
";
app.Logger.LogInformation(greeting);

// Dump configuration and environment information
using (var scope = app.Services.CreateScope())
{
    // Runtime environment information
    bool isInK8s = Yuzu.Web.Configuration.Kubernetes.KubernetesEnvironmentDetector.IsRunningInKubernetes();
    
    var runtimeEnv = new System.Text.StringBuilder("=== Runtime Environment ===\n");
    runtimeEnv.AppendLine($"  Running in Kubernetes: {isInK8s}");
    
    if (isInK8s)
    {
        runtimeEnv.AppendLine($"  Kubernetes Service Host: {Environment.GetEnvironmentVariable("KUBERNETES_SERVICE_HOST") ?? "unknown"}");
        runtimeEnv.AppendLine($"  Kubernetes Service Port: {Environment.GetEnvironmentVariable("KUBERNETES_SERVICE_PORT") ?? "unknown"}");
        runtimeEnv.AppendLine($"  Kubernetes Namespace: {Environment.GetEnvironmentVariable("KUBERNETES_NAMESPACE") ?? "default"}");
        runtimeEnv.AppendLine($"  Kubernetes Pod Name: {Environment.GetEnvironmentVariable("HOSTNAME") ?? "unknown"}");
            
        // Check if service account token exists
        bool hasServiceAccount = File.Exists("/var/run/secrets/kubernetes.io/serviceaccount/token");
        runtimeEnv.AppendLine($"  Service Account Token Available: {hasServiceAccount}");
        
        // Log secret sources
        runtimeEnv.AppendLine($"  Kubernetes Secrets Source: yuzu-app-secrets in namespace default");
    }
    
    app.Logger.LogInformation(runtimeEnv.ToString());
    
    // Configuration values
    var configuration = builder.Configuration;
    app.Logger.LogInformation("=== Configuration Values ===");
    
    // Helper function to obfuscate sensitive values
    string ObfuscateValue(string key, string value)
    {
        // List of keys that should be obfuscated
        var sensitiveKeys = new[] { 
            "password", "secret", "key", "token", "apikey", "connectionstring", 
            "connection", "accesskey", "secretkey"
        };
        
        // Check if any sensitive key is contained in the key (case insensitive)
        bool isSensitive = sensitiveKeys.Any(k => key.Contains(k, StringComparison.OrdinalIgnoreCase));
        
        if (isSensitive && !string.IsNullOrEmpty(value))
        {
            if (value.Length <= 4)
                return "****";
            else
                return value.Substring(0, 3) + "..." + value.Substring(value.Length - 1);
        }
        
        return value;
    }
    
    // Will reuse the isInK8s variable from above
    
    // Process configuration by category
    var configByCategory = new Dictionary<string, List<KeyValuePair<string, string>>>();
    
    // Function to gather configuration values
    void GatherConfigValues(IConfiguration config, string sectionPrefix = "")
    {
        foreach (var child in config.GetChildren())
        {
            var key = string.IsNullOrEmpty(sectionPrefix) ? child.Key : $"{sectionPrefix}:{child.Key}";
            string section = key.Contains(':') ? key.Split(':')[0] : "Root";
            
            // If section has children, process them
            if (child.GetChildren().Any())
            {
                GatherConfigValues(child, key);
            }
            else
            {
                var value = child.Value ?? string.Empty; // Handle null values
                var displayValue = ObfuscateValue(key, value);
                
                if (!configByCategory.ContainsKey(section))
                {
                    configByCategory[section] = new List<KeyValuePair<string, string>>();
                }
                
                configByCategory[section].Add(new KeyValuePair<string, string>(key, displayValue));
            }
        }
    }
    
    // Gather all config values by category
    GatherConfigValues(configuration);
    
    // Output configuration in a more readable format
    foreach (var category in configByCategory.OrderBy(x => x.Key != "Root").ThenBy(x => x.Key))
    {
        var categoryName = category.Key;
        var items = category.Value;
        
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"=== {categoryName} Configuration ===");
        
        foreach (var item in items.OrderBy(x => x.Key))
        {
            // Simplify display key to exclude the category prefix for more readable output
            string displayKey = item.Key;
            if (categoryName != "Root" && displayKey.StartsWith($"{categoryName}:"))
            {
                displayKey = displayKey.Substring(categoryName.Length + 1);
            }
            
            // Mark kubernetes secrets with an indicator
            string k8sIndicator = isInK8s && item.Key.Contains("K8S_SECRET") ? " [K8S]" : "";
            
            sb.AppendLine($"  {displayKey} = {item.Value}{k8sIndicator}");
        }
        
        // Log each category as a single message
        app.Logger.LogInformation(sb.ToString());
    }
    
    app.Logger.LogInformation("=== End Configuration ===");
}

// Begin service connectivity checks
app.Logger.LogInformation("Starting service connectivity checks...");

// Database connectivity verification first
using (var scope = app.Services.CreateScope())
{
    try
    {
        // Get database context
        var dbContext = scope.ServiceProvider.GetRequiredService<Yuzu.Data.YuzuDbContext>();
        bool canConnect = false; // Default value
        
        // Get connection string from configuration
        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
        
        // Extract and log database information in consolidated format
        try {
            var connBuilder = new Npgsql.NpgsqlConnectionStringBuilder(connectionString);
            
            // Just check database connectivity - schema created manually with migrations
            canConnect = await dbContext.Database.CanConnectAsync();
            
            // Create a consolidated database info log
            var dbInfo = new System.Text.StringBuilder("=== Database Connection ===\n");
            dbInfo.AppendLine($"  Database: {connBuilder.Database}");
            dbInfo.AppendLine($"  Host: {connBuilder.Host}");
            dbInfo.AppendLine($"  Port: {connBuilder.Port}");
            dbInfo.AppendLine($"  Username: {connBuilder.Username}");
            dbInfo.AppendLine($"  Status: {(canConnect ? "Connected ✓" : "Failed ✗")}");
            
            app.Logger.LogInformation(dbInfo.ToString());
            
            if (!canConnect) {
                app.Logger.LogWarning("Cannot connect to database - application may not function correctly");
            }
        }
        catch (Exception ex) {
            app.Logger.LogWarning("Could not connect to database: {Message}", ex.Message);
        }
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "An error occurred during database initialization");
    }
}

// Check S3 storage connectivity
using (var scope = app.Services.CreateScope())
{
    // Test S3 connectivity and initialize background images
    try
    {
        // Get S3 settings
        var s3Settings = scope.ServiceProvider.GetRequiredService<IOptions<S3Settings>>().Value;
        var storageService = scope.ServiceProvider.GetRequiredService<Yuzu.Data.Services.Interfaces.IStorageService>();
        var backgroundImageInitializer = scope.ServiceProvider.GetRequiredService<Yuzu.Data.Services.SystemBackgroundImageInitializer>();
        
        // First verify connectivity
        var items = await storageService.ListObjectsAsync(s3Settings.BackgroundsContainer);
        
        // Then initialize background images
        await backgroundImageInitializer.InitializeAsync();
        
        // Log consolidated S3 info with connection result
        var s3Info = new System.Text.StringBuilder("=== S3 Storage Connection ===\n");
        s3Info.AppendLine($"  Service URL: {s3Settings.ServiceUrl}");
        s3Info.AppendLine($"  Bucket Name: {s3Settings.BucketName}");
        s3Info.AppendLine($"  Container: {s3Settings.BackgroundsContainer}");
        s3Info.AppendLine($"  Status: Connected ✓");
        s3Info.AppendLine($"  Items Found: {items.Count()}");
        s3Info.AppendLine($"  Background Images: Initialized");
        
        app.Logger.LogInformation(s3Info.ToString());
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Error with S3 storage - backgrounds may not work");
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

// Map default endpoints - this is now a no-op in ServiceDefaults
app.MapDefaultEndpoints(); 

// Map standard health check endpoints for Kubernetes monitoring
app.MapYuzuHealthChecks();
app.MapControllers(); // Map controllers
app.MapStaticAssets(); // Map static assets

app.MapRazorPages() // Map Razor Pages
   .WithStaticAssets(); // Enable static assets

// No separate system background image initialization - handled during S3 connectivity check

// Log startup complete
var completionMessage = $@"
+------------------------------------------------------------------+
|                                                                  
|   YUZU STARTUP COMPLETED SUCCESSFULLY!                           
|                                                                  
|   Time: {DateTime.Now:HH:mm:ss}                                            
|   Status: Ready to serve requests                                
|                                                                  
|   ""A break reminds us that our determination to succeed          
|    should never overpower our willingness to rest.""             
|                                                                  
+------------------------------------------------------------------+
";
app.Logger.LogInformation(completionMessage);

// Run the application
app.Run();