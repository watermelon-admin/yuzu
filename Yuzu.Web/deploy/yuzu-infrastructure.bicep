@description('The environment name, used as a prefix/suffix in naming patterns')
param environment string = 'dev'

@description('The region code for deployment')
param regionCode string = 'dewc'

@description('The main Azure region for resource deployment')
param location string = 'germanywestcentral'

@description('The project codename used in resource naming')
param projectName string = 'yuzu'

@description('Instance number for globally unique resources')
param instanceNumber string = '01'

// Common naming variables
var prefix = 'st'
var webAppPrefix = 'app'
var keyVaultPrefix = 'kv'
var logAnalyticsPrefix = 'log'
var appInsightsPrefix = 'ai'
var vnetPrefix = 'vnet'
var nsgPrefix = 'nsg'

// Resource naming patterns
var authStorageName = '${prefix}${projectName}auth${instanceNumber}${regionCode}'
var operationalStorageName = '${prefix}${projectName}data${instanceNumber}${regionCode}'
var staticStorageName = '${prefix}${projectName}static${instanceNumber}${regionCode}'
var webAppName = '${webAppPrefix}-${projectName}-${environment}-${regionCode}'
var appServicePlanName = '${webAppPrefix}-plan-${projectName}-${environment}-${regionCode}'
var keyVaultName = '${keyVaultPrefix}-${projectName}-${environment}-${regionCode}'
var logAnalyticsName = '${logAnalyticsPrefix}-${projectName}-${environment}-${regionCode}'
var appInsightsName = '${appInsightsPrefix}-${projectName}-${environment}-${regionCode}'
var vnetName = '${vnetPrefix}-${projectName}-${environment}-${regionCode}'
var webAppSubnetName = 'snet-webapp'
var storageSubnetName = 'snet-storage'
var keyVaultSubnetName = 'snet-keyvault'
var webappNsgName = '${nsgPrefix}-webapp-${environment}-${regionCode}'
var storageNsgName = '${nsgPrefix}-storage-${environment}-${regionCode}'
var keyVaultNsgName = '${nsgPrefix}-keyvault-${environment}-${regionCode}'

// Network Security Groups
resource webAppNsg 'Microsoft.Network/networkSecurityGroups@2023-05-01' = {
  name: webappNsgName
  location: location
  properties: {
    securityRules: [
      {
        name: 'AllowHTTPInbound'
        properties: {
          priority: 100
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '80'
        }
      }
      {
        name: 'AllowHTTPSInbound'
        properties: {
          priority: 110
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '443'
        }
      }
      {
        name: 'AllowStorageAccess'
        properties: {
          priority: 120
          direction: 'Outbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: 'Storage'
          destinationPortRange: '443'
        }
      }
      {
        name: 'AllowKeyVaultAccess'
        properties: {
          priority: 130
          direction: 'Outbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: 'AzureKeyVault'
          destinationPortRange: '443'
        }
      }
    ]
  }
}

resource storageNsg 'Microsoft.Network/networkSecurityGroups@2023-05-01' = {
  name: storageNsgName
  location: location
  properties: {
    securityRules: [
      {
        name: 'AllowWebAppInbound'
        properties: {
          priority: 100
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: '10.0.1.0/24' // Web app subnet CIDR
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '443'
        }
      }
      {
        name: 'DenyAllOtherInbound'
        properties: {
          priority: 200
          direction: 'Inbound'
          access: 'Deny'
          protocol: '*'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '*'
        }
      }
    ]
  }
}

resource keyVaultNsg 'Microsoft.Network/networkSecurityGroups@2023-05-01' = {
  name: keyVaultNsgName
  location: location
  properties: {
    securityRules: [
      {
        name: 'AllowWebAppInbound'
        properties: {
          priority: 100
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: '10.0.1.0/24' // Web app subnet CIDR
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '443'
        }
      }
      {
        name: 'DenyAllOtherInbound'
        properties: {
          priority: 200
          direction: 'Inbound'
          access: 'Deny'
          protocol: '*'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '*'
        }
      }
    ]
  }
}

