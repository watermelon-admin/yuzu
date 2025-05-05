# ASP.NET Core Identity Migration Plan: Azure Table Storage to PostgreSQL

This document outlines the plan to migrate the ASP.NET Core Identity implementation from Azure Table Storage to PostgreSQL with Entity Framework Core, while maintaining separate DbContexts for identity and application data.

## Current Implementation Analysis

### Authentication System
- Uses ElCamino.AspNetCore.Identity.AzureTable for Azure Table Storage
- Custom ApplicationUser with additional fields:
  - FirstName, LastName
  - StripeUserID, StripeSubscriptionID, StripeCurrentPeriodEndTimestamp
- Custom ApplicationRole with Description field
- Tables prefixed with "auth_"

### Data System 
- PostgreSQL with YuzuDbContext for application data
- Existing models: BreakType, Break, UserData, BackgroundImage
- Services registered through AddDataServices extension method

## Migration Goals

1. Use PostgreSQL for Identity storage instead of Azure Table Storage
2. Keep Identity data separate from application data (separate DbContext)
3. Use the same PostgreSQL database for both contexts
4. Preserve existing user model customizations
5. Create necessary tables at application startup
6. Integrate with existing data initialization

## Required Components

1. **New Identity DbContext**
   - Create a dedicated IdentityDbContext using EntityFrameworkCore
   - Configure to use the same PostgreSQL database
   - Maintain separation from application data

2. **Updated Identity Models**
   - Update ApplicationUser to inherit from standard IdentityUser
   - Update ApplicationRole to inherit from standard IdentityRole
   - Preserve custom fields

3. **Configuration Updates**
   - Update Program.cs to use EF Core instead of Azure Table Storage
   - Configure connection string to use existing PostgreSQL database
   - Set up appropriate table naming conventions

4. **Database Initialization**
   - Create an Identity database initializer
   - Integrate with existing initialization process
   - Create tables on application startup

## Implementation Plan

### Step 1: Create Identity DbContext and Update Models

1. Create new `YuzuIdentityDbContext.cs`:
```csharp
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Yuzu.Web
{
    public class YuzuIdentityDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, string>
    {
        public YuzuIdentityDbContext(DbContextOptions<YuzuIdentityDbContext> options)
            : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Customize table names to use 'Identity' prefix or schema
            builder.Entity<ApplicationUser>(entity => {
                entity.ToTable("Identity_Users");
            });

            builder.Entity<ApplicationRole>(entity => {
                entity.ToTable("Identity_Roles");
            });

            builder.Entity<IdentityUserRole<string>>(entity => {
                entity.ToTable("Identity_UserRoles");
            });

            builder.Entity<IdentityUserClaim<string>>(entity => {
                entity.ToTable("Identity_UserClaims");
            });

            builder.Entity<IdentityUserLogin<string>>(entity => {
                entity.ToTable("Identity_UserLogins");
            });

            builder.Entity<IdentityUserToken<string>>(entity => {
                entity.ToTable("Identity_UserTokens");
            });

            builder.Entity<IdentityRoleClaim<string>>(entity => {
                entity.ToTable("Identity_RoleClaims");
            });
        }
    }
}
```

2. Update ApplicationUser:
```csharp
using Microsoft.AspNetCore.Identity;

namespace Yuzu.Web
{
    public class ApplicationUser : IdentityUser
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? StripeUserID { get; set; }
        public string? StripeSubscriptionID { get; set; }
        public long StripeCurrentPeriodEndTimestamp { get; set; }
    }
}
```

3. Update ApplicationRole:
```csharp
using Microsoft.AspNetCore.Identity;

namespace Yuzu.Web
{
    public class ApplicationRole : IdentityRole
    {
        public string Description { get; set; } = string.Empty;
    }
}
```

### Step 2: Create Factory for Identity DbContext

Create the design-time factory for the Identity DbContext:

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.Reflection;

namespace Yuzu.Web
{
    public class YuzuIdentityDbContextFactory : IDesignTimeDbContextFactory<YuzuIdentityDbContext>
    {
        public YuzuIdentityDbContext CreateDbContext(string[] args)
        {
            var assemblyPath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)!;
            var projectRoot = Path.GetFullPath(Path.Combine(assemblyPath, "..", ".."));
            
            var configuration = new ConfigurationBuilder()
                .SetBasePath(projectRoot)
                .AddJsonFile("appsettings.json", optional: true)
                .AddJsonFile("appsettings.Development.json", optional: true)
                .AddEnvironmentVariables()
                .AddUserSecrets<YuzuIdentityDbContext>(optional: true)
                .Build();

            // Use the same connection string as the application data
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            
            if (string.IsNullOrEmpty(connectionString))
            {
                connectionString = configuration.GetSection("DataStorageConfig")["ConnectionString"];
            }
            
            var optionsBuilder = new DbContextOptionsBuilder<YuzuIdentityDbContext>();
            optionsBuilder.UseNpgsql(connectionString);

