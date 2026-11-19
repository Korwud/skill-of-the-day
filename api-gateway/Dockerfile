FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY api-gateway/src/ApiGateway/ApiGateway.csproj api-gateway/src/ApiGateway/
COPY observability/ServiceDefaults/ServiceDefaults.csproj observability/ServiceDefaults/
RUN dotnet restore api-gateway/src/ApiGateway/ApiGateway.csproj
COPY api-gateway/src api-gateway/src
COPY observability/ServiceDefaults observability/ServiceDefaults
RUN dotnet publish api-gateway/src/ApiGateway/ApiGateway.csproj -c Release -o /out --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /out .
USER $APP_UID
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 CMD ["dotnet", "ApiGateway.dll", "--healthcheck"]
ENTRYPOINT ["dotnet", "ApiGateway.dll"]
