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

> 📖 **Complete Setup Guide**: See [docs/DEVELOPMENT_CONTAINERS.md](docs/DEVELOPMENT_CONTAINERS.md) for detailed installation, troubleshooting, and management instructions.

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

### User Secrets Configuration

For production or when testing with real services, configure sensitive settings using .NET User Secrets:

```bash
# Initialize user secrets (only needed once per project)
cd Yuzu.Web
dotnet user-secrets init

# Database Connection
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Database=yuzu;Username=postgres;Password=yourpassword"

# S3/Object Storage Settings
dotnet user-secrets set "S3Settings:AccessKey" "your-access-key"
dotnet user-secrets set "S3Settings:SecretKey" "your-secret-key"
dotnet user-secrets set "S3Settings:AccountId" "your-account-id"  # Required for Cloudflare R2

# Mail Settings (if using real SMTP instead of MailHog)
dotnet user-secrets set "MailSettings:SmtpUsername" "your-smtp-username"
dotnet user-secrets set "MailSettings:SmtpPassword" "your-smtp-password"
dotnet user-secrets set "MailSettings:SmtpNoReplyUsername" "your-noreply-username"
dotnet user-secrets set "MailSettings:SmtpNoReplyPassword" "your-noreply-password"

# Payment Settings
dotnet user-secrets set "PaymentConfig:Stripe:SecretKey" "sk_test_your_stripe_secret_key"

# Application Insights (optional)
dotnet user-secrets set "ApplicationInsights:ConnectionString" "your-app-insights-connection-string"

# List all configured secrets
dotnet user-secrets list

# Remove a specific secret
dotnet user-secrets remove "SecretKey"

# Clear all secrets
dotnet user-secrets clear
```

**Note**: User secrets are stored in your user profile directory and are NOT checked into source control. For production deployments, use environment variables or Azure Key Vault.

## Azure Table Storage Authentication

The application supports two authentication methods for Azure Table Storage:

### Development (Connection String)

For local development with Azurite, use connection string authentication:

```json
{
  "AzureTablesSettings": {
    "UseManagedIdentity": false,
    "AccountUri": ""
  },
  "ConnectionStrings": {
    "AzureTables": "UseDevelopmentStorage=true"
  }
}
```

This is the default configuration in `appsettings.Development.json`.

### Production (Managed Identity)

For production deployments in Azure, use Managed Identity for passwordless authentication:

```json
{
  "AzureTablesSettings": {
    "UseManagedIdentity": true,
    "AccountUri": "https://yourstorageaccount.table.core.windows.net/"
  }
}
```

**Azure Setup Steps:**

1. **Enable Managed Identity** on your Azure App Service or Container App
2. **Assign RBAC Role** to the managed identity:
   - Navigate to your Storage Account → Access Control (IAM)
   - Click "Add role assignment"
   - Select role: **Storage Table Data Contributor**
   - Assign access to: Your App Service's managed identity
3. **Configure Application Settings** in Azure:
   - `AzureTablesSettings__UseManagedIdentity` = `true`
   - `AzureTablesSettings__AccountUri` = `https://yourstorageaccount.table.core.windows.net/`

**Authentication Methods Supported:**

The application uses `DefaultAzureCredential` which automatically tries multiple authentication methods in order:

1. **Environment Variables** - Service principal credentials (AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET)
2. **Managed Identity** - System or user-assigned managed identity (production in Azure)
3. **Azure CLI** - Credentials from `az login` (local development)
4. **Visual Studio** - Credentials from Visual Studio (local development)

This allows seamless authentication across development and production environments without code changes.

**Benefits:**

- ✅ No connection strings or secrets to manage
- ✅ Automatic credential rotation
- ✅ Fine-grained access control via Azure RBAC
- ✅ Works with both system and user-assigned managed identities
- ✅ Simplified local development with Azure CLI or Visual Studio credentials

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
## Font Management (Break Screen Designer)

The break screen designer uses self-hosted Google Fonts for GDPR compliance and better performance. All fonts are stored locally and loaded dynamically.

### Font Architecture

**Files:**
- `Yuzu.Web/wwwroot/css/fonts.css` - @font-face declarations for all fonts
- `Yuzu.Web/wwwroot/js/designer/fonts.ts` - TypeScript font catalog and loading logic
- `Yuzu.Web/wwwroot/js/designer/fonts.js` - Compiled JavaScript (generated from TS)
- `Yuzu.Web/wwwroot/fonts/` - Font files (woff2 format)
- `Yuzu.Web/Pages/Designer.cshtml` - Font dropdown UI

