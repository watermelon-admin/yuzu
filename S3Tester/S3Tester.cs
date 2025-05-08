using Amazon.S3;
using Amazon.S3.Model;
using Amazon.Runtime;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.IO;

class S3Tester
{
    // Scaleway configuration
    private const string ServiceUrl = "https://s3.fr-par.scw.cloud";
    private const string BucketName = "s3-yuzu-static";
    private const string BackgroundsContainer = "backgrounds";
    private const string AccessKey = "SCW43C6XGT7W6FKN25YM";
    private const string SecretKey = "7cb69d55-4710-46f7-a233-9589e39d4339"; 
    
    static async Task Main(string[] args)
    {
        Console.WriteLine("S3 Connection Tester");
        Console.WriteLine("===================");
        Console.WriteLine($"Service URL: {ServiceUrl}");
        Console.WriteLine($"Bucket Name: {BucketName}");
        Console.WriteLine($"Container: {BackgroundsContainer}");
        Console.WriteLine($"Access Key: {AccessKey}");
        Console.WriteLine($"Secret Key: {SecretKey.Substring(0, 5)}...");
        Console.WriteLine();

        // Create credentials
        var credentials = new BasicAWSCredentials(AccessKey, SecretKey);
        
        // Try different connection methods
        await TestVirtualHostedStyle(credentials);
        await TestPathStyle(credentials);
        await TestWithoutContainer(credentials);
        await TestGetObject(credentials);
        await TestScalewaySpecific(credentials);
        await TestScalewayWithoutRegion(credentials);
        
        Console.WriteLine("\nPress any key to exit...");
        Console.ReadKey();
    }
    
    static async Task TestVirtualHostedStyle(BasicAWSCredentials credentials)
    {
        Console.WriteLine("\n=== Testing Virtual-Hosted Style (ForcePathStyle=false) ===");
        
        try
        {
            // Configure S3 client for virtual-hosted style (bucket in hostname)
            var config = new AmazonS3Config
            {
                ServiceURL = ServiceUrl,
                ForcePathStyle = false,
                RegionEndpoint = Amazon.RegionEndpoint.EUWest3, // Paris
                Timeout = TimeSpan.FromSeconds(30),
                MaxErrorRetry = 3
            };
            
            Console.WriteLine($"S3 Config: ServiceURL={config.ServiceURL}, ForcePathStyle={config.ForcePathStyle}, Region={config.RegionEndpoint.DisplayName}");
            
            using (var s3Client = new AmazonS3Client(credentials, config))
            {
                // List objects in the backgrounds container
                var request = new ListObjectsV2Request
                {
                    BucketName = BucketName,
                    Prefix = $"{BackgroundsContainer}/",
                    MaxKeys = 10
                };
                
                Console.WriteLine($"Sending ListObjectsV2 request: BucketName={request.BucketName}, Prefix={request.Prefix}");
                var response = await s3Client.ListObjectsV2Async(request);
                
                Console.WriteLine($"SUCCESS! Found {response.S3Objects.Count} objects:");
                
                foreach (var obj in response.S3Objects)
                {
                    Console.WriteLine($"  {obj.Key} ({obj.Size} bytes, {obj.LastModified})");
                }
            }
        }
        catch (AmazonS3Exception s3Ex)
        {
            Console.WriteLine($"ERROR (S3): {s3Ex.Message}");
            Console.WriteLine($"Status: {s3Ex.StatusCode}, Error Code: {s3Ex.ErrorCode}");
            Console.WriteLine($"Request ID: {s3Ex.RequestId}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"ERROR: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
            }
        }
    }
    
