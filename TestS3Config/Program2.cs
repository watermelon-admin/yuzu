using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Yuzu.Configuration.S3;

// This file simulates the configuration setup in the Web project
class Program2
{
    static void Main(string[] args)
    {
        // Build configuration
        var configuration = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
            .Build();

        // Create service collection
        var services = new ServiceCollection();
        
        // Add logging
        services.AddLogging(builder => builder.AddConsole());
        
        // Register S3Settings in options using the AddOptions approach (similar to Web project)
        services.AddOptions<S3Settings>()
            .Bind(configuration.GetSection("S3Settings"))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        // Build service provider
        var serviceProvider = services.BuildServiceProvider();

        // Verify the S3Settings
        try 
        {
            var s3Settings = serviceProvider.GetRequiredService<IOptions<S3Settings>>().Value;
            
            Console.WriteLine("S3Settings:");
            Console.WriteLine($"  ServiceUrl: {s3Settings.ServiceUrl}");
            Console.WriteLine($"  BucketName: {s3Settings.BucketName}");
            Console.WriteLine($"  BackgroundsContainer: {s3Settings.BackgroundsContainer}");
            Console.WriteLine($"  AccessKey: {s3Settings.AccessKey}");
            Console.WriteLine($"  SecretKey: {s3Settings.SecretKey}");
            
            // Print whether validation would pass
            if (string.IsNullOrEmpty(s3Settings.ServiceUrl) || 
                string.IsNullOrEmpty(s3Settings.BucketName) || 
                string.IsNullOrEmpty(s3Settings.BackgroundsContainer) || 
                string.IsNullOrEmpty(s3Settings.AccessKey) || 
                string.IsNullOrEmpty(s3Settings.SecretKey))
            {
                Console.WriteLine("ERROR: One or more S3Settings properties are empty!");
            }
            else
            {
                Console.WriteLine("SUCCESS: All S3Settings properties are populated.");
            }
            
            // Try validation manually
            var validationContext = new System.ComponentModel.DataAnnotations.ValidationContext(s3Settings);
            var validationResults = new System.Collections.Generic.List<System.ComponentModel.DataAnnotations.ValidationResult>();
            var isValid = System.ComponentModel.DataAnnotations.Validator.TryValidateObject(s3Settings, validationContext, validationResults, true);
            
            Console.WriteLine($"Validation result: {(isValid ? "Valid" : "Invalid")}");
            foreach (var result in validationResults)
            {
                Console.WriteLine($"- {result.ErrorMessage}");
            }
            
            // Try validation from the class
            var customValidationResults = s3Settings.Validate(validationContext);
            foreach (var result in customValidationResults)
            {
                Console.WriteLine($"Custom validation: {result.ErrorMessage}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"ERROR: {ex.GetType().Name}: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner Exception: {ex.InnerException.GetType().Name}: {ex.InnerException.Message}");
            }
        }
    }
}