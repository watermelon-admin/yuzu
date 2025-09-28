# YUZU Project Guide

## Build & Test Commands

### .NET (Core)
- Build: `dotnet build Yuzu.sln`
- Run: `dotnet run --project Yuzu.Web/Yuzu.Web.csproj`
- Watch: `dotnet watch --project Yuzu.Web/Yuzu.Web.csproj run`
- Test all C# tests: `dotnet test Yuzu.Tests/Yuzu.Tests.csproj`
- Test single C# test: `dotnet test Yuzu.Tests/Yuzu.Tests.csproj --filter "FullyQualifiedName=Yuzu.Tests.Data.BreakTypesRepositoryTests.GetBreakTypeByIdAsync_ReturnsBreakType_WhenExists"`
- Test single C# test class: `dotnet test Yuzu.Tests/Yuzu.Tests.csproj --filter "FullyQualifiedName~Yuzu.Tests.Data.BreakTypesRepositoryTests"`
- Run tests with coverage: `dotnet test Yuzu.Tests/Yuzu.Tests.csproj /p:CollectCoverage=true /p:CoverletOutputFormat=opencover`

### TypeScript
- Test all: `npm test`
- Watch tests: `npm run test:watch`
- Test single file: `npx jest path/to/test-file.test.ts`
- Test coverage: `npm run test:coverage`

## Development Environment Setup

### Required Services
The application requires the following services for local development:

#### Azurite (Azure Storage Emulator)
```bash
# Start Azurite container
docker run -d -p 10000:10000 -p 10001:10001 -p 10002:10002 --name yuzu-azurite mcr.microsoft.com/azure-storage/azurite

# Stop Azurite
docker stop yuzu-azurite

# Start existing container
docker start yuzu-azurite

# Remove container (to reset data)
docker rm yuzu-azurite
```

#### MailHog (Email Testing)
```bash
# Start MailHog container
docker run -d -p 1025:1025 -p 8025:8025 --name yuzu-mailhog mailhog/mailhog

# View captured emails at: http://localhost:8025
# SMTP server available at: localhost:1025

# Stop MailHog
docker stop yuzu-mailhog

# Start existing container
docker start yuzu-mailhog

# Remove container
docker rm yuzu-mailhog
```

#### Start All Development Services
```bash
# Start both services for development
docker start yuzu-azurite yuzu-mailhog

# Or create and start if not exists
docker run -d -p 10000:10000 -p 10001:10001 -p 10002:10002 --name yuzu-azurite mcr.microsoft.com/azure-storage/azurite
docker run -d -p 1025:1025 -p 8025:8025 --name yuzu-mailhog mailhog/mailhog
```

### Configuration
Development configuration is automatically used when `ASPNETCORE_ENVIRONMENT=Development`:
- **Azure Storage**: Uses `UseDevelopmentStorage=true` (connects to Azurite)
- **Email**: Configured to use MailHog (localhost:1025, no authentication)
- **Debug Settings**: All users treated as subscribed for testing

## Testing Guidelines

### C# Unit Testing
- Use xUnit for all C# unit testing
- Create separate test classes for each class being tested
- Follow the Arrange-Act-Assert pattern for test structure
- Use Moq for mocking dependencies
- For testing code that uses Azure services, refactor to use interfaces for better testability
- Test failure cases in addition to success cases

### Current Test Coverage
- Time module: Good coverage (Line: 87.5%, Branch: 92.85%, Method: 64.7%)
- Mail module: Good coverage (Line: 62.74%, Branch: 50%, Method: 77.77%)
- Payments module: Low coverage (Line: 24.44%, Branch: 0%, Method: 33.33%)
- Data module: Very low coverage (Line: 1.96%, Branch: 0%, Method: 16.36%)
- Web module: No coverage
- ServiceDefaults module: No coverage

### Test Improvement Plan
1. Refactor repositories to use interfaces for better testability
   - Create `ITableStorage<T>` interface to abstract Azure Table Storage operations
   - Create `ITableStorageFactory` to create table storage instances
   - Create interfaces for repositories (e.g., `IBreakTypesRepository`)
   - Implement repositories with dependency injection
   - Create unit tests with mocked dependencies
2. Add more tests for payment processing functionality
3. Add integration tests for critical user flows
4. Add tests for web controllers and Razor pages

## Code Style Guidelines

### .NET
- Nullable enabled
- ImplicitUsings enabled
- Target framework: net9.0
- PascalCase for class/method/property names
- Use async/await pattern for asynchronous operations

### TypeScript
- ES2017 target
- ESNext module
- Source maps enabled
- Tests in `__tests__` directories with `.test.ts` suffix
- Jest for testing with jest-environment-jsdom
- ES modules pattern (import/export)
- Interface-based typing

### Conventions
- Component-based architecture
- Repository pattern for data access
- Services for business logic
- Dependency injection
- Repository files follow `EntityNameRepository.cs` pattern