    static async Task TestPathStyle(BasicAWSCredentials credentials)
    {
        Console.WriteLine("\n=== Testing Path Style (ForcePathStyle=true) ===");
        
        try
        {
            // Configure S3 client for path style URLs
            var config = new AmazonS3Config
            {
                ServiceURL = ServiceUrl,
                ForcePathStyle = true,
                RegionEndpoint = Amazon.RegionEndpoint.EUWest3, // Paris
                Timeout = TimeSpan.FromSeconds(30),
                MaxErrorRetry = 3
            };
            
            Console.WriteLine($"S3 Config: ServiceURL={config.ServiceURL}, ForcePathStyle={config.ForcePathStyle}, Region={config.RegionEndpoint.DisplayName}");
            
            using (var s3Client = new AmazonS3Client(credentials, config))
            {
                // List objects in the backgrounds container
                var request = new ListObjectsV2Request
                {
                    BucketName = BucketName,
                    Prefix = $"{BackgroundsContainer}/",
                    MaxKeys = 10
                };
                
                Console.WriteLine($"Sending ListObjectsV2 request: BucketName={request.BucketName}, Prefix={request.Prefix}");
                var response = await s3Client.ListObjectsV2Async(request);
                
                Console.WriteLine($"SUCCESS! Found {response.S3Objects.Count} objects:");
                
                foreach (var obj in response.S3Objects)
                {
                    Console.WriteLine($"  {obj.Key} ({obj.Size} bytes, {obj.LastModified})");
                }
            }
        }
        catch (AmazonS3Exception s3Ex)
        {
            Console.WriteLine($"ERROR (S3): {s3Ex.Message}");
            Console.WriteLine($"Status: {s3Ex.StatusCode}, Error Code: {s3Ex.ErrorCode}");
            Console.WriteLine($"Request ID: {s3Ex.RequestId}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"ERROR: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
            }
        }
    }
    
