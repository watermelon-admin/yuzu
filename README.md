# Yuzu

Break timer application for shared office environments.

## Database Migration

This project has recently been migrated from Azure Tables to PostgreSQL with Entity Framework Core. The migration provides:

1. Better relational data modeling
2. Simplified data access with direct EF Core
3. Improved performance with optimized queries
4. Lower cloud costs with PostgreSQL

### Setup Instructions

1. Create a PostgreSQL database for the application
2. Update the connection string in `appsettings.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Database=yuzu;Username=your_username;Password=your_password"
}
```

3. Run the migration script:

```bash
psql -U your_username -d yuzu -f Yuzu.Data/migration.sql
```

4. Build and run the application:

```bash
dotnet build
dotnet run --project Yuzu.Web/Yuzu.Web.csproj
```

## Folder Structure

- **Yuzu.AppHost**: App host for the web application
- **Yuzu.Data**: Data access layer
  - **Models**: Domain models
  - **Services**: Business logic services
- **Yuzu.Mail**: Email functionality
- **Yuzu.Payments**: Stripe integration
- **Yuzu.ServiceDefaults**: Shared service configuration
- **Yuzu.Tests**: Unit tests
- **Yuzu.Time**: Time zone management
- **Yuzu.Web**: Web application UI

## Development Workflow

1. Clone the repository
2. Set up a PostgreSQL database
3. Run the migration script
4. Configure connection strings in appsettings.Development.json
5. Run the application

## Adding New Features

When adding new features:

1. Update models in Yuzu.Data/Models if needed
2. Add new service methods in appropriate service interfaces
3. Implement service methods in service classes
4. Update controllers or Razor pages to use the new services
5. Add tests for new functionality

## Testing

Run tests with:

```bash
dotnet test
```

## Database Migrations

When changing the database schema:

1. Update entity models in Yuzu.Data/Models
2. Update OnModelCreating in YuzuDbContext.cs
3. Create a new migration:

```bash
dotnet ef migrations add YourMigrationName --project Yuzu.Data --startup-project Yuzu.Web --output-dir Migrations/EfCore
```

4. Update the database:

```bash
dotnet ef database update --project Yuzu.Data --startup-project Yuzu.Web
```