// Virtual Network Configuration - Deployed after NSGs
resource virtualNetwork 'Microsoft.Network/virtualNetworks@2023-05-01' = {
  name: vnetName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.0.0.0/16'
      ]
    }
    subnets: [
      {
        name: webAppSubnetName
        properties: {
          addressPrefix: '10.0.1.0/24'
          networkSecurityGroup: {
            id: webAppNsg.id
          }
          serviceEndpoints: [
            {
              service: 'Microsoft.Storage'
              locations: [
                location
              ]
            }
            {
              service: 'Microsoft.KeyVault'
              locations: [
                location
              ]
            }
          ]
          delegations: [
            {
              name: 'delegation'
              properties: {
                serviceName: 'Microsoft.Web/serverFarms'
              }
            }
          ]
        }
      }
      {
        name: storageSubnetName
        properties: {
          addressPrefix: '10.0.2.0/24'
          networkSecurityGroup: {
            id: storageNsg.id
          }
          serviceEndpoints: [
            {
              service: 'Microsoft.Storage'
              locations: [
                location
              ]
            }
          ]
        }
      }
      {
        name: keyVaultSubnetName
        properties: {
          addressPrefix: '10.0.3.0/24'
          networkSecurityGroup: {
            id: keyVaultNsg.id
          }
          serviceEndpoints: [
            {
              service: 'Microsoft.KeyVault'
              locations: [
                location
              ]
            }
          ]
        }
      }
    ]
  }
}

// Log Analytics Workspace
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    retentionInDays: 30
    sku: {
      name: 'PerGB2018'
    }
    workspaceCapping: {
      dailyQuotaGb: 1
    }
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    RetentionInDays: 90
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    SamplingPercentage: 100
  }
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'S1'
    tier: 'Standard'
    size: 'S1'
    family: 'S'
    capacity: 1
  }
  properties: {
    reserved: false
    zoneRedundant: false
  }
}

// Authentication Storage Account
resource authStorage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: authStorageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Deny'
      virtualNetworkRules: [
        {
          id: resourceId('Microsoft.Network/virtualNetworks/subnets', vnetName, webAppSubnetName)
          action: 'Allow'
        }
      ]
    }
  }
  dependsOn: [
    virtualNetwork
  ]
  
  resource tableService 'tableServices' = {
    name: 'default'
    
    resource authIndexTable 'tables' = {
      name: 'authIndex'
    }
    
    resource authRolesTable 'tables' = {
      name: 'authRoles'
    }
    
    resource authUsersTable 'tables' = {
      name: 'authUsers'
    }
  }
}

// Operational Storage Account
resource operationalStorage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: operationalStorageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Deny'
      virtualNetworkRules: [
        {
          id: resourceId('Microsoft.Network/virtualNetworks/subnets', vnetName, webAppSubnetName)
          action: 'Allow'
        }
      ]
    }
  }
  dependsOn: [
    virtualNetwork
  ]
  
  resource tableService 'tableServices' = {
    name: 'default'
    
    resource yzBreaksTable 'tables' = {
      name: 'yzBreaks'
    }
    
    resource yzBreakTypesTable 'tables' = {
      name: 'yzBreakTypes'
    }
    
    resource yzUserDataTable 'tables' = {
      name: 'yzUserData'
    }
    
    resource yzLogsTable 'tables' = {
      name: 'yzLogs'
    }
  }
}

// Static Assets Storage Account
resource staticStorage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: staticStorageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: true
  }
  
  resource blobService 'blobServices' = {
    name: 'default'
    
    resource backgroundsContainer 'containers' = {
      name: 'backgrounds'
      properties: {
        publicAccess: 'Blob'
      }
    }
  }
}

// Key Vault with network rules included directly
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: keyVaultName
  location: location
  properties: {
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    enableRbacAuthorization: true
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Deny'
      virtualNetworkRules: [
        {
          id: resourceId('Microsoft.Network/virtualNetworks/subnets', vnetName, webAppSubnetName)
        }
      ]
    }
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
  }
  dependsOn: [
    virtualNetwork
  ]
}

