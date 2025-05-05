using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Yuzu.Web
{
    /// <summary>
    /// Identity DbContext for Yuzu application using PostgreSQL
    /// </summary>
    public class YuzuIdentityDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, string>
    {
        /// <summary>
        /// Initializes a new instance of the YuzuIdentityDbContext class
        /// </summary>
        /// <param name="options">The options to be used by the DbContext</param>
        public YuzuIdentityDbContext(DbContextOptions<YuzuIdentityDbContext> options)
            : base(options)
        {
        }

        /// <summary>
        /// Configures the database model
        /// </summary>
        /// <param name="builder">The model builder to use for configuration</param>
        protected override void OnModelCreating(ModelBuilder builder)
        {
            // Call base implementation first to set up the basic identity model
            base.OnModelCreating(builder);

            // Customize table names to use 'Identity' prefix to separate from application data
            builder.Entity<ApplicationUser>(entity => {
                entity.ToTable("Identity_Users");
                // Add additional configuration if needed
                entity.Property(u => u.FirstName).HasMaxLength(256);
                entity.Property(u => u.LastName).HasMaxLength(256);
            });

            builder.Entity<ApplicationRole>(entity => {
                entity.ToTable("Identity_Roles");
                // Add additional configuration if needed
                entity.Property(r => r.Description).HasMaxLength(256);
            });

            builder.Entity<IdentityUserRole<string>>(entity => {
                entity.ToTable("Identity_UserRoles");
                // Make sure primary key is configured
                entity.HasKey(r => new { r.UserId, r.RoleId });
            });

            builder.Entity<IdentityUserClaim<string>>(entity => {
                entity.ToTable("Identity_UserClaims");
            });

            builder.Entity<IdentityUserLogin<string>>(entity => {
                entity.ToTable("Identity_UserLogins");
                // Make sure primary key is configured
                entity.HasKey(l => new { l.LoginProvider, l.ProviderKey });
            });

            builder.Entity<IdentityUserToken<string>>(entity => {
                entity.ToTable("Identity_UserTokens");
                // Make sure primary key is configured
                entity.HasKey(t => new { t.UserId, t.LoginProvider, t.Name });
            });

            builder.Entity<IdentityRoleClaim<string>>(entity => {
                entity.ToTable("Identity_RoleClaims");
            });
        }
    }
}