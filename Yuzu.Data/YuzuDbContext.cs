using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Yuzu.Data.Models;

namespace Yuzu.Data
{
    /// <summary>
    /// Entity Framework Core DbContext for Yuzu application
    /// </summary>
    public class YuzuDbContext : DbContext
    {
        private readonly IConfiguration _configuration;
        
        /// <summary>
        /// BreakTypes dataset
        /// </summary>
        public DbSet<BreakType> BreakTypes { get; set; } = null!;
        
        /// <summary>
        /// Breaks dataset
        /// </summary>
        public DbSet<Break> Breaks { get; set; } = null!;
        
        /// <summary>
        /// UserData dataset
        /// </summary>
        public DbSet<UserDataItem> UserData { get; set; } = null!;
        
        /// <summary>
        /// BackgroundImages dataset
        /// </summary>
        public DbSet<BackgroundImage> BackgroundImages { get; set; } = null!;
        
        /// <summary>
        /// Initializes a new instance of the YuzuDbContext class
        /// </summary>
        /// <param name="options">The options to be used by the DbContext</param>
        /// <param name="configuration">The application configuration</param>
        public YuzuDbContext(DbContextOptions<YuzuDbContext> options, IConfiguration configuration)
            : base(options)
        {
            _configuration = configuration;
        }
        
        /// <summary>
        /// Initializes a new instance of the YuzuDbContext class
        /// </summary>
        /// <param name="options">The options to be used by the DbContext</param>
        public YuzuDbContext(DbContextOptions<YuzuDbContext> options)
            : base(options)
        {
            _configuration = new ConfigurationBuilder().Build(); // Empty configuration
        }
        
        /// <summary>
        /// Configures the database model
        /// </summary>
        /// <param name="modelBuilder">The model builder to use for configuration</param>
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Configure BreakType entity
            modelBuilder.Entity<BreakType>(entity =>
            {
                entity.ToTable("Data_BreakTypes");
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.SortOrder).HasColumnName("sort_order");
                entity.Property(e => e.Name).HasColumnName("name").IsRequired();
                entity.Property(e => e.DefaultDurationMinutes).HasColumnName("default_duration_minutes");
                entity.Property(e => e.CountdownMessage).HasColumnName("countdown_message");
                entity.Property(e => e.CountdownEndMessage).HasColumnName("countdown_end_message");
                entity.Property(e => e.EndTimeTitle).HasColumnName("end_time_title");
                entity.Property(e => e.BreakTimeStepMinutes).HasColumnName("break_time_step_minutes");
                entity.Property(e => e.BackgroundImageChoices).HasColumnName("background_image_choices");
                entity.Property(e => e.ImageTitle).HasColumnName("image_title");
                entity.Property(e => e.UsageCount).HasColumnName("usage_count");
                entity.Property(e => e.IconName).HasColumnName("icon_name");
                entity.Property(e => e.Components).HasColumnName("components");
                entity.Property(e => e.IsLocked).HasColumnName("is_locked");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");
                
                // Create index for faster lookup by user_id
                entity.HasIndex(e => e.UserId);
            });
            
            // Configure Break entity
            modelBuilder.Entity<Break>(entity =>
            {
                entity.ToTable("Data_Breaks");
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.BreakTypeId).HasColumnName("break_type_id");
                entity.Property(e => e.StartTime).HasColumnName("start_time");
                entity.Property(e => e.EndTime).HasColumnName("end_time");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");
                
                // Create index for faster lookup by user_id
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.BreakTypeId);
                
                // Create relationship with BreakType
                entity.HasOne(b => b.BreakType)
                    .WithMany(bt => bt.Breaks)
                    .HasForeignKey(b => b.BreakTypeId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
            
            // Configure UserData entity
            modelBuilder.Entity<UserDataItem>(entity =>
            {
                entity.ToTable("Data_UserData");
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.DataKey).HasColumnName("data_key").IsRequired();
                entity.Property(e => e.Value).HasColumnName("value").IsRequired();
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");
                
                // Create index for faster lookup by user_id
                entity.HasIndex(e => e.UserId);
                
                // Create unique index for user_id + data_key combination
                entity.HasIndex(e => new { e.UserId, e.DataKey }).IsUnique();
            });
            
            // Configure BackgroundImage entity
            modelBuilder.Entity<BackgroundImage>(entity =>
            {
                entity.ToTable("Data_BackgroundImages");
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
                entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
                entity.Property(e => e.FileName).HasColumnName("file_name").IsRequired();
                entity.Property(e => e.Title).HasColumnName("title").IsRequired();
                entity.Property(e => e.ThumbnailPath).HasColumnName("thumbnail_path").IsRequired();
                entity.Property(e => e.FullImagePath).HasColumnName("full_image_path").IsRequired();
                entity.Property(e => e.ThumbnailUrl).HasColumnName("thumbnail_url");
                entity.Property(e => e.FullImageUrl).HasColumnName("full_image_url");
                entity.Property(e => e.UploadedAt).HasColumnName("uploaded_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.IsSystem).HasColumnName("is_system").HasDefaultValue(false);
                entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
                entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");
                
                // Create index for faster lookup by user_id
                entity.HasIndex(e => e.UserId);
                
                // Create index for faster lookup by file name
                entity.HasIndex(e => e.FileName);
            });
        }
        
        /// <summary>
        /// Called before saving changes to update timestamps
        /// </summary>
        public override int SaveChanges()
        {
            UpdateTimestamps();
            return base.SaveChanges();
        }
        
        /// <summary>
        /// Called before saving changes asynchronously to update timestamps
        /// </summary>
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            UpdateTimestamps();
            return base.SaveChangesAsync(cancellationToken);
        }
        
        /// <summary>
        /// Updates timestamps for modified entities
        /// </summary>
        private void UpdateTimestamps()
        {
            var utcNow = DateTime.UtcNow;
            
            foreach (var entry in ChangeTracker.Entries()
                .Where(e => e.State == EntityState.Modified))
            {
                if (entry.Entity is BaseEntity baseEntity)
                {
                    baseEntity.UpdatedAt = utcNow;
                }
            }
        }
    }
}