# Script to augment IANA timezone data with proper names using OpenAI API
param(
    [Parameter(Mandatory=$true)]
    [string]$OpenAIKey
)

# Install required modules if not present
if (-not (Get-Module -ListAvailable -Name Microsoft.PowerShell.SecretManagement)) {
    Install-Module -Name Microsoft.PowerShell.SecretManagement -Force -Scope CurrentUser
}

# Function to call OpenAI API
function Get-TimeZoneInfo {
    param(
        [string]$zoneId,
        [string]$apiKey
    )
    
    $headers = @{
        'Authorization' = "Bearer $apiKey"
        'Content-Type' = 'application/json'
    }
    
    $body = @{
        model = "gpt-4"
        messages = @(
            @{
                role = "system"
                content = "You are a helpful assistant that provides accurate timezone information. Please respond in JSON format only."
            },
            @{
                role = "user"
                content = "For the timezone $zoneId, provide the following information in JSON format:
                1. The main city or cities it represents (cleaned up, without underscores)
                2. The country name
                3. The continent
                4. The official timezone names (standard and daylight if applicable)
                5. Any commonly used alternative names
                Format the response as:
                {
                    'zoneId': 'string',
                    'cities': ['string'],
                    'countryName': 'string',
                    'continent': 'string',
                    'officialNames': ['string'],
                    'otherNames': ['string']
                }"
            }
        )
        temperature = 0.3
        max_tokens = 500
    }
    
    $response = Invoke-RestMethod -Uri "https://api.openai.com/v1/chat/completions" `
                                -Method Post `
                                -Headers $headers `
                                -Body ($body | ConvertTo-Json -Depth 10)
    
    return $response.choices[0].message.content | ConvertFrom-Json
}

# Read existing zone1970.tab for base data
$zoneFile = Get-Content "zone1970.tab"
$timeZones = @()

foreach ($line in $zoneFile) {
    if ($line -match '^\s*#' -or [string]::IsNullOrWhiteSpace($line)) {
        continue
    }
    
    $fields = $line -split '\t'
    if ($fields.Length -ge 3) {
        $zoneId = $fields[2].Trim()
        Write-Host "Processing $zoneId..."
        
        try {
            $tzInfo = Get-TimeZoneInfo -zoneId $zoneId -apiKey $OpenAIKey
            $timeZones += $tzInfo
            
            # Save after each successful API call to prevent data loss
            $timeZones | ConvertTo-Json -Depth 10 | Set-Content "timezones.json"
            
            # Rate limiting
            Start-Sleep -Seconds 1
        }
        catch {
            Write-Warning "Failed to process $zoneId : $_"
        }
    }
}

# Convert the final data to TypeScript
$tsContent = @"
// Generated on: $(Get-Date -Format "yyyy/MM/dd HH:mm:ss")
// This file contains timezone information augmented with AI-generated data.

export interface TimeZoneInfo {
    zoneId: string;
    cities: string[];
    countryName: string;
    continent: string;
    officialNames: string[];
    otherNames: string[];
}

export const TimeZoneInfos: TimeZoneInfo[] = $(($timeZones | ConvertTo-Json -Depth 10));
"@

Set-Content -Path "TimeZonesData.ts" -Value $tsContent

Write-Host "Done! Generated TimeZonesData.ts with augmented timezone information." 