# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Install Node.js for TypeScript compilation
RUN apt-get update && \
    apt-get install -y --no-install-recommends nodejs npm && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy solution and project files first for better layer caching
COPY *.sln ./
COPY Yuzu.AppHost/*.csproj ./Yuzu.AppHost/
COPY Yuzu.Configuration/*.csproj ./Yuzu.Configuration/
COPY Yuzu.Data/*.csproj ./Yuzu.Data/
COPY Yuzu.Mail/*.csproj ./Yuzu.Mail/
COPY Yuzu.Payments/*.csproj ./Yuzu.Payments/
COPY Yuzu.ServiceDefaults/*.csproj ./Yuzu.ServiceDefaults/
COPY Yuzu.Time/*.csproj ./Yuzu.Time/
COPY Yuzu.Web/*.csproj ./Yuzu.Web/

# Restore dependencies
RUN dotnet restore

# Copy the package.json and package-lock.json for npm
COPY Yuzu.Web/package*.json ./Yuzu.Web/

# Install npm dependencies
WORKDIR /src/Yuzu.Web
RUN npm install

# Copy the rest of the code
WORKDIR /src
COPY . .

# Update version information if build arguments are provided
ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown
WORKDIR /src/build
RUN chmod +x update-version-info.sh
RUN ./update-version-info.sh "$GIT_COMMIT" "$BUILD_DATE" "../Yuzu.Web/BuildInfo.cs"
RUN cat ../Yuzu.Web/BuildInfo.cs

# Install TypeScript compiler and compile TypeScript files
WORKDIR /src/Yuzu.Web
RUN npm install -g typescript
RUN npx tsc --version
# Checking if tsconfig.json exists and compiling if it does
RUN if [ -f "tsconfig.json" ]; then npx tsc; else echo "No tsconfig.json found, skipping TypeScript compilation"; fi

# Build and publish the .NET app
WORKDIR /src
RUN dotnet build "Yuzu.Web/Yuzu.Web.csproj" -c Release -o /app/build
RUN dotnet publish "Yuzu.Web/Yuzu.Web.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Create non-root user for security
RUN groupadd -g 1000 dotnetuser && \
    useradd -m -u 1000 -g dotnetuser dotnetuser

# Install curl for health checks and troubleshooting
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set proper permissions
RUN mkdir -p /app && chown -R dotnetuser:dotnetuser /app

# Copy published files from build stage
COPY --from=build --chown=dotnetuser:dotnetuser /app/publish .

# Set environment variables
ENV ASPNETCORE_URLS=http://+:80
ENV ASPNETCORE_ENVIRONMENT=Production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

# Switch to non-root user
USER dotnetuser

EXPOSE 80
ENTRYPOINT ["dotnet", "Yuzu.Web.dll"]