## S3 Integration

```csharp
// S3 operations with AWS SDK
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.UserSecrets;
using System.Text;

// Main execution method
async Task RunS3DemoAsync()
{
    // Load configuration from appsettings.json and user secrets
    IConfiguration config = new ConfigurationBuilder()
        .SetBasePath(Directory.GetCurrentDirectory())
        .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
        .AddUserSecrets<Program>() // This line enables user secrets
        .Build();

    // dotnet user-secrets set "S3Settings:AccessKey" "your-access-key"
    // dotnet user-secrets set "S3Settings:SecretKey" "your-secret-key"
    // dotnet user-secrets set "S3Settings:ServiceUrl" "https://s3.nl-ams.scw.cloud"
    // dotnet user-secrets set "S3Settings:BucketName" "a3-yuzu-static-01"

    // Read S3 settings from configuration
    var s3Config = config.GetSection("S3Settings");
    var accessKey = s3Config["AccessKey"];
    var secretKey = s3Config["SecretKey"];
    var serviceUrl = s3Config["ServiceUrl"];
    var bucketName = s3Config["BucketName"];

    Console.WriteLine($"Connecting to S3 bucket: {bucketName} at {serviceUrl}");

    // Create credentials and S3 client
    var credentials = new BasicAWSCredentials(accessKey, secretKey);
    var s3Client = new AmazonS3Client(credentials, new AmazonS3Config
    {
        ServiceURL = serviceUrl,
        ForcePathStyle = true
    });

    try
    {
        // 1. List all objects in the bucket
        await ListAllObjectsAsync(s3Client, bucketName);

        // 2. Upload a text file
        string fileKey = "demo-file.txt";
        string fileContent = "Hello from Scaleway S3 bucket demo! This file was created at " + DateTime.UtcNow.ToString();
        await UploadTextFileAsync(s3Client, bucketName, fileKey, fileContent);

        // 3. Read the file we just uploaded
        string downloadedContent = await DownloadTextFileAsync(s3Client, bucketName, fileKey);
        Console.WriteLine($"\nDownloaded content:\n{downloadedContent}");

        // 4. List objects again to see our new file
        await ListAllObjectsAsync(s3Client, bucketName);

        // 5. Optional: Delete the file we created
        // Uncomment the line below if you want to delete the file after the demo
        // await DeleteFileAsync(s3Client, bucketName, fileKey);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error: {ex.Message}");
        if (ex.InnerException != null)
        {
            Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
        }
    }
}

// Helper methods
async Task ListAllObjectsAsync(IAmazonS3 client, string bucket)
{
    Console.WriteLine($"\nListing all objects in bucket: {bucket}");
    var request = new ListObjectsV2Request
    {
        BucketName = bucket,
        MaxKeys = 1000
    };

    ListObjectsV2Response response;
    int count = 0;

    do
    {
        response = await client.ListObjectsV2Async(request);
        foreach (var obj in response.S3Objects)
        {
            count++;
            Console.WriteLine($"{count,4}: {obj.Key,-50} | Size: {obj.Size,10} bytes | Last Modified: {obj.LastModified}");
        }
        request.ContinuationToken = response.NextContinuationToken;
    } while (response.IsTruncated);

    Console.WriteLine($"Total objects: {count}");
}

// Upload a text file to S3
async Task UploadTextFileAsync(IAmazonS3 client, string bucket, string key, string content)
{
    Console.WriteLine($"\nUploading text file: {key}");

    byte[] contentBytes = Encoding.UTF8.GetBytes(content);
    using var stream = new MemoryStream(contentBytes);

    var putRequest = new PutObjectRequest
    {
        BucketName = bucket,
        Key = key,
        InputStream = stream,
        ContentType = "text/plain"
    };

    var response = await client.PutObjectAsync(putRequest);
    Console.WriteLine($"Upload complete with ETag: {response.ETag}");
}

// Download a text file from S3
async Task<string> DownloadTextFileAsync(IAmazonS3 client, string bucket, string key)
{
    Console.WriteLine($"\nDownloading text file: {key}");

    var getRequest = new GetObjectRequest
    {
        BucketName = bucket,
        Key = key
    };

    using var response = await client.GetObjectAsync(getRequest);
    using var reader = new StreamReader(response.ResponseStream);
    string content = await reader.ReadToEndAsync();

    Console.WriteLine($"Download complete, content size: {content.Length} characters");
    return content;
}

// Delete a file from S3
async Task DeleteFileAsync(IAmazonS3 client, string bucket, string key)
{
    Console.WriteLine($"\nDeleting file: {key}");

    var deleteRequest = new DeleteObjectRequest
    {
        BucketName = bucket,
        Key = key
    };

    await client.DeleteObjectAsync(deleteRequest);
    Console.WriteLine("Delete operation complete");
}

// Add this at the end of your file if this is a console application
await RunS3DemoAsync();
```