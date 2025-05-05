# Yuzu Data Layer

This project has been refactored to use Entity Framework Core with PostgreSQL directly. The repository pattern has been removed in favor of simple service classes that directly use the DbContext.

## Setup Instructions

1. Make sure PostgreSQL is installed and running
2. Update the connection string in `appsettings.json` or `appsettings.Development.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Database=yuzu;Username=your_username;Password=your_password"
}
```

3. Install the Entity Framework Core tools:

```
dotnet tool install --global dotnet-ef
```

4. Install the required packages:

```
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Microsoft.EntityFrameworkCore.Tools
```

5. Generate the initial migration:

```
dotnet ef migrations add InitialSchemaEfCore --project Yuzu.Data --startup-project Yuzu.Web --output-dir Migrations/EfCore
```

6. Apply the migration to create the database schema:

```
dotnet ef database update --project Yuzu.Data --startup-project Yuzu.Web
```

## Architecture

The data layer now uses a simpler, more straightforward architecture:

- **Models**: Domain models used throughout the application
- **Services**: Business logic for accessing and manipulating data
- **YuzuDbContext**: EF Core context defining the database schema
- **DbInitializer**: Handles database creation and initialization

## Service Interfaces

Service interfaces define the contracts for accessing data:

- `IBreakTypeService`: For managing break types
- `IBreakService`: For managing breaks
- `IUserDataService`: For managing user data
- `IUserDataCleanupService`: For cleaning up user data
- `IBackgroundImageService`: For managing background images

## Service Implementations

Each service interface has a concrete implementation that uses EF Core directly:

- `BreakTypeService`: Implements `IBreakTypeService`
- `CachedBreakTypeService`: Decorator for `IBreakTypeService` that adds caching
- `BreakService`: Implements `IBreakService`
- `UserDataService`: Implements `IUserDataService`
- `UserDataCleanupService`: Implements `IUserDataCleanupService`
- `BackgroundImageService`: Implements `IBackgroundImageService`

## Working with the Data Layer

To add a new feature:

1. Add any needed properties to the domain models
2. Add methods to the service interfaces
3. Implement the methods in the service classes
4. Generate a migration for schema changes:

```
dotnet ef migrations add YourMigrationName --project Yuzu.Data --startup-project Yuzu.Web --output-dir Migrations/EfCore
```

5. Apply the migration:

```
dotnet ef database update --project Yuzu.Data --startup-project Yuzu.Web
```