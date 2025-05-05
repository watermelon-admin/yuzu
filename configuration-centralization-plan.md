# Configuration Centralization Plan

## Overview

This document outlines the plan to centralize and improve configuration management in the Yuzu application. The goal is to move from direct configuration access in individual components to a strongly-typed, centralized configuration system using the Options pattern.

## Current Issues

1. **Inconsistent access patterns**:
   - Direct indexing: `configuration["SomeSection:SomeKey"]`
   - Section-based access: `configuration.GetSection("SomeSection")`
   - GetConnectionString: `configuration.GetConnectionString("DefaultConnection")`

2. **No type safety**:
   - String-based access prone to typos
   - No IntelliSense support
   - No validation

3. **Repeated configuration code**:
   - Configuration values are read in multiple places
   - Default values and fallbacks duplicated

4. **Hard to track dependencies**:
   - Difficult to determine which components need which configuration
   - No clear documentation of required settings

## Implementation Approach

### 1. Create Configuration Classes

Define POCO classes for each configuration section:

- `MailSettings`: Email server configuration
- `S3Settings`: S3 storage configuration
- `PaymentSettings`: Stripe and payment processing
- `DataStorageSettings`: Database and storage configuration
- `DebugSettings`: Development and debugging options
- `IdentitySettings`: ASP.NET Core Identity configuration

### 2. Use Options Pattern

Register all configuration sections in Program.cs:

```csharp
// Register all configuration
builder.Services.AddOptions<MailSettings>()
    .Bind(builder.Configuration.GetSection("MailConnectionConfig"))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// Similar for other configuration sections
```

### 3. Update Services to Use IOptions<T>

Update service constructors to use the Options pattern:

**Before**:
```csharp
public EmailSender(IConfiguration configuration)
{
    var smtpServer = configuration["MailConnectionConfig:SmtpServer"];
    // ...
}
```

**After**:
```csharp
public EmailSender(IOptions<MailSettings> mailOptions)
{
    var options = mailOptions.Value;
    var smtpServer = options.SmtpServer;
    // ...
}
```

### 4. Validation

Add data annotations and custom validation logic:

```csharp
public class S3Settings : IValidatableObject
{
    [Required]
    [Url]
    public string ServiceUrl { get; set; } = string.Empty;
    
    // ...
    
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        // Custom validation logic
    }
}
```

## Files to Update

### Core Configuration Infrastructure

1. ✅ Create configuration classes:
   - `/Yuzu.Web/Configuration/MailSettings.cs`
   - `/Yuzu.Web/Configuration/S3Settings.cs`
   - `/Yuzu.Web/Configuration/PaymentSettings.cs`
   - `/Yuzu.Web/Configuration/DataStorageSettings.cs`
   - `/Yuzu.Web/Configuration/DebugSettings.cs`
   - `/Yuzu.Web/Configuration/IdentitySettings.cs`
   - `/Yuzu.Web/Configuration/ConfigurationExtensions.cs`

2. ✅ Update Program.cs to use Options pattern:
   - `/Yuzu.Web/Program.cs`

### Services to Update

3. ✅ Update S3 services:
   - `/Yuzu.Web/Tools/StorageServices/S3StorageService.cs`
   - `/Yuzu.Web/Tools/StorageServices/StorageServiceFactory.cs`

4. ✅ Update payment services:
   - `/Yuzu.Payments/StripeService.cs`
   - `/Yuzu.Web/Pages/Payments/Buy.cshtml.cs`

5. ✅ Update background image services:
   - `/Yuzu.Data/Services/SystemBackgroundImageInitializer.cs`

6. Update remaining services (in subsequent phases):
   - `/Yuzu.Data/ServiceCollectionExtensions.cs`
   - `/Yuzu.Web/IdentityServiceCollectionExtensions.cs`
   - `/Yuzu.Web/Tools/BackgroundImageService.cs`
   - `/Yuzu.Web/Tools/StripeTools.cs`
   - `/Yuzu.Web/Tools/WeatherService.cs`

## Migration Strategy

1. **Phase 1 - Infrastructure Setup (Current PR)**:
   - Create configuration classes and add validation
   - Set up Options pattern registration
   - Update a few key services as examples

2. **Phase 2 - Service Migration**:
   - Update remaining services to use Options pattern
   - Remove direct IConfiguration dependencies

3. **Phase 3 - Validation and Testing**:
   - Add comprehensive validation for all settings
   - Add unit tests for configuration validation
   - Document all configuration options

## Benefits

1. **Type safety**: No more string-based configuration access
2. **Self-documentation**: Configuration requirements clearly defined
3. **Centralized management**: All configuration registered in one place
4. **Validation**: Fail-fast validation for required settings
5. **Testability**: Easier to mock configuration for tests
6. **Maintainability**: Clearer dependencies and configuration requirements

## Implementation Notes

- No runtime behavior should change during this refactoring
- Validation should be stricter but not break existing valid configurations
- Default values should match current behavior