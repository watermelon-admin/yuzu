# PowerShell script to download all Google Fonts for the break screen designer
# Uses google-webfonts-helper API for reliable downloads

$ErrorActionPreference = "Stop"

# Destination directory
$fontsDir = "Yuzu.Web\wwwroot\fonts"

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Google Fonts Downloader for Yuzu Designer" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Create fonts directory if it doesn't exist
if (!(Test-Path $fontsDir)) {
    Write-Host "Creating fonts directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $fontsDir -Force | Out-Null
}

# Font definitions with direct CDN URLs (from google-webfonts-helper)
# Using jsdelivr CDN which mirrors Google Fonts
$fonts = @(
    # Sans-Serif
    @{Name="Open Sans"; FileName="open-sans-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/open-sans@latest/latin-400-normal.woff2"},
    @{Name="Lato"; FileName="lato-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/lato@latest/latin-400-normal.woff2"},
    @{Name="Montserrat"; FileName="montserrat-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-400-normal.woff2"},
    @{Name="Poppins"; FileName="poppins-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-400-normal.woff2"},
    @{Name="Work Sans"; FileName="work-sans-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/work-sans@latest/latin-400-normal.woff2"},
    @{Name="Inter"; FileName="inter-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.woff2"},
    @{Name="Raleway"; FileName="raleway-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/raleway@latest/latin-400-normal.woff2"},
    @{Name="Nunito"; FileName="nunito-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/nunito@latest/latin-400-normal.woff2"},
    @{Name="Source Sans 3"; FileName="source-sans-3-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/source-sans-3@latest/latin-400-normal.woff2"},

    # Serif
    @{Name="Merriweather"; FileName="merriweather-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/merriweather@latest/latin-400-normal.woff2"},
    @{Name="Playfair Display"; FileName="playfair-display-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-400-normal.woff2"},
    @{Name="Libre Baskerville"; FileName="libre-baskerville-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/libre-baskerville@latest/latin-400-normal.woff2"},
    @{Name="Crimson Text"; FileName="crimson-text-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/crimson-text@latest/latin-400-normal.woff2"},
    @{Name="Lora"; FileName="lora-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/lora@latest/latin-400-normal.woff2"},

    # Monospace
    @{Name="Roboto Mono"; FileName="roboto-mono-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-400-normal.woff2"},
    @{Name="Source Code Pro"; FileName="source-code-pro-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/source-code-pro@latest/latin-400-normal.woff2"},
    @{Name="JetBrains Mono"; FileName="jetbrains-mono-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-400-normal.woff2"},
    @{Name="Courier Prime"; FileName="courier-prime-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/courier-prime@latest/latin-400-normal.woff2"},

    # Display
    @{Name="Bebas Neue"; FileName="bebas-neue-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/bebas-neue@latest/latin-400-normal.woff2"},
    @{Name="Oswald"; FileName="oswald-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/oswald@latest/latin-400-normal.woff2"},
    @{Name="Archivo Black"; FileName="archivo-black-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/archivo-black@latest/latin-400-normal.woff2"},
    @{Name="Righteous"; FileName="righteous-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/righteous@latest/latin-400-normal.woff2"},
    @{Name="Permanent Marker"; FileName="permanent-marker-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/permanent-marker@latest/latin-400-normal.woff2"},
    @{Name="Pacifico"; FileName="pacifico-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/pacifico@latest/latin-400-normal.woff2"},
    @{Name="Dancing Script"; FileName="dancing-script-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/dancing-script@latest/latin-400-normal.woff2"},
    @{Name="Lobster"; FileName="lobster-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/lobster@latest/latin-400-normal.woff2"},
    @{Name="Caveat"; FileName="caveat-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/caveat@latest/latin-400-normal.woff2"},

    # Exotic - Script & Handwriting
    @{Name="Great Vibes"; FileName="great-vibes-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/great-vibes@latest/latin-400-normal.woff2"},
    @{Name="Satisfy"; FileName="satisfy-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/satisfy@latest/latin-400-normal.woff2"},
    @{Name="Allura"; FileName="allura-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/allura@latest/latin-400-normal.woff2"},
    @{Name="Tangerine"; FileName="tangerine-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/tangerine@latest/latin-400-normal.woff2"},
    @{Name="Sacramento"; FileName="sacramento-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/sacramento@latest/latin-400-normal.woff2"},

    # Exotic - Vintage & Retro
    @{Name="Bungee"; FileName="bungee-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/bungee@latest/latin-400-normal.woff2"},
    @{Name="Fredoka One"; FileName="fredoka-one-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/fredoka-one@latest/latin-400-normal.woff2"},
    @{Name="Alfa Slab One"; FileName="alfa-slab-one-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/alfa-slab-one@latest/latin-400-normal.woff2"},
    @{Name="Russo One"; FileName="russo-one-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/russo-one@latest/latin-400-normal.woff2"},

    # Exotic - Decorative & Artistic
    @{Name="Cinzel Decorative"; FileName="cinzel-decorative-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/cinzel-decorative@latest/latin-400-normal.woff2"},
    @{Name="Abril Fatface"; FileName="abril-fatface-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/abril-fatface@latest/latin-400-normal.woff2"},
    @{Name="Ultra"; FileName="ultra-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/ultra@latest/latin-400-normal.woff2"},
    @{Name="Monoton"; FileName="monoton-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/monoton@latest/latin-400-normal.woff2"},
    @{Name="Fascinate"; FileName="fascinate-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/fascinate@latest/latin-400-normal.woff2"},

    # Exotic - Tech & Futuristic
    @{Name="Orbitron"; FileName="orbitron-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/orbitron@latest/latin-400-normal.woff2"},
    @{Name="Press Start 2P"; FileName="press-start-2p-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/press-start-2p@latest/latin-400-normal.woff2"},
    @{Name="Audiowide"; FileName="audiowide-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/audiowide@latest/latin-400-normal.woff2"},

    # Exotic - Quirky & Fun
    @{Name="Bangers"; FileName="bangers-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/bangers@latest/latin-400-normal.woff2"},
    @{Name="Creepster"; FileName="creepster-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/creepster@latest/latin-400-normal.woff2"},
    @{Name="Cabin Sketch"; FileName="cabin-sketch-regular.woff2"; Url="https://cdn.jsdelivr.net/fontsource/fonts/cabin-sketch@latest/latin-400-normal.woff2"}
)

