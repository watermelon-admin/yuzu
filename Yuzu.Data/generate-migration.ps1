# Add the EF Core Tools and Design packages if needed
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Microsoft.EntityFrameworkCore.Tools

# Create the initial migration
dotnet ef migrations add InitialSchemaEfCore --output-dir Migrations/EfCore

# Update the database
dotnet ef database update