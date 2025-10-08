// Azure Bicep template for InsightI application
@description('The name of the resource group')
param resourceGroupName string = 'insighti-rg'

@description('The location for all resources')
param location string = 'koreacentral'

@description('The name of the application')
param appName string = 'insighti'

@description('The database password')
@secure()
param dbPassword string = 'insighti123'

@description('The JWT secret')
@secure()
param jwtSecret string = 'insighti-super-secret-jwt-key-2024'

@description('The SMS service ID')
param smsServiceId string = 'your-service-id'

@description('The SMS access key')
@secure()
param smsAccessKey string = 'your-access-key'

@description('The SMS secret key')
@secure()
param smsSecretKey string = 'your-secret-key'

@description('The SMS from number')
param smsFromNumber string = '01012345678'

// Variables
var containerRegistryName = '${appName}acr'
var appServicePlanName = '${appName}-plan'
var backendAppName = '${appName}-backend'
var frontendAppName = '${appName}-frontend'
var postgresServerName = '${appName}-postgres'
var databaseName = 'insighti_db'

// Container Registry
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: containerRegistryName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: appServicePlanName
  location: location
  kind: 'linux'
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  properties: {
    reserved: true
  }
}

// PostgreSQL Flexible Server
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2022-12-01' = {
  name: postgresServerName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: 'postgres'
    administratorLoginPassword: dbPassword
    version: '15'
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

// PostgreSQL Database
resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2022-12-01' = {
  parent: postgresServer
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// PostgreSQL Firewall Rule (Allow Azure Services)
resource postgresFirewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2022-12-01' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Backend Web App
resource backendWebApp 'Microsoft.Web/sites@2022-03-01' = {
  name: backendAppName
  location: location
  kind: 'app,linux,container'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'DOCKER|${containerRegistry.properties.loginServer}/insighti-backend:latest'
      alwaysOn: true
      appSettings: [
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'PORT'
          value: '3000'
        }
        {
          name: 'DB_HOST'
          value: '${postgresServer.properties.fullyQualifiedDomainName}'
        }
        {
          name: 'DB_PORT'
          value: '5432'
        }
        {
          name: 'DB_NAME'
          value: databaseName
        }
        {
          name: 'DB_USER'
          value: 'postgres'
        }
        {
          name: 'DB_PASSWORD'
          value: dbPassword
        }
        {
          name: 'JWT_SECRET'
          value: jwtSecret
        }
        {
          name: 'JWT_EXPIRES_IN'
          value: '3d'
        }
        {
          name: 'UPLOAD_DIR'
          value: '/app/uploads'
        }
        {
          name: 'MAX_FILE_SIZE'
          value: '10485760'
        }
        {
          name: 'SMS_SERVICE_ID'
          value: smsServiceId
        }
        {
          name: 'SMS_ACCESS_KEY'
          value: smsAccessKey
        }
        {
          name: 'SMS_SECRET_KEY'
          value: smsSecretKey
        }
        {
          name: 'SMS_FROM_NUMBER'
          value: smsFromNumber
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_URL'
          value: 'https://${containerRegistry.properties.loginServer}'
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_USERNAME'
          value: containerRegistry.name
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_PASSWORD'
          value: containerRegistry.listCredentials().passwords[0].value
        }
      ]
    }
  }
}

// Frontend Web App
resource frontendWebApp 'Microsoft.Web/sites@2022-03-01' = {
  name: frontendAppName
  location: location
  kind: 'app,linux,container'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'DOCKER|${containerRegistry.properties.loginServer}/insighti-frontend:latest'
      alwaysOn: true
      appSettings: [
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_URL'
          value: 'https://${containerRegistry.properties.loginServer}'
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_USERNAME'
          value: containerRegistry.name
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_PASSWORD'
          value: containerRegistry.listCredentials().passwords[0].value
        }
      ]
    }
  }
}

// Outputs
output containerRegistryLoginServer string = containerRegistry.properties.loginServer
output backendAppUrl string = 'https://${backendWebApp.properties.defaultHostName}'
output frontendAppUrl string = 'https://${frontendWebApp.properties.defaultHostName}'
output postgresServerFqdn string = postgresServer.properties.fullyQualifiedDomainName
output resourceGroupName string = resourceGroupName