**Current Font Catalog (30 fonts):**
- Sans-Serif: Roboto, Open Sans, Lato, Montserrat, Poppins, Work Sans, Inter, Raleway, Nunito, Source Sans 3
- Serif: Noto Serif, Merriweather, Playfair Display, Libre Baskerville, Crimson Text, Lora
- Monospace: Roboto Mono, Source Code Pro, JetBrains Mono, Courier Prime
- Display: Bebas Neue, Oswald, Archivo Black, Righteous, Permanent Marker, Pacifico, Dancing Script, Lobster, Fredericka the Great, Caveat

### Dynamic Font Loading

Fonts are loaded lazily for optimal performance:

1. **On Designer Load**: Scans canvas data for used fonts and preloads them
2. **On Font Selection**: Loads font before applying to text widget
3. **Font Loading API**: Uses browser's CSS Font Loading API

\`\`\`typescript
// Example usage in code
import { loadFont, preloadUsedFonts } from './fonts.js';

// Load a single font
await loadFont('Roboto');

// Preload fonts from canvas data
const canvasData = JSON.parse(jsonData);
await preloadUsedFonts(canvasData);
\`\`\`

### Adding a New Font

To add a new font to the designer:

1. **Download the font file**:
   - Go to [Google Fonts](https://fonts.google.com/)
   - Select the font and download woff2 format (latin subset, regular weight)
   - Or use [google-webfonts-helper](https://gwfh.mranftl.com/fonts)

2. **Add to `/wwwroot/fonts/`**:
   \`\`\`bash
   # Naming convention: {font-name}-regular.woff2
   cp ~/Downloads/my-font-regular.woff2 Yuzu.Web/wwwroot/fonts/
   \`\`\`

3. **Update `fonts.css`**:
   \`\`\`css
   /* my-font-regular - latin */
   @font-face {
       font-display: swap;
       font-family: 'My Font';
       font-style: normal;
       font-weight: 400;
       src: url('/fonts/my-font-regular.woff2') format('woff2');
   }
   \`\`\`

4. **Update `fonts.ts` catalog**:
   \`\`\`typescript
   // Add to appropriate category in FONT_CATALOG
   {
       name: 'My Font',
       family: 'My Font',
       category: 'sans-serif', // or 'serif', 'monospace', 'display'
       fileName: 'my-font-regular.woff2',
       loaded: false
   }
   \`\`\`

5. **Update `Designer.cshtml` dropdown**:
   \`\`\`html
   <optgroup label="Sans-Serif">
       <!-- ... existing options ... -->
       <option value="My Font">My Font</option>
   </optgroup>
   \`\`\`

6. **Compile TypeScript**:
   \`\`\`bash
   cd Yuzu.Web
   npx tsc wwwroot/js/designer/fonts.ts --outDir wwwroot/js/designer --module es2015 --target es2017 --sourceMap --skipLibCheck
   \`\`\`

7. **Test**: Build and run the designer, verify the font appears in dropdown and renders correctly

### Font Licensing

All Google Fonts are open source (OFL or Apache 2.0 licenses):
- ✅ Free to use, modify, and redistribute
- ✅ Must include original license file
- ✅ Self-hosting is explicitly allowed
- ✅ GDPR compliant (no external requests to Google)

License file location: `Yuzu.Web/wwwroot/fonts/OFL.txt`

### Downloading Multiple Fonts

To download all 27 missing fonts (see fonts.ts for the complete list):

\`\`\`bash
# Use google-webfonts-helper (https://gwfh.mranftl.com/fonts)
# 1. Select each font
# 2. Choose "latin" subset only
# 3. Select "regular" (400) weight only
# 4. Download woff2 format
# 5. Extract to Yuzu.Web/wwwroot/fonts/

# Or use a download script (requires google-webfonts-helper API)
\`\`\`

**Missing fonts to download** (already configured in code):
- Open Sans, Lato, Montserrat, Poppins, Work Sans, Inter, Raleway, Nunito, Source Sans 3
- Merriweather, Playfair Display, Libre Baskerville, Crimson Text, Lora
- Roboto Mono, Source Code Pro, JetBrains Mono, Courier Prime
- Bebas Neue, Oswald, Archivo Black, Righteous, Permanent Marker, Pacifico, Dancing Script, Lobster, Caveat

### Performance Considerations

- **Format**: woff2 only (97%+ browser support, best compression)
- **Subsetting**: Latin characters only (~15-50KB per font)
- **Loading**: `font-display: swap` prevents FOIT (Flash of Invisible Text)
- **Caching**: Aggressive browser caching (fonts rarely change)
- **Initial Load**: Only fonts.css loads (~10KB)
- **Dynamic Load**: Fonts load only when used or selected