    static async Task TestWithoutContainer(BasicAWSCredentials credentials)
    {
        Console.WriteLine("\n=== Testing Root Bucket Listing ===");
        
        try
        {
            // Try both path styles
            var configs = new List<AmazonS3Config>
            {
                new AmazonS3Config
                {
                    ServiceURL = ServiceUrl,
                    ForcePathStyle = false,
                    RegionEndpoint = Amazon.RegionEndpoint.EUWest3,
                    Timeout = TimeSpan.FromSeconds(30)
                },
                new AmazonS3Config
                {
                    ServiceURL = ServiceUrl,
                    ForcePathStyle = true,
                    RegionEndpoint = Amazon.RegionEndpoint.EUWest3,
                    Timeout = TimeSpan.FromSeconds(30)
                }
            };
            
            foreach (var config in configs)
            {
                Console.WriteLine($"\nTrying with ForcePathStyle={config.ForcePathStyle}");
                
                using (var s3Client = new AmazonS3Client(credentials, config))
                {
                    // List root bucket objects (no prefix)
                    var request = new ListObjectsV2Request
                    {
                        BucketName = BucketName,
                        MaxKeys = 20
                    };
                    
                    Console.WriteLine($"Sending root ListObjectsV2 request: BucketName={request.BucketName}");
                    var response = await s3Client.ListObjectsV2Async(request);
                    
                    Console.WriteLine($"SUCCESS! Found {response.S3Objects.Count} objects at root level:");
                    
                    int backgroundImages = 0;
                    foreach (var obj in response.S3Objects)
                    {
                        Console.WriteLine($"  {obj.Key} ({obj.Size} bytes)");
                        if (obj.Key.StartsWith(BackgroundsContainer + "/"))
                        {
                            backgroundImages++;
                        }
                    }
                    
                    Console.WriteLine($"Found {backgroundImages} objects in backgrounds container");
                }
            }
        }
        catch (AmazonS3Exception s3Ex)
        {
            Console.WriteLine($"ERROR (S3): {s3Ex.Message}");
            Console.WriteLine($"Status: {s3Ex.StatusCode}, Error Code: {s3Ex.ErrorCode}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"ERROR: {ex.Message}");
        }
    }
    
    static async Task TestGetObject(BasicAWSCredentials credentials)
    {
        Console.WriteLine("\n=== Testing GetObject ===");
        
        try
        {
            // Configure S3 client
            var config = new AmazonS3Config
            {
                ServiceURL = ServiceUrl,
                ForcePathStyle = false, // Try virtual-hosted style first
                RegionEndpoint = Amazon.RegionEndpoint.EUWest3,
                Timeout = TimeSpan.FromSeconds(30)
            };
            
            using (var s3Client = new AmazonS3Client(credentials, config))
            {
                // First list objects to find something to download
                var listRequest = new ListObjectsV2Request
                {
                    BucketName = BucketName,
                    Prefix = $"{BackgroundsContainer}/",
                    MaxKeys = 5
                };
                
                Console.WriteLine("Trying to find an object to download...");
                var listResponse = await s3Client.ListObjectsV2Async(listRequest);
                
                if (listResponse.S3Objects.Count > 0)
                {
                    var objectKey = listResponse.S3Objects[0].Key;
                    Console.WriteLine($"Found object to download: {objectKey}");
                    
                    // Try to get object metadata
                    var metadataRequest = new GetObjectMetadataRequest
                    {
                        BucketName = BucketName,
                        Key = objectKey
                    };
                    
                    Console.WriteLine("Getting object metadata...");
                    var metadataResponse = await s3Client.GetObjectMetadataAsync(metadataRequest);
                    
                    Console.WriteLine($"SUCCESS! Object exists, Content Type: {metadataResponse.Headers.ContentType}, Size: {metadataResponse.Headers.ContentLength} bytes");
                    
                    // Now try to download the object
                    var getRequest = new GetObjectRequest
                    {
                        BucketName = BucketName,
                        Key = objectKey
                    };
                    
                    Console.WriteLine("Downloading object...");
                    using (var response = await s3Client.GetObjectAsync(getRequest))
                    using (var reader = new StreamReader(response.ResponseStream))
                    {
                        // Read just the first 100 bytes (or less if the object is smaller)
                        char[] buffer = new char[100];
                        int bytesRead = await reader.ReadAsync(buffer, 0, buffer.Length);
                        
                        Console.WriteLine($"Downloaded {bytesRead} bytes of data");
                        Console.WriteLine("SUCCESS! Object download complete");
                    }
                }
                else
                {
                    Console.WriteLine("No objects found to download");
                }
            }
        }
        catch (AmazonS3Exception s3Ex)
        {
            Console.WriteLine($"ERROR (S3): {s3Ex.Message}");
            Console.WriteLine($"Status: {s3Ex.StatusCode}, Error Code: {s3Ex.ErrorCode}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"ERROR: {ex.Message}");
        }
    }
    
    static async Task TestScalewayWithoutRegion(BasicAWSCredentials credentials)
    {
        Console.WriteLine("\n=== Testing Scaleway Without Region Setting ===");
        
        try
        {
            // Configure S3 client without setting region endpoint
            var config = new AmazonS3Config
            {
                ServiceURL = ServiceUrl,
                ForcePathStyle = false, // Try virtual-hosted style
                Timeout = TimeSpan.FromSeconds(30),
                // No region endpoint set intentionally
            };
            
            Console.WriteLine($"S3 Config: ServiceURL={config.ServiceURL}, ForcePathStyle={config.ForcePathStyle}, No Region Endpoint");
            
            using (var s3Client = new AmazonS3Client(credentials, config))
            {
                // Try to list objects in the backgrounds container
                var request = new ListObjectsV2Request
                {
                    BucketName = BucketName,
                    Prefix = $"{BackgroundsContainer}/",
                    MaxKeys = 10
                };
                
                Console.WriteLine($"Sending ListObjectsV2 request: BucketName={request.BucketName}, Prefix={request.Prefix}");
                var response = await s3Client.ListObjectsV2Async(request);
                
                Console.WriteLine($"SUCCESS! Found {response.S3Objects.Count} objects:");
                
                foreach (var obj in response.S3Objects.Take(5))
                {
                    Console.WriteLine($"  {obj.Key} ({obj.Size} bytes)");
                }
            }
        }
        catch (AmazonS3Exception s3Ex)
        {
            Console.WriteLine($"ERROR (S3): {s3Ex.Message}");
            Console.WriteLine($"Status: {s3Ex.StatusCode}, Error Code: {s3Ex.ErrorCode}");
            Console.WriteLine($"Request ID: {s3Ex.RequestId}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"ERROR: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
            }
        }
    }
    
    static async Task TestScalewaySpecific(BasicAWSCredentials credentials)
    {
        Console.WriteLine("\n=== Testing Scaleway Specific Configuration ===");
        
        try
        {
            // Use direct bucket subdomain URL format that Scaleway recommends
            string bucketUrl = $"https://{BucketName}.s3.fr-par.scw.cloud";
            Console.WriteLine($"Using bucket URL: {bucketUrl}");
            
            // Configure S3 client with the bucket URL directly
            var config = new AmazonS3Config
            {
                ServiceURL = bucketUrl,
                ForcePathStyle = false,
                RegionEndpoint = Amazon.RegionEndpoint.EUWest3,
                Timeout = TimeSpan.FromSeconds(30)
            };
            
            Console.WriteLine($"S3 Config: ServiceURL={config.ServiceURL}, ForcePathStyle={config.ForcePathStyle}, Region={config.RegionEndpoint.DisplayName}");
            
            using (var s3Client = new AmazonS3Client(credentials, config))
            {
                // Try listing with empty bucket name since it's already in the URL
                var request1 = new ListObjectsV2Request
                {
                    BucketName = "",
                    Prefix = BackgroundsContainer + "/",
                    MaxKeys = 10
                };
                
                Console.WriteLine("\nTEST 1: Listing with empty bucket name");
                Console.WriteLine($"Request: BucketName=\"\", Prefix={request1.Prefix}");
                
                try
                {
                    var response1 = await s3Client.ListObjectsV2Async(request1);
                    Console.WriteLine($"SUCCESS! Found {response1.S3Objects.Count} objects");
                    
                    foreach (var obj in response1.S3Objects.Take(5))
                    {
                        Console.WriteLine($"  {obj.Key} ({obj.Size} bytes)");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"TEST 1 FAILED: {ex.Message}");
                }
                
                // Try listing with the bucket name still set
                var request2 = new ListObjectsV2Request
                {
                    BucketName = BucketName,
                    Prefix = BackgroundsContainer + "/",
                    MaxKeys = 10
                };
                
                Console.WriteLine("\nTEST 2: Listing with bucket name set");
                Console.WriteLine($"Request: BucketName={request2.BucketName}, Prefix={request2.Prefix}");
                
                try
                {
                    var response2 = await s3Client.ListObjectsV2Async(request2);
                    Console.WriteLine($"SUCCESS! Found {response2.S3Objects.Count} objects");
                    
                    foreach (var obj in response2.S3Objects.Take(5))
                    {
                        Console.WriteLine($"  {obj.Key} ({obj.Size} bytes)");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"TEST 2 FAILED: {ex.Message}");
                }
                
                // Try direct URI construction to test different prefix formats
                var prefixes = new[]
                {
                    "",
                    "/",
                    BackgroundsContainer,
                    BackgroundsContainer + "/",
                    "/" + BackgroundsContainer,
                    "/" + BackgroundsContainer + "/"
                };
                
                Console.WriteLine("\nTEST 3: Testing different prefix formats");
                int testNum = 1;
                
                foreach (var prefix in prefixes)
                {
                    var request3 = new ListObjectsV2Request
                    {
                        BucketName = BucketName,
                        Prefix = prefix,
                        MaxKeys = 5
                    };
                    
                    try
                    {
                        Console.WriteLine($"\nTEST 3.{testNum}: Prefix=\"{prefix}\"");
                        var response3 = await s3Client.ListObjectsV2Async(request3);
                        Console.WriteLine($"SUCCESS! Found {response3.S3Objects.Count} objects");
                        
                        if (response3.S3Objects.Count > 0)
                        {
                            Console.WriteLine($"First object: {response3.S3Objects[0].Key}");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"TEST 3.{testNum} FAILED: {ex.Message}");
                    }
                    
                    testNum++;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"ERROR: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
            }
        }
    }
}