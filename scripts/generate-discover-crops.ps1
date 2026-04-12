param(
  [string]$ManifestPath = "assets/media/discover/collages/crop-manifest.json",
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$resolvedManifestPath = Join-Path $repoRoot $ManifestPath

if (-not (Test-Path -LiteralPath $resolvedManifestPath)) {
  throw "Crop manifest not found at '$resolvedManifestPath'. Add one category entry per collage with seven crop rectangles."
}

$manifest = Get-Content -LiteralPath $resolvedManifestPath -Raw | ConvertFrom-Json

if (-not $manifest.categories) {
  throw "Manifest must contain a top-level 'categories' array."
}

function Save-Crop {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$OutputPath,
    [int]$X,
    [int]$Y,
    [int]$Width,
    [int]$Height
  )

  $rect = New-Object System.Drawing.Rectangle($X, $Y, $Width, $Height)
  $target = New-Object System.Drawing.Bitmap($Width, $Height)

  try {
    $graphics = [System.Drawing.Graphics]::FromImage($target)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.DrawImage($Bitmap, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
      $target.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
      $graphics.Dispose()
    }
  }
  finally {
    $target.Dispose()
  }
}

foreach ($category in $manifest.categories) {
  if (-not $category.categoryName) {
    throw "Each category entry must include 'categoryName'."
  }

  if (-not $category.source) {
    throw "Category '$($category.categoryName)' is missing 'source'."
  }

  if (-not $category.outputDir) {
    throw "Category '$($category.categoryName)' is missing 'outputDir'."
  }

  if (-not $category.crops -or $category.crops.Count -ne 7) {
    throw "Category '$($category.categoryName)' must define exactly seven crops."
  }

  $sourcePath = Join-Path $repoRoot $category.source
  $outputDir = Join-Path $repoRoot $category.outputDir

  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Source collage not found for '$($category.categoryName)': $sourcePath"
  }

  if (-not (Test-Path -LiteralPath $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
  }

  $bitmap = [System.Drawing.Bitmap]::new($sourcePath)

  try {
    for ($index = 0; $index -lt $category.crops.Count; $index++) {
      $crop = $category.crops[$index]
      $fileName = "{0}_Image_{1}.png" -f $category.categoryName, ($index + 1)
      $outputPath = Join-Path $outputDir $fileName

      if ((Test-Path -LiteralPath $outputPath) -and -not $Force) {
        Write-Host "Skipping existing crop $fileName"
        continue
      }

      Save-Crop `
        -Bitmap $bitmap `
        -OutputPath $outputPath `
        -X ([int]$crop.x) `
        -Y ([int]$crop.y) `
        -Width ([int]$crop.width) `
        -Height ([int]$crop.height)

      Write-Host "Wrote $fileName"
    }
  }
  finally {
    $bitmap.Dispose()
  }
}
