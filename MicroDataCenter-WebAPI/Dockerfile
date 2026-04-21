# Use the official .NET 10.0 runtime as a parent image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

# Use the SDK image to build the application
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

ARG APP_VERSION=0.0.0
ARG BUILD_DATE

# Copy csproj files and restore as distinct layers
COPY ["MDC.Api/MDC.Api.csproj", "MDC.Api/"]
COPY ["MDC.Core/MDC.Core.csproj", "MDC.Core/"]
COPY ["MDC.Shared/MDC.Shared.csproj", "MDC.Shared/"]
RUN dotnet restore "MDC.Api/MDC.Api.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/MDC.Api"
RUN dotnet build "MDC.Api.csproj" \
	-c Release \
    -o /app/build \
    /p:Version=$APP_VERSION \
    /p:AssemblyVersion=$APP_VERSION \
    /p:FileVersion=$APP_VERSION \
    /p:InformationalVersion=$APP_VERSION

FROM build AS publish
RUN dotnet publish "MDC.Api.csproj" \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false \
    /p:Version=$APP_VERSION \
    /p:AssemblyVersion=$APP_VERSION \
    /p:FileVersion=$APP_VERSION \
    /p:InformationalVersion=$APP_VERSION

# Build runtime image
FROM base AS final
WORKDIR /app

# OCI Image Metadata
LABEL org.opencontainers.image.title="MDC Web API"
LABEL org.opencontainers.image.description="Micro Data Center Web API"
LABEL org.opencontainers.image.version=$APP_VERSION
LABEL org.opencontainers.image.created=$BUILD_DATE

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MDC.Api.dll"]