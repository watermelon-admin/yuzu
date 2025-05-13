using Amazon.S3;
using Amazon.S3.Model;
using Amazon.Runtime;
using System;
using System.Threading.Tasks;
using System.IO;
using System.Text;

namespace Yuzu.S3Tester
{
    public class Program
    {
        // Cloudflare R2 configuration
        private const string AccountId = "80fe7e7f1e1c6b60eb8d9585227d5ff9";
        private const string BucketName = "backgrounds";
        private const string AccessKey = "dad6d9a02f0f41ccbf64199664211c96";
        private const string SecretKey = "60b8fd9c2d106b4f9d4848378af53b219efdf01aaa35ff2061e01ed24d6284d3";

        static async Task Main(string[] args)
        {
            Console.WriteLine("Cloudflare R2 Connection Tester");
            Console.WriteLine("==============================");

            string endpoint = $"https://{AccountId}.r2.cloudflarestorage.com";
            Console.WriteLine($"Endpoint: {endpoint}");
            Console.WriteLine($"Bucket: {BucketName}");
            Console.WriteLine($"Access Key: {AccessKey.Substring(0, 8)}...");
            Console.WriteLine();

            try
            {
                // Create credentials
                var credentials = new BasicAWSCredentials(AccessKey, SecretKey);

                // Configure S3 client for R2
                var config = new AmazonS3Config
                {
                    ServiceURL = endpoint,
                    ForcePathStyle = true, // Required for R2
                    UseHttp = false
                };

                using var client = new AmazonS3Client(credentials, config);

                // List buckets
                Console.WriteLine("=== Listing Buckets ===");
                var buckets = await client.ListBucketsAsync();
                Console.WriteLine($"Found {buckets.Buckets.Count} bucket(s):");
                foreach (var bucket in buckets.Buckets)
                {
                    Console.WriteLine($"  {bucket.BucketName} (Created: {bucket.CreationDate})");
                }

                // List objects
                Console.WriteLine($"\n=== Listing Objects in '{BucketName}' ===");
                var listRequest = new ListObjectsV2Request
                {
                    BucketName = BucketName,
                    MaxKeys = 10
                };

                var listResponse = await client.ListObjectsV2Async(listRequest);
                Console.WriteLine($"Found {listResponse.S3Objects.Count} object(s):");
                foreach (var obj in listResponse.S3Objects)
                {
                    Console.WriteLine($"  {obj.Key} ({obj.Size} bytes, {obj.LastModified})");
                }

                // Upload a file
                Console.WriteLine($"\n=== Uploading Test File ===");
                string key = $"test-file-{DateTime.UtcNow:yyyyMMdd-HHmmss}.txt";
                string content = $"This is a test file uploaded at {DateTime.UtcNow}";

                // Create temporary file
                string tempFile = Path.GetTempFileName();
                File.WriteAllText(tempFile, content);

                try
                {
                    // Use the absolute simplest upload method
                    Console.WriteLine("Using basic PutObject with file path...");

                    var putRequest = new PutObjectRequest
                    {
                        BucketName = BucketName,
                        Key = key,
                        FilePath = tempFile,
                        ContentType = "text/plain",
                        DisablePayloadSigning = true  // Critical for R2 compatibility
                    };

                    var putResponse = await client.PutObjectAsync(putRequest);
                    Console.WriteLine($"SUCCESS! File uploaded as: {key}");

                    // Download the file
                    Console.WriteLine($"\n=== Downloading Test File ===");
                    var getRequest = new GetObjectRequest
                    {
                        BucketName = BucketName,
                        Key = key
                    };

                    using var response = await client.GetObjectAsync(getRequest);
                    using var reader = new StreamReader(response.ResponseStream);
                    string downloadedContent = await reader.ReadToEndAsync();

                    Console.WriteLine("Downloaded file content:");
                    Console.WriteLine("-----------------------");
                    Console.WriteLine(downloadedContent);
                    Console.WriteLine("-----------------------");
                }
                finally
                {
                    // Clean up temp file
                    if (File.Exists(tempFile))
                    {
                        File.Delete(tempFile);
                    }
                }
            }
            catch (AmazonS3Exception s3Ex)
            {
                Console.WriteLine($"\nS3 ERROR: {s3Ex.Message}");
                Console.WriteLine($"Status: {s3Ex.StatusCode}, Error Code: {s3Ex.ErrorCode}");
                
                if (s3Ex.ErrorCode == "InvalidAccessKeyId")
                {
                    Console.WriteLine("\nThe Access Key ID is not recognized.");
                    Console.WriteLine("Verify you're using the S3-compatible access keys from R2, not a regular Cloudflare API token.");
                }
                else if (s3Ex.ErrorCode == "PermanentRedirect")
                {
                    Console.WriteLine("\nR2 is requesting a different endpoint. Check the error message for details.");
                }
                else if (s3Ex.ErrorCode == "NotImplemented")
                {
                    Console.WriteLine("\nR2 doesn't support this operation. Some S3 features might not be available in R2.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\nERROR: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
            }

            Console.WriteLine("\nPress any key to exit...");
            Console.ReadKey();
        }
    }
}