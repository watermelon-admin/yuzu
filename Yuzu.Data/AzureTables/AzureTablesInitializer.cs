using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Threading;
using System.Threading.Tasks;
using Yuzu.Data.AzureTables.Repositories;

namespace Yuzu.Data.AzureTables
{
    public class AzureTablesInitializer : IHostedService
    {
        private readonly IUserDataRepository _userDataRepository;
        private readonly IBreakTypeRepository _breakTypeRepository;
        private readonly IBreakRepository _breakRepository;
        private readonly IBackgroundImageRepository _backgroundImageRepository;
        private readonly ILogger<AzureTablesInitializer> _logger;

        public AzureTablesInitializer(
            IUserDataRepository userDataRepository,
            IBreakTypeRepository breakTypeRepository,
            IBreakRepository breakRepository,
            IBackgroundImageRepository backgroundImageRepository,
            ILogger<AzureTablesInitializer> logger)
        {
            _userDataRepository = userDataRepository;
            _breakTypeRepository = breakTypeRepository;
            _breakRepository = breakRepository;
            _backgroundImageRepository = backgroundImageRepository;
            _logger = logger;
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Initializing Azure Tables...");

            await _userDataRepository.InitializeAsync();
            await _breakTypeRepository.InitializeAsync();
            await _breakRepository.InitializeAsync();
            await _backgroundImageRepository.InitializeAsync();

            _logger.LogInformation("Azure Tables initialized successfully");
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    }
}