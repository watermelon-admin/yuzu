using Yuzu.Data.Services.Interfaces;

namespace Yuzu.Data.Services
{
    /// <summary>
    /// Adapter for storage services between Web and Data layers
    /// </summary>
    public class StorageServiceAdapter : Interfaces.IStorageService
    {
        private readonly object _webStorageService;

        /// <summary>
        /// Initializes a new instance of the StorageServiceAdapter class
        /// </summary>
        /// <param name="webStorageService">The web storage service to adapt</param>
        public StorageServiceAdapter(object webStorageService)
        {
            _webStorageService = webStorageService ?? throw new ArgumentNullException(nameof(webStorageService));
            Console.WriteLine($"StorageServiceAdapter created with web service type: {_webStorageService.GetType().FullName}");
            
            // Verify that required methods exist
            var getBaseUrlMethod = _webStorageService.GetType().GetMethod("GetBaseUrl");
            var listObjectsMethod = _webStorageService.GetType().GetMethod("ListObjectsAsync");
            var objectExistsMethod = _webStorageService.GetType().GetMethod("ObjectExistsAsync");
            
            if (getBaseUrlMethod == null || listObjectsMethod == null || objectExistsMethod == null)
            {
                var missing = new List<string>();
                if (getBaseUrlMethod == null) missing.Add("GetBaseUrl");
                if (listObjectsMethod == null) missing.Add("ListObjectsAsync");
                if (objectExistsMethod == null) missing.Add("ObjectExistsAsync");
                
                throw new InvalidOperationException($"Web storage service is missing required methods: {string.Join(", ", missing)}");
            }
        }

        /// <inheritdoc />
        public string GetBaseUrl(string containerName)
        {
            // Use reflection to call the GetBaseUrl method on the web storage service
            var method = _webStorageService.GetType().GetMethod("GetBaseUrl");
            if (method == null)
            {
                throw new InvalidOperationException("GetBaseUrl method not found on web storage service");
            }
            
            var result = method.Invoke(_webStorageService, new object[] { containerName });
            return result?.ToString() ?? string.Empty;
        }

        /// <inheritdoc />
        public async Task<IEnumerable<StorageItem>> ListObjectsAsync(string containerName, string? prefix = null)
        {
            // Use reflection to call the ListObjectsAsync method on the web storage service
            var method = _webStorageService.GetType().GetMethod("ListObjectsAsync");
            if (method == null)
            {
                throw new InvalidOperationException("ListObjectsAsync method not found on web storage service");
            }
            
            // The result is a Task<IEnumerable<StorageItem>> in the web namespace
            var invokeResult = method.Invoke(_webStorageService, new object[] { containerName, prefix });
            if (invokeResult == null)
            {
                return new List<StorageItem>();
            }
            dynamic task = invokeResult;
            var result = await task;
            
            // Convert the result to our StorageItem objects
            var items = new List<StorageItem>();
            foreach (var item in result)
            {
                items.Add(new StorageItem
                {
                    Name = item.Name,
                    Key = item.Key,
                    Size = item.Size,
                    LastModified = item.LastModified
                });
            }
            
            return items;
        }

        /// <inheritdoc />
        public async Task<bool> ObjectExistsAsync(string containerName, string objectName)
        {
            // Use reflection to call the ObjectExistsAsync method on the web storage service
            var method = _webStorageService.GetType().GetMethod("ObjectExistsAsync");
            if (method == null)
            {
                throw new InvalidOperationException("ObjectExistsAsync method not found on web storage service");
            }
            
            var result = method.Invoke(_webStorageService, new object[] { containerName, objectName });
            if (result == null)
            {
                return false;
            }
            return await (Task<bool>)result;
        }
    }

    /// <summary>
    /// Adapter for storage service factory between Web and Data layers
    /// </summary>
    public class StorageServiceFactoryAdapter : Interfaces.IStorageServiceFactory
    {
        private readonly object _webStorageServiceFactory;

        /// <summary>
        /// Initializes a new instance of the StorageServiceFactoryAdapter class
        /// </summary>
        /// <param name="webStorageServiceFactory">The web storage service factory to adapt</param>
        public StorageServiceFactoryAdapter(object webStorageServiceFactory)
        {
            _webStorageServiceFactory = webStorageServiceFactory ?? throw new ArgumentNullException(nameof(webStorageServiceFactory));
        }

        /// <inheritdoc />
        public Interfaces.IStorageService CreateStorageService()
        {
            // Use reflection to call the CreateStorageService method on the web storage service factory
            var method = _webStorageServiceFactory.GetType().GetMethod("CreateStorageService");
            if (method == null)
            {
                throw new InvalidOperationException("CreateStorageService method not found on web storage service factory");
            }
            
            var webStorageService = method.Invoke(_webStorageServiceFactory, null);
            if (webStorageService == null)
            {
                throw new InvalidOperationException("Web storage service factory returned null");
            }
            return new StorageServiceAdapter(webStorageService);
        }

        /// <inheritdoc />
        public string GetBackgroundsUrl()
        {
            // Use reflection to call the GetBackgroundsUrl method on the web storage service factory
            var method = _webStorageServiceFactory.GetType().GetMethod("GetBackgroundsUrl");
            if (method == null)
            {
                throw new InvalidOperationException("GetBackgroundsUrl method not found on web storage service factory");
            }
            
            var result = method.Invoke(_webStorageServiceFactory, null);
            return result?.ToString() ?? string.Empty;
        }
    }
}