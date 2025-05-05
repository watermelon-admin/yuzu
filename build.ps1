# PowerShell script to build the project on Windows side
# Usage: Open PowerShell in Windows and run: ./build.ps1

# Clean output folders
Write-Host "Cleaning output folders..."
Get-ChildItem -Path . -Directory | ForEach-Object {
    $binDir = Join-Path $_.FullName "bin"
    $objDir = Join-Path $_.FullName "obj"
    
    if (Test-Path $binDir) {
        Remove-Item -Path $binDir -Recurse -Force
    }
    
    if (Test-Path $objDir) {
        Remove-Item -Path $objDir -Recurse -Force
    }
}

# Build the solution
Write-Host "Building solution..."
dotnet build Yuzu.sln