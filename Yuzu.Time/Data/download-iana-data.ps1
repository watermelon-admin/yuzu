# Download and process IANA timezone database
$url = "https://data.iana.org/time-zones/releases/tzdata2023c.tar.gz"
$output = "tzdata.tar.gz"
$extractPath = "tzdata"
$outputFile = "timezones.txt"

# Create the extract directory if it doesn't exist
if (!(Test-Path -Path $extractPath)) {
    New-Item -ItemType Directory -Path $extractPath
}

# Download the file
Write-Host "Downloading IANA timezone database..."
Invoke-WebRequest -Uri $url -OutFile $output

# Extract the tar.gz file
Write-Host "Extracting files..."
tar -xzf $output -C $extractPath

# Create a hashtable for country codes to names
$countryNames = @{}
[System.Globalization.CultureInfo]::GetCultures([System.Globalization.CultureTypes]::AllCultures) | 
    Where-Object { $_.Name.Length -eq 2 } | 
    ForEach-Object {
        try {
            $region = [System.Globalization.RegionInfo]::new($_.Name)
            $countryNames[$_.Name] = $region.DisplayName
        } catch {}
    }

# Additional country mappings for special cases
$countryMappings = @{
    "America/Argentina/Buenos_Aires" = "Argentina"
    "America/Argentina/Cordoba" = "Argentina"
    "America/Argentina/Salta" = "Argentina"
    "America/Argentina/Jujuy" = "Argentina"
    "America/Argentina/Tucuman" = "Argentina"
    "America/Argentina/Catamarca" = "Argentina"
    "America/Argentina/La_Rioja" = "Argentina"
    "America/Argentina/San_Juan" = "Argentina"
    "America/Argentina/Mendoza" = "Argentina"
    "America/Argentina/San_Luis" = "Argentina"
    "America/Argentina/Rio_Gallegos" = "Argentina"
    "America/Argentina/Ushuaia" = "Argentina"
    "America/Sao_Paulo" = "Brazil"
    "America/Manaus" = "Brazil"
    "America/Rio_Branco" = "Brazil"
    "America/Noronha" = "Brazil"
    "America/Belem" = "Brazil"
    "America/Fortaleza" = "Brazil"
    "America/Recife" = "Brazil"
    "America/Araguaina" = "Brazil"
    "America/Maceio" = "Brazil"
    "America/Bahia" = "Brazil"
    "America/Campo_Grande" = "Brazil"
    "America/Cuiaba" = "Brazil"
    "America/Porto_Velho" = "Brazil"
    "America/Boa_Vista" = "Brazil"
    "America/Santarem" = "Brazil"
    "America/Eirunepe" = "Brazil"
    "America/Mexico_City" = "Mexico"
    "America/Cancun" = "Mexico"
    "America/Merida" = "Mexico"
    "America/Monterrey" = "Mexico"
    "America/Matamoros" = "Mexico"
    "America/Chihuahua" = "Mexico"
    "America/Ciudad_Juarez" = "Mexico"
    "America/Ojinaga" = "Mexico"
    "America/Mazatlan" = "Mexico"
    "America/Bahia_Banderas" = "Mexico"
    "America/Hermosillo" = "Mexico"
    "America/Tijuana" = "Mexico"
}

# Process zone1970.tab file
Write-Host "Processing timezone data..."
$header = "# Format: ZoneId|Continent|City|Country`n"
Set-Content -Path $outputFile -Value $header

# Read zone1970.tab and zonenow.tab for additional metadata
$zone1970Data = Get-Content "$extractPath/zone1970.tab" | Where-Object { !$_.StartsWith("#") } | ForEach-Object {
    $fields = $_ -split "`t"
    if ($fields.Length -ge 3) {
        @{
            CountryCode = $fields[1]
            ZoneId = $fields[2]
            Description = if ($fields.Length -ge 4) { $fields[3] } else { "" }
        }
    }
}

$zoneNowData = Get-Content "$extractPath/zone.tab" | Where-Object { !$_.StartsWith("#") } | ForEach-Object {
    $fields = $_ -split "`t"
    if ($fields.Length -ge 3) {
        @{
            CountryCode = $fields[0]
            ZoneId = $fields[2]
            Description = if ($fields.Length -ge 4) { $fields[3] } else { "" }
        }
    }
}

# Function to clean up country names
function Get-CleanCountryName {
    param(
        [string]$countryCode,
        [string]$zoneId,
        [string]$description
    )
    
    # First check special mappings
    if ($countryMappings.ContainsKey($zoneId)) {
        return $countryMappings[$zoneId]
    }
    
    # Then check .NET country names
    if ($countryNames.ContainsKey($countryCode)) {
        return $countryNames[$countryCode]
    }
    
    # Clean up description if needed
    if ($description -match "^([^(+\-0-9][^(]*?)(?:\s*\(|$)") {
        return $matches[1].Trim()
    }
    
    # Fallback to country code
    return $countryCode
}

# Combine and process the data
$processedZones = @{}

foreach ($zone in ($zone1970Data + $zoneNowData | Where-Object { $_ -ne $null })) {
    if ($processedZones.ContainsKey($zone.ZoneId)) {
        continue
    }

    $zoneId = $zone.ZoneId
    $countryCode = $zone.CountryCode
    $description = $zone.Description

    # Split zone ID into continent and city
    $parts = $zoneId -split "/"
    if ($parts.Length -ge 2) {
        $continent = $parts[0]
        $city = ($parts[-1] -replace "_", " ")
        
        # Get clean country name
        $countryName = Get-CleanCountryName -countryCode $countryCode -zoneId $zoneId -description $description
        
        # Special handling for common timezone names
        $city = switch ($city) {
            "Buenos_Aires" { "Buenos Aires" }
            "Los_Angeles" { "Los Angeles" }
            "New_York" { "New York" }
            "Mexico_City" { "Mexico City" }
            "Sao_Paulo" { "São Paulo" }
            "Hong_Kong" { "Hong Kong" }
            "Ho_Chi_Minh" { "Ho Chi Minh City" }
            "Port_au_Prince" { "Port-au-Prince" }
            "Port_of_Spain" { "Port of Spain" }
            "St_Johns" { "St. John's" }
            "St_Kitts" { "St. Kitts" }
            "St_Lucia" { "St. Lucia" }
            "St_Thomas" { "St. Thomas" }
            "St_Vincent" { "St. Vincent" }
            default { $city -replace "_", " " }
        }
        
        "$zoneId|$continent|$city|$countryName" | Add-Content $outputFile
        $processedZones[$zoneId] = $true
    }
}

Write-Host "Cleaning up..."
# Clean up
Remove-Item $output
Remove-Item $extractPath -Recurse

Write-Host "Done! Generated $outputFile with complete IANA timezone data." 