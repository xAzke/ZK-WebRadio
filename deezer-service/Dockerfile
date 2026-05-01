FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["deezer-service/deezer-service.csproj", "deezer-service/"]
RUN dotnet restore "deezer-service/deezer-service.csproj"
COPY . .
WORKDIR "/src/deezer-service"
RUN dotnet build "deezer-service.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "deezer-service.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "deezer-service.dll"]