$successCount = 0
$skipCount = 0
$failCount = 0

Write-Host "Downloading $($fonts.Count) fonts from jsDelivr CDN..." -ForegroundColor Green
Write-Host ""

foreach ($font in $fonts) {
    $filePath = Join-Path $fontsDir $font.FileName

    # Check if file already exists
    if (Test-Path $filePath) {
        Write-Host "[SKIP] $($font.Name) (already exists)" -ForegroundColor Yellow
        $skipCount++
        continue
    }

    Write-Host "[Downloading] $($font.Name)..." -ForegroundColor Cyan -NoNewline

    try {
        # Download the font file directly
        Invoke-WebRequest -Uri $font.Url -OutFile $filePath -UseBasicParsing

        # Verify the file was downloaded and has content
        $fileInfo = Get-Item $filePath
        if ($fileInfo.Length -gt 1000) {
            Write-Host " [OK] ($([math]::Round($fileInfo.Length/1KB, 1)) KB)" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host " [FAILED - File too small]" -ForegroundColor Red
            Remove-Item $filePath -ErrorAction SilentlyContinue
            $failCount++
        }
    }
    catch {
        Write-Host " [FAILED - $($_.Exception.Message)]" -ForegroundColor Red
        $failCount++
    }

    # Small delay to be nice to the CDN
    Start-Sleep -Milliseconds 100
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan

# Download OFL license
Write-Host ""
Write-Host "Downloading OFL license..." -ForegroundColor Green

$licenseContent = @"
Copyright (c) 2010-2023, Google LLC.

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
http://scripts.sil.org/OFL

-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
"@

$licensePath = Join-Path $fontsDir "OFL.txt"

try {
    $licenseContent | Out-File -FilePath $licensePath -Encoding UTF8
    Write-Host "[OK] License file created" -ForegroundColor Green
}
catch {
    Write-Host "[WARNING] Could not create license file" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Download Summary" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Success: $successCount" -ForegroundColor Green
Write-Host "  Skipped: $skipCount (already exist)" -ForegroundColor Yellow
Write-Host "  Failed:  $failCount" -ForegroundColor Red
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

if ($failCount -gt 0) {
    Write-Host "Some fonts failed to download. Failed fonts:" -ForegroundColor Yellow
    Write-Host "You may need to download them manually from:" -ForegroundColor Yellow
    Write-Host "https://gwfh.mranftl.com/fonts" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: Visit https://fonts.google.com/ and download each font individually" -ForegroundColor Yellow
} elseif ($successCount -gt 0) {
    Write-Host "All fonts downloaded successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Build the solution: dotnet build Yuzu.sln" -ForegroundColor White
    Write-Host "2. Run the designer and test font selection" -ForegroundColor White
    Write-Host "3. Verify fonts load correctly in the browser" -ForegroundColor White
} else {
    Write-Host "All fonts already exist. No downloads needed!" -ForegroundColor Green
}

Write-Host ""