            return new YuzuIdentityDbContext(optionsBuilder.Options);
        }
    }
}
```

### Step 3: Create Extension Method for Identity Services

Create an extension method for registering identity services:

```csharp
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Yuzu.Web
{
    public static class IdentityServiceCollectionExtensions
    {
        public static IServiceCollection AddYuzuIdentity(this IServiceCollection services, IConfiguration configuration)
        {
            // Get connection string from configuration
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            
            if (string.IsNullOrEmpty(connectionString))
            {
                connectionString = configuration.GetSection("DataStorageConfig")["ConnectionString"];
            }

            // Add Identity DbContext
            services.AddDbContext<YuzuIdentityDbContext>(options =>
                options.UseNpgsql(connectionString));

            // Configure Identity
            services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
            {
                // Require confirmed account
                options.SignIn.RequireConfirmedAccount = true;
            })
            .AddEntityFrameworkStores<YuzuIdentityDbContext>()
            .AddDefaultTokenProviders();

            return services;
        }
    }
}
```

### Step 4: Create Identity Database Initializer

```csharp
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Yuzu.Web
{
    public class IdentityDbInitializer
    {
        private readonly YuzuIdentityDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly ILogger<IdentityDbInitializer> _logger;

        public IdentityDbInitializer(
            YuzuIdentityDbContext context, 
            UserManager<ApplicationUser> userManager, 
            RoleManager<ApplicationRole> roleManager, 
            ILogger<IdentityDbInitializer> logger)
        {
            _context = context;
            _userManager = userManager;
            _roleManager = roleManager;
            _logger = logger;
        }

        public async Task InitializeAsync()
        {
            try
            {
                _logger.LogInformation("Ensuring Identity database is created");
                await _context.Database.EnsureCreatedAsync();
                _logger.LogInformation("Identity database created successfully");

                // Optionally create default roles if needed
                if (!await _roleManager.RoleExistsAsync("Admin"))
                {
                    await _roleManager.CreateAsync(new ApplicationRole 
                    { 
                        Name = "Admin", 
                        Description = "Administrator with full access" 
                    });
                    _logger.LogInformation("Created Admin role");
                }

                if (!await _roleManager.RoleExistsAsync("User"))
                {
                    await _roleManager.CreateAsync(new ApplicationRole 
                    { 
                        Name = "User", 
                        Description = "Standard user with limited access" 
                    });
                    _logger.LogInformation("Created User role");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred initializing the identity database");
                throw;
            }
        }
    }
}
```

### Step 5: Update Program.cs

Replace the Azure Table Storage Identity configuration with the new PostgreSQL configuration:

```csharp
// Remove this Azure Table Storage Identity configuration
// builder.Services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
// {
//     options.SignIn.RequireConfirmedAccount = true;
// })
// .AddAzureTableStores<ApplicationDbContext>(() =>
// {
//     IdentityConfiguration identityConfig = new()
//     {
//         TablePrefix = "auth",
//         IndexTableName = "Index",
//         RoleTableName = "Roles",
//         UserTableName = "Users",
//     };
//     return identityConfig;
// },
// () => { /* table client setup code */ })
// .CreateAzureTablesIfNotExists<ApplicationDbContext>()
// .AddDefaultTokenProviders();

// Replace with EF Core Identity
builder.Services.AddYuzuIdentity(builder.Configuration);

// Then, update database initialization:
using (var scope = app.Services.CreateScope())
{
    try
    {
        // Initialize application database
        var dbContext = scope.ServiceProvider.GetRequiredService<Yuzu.Data.YuzuDbContext>();
        await dbContext.Database.EnsureCreatedAsync();
        
        // Initialize identity database
        var identityInitializer = scope.ServiceProvider.GetRequiredService<IdentityDbInitializer>();
        await identityInitializer.InitializeAsync();
        
        app.Logger.LogInformation("Database initialization complete");
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "An error occurred while initializing the database");
    }
}
```

### Step 6: Update NuGet Packages

Remove the ElCamino.AspNetCore.Identity.AzureTable package and add the required Identity EntityFrameworkCore packages:

```
dotnet remove package ElCamino.AspNetCore.Identity.AzureTable
dotnet add package Microsoft.AspNetCore.Identity.EntityFrameworkCore
```

## Testing Strategy

1. **Unit Tests**
   - Create tests for YuzuIdentityDbContext
   - Test user and role management operations
   - Verify entity configuration

2. **Integration Tests**
   - Test user registration flow
   - Test login/logout functionality
   - Test password reset and email confirmation

3. **Manual Testing**
   - Verify login works with form-based authentication
   - Test user registration with email confirmation
   - Validate password reset functionality
   - Test role-based authorization

## NuGet Package Changes

### Packages to Remove
- ElCamino.AspNetCore.Identity.AzureTable

### Packages to Add
- Microsoft.AspNetCore.Identity.EntityFrameworkCore
- Microsoft.EntityFrameworkCore.Design (if not already installed)

## Configuration Changes

### appsettings.json Changes
- Remove or update IdentityStorageConfig section:
```json
"IdentityStorageConfig": {
  "UseDevelopmentStorage": true,
  "StorageAccountName": "styuzuauthger"
}
```

## Additional Considerations

1. **Schema Management**
   - Use EF Core migrations for managing identity schema changes
   - Create initial migration for identity context

2. **Performance**
   - Consider index optimization for frequently queried identity fields
   - Monitor query performance after migration

3. **Security**
   - Review and update password policies
   - Consider implementing additional security features:
     - Two-factor authentication
     - Account lockout policies

4. **Logging**
   - Enhance logging for authentication operations
   - Add audit logging for security-related events

## References

- [ASP.NET Core Identity Documentation](https://docs.microsoft.com/en-us/aspnet/core/security/authentication/identity)
- [Entity Framework Core Documentation](https://docs.microsoft.com/en-us/ef/core/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)