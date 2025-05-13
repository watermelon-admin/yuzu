# Cloudflare R2 Tester

A simple console application for testing connectivity to Cloudflare R2 storage service using AWS SDK for .NET.

## Overview

This utility tests connectivity to Cloudflare R2 storage and demonstrates how to:
- List buckets
- List objects in a bucket
- Upload files (with DisablePayloadSigning for compatibility)
- Download files

## Configuration

Update the following variables in `Program.cs`:

```csharp
private const string AccountId = "YOUR_ACCOUNT_ID";
private const string BucketName = "YOUR_BUCKET_NAME";
private const string AccessKey = "YOUR_ACCESS_KEY";
private const string SecretKey = "YOUR_SECRET_KEY";
```

You can find these values in your Cloudflare dashboard:
1. Navigate to R2 in your Cloudflare dashboard
2. Select your bucket or create a new one
3. Go to "Settings" and then "API Tokens"
4. Create or use an existing API token (S3-compatible credentials) 
5. Use the Account ID, Access Key ID, and Secret Access Key provided

## Running the Tester

```bash
cd S3Tester
dotnet run
```

## Working with R2 in Your Application

To integrate Cloudflare R2 into your application, use this configuration:

```csharp
// Create credentials
var credentials = new BasicAWSCredentials(accessKey, secretKey);

// Configure S3 client
var config = new AmazonS3Config
{
    ServiceURL = $"https://{accountId}.r2.cloudflarestorage.com",
    ForcePathStyle = true,
    UseHttp = false
};

// Create client
using var client = new AmazonS3Client(credentials, config);
```

For uploads, use PutObject with DisablePayloadSigning to avoid streaming signature issues:

```csharp
var putRequest = new PutObjectRequest
{
    BucketName = bucketName,
    Key = key,
    FilePath = filePath,
    ContentType = contentType,
    DisablePayloadSigning = true  // Critical for R2 compatibility
};

await client.PutObjectAsync(putRequest);
```

## Important Notes

1. Cloudflare R2 is compatible with the S3 API but has some differences:
   - Some advanced S3 features might not be implemented
   - Use DisablePayloadSigning=true for uploads to avoid streaming signature issues

2. R2 requires:
   - ForcePathStyle = true
   - The correct account-specific endpoint
   - S3-compatible API credentials (not regular Cloudflare API tokens)