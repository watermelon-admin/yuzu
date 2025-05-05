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
        /// Initializes the Identity database
        /// </summary>
        /// <returns>A task representing the asynchronous operation</returns>
        public async Task InitializeAsync()
        {
            try
            {
                _logger.LogInformation("Ensuring Identity database schema is created");
                
                // Create the database schema if not exists
                bool canConnect = await _context.Database.CanConnectAsync();
                _logger.LogInformation("Can connect to database: {CanConnect}", canConnect);
                
                // Get a list of tables in the database
                var tableNames = await GetDbTableNamesAsync();
                _logger.LogInformation("Current database tables: {TableNames}", string.Join(", ", tableNames));
                
                // Make sure the database exists
                await _context.Database.EnsureCreatedAsync();
                _logger.LogInformation("Identity database schema creation attempt completed");
                
                // Check if the Identity_Users table was created
                tableNames = await GetDbTableNamesAsync();
                bool hasIdentityUsers = tableNames.Contains("Identity_Users");
                _logger.LogInformation("Identity_Users table exists: {HasTable}", hasIdentityUsers);
                
                if (!hasIdentityUsers)
                {
                    _logger.LogWarning("Identity_Users table does not exist yet, forcing schema creation");
                    
                    // Force model creation with SQL
                    string sql = _context.Database.GenerateCreateScript();
                    _logger.LogInformation("Generated SQL for schema creation: {SqlLength} chars", sql.Length);
                    
                    await _context.Database.ExecuteSqlRawAsync(sql);
                    _logger.LogInformation("Executed SQL for schema creation");
                    
                    // Verify tables again
                    tableNames = await GetDbTableNamesAsync();
                    hasIdentityUsers = tableNames.Contains("Identity_Users");
                    _logger.LogInformation("After SQL execution, Identity_Users table exists: {HasTable}", hasIdentityUsers);
                }
                
                // Create default roles if they don't already exist
                await EnsureRolesCreatedAsync();
                
                _logger.LogInformation("Identity database initialization completed successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while initializing the Identity database: {Message}", ex.Message);
                if (ex.InnerException != null)
                {
                    _logger.LogError("Inner exception: {Message}", ex.InnerException.Message);
                }
                throw;
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