// Web App
resource webApp 'Microsoft.Web/sites@2022-09-01' = {
  name: webAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      netFrameworkVersion: 'v9.0'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      webSocketsEnabled: true
      alwaysOn: true
      appSettings: [
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
          value: '~3'
        }
        {
          name: 'XDT_MicrosoftApplicationInsights_Mode'
          value: 'recommended'
        }
        {
          name: 'IdentityStorageConfig__UseDevelopmentStorage'
          value: 'false'
        }
        {
          name: 'IdentityStorageConfig__StorageAccountName'
          value: authStorage.name
        }
        {
          name: 'DataStorageConfig__UseDevelopmentStorage'
          value: 'false'
        }
        {
          name: 'DataStorageConfig__StorageAccountName'
          value: operationalStorage.name
        }
        {
          name: 'StaticStorageConfig__BackgroundImagesURL'
          value: 'https://${staticStorage.name}.${az.environment().suffixes.storage}/backgrounds'
        }
        {
          name: 'MailConnectionConfig__smtpServer'
          value: 'smtps.udag.de'
        }
        {
          name: 'MailConnectionConfig__ConfirmationHost'
          value: 'breakscreen.com'
        }
        {
          name: 'MailConnectionConfig__SenderName'
          value: 'BreakScreen Team'
        }
        {
          name: 'MailConnectionConfig__SenderEmail'
          value: 'info@breakscreen.com'
        }
        {
          name: 'MailConnectionConfig__smtpPassword'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/SmtpPassword/)'
        }
        {
          name: 'MailConnectionConfig__smtpUsername'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/SmtpUsername/)'
        }
        {
          name: 'MailConnectionConfig__NoReplySenderName'
          value: 'BreakScreen Automailer'
        }
        {
          name: 'MailConnectionConfig__NoReplySenderEmail'
          value: 'noreply@breakscreen.com'
        }
        {
          name: 'MailConnectionConfig__smtpNoReplyUsername'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/SmtpNoReplyUsername/)'
        }
        {
          name: 'MailConnectionConfig__smtpNoReplyPassword'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/SmtpNoReplyPassword/)'
        }
        {
          name: 'MailConnectionConfig__smtpPort'
          value: '465'
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'WEBSITE_DNS_SERVER'
          value: '168.63.129.16'
        }
        {
          name: 'WEBSITE_VNET_ROUTE_ALL'
          value: '1'
        }
      ]
      connectionStrings: []
      metadata: [
        {
          name: 'CURRENT_STACK'
          value: 'dotnet'
        }
      ]
      httpLoggingEnabled: true
      detailedErrorLoggingEnabled: true
      requestTracingEnabled: true
    }
  }

  resource logsConfig 'config' = {
    name: 'logs'
    properties: {
      httpLogs: {
        fileSystem: {
          enabled: true
          retentionInMb: 100
          retentionInDays: 7
        }
      }
      detailedErrorMessages: {
        enabled: true
      }
      failedRequestsTracing: {
        enabled: true
      }
      applicationLogs: {
        fileSystem: {
          level: 'Information'
        }
      }
    }
  }

  resource stagingSlot 'slots' = {
    name: 'staging'
    location: location
    identity: {
      type: 'SystemAssigned'
    }
    properties: {
      serverFarmId: appServicePlan.id
      httpsOnly: true
      siteConfig: {
        netFrameworkVersion: 'v9.0'
        ftpsState: 'Disabled'
        minTlsVersion: '1.2'
        http20Enabled: true
        webSocketsEnabled: true
        alwaysOn: true
        appSettings: [
          {
            name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
            value: appInsights.properties.InstrumentationKey
          }
          {
            name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
            value: appInsights.properties.ConnectionString
          }
          {
            name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
            value: '~3'
          }
          {
            name: 'XDT_MicrosoftApplicationInsights_Mode'
            value: 'recommended'
          }
          {
            name: 'IdentityStorageConfig__UseDevelopmentStorage'
            value: 'false'
          }
          {
            name: 'IdentityStorageConfig__StorageAccountName'
            value: authStorage.name
          }
          {
            name: 'DataStorageConfig__UseDevelopmentStorage'
            value: 'false'
          }
          {
            name: 'DataStorageConfig__StorageAccountName'
            value: operationalStorage.name
          }
          {
            name: 'StaticStorageConfig__BackgroundImagesURL'
            value: 'https://${staticStorage.name}.${az.environment().suffixes.storage}/backgrounds'
          }
          {
            name: 'MailConnectionConfig__smtpServer'
            value: 'smtps.udag.de'
          }
          {
            name: 'MailConnectionConfig__ConfirmationHost'
            value: 'breakscreen.com'
          }
          {
            name: 'MailConnectionConfig__SenderName'
            value: 'BreakScreen Team'
          }
          {
            name: 'MailConnectionConfig__SenderEmail'
            value: 'info@breakscreen.com'
          }
          {
            name: 'MailConnectionConfig__smtpPassword'
            value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/SmtpPassword/)'
          }
          {
            name: 'MailConnectionConfig__smtpUsername'
            value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/SmtpUsername/)'
          }
          {
            name: 'MailConnectionConfig__NoReplySenderName'
            value: 'BreakScreen Automailer'
          }
          {
            name: 'MailConnectionConfig__NoReplySenderEmail'
            value: 'noreply@breakscreen.com'
          }
          {
            name: 'MailConnectionConfig__smtpNoReplyUsername'
            value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/SmtpNoReplyUsername/)'
          }
          {
            name: 'MailConnectionConfig__smtpNoReplyPassword'
            value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/SmtpNoReplyPassword/)'
          }
          {
            name: 'MailConnectionConfig__smtpPort'
            value: '465'
          }
          {
            name: 'WEBSITE_RUN_FROM_PACKAGE'
            value: '1'
          }
          {
            name: 'WEBSITE_DNS_SERVER'
            value: '168.63.129.16'
          }
          {
            name: 'WEBSITE_VNET_ROUTE_ALL'
            value: '1'
          }
        ]
        httpLoggingEnabled: true
        detailedErrorLoggingEnabled: true
        requestTracingEnabled: true
      }
    }

    resource stagingLogsConfig 'config' = {
      name: 'logs'
      properties: {
        httpLogs: {
          fileSystem: {
            enabled: true
            retentionInMb: 100
            retentionInDays: 7
          }
        }
        detailedErrorMessages: {
          enabled: true
        }
        failedRequestsTracing: {
          enabled: true
        }
        applicationLogs: {
          fileSystem: {
            level: 'Information'
          }
        }
      }
    }
  }
}

