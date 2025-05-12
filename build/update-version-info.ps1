# Script to update version information in BuildInfo.cs
# This script replaces placeholder values with actual build information

param(
    [string]$BuildNumber = "dev",
    [string]$GitCommit = "",
    [string]$BuildInfoPath = "../Yuzu.Web/BuildInfo.cs"
)

# Set default BuildDate to current date/time in ISO 8601 format
$BuildDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")

# If GitCommit is not provided, try to get it from git if available
if ([string]::IsNullOrEmpty($GitCommit)) {
    try {
        $GitCommit = git rev-parse --short HEAD
    }
    catch {
        $GitCommit = "unknown"
        Write-Warning "Unable to get git commit hash. Using 'unknown' instead."
    }
}

Write-Host "Updating version information..."
Write-Host "  Build Number: $BuildNumber"
Write-Host "  Build Date: $BuildDate"
Write-Host "  Git Commit: $GitCommit"

# Read the BuildInfo.cs file
$content = Get-Content $BuildInfoPath -Raw

# Replace placeholders with actual values
$content = $content -replace '#{BUILD_BUILDNUMBER}#', $BuildNumber
$content = $content -replace '#{BUILD_DATE}#', $BuildDate
$content = $content -replace '#{GIT_COMMIT}#', $GitCommit

# Write the updated content back to the file
Set-Content -Path $BuildInfoPath -Value $content

Write-Host "Version information updated successfully."