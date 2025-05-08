using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Yuzu.Data.Services;
using Yuzu.Data.Services.Interfaces;

namespace Yuzu.Data
{
    /// <summary>
    /// Extension methods for registering data services in the dependency injection container
    /// </summary>
    public static class ServiceCollectionExtensions
    {
        /// <summary>
        /// Adds data services to the service collection
        /// </summary>
        /// <param name="services">The service collection</param>
        /// <param name="configuration">The application configuration</param>
        /// <returns>The service collection for chaining</returns>
        public static IServiceCollection AddDataServices(this IServiceCollection services, IConfiguration configuration)
        {
            // Get connection string from configuration
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            
            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException("Could not find a connection string. Ensure that ConnectionStrings:DefaultConnection is set in appsettings.json or user secrets.");
            }
            
            // Register the YuzuDbContext
            services.AddDbContext<YuzuDbContext>(options =>
                options.UseNpgsql(connectionString));
            
            // Register services
            services.AddScoped<IBreakTypeService, BreakTypeService>();
            services.AddScoped<IBreakService, BreakService>();
            services.AddScoped<IUserDataService, UserDataService>();
            services.AddScoped<IUserDataCleanupService, UserDataCleanupService>();
            services.AddScoped<IBackgroundImageService, BackgroundImageService>();
            
            // Register system background image initializer service
            services.AddScoped<SystemBackgroundImageInitializer>();
            
            // Register database initializer
            services.AddScoped<DbInitializer>();
            
            // Add caching decorator for break type service
            services.Decorate<IBreakTypeService, CachedBreakTypeService>();
            
            return services;
        }
    }
    
    /// <summary>
    /// Extension method for decorating services
    /// </summary>
    public static class ServiceCollectionDecoratorExtensions
    {
        /// <summary>
        /// Decorates a service with another implementation
        /// </summary>
        /// <typeparam name="TService">The service type</typeparam>
        /// <typeparam name="TDecorator">The decorator type</typeparam>
        /// <param name="services">The service collection</param>
        /// <returns>The service collection for chaining</returns>
        public static IServiceCollection Decorate<TService, TDecorator>(this IServiceCollection services)
            where TService : class
            where TDecorator : class, TService
        {
            var serviceDescriptor = services.FirstOrDefault(d => d.ServiceType == typeof(TService));
            if (serviceDescriptor == null)
            {
                throw new InvalidOperationException($"Service of type {typeof(TService).Name} is not registered");
            }
            
            // Remove the existing registration
            services.Remove(serviceDescriptor);
            
            // Register the decorator with the original service as a dependency
            services.Add(new ServiceDescriptor(
                typeof(TService),
                sp =>
                {
                    var innerService = ActivatorUtilities.CreateInstance(sp, serviceDescriptor.ImplementationType!);
                    return ActivatorUtilities.CreateInstance<TDecorator>(sp, innerService);
                },
                serviceDescriptor.Lifetime));
            
            return services;
        }
    }
}