// Diagnostic settings for Web App
resource webAppDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'webAppDiagnostics'
  scope: webApp
  properties: {
    workspaceId: logAnalyticsWorkspace.id
    logs: [
      {
        category: 'AppServiceHTTPLogs'
        enabled: true
      }
      {
        category: 'AppServiceConsoleLogs'
        enabled: true
      }
      {
        category: 'AppServiceAppLogs'
        enabled: true
      }
      {
        category: 'AppServiceAuditLogs'
        enabled: true
      }
      {
        category: 'AppServiceIPSecAuditLogs'
        enabled: true
      }
      {
        category: 'AppServicePlatformLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

// VNET integration for Web App
resource webAppVnetIntegration 'Microsoft.Web/sites/networkConfig@2022-09-01' = {
  parent: webApp
  name: 'virtualNetwork'
  properties: {
    subnetResourceId: resourceId('Microsoft.Network/virtualNetworks/subnets', vnetName, webAppSubnetName)
    swiftSupported: true
  }
  dependsOn: [
    virtualNetwork
  ]
}

// VNET integration for staging slot
resource webAppStagingVnetIntegration 'Microsoft.Web/sites/slots/networkConfig@2022-09-01' = {
  parent: webApp::stagingSlot
  name: 'virtualNetwork'
  properties: {
    subnetResourceId: resourceId('Microsoft.Network/virtualNetworks/subnets', vnetName, webAppSubnetName)
    swiftSupported: true
  }
  dependsOn: [
    virtualNetwork
  ]
}

// Role assignments for Web App to access Key Vault secrets (Get only, no List)
resource webappKeyVaultGetSecretRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, webApp.id, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User role
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Role assignments for Staging Slot to access Key Vault secrets
resource stagingSlotKeyVaultGetSecretRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, webApp::stagingSlot.id, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User role
    principalId: webApp::stagingSlot.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Role assignments for Web App to access Storage Tables
resource webappAuthStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(authStorage.id, webApp.id, 'Storage Table Data Contributor')
  scope: authStorage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3') // Storage Table Data Contributor
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource webappOperationalStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(operationalStorage.id, webApp.id, 'Storage Table Data Contributor')
  scope: operationalStorage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3') // Storage Table Data Contributor
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Role assignments for Staging Slot to access Storage Tables
resource stagingSlotAuthStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(authStorage.id, webApp::stagingSlot.id, 'Storage Table Data Contributor')
  scope: authStorage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3') // Storage Table Data Contributor
    principalId: webApp::stagingSlot.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource stagingSlotOperationalStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(operationalStorage.id, webApp::stagingSlot.id, 'Storage Table Data Contributor')
  scope: operationalStorage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3') // Storage Table Data Contributor
    principalId: webApp::stagingSlot.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Key Vault secrets required by the web app
@description('SMTP password for sending emails')
@secure()
param smtpPassword string = ''

@description('SMTP username for sending emails')
param smtpUsername string = 'info@breakscreen.com'

@description('No-reply SMTP password for automated emails')
@secure()
param smtpNoReplyPassword string = ''

@description('No-reply SMTP username for automated emails')
param smtpNoReplyUsername string = 'noreply@breakscreen.com'

resource smtpPasswordSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'SmtpPassword'
  properties: {
    value: smtpPassword
  }
}

resource smtpUsernameSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'SmtpUsername'
  properties: {
    value: smtpUsername
  }
}

resource smtpNoReplyPasswordSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'SmtpNoReplyPassword'
  properties: {
    value: smtpNoReplyPassword
  }
}

resource smtpNoReplyUsernameSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'SmtpNoReplyUsername'
  properties: {
    value: smtpNoReplyUsername
  }
}

// Output section for easy reference to created resources
output webAppName string = webApp.name
output webAppHostName string = webApp.properties.defaultHostName
output webAppStagingSlotName string = webApp::stagingSlot.name
output webAppStagingSlotHostName string = webApp::stagingSlot.properties.defaultHostName
output authStorageName string = authStorage.name
output operationalStorageName string = operationalStorage.name
output staticStorageName string = staticStorage.name
output keyVaultName string = keyVault.name
output vnetName string = virtualNetwork.name
output appInsightsName string = appInsights.name
output logAnalyticsName string = logAnalyticsWorkspace.name