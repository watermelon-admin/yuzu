using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Yuzu.Web
{
    /// <summary>
    /// Service for initializing the Identity database
    /// </summary>
    public class IdentityDbInitializer
    {
        private readonly YuzuIdentityDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly ILogger<IdentityDbInitializer> _logger;

        /// <summary>
        /// Initializes a new instance of the IdentityDbInitializer class
        /// </summary>
        /// <param name="context">The Identity DbContext</param>
        /// <param name="userManager">The ASP.NET Core Identity user manager</param>
        /// <param name="roleManager">The ASP.NET Core Identity role manager</param>
        /// <param name="logger">The logger</param>
        public IdentityDbInitializer(
            YuzuIdentityDbContext context,
            UserManager<ApplicationUser> userManager,
            RoleManager<ApplicationRole> roleManager,
            ILogger<IdentityDbInitializer> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _roleManager = roleManager ?? throw new ArgumentNullException(nameof(roleManager));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Initializes the Identity database roles
        /// </summary>
        /// <returns>A task representing the asynchronous operation</returns>
        public async Task InitializeAsync()
        {
            try
            {
                _logger.LogInformation("Initializing Identity roles (schema is created via migrations)");
                
                // Check database connectivity
                bool canConnect = await _context.Database.CanConnectAsync();
                if (!canConnect) {
                    _logger.LogWarning("Cannot connect to database - role initialization may fail");
                    return;
                }
                
                // Get a list of tables for diagnostics only
                var tableNames = await GetDbTableNamesAsync();
                _logger.LogInformation("Current database tables: {TableNames}", string.Join(", ", tableNames));
                
                // Create default roles if they don't already exist
                await EnsureRolesCreatedAsync();
                
                _logger.LogInformation("Identity roles initialization completed successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while initializing Identity roles: {Message}", ex.Message);
                // Don't rethrow - let the application continue
            }
        }
        
        /// <summary>
        /// Gets a list of table names in the database
        /// </summary>
        private async Task<List<string>> GetDbTableNamesAsync()
        {
            var tableNames = new List<string>();
            
            try
            {
                // Query for table names in PostgreSQL
                var conn = _context.Database.GetDbConnection();
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
                _logger.LogError(ex, "Error getting table names: {Message}", ex.Message);
            }
            
            return tableNames;
        }

        /// <summary>
        /// Ensures that default roles are created
        /// </summary>
        /// <returns>A task representing the asynchronous operation</returns>
        private async Task EnsureRolesCreatedAsync()
        {
            try
            {
                // Create default roles if they don't exist
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
                _logger.LogError(ex, "Error creating default roles: {Message}", ex.Message);
                throw;
            }
        }
    }
}