using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Yuzu.Data.AzureTables;
using Yuzu.Data.AzureTables.Repositories;
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
            // Register Azure Tables factory (singleton to share TableServiceClient)
            services.AddSingleton<AzureTables.TableServiceClientFactory>();

            // Register Azure Tables repositories
            services.AddSingleton<IUserDataRepository, UserDataRepository>();
            services.AddSingleton<IBreakTypeRepository, BreakTypeRepository>();
            services.AddSingleton<IBreakRepository, BreakRepository>();
            services.AddSingleton<IBackgroundImageRepository, BackgroundImageRepository>();

            // Register services
            services.AddScoped<IUserDataService, UserDataService>();
            services.AddScoped<IBreakTypeService, BreakTypeService>();
            services.AddScoped<IBreakService, BreakService>();
            services.AddScoped<IBackgroundImageService, BackgroundImageService>();
            services.AddScoped<IUserDataCleanupService, UserDataCleanupService>();

            // Register system background image initializer service
            services.AddScoped<SystemBackgroundImageInitializer>();

            // Add caching decorator for break type service
            services.Decorate<IBreakTypeService, CachedBreakTypeService>();

            // Initialize tables on startup
            services.AddHostedService<AzureTablesInitializer>();

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