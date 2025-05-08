# Scaleway S3 Tester

A simple console application for testing connectivity to Scaleway S3-compatible storage service.

## Overview

This utility tests various configurations and methods for connecting to Scaleway S3 storage. It helps diagnose connectivity issues and determine the optimal configuration for your application.

## Features

- Tests multiple S3 client configurations
- Tests both virtual-hosted style and path style URLs
- Tests different URL formats and prefix configurations
- Tests object operations (metadata, download)
- Provides detailed error information

## Configuration

Update the following constants in `S3Tester.cs` to match your Scaleway configuration:

```csharp
private const string ServiceUrl = "https://s3.fr-par.scw.cloud";
private const string BucketName = "s3-yuzu-static";
private const string BackgroundsContainer = "backgrounds";
private const string AccessKey = "YOUR_ACCESS_KEY";
private const string SecretKey = "YOUR_SECRET_KEY";
```

## Building and Running

```bash
cd /path/to/S3Tester
dotnet build
dotnet run
```

## Test Categories

The tester runs the following test configurations:

1. **Virtual-Hosted Style** - Uses `ForcePathStyle=false` with standard service URL
2. **Path Style** - Uses `ForcePathStyle=true` with standard service URL
3. **Root Bucket Listing** - Lists root-level objects without a container prefix
4. **GetObject Test** - Attempts to download an object if found
5. **Scaleway-Specific Tests** - Uses direct bucket URL and tests various prefix formats
6. **No Region Endpoint** - Tests without specifying a region endpoint

## Interpreting Results

When you run the tester, look for SUCCESS messages that indicate a working configuration. Pay attention to:

- Which URL style works (virtual-hosted vs path)
- Which prefix format works
- Whether region endpoint setting is required
- Specific errors returned for failed configurations

Use the successful configuration pattern in your main application.