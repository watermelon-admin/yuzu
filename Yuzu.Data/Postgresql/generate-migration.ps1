#!/usr/bin/env pwsh
# Script to generate an Entity Framework Core migration for the PostgreSQL database

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Join-Path $scriptPath "..\"

# Change to project directory
Set-Location $projectPath

# Ensure the Migrations directory exists
$migrationsPath = Join-Path $scriptPath "Migrations"
if (-not (Test-Path $migrationsPath)) {
    New-Item -ItemType Directory -Path $migrationsPath -Force | Out-Null
    Write-Host "Created Migrations directory" -ForegroundColor Green
}

# Generate migration
Write-Host "Generating migration for PostgreSQL database..." -ForegroundColor Cyan
dotnet ef migrations add InitialPostgresSchema --context YuzuDbContext --output-dir Postgresql/Migrations

Write-Host "Generating SQL script..." -ForegroundColor Cyan
dotnet ef migrations script --context YuzuDbContext --output Postgresql/Migrations/migration.sql

Write-Host "Done!" -ForegroundColor Green