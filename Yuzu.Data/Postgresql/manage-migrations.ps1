#!/usr/bin/env pwsh
# Script to manage Entity Framework Core migrations for PostgreSQL database

param (
    [string]$Action = "generate",
    [string]$Name = "InitialMigration"
)

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

function Add-Migration {
    param (
        [string]$MigrationName
    )
    
    Write-Host "Adding migration '$MigrationName' for PostgreSQL database..." -ForegroundColor Cyan
    dotnet ef migrations add $MigrationName --context YuzuDbContext --output-dir Postgresql/Migrations
    
    # Generate SQL script
    Write-Host "Generating SQL script..." -ForegroundColor Cyan
    dotnet ef migrations script --context YuzuDbContext --output Postgresql/Migrations/migration.sql
}

function Apply-Migration {
    Write-Host "Applying migrations to PostgreSQL database..." -ForegroundColor Cyan
    dotnet ef database update --context YuzuDbContext
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Migrations applied successfully!" -ForegroundColor Green
    } else {
        Write-Host "Failed to apply migrations. Check connection string and ensure PostgreSQL is running." -ForegroundColor Red
    }
}

function Remove-Migration {
    Write-Host "Removing last migration..." -ForegroundColor Cyan
    dotnet ef migrations remove --context YuzuDbContext
}

function List-Migrations {
    Write-Host "Listing migrations..." -ForegroundColor Cyan
    dotnet ef migrations list --context YuzuDbContext
}

# Execute the requested action
switch ($Action.ToLower()) {
    "add" {
        Add-Migration -MigrationName $Name
    }
    "update" {
        Apply-Migration
    }
    "remove" {
        Remove-Migration
    }
    "list" {
        List-Migrations
    }
    "generate" {
        Add-Migration -MigrationName $Name
    }
    default {
        Write-Host "Unknown action: $Action" -ForegroundColor Red
        Write-Host "Available actions: add, update, remove, list, generate" -ForegroundColor Yellow
    }
}

Write-Host "Done!" -ForegroundColor Green