var builder = DistributedApplication.CreateBuilder(args);

builder.AddProject<Projects.Yuzu_Web>("yuzu-web");

builder.Build().Run();
