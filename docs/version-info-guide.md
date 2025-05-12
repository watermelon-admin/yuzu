# Version Information Guide

This document explains how version information is managed in the Yuzu application.

## Version Format

Yuzu uses a standard four-part version number:

```
MAJOR.MINOR.REVISION.BUILD
```

For example: `1.0.0.15807683`

## Version Information in Code

Version information is defined in the `BuildInfo.cs` file and includes:

- Major, Minor, and Revision numbers (maintained manually)
- Build number (from CI/CD)
- Build date (timestamp of when the build was created)
- Git commit hash (to trace back to exact source code version)

## Build-time Version Stamping

The `BuildInfo.cs` file contains placeholders that are replaced during the build process:

- `#{BUILD_BUILDNUMBER}#` - Replaced with the build number
- `#{BUILD_DATE}#` - Replaced with the build date
- `#{GIT_COMMIT}#` - Replaced with the git commit hash

## Updating Version Information

### Manual Updates

Major, Minor, and Revision numbers should be updated manually in the `BuildInfo.cs` file when appropriate:

- **Major**: Significant changes or rewrites that may break compatibility
- **Minor**: New features or significant improvements
- **Revision**: Bug fixes and minor improvements

### Automated Updates

The build number and other dynamic information are updated automatically during the build process.

## Update Scripts

Two scripts are provided to update version information during the build process:

### PowerShell (Windows)

```powershell
# From the repository root
./build/update-version-info.ps1 -BuildNumber "12345"
```

### Bash (Linux/macOS)

```bash
# From the repository root
./build/update-version-info.sh "12345"
```

## Integrating with CI/CD

### Azure DevOps

Add the following to your build pipeline:

```yaml
steps:
- task: PowerShell@2
  displayName: 'Update Version Information'
  inputs:
    filePath: '$(Build.SourcesDirectory)/build/update-version-info.ps1'
    arguments: '-BuildNumber "$(Build.BuildNumber)" -GitCommit "$(Build.SourceVersion)"'
```

### GitHub Actions

Add the following to your workflow:

```yaml
- name: Update Version Information
  run: |
    chmod +x ./build/update-version-info.sh
    ./build/update-version-info.sh ${{ github.run_number }} ${{ github.sha }}
```

## Viewing Version Information

The application's version is visible in several places:

1. In the footer of every page
2. At the `/Dbg/Version` endpoint (returns detailed version information)
3. In logs during application startup

## Adding Version Information to Deployments

For Kubernetes deployments, make sure to include the version information in container labels:

```yaml
metadata:
  labels:
    app.kubernetes.io/version: v1.0.0.12345
```

This helps with tracking which version is deployed in each environment.