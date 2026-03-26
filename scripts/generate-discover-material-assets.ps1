Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent $PSScriptRoot
$discoverRoot = Join-Path $repoRoot "assets\media\discover"
$floorDir = Join-Path $discoverRoot "floor"
$wallDir = Join-Path $discoverRoot "wall"

New-Item -ItemType Directory -Force -Path $floorDir | Out-Null
New-Item -ItemType Directory -Force -Path $wallDir | Out-Null

$imageWidth = 1200
$imageHeight = 1464
$floorTop = [int]($imageHeight * 0.46)
$rand = [System.Random]::new(20260326)

function New-Color {
  param([string]$Hex, [int]$Alpha = 255)

  $safeHex = $Hex.TrimStart("#")
  if ($safeHex.Length -ne 6) {
    throw "Expected a 6 digit color, got '$Hex'."
  }

  return [System.Drawing.Color]::FromArgb(
    $Alpha,
    [Convert]::ToInt32($safeHex.Substring(0, 2), 16),
    [Convert]::ToInt32($safeHex.Substring(2, 2), 16),
    [Convert]::ToInt32($safeHex.Substring(4, 2), 16)
  )
}

function New-GradientBrush {
  param(
    [System.Drawing.Rectangle]$Rect,
    [string]$StartHex,
    [string]$EndHex,
    [float]$Angle = 90
  )

  return [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $Rect,
    (New-Color $StartHex),
    (New-Color $EndHex),
    $Angle
  )
}

function Add-Grain {
  param(
    [System.Drawing.Graphics]$Graphics,
    [int]$Width,
    [int]$Height,
    [int]$Count,
    [string]$Hex,
    [int]$AlphaMin,
    [int]$AlphaMax,
    [int]$SizeMin,
    [int]$SizeMax
  )

  for ($i = 0; $i -lt $Count; $i++) {
    $size = $rand.Next($SizeMin, $SizeMax)
    $alpha = $rand.Next($AlphaMin, $AlphaMax)
    $x = $rand.Next(0, $Width)
    $y = $rand.Next(0, $Height)
    $brush = [System.Drawing.SolidBrush]::new((New-Color $Hex $alpha))
    $Graphics.FillEllipse($brush, $x, $y, $size, $size)
    $brush.Dispose()
  }
}

function Draw-FloorTexture {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Kind,
    [string[]]$Palette
  )

  $floorRect = [System.Drawing.Rectangle]::new(0, $floorTop, $imageWidth, $imageHeight - $floorTop)
  $baseBrush = New-GradientBrush -Rect $floorRect -StartHex $Palette[0] -EndHex $Palette[1] -Angle 90
  $Graphics.FillRectangle($baseBrush, $floorRect)
  $baseBrush.Dispose()

  switch ($Kind) {
    "wood" {
      $plankWidth = 110
      for ($x = -40; $x -lt $imageWidth + $plankWidth; $x += $plankWidth) {
        $plankBrush = [System.Drawing.SolidBrush]::new((New-Color $Palette[$rand.Next(0, $Palette.Length)]))
        $Graphics.FillRectangle($plankBrush, $x, $floorTop, $plankWidth - 4, $imageHeight - $floorTop)
        $plankBrush.Dispose()

        for ($line = 0; $line -lt 8; $line++) {
          $pen = [System.Drawing.Pen]::new((New-Color $Palette[2] ($rand.Next(20, 58))), 2)
          $y = $floorTop + ($line * 110) + $rand.Next(12, 48)
          $Graphics.DrawLine($pen, $x + 12, $y, $x + $plankWidth - 18, $y + $rand.Next(-16, 16))
          $pen.Dispose()
        }
      }
      Add-Grain -Graphics $Graphics -Width $imageWidth -Height ($imageHeight - $floorTop) -Count 240 -Hex $Palette[2] -AlphaMin 14 -AlphaMax 40 -SizeMin 2 -SizeMax 9
    }
    "herringbone" {
      $tileW = 150
      $tileH = 42
      for ($row = 0; $row -lt 14; $row++) {
        for ($col = -2; $col -lt 10; $col++) {
          $left = $col * 128 + (($row % 2) * 64)
          $top = $floorTop + $row * 52

          $matrix = $Graphics.Transform.Clone()
          $Graphics.TranslateTransform($left + 80, $top + 40)
          $rotation = 42
          if ((($row + $col) % 2) -ne 0) {
            $rotation = -42
          }
          $Graphics.RotateTransform($rotation)

          $brush = [System.Drawing.SolidBrush]::new((New-Color $Palette[$rand.Next(0, $Palette.Length)]))
          $Graphics.FillRectangle($brush, -($tileW / 2), -($tileH / 2), $tileW, $tileH)
          $brush.Dispose()

          $pen = [System.Drawing.Pen]::new((New-Color "FFFFFF" 26), 2)
          $Graphics.DrawRectangle($pen, -($tileW / 2), -($tileH / 2), $tileW, $tileH)
          $pen.Dispose()

          $Graphics.Transform = $matrix
          $matrix.Dispose()
        }
      }
      Add-Grain -Graphics $Graphics -Width $imageWidth -Height ($imageHeight - $floorTop) -Count 180 -Hex $Palette[2] -AlphaMin 14 -AlphaMax 36 -SizeMin 3 -SizeMax 8
    }
    "marble" {
      Add-Grain -Graphics $Graphics -Width $imageWidth -Height ($imageHeight - $floorTop) -Count 420 -Hex "FFFFFF" -AlphaMin 18 -AlphaMax 46 -SizeMin 2 -SizeMax 12
      for ($i = 0; $i -lt 22; $i++) {
        $pen = [System.Drawing.Pen]::new((New-Color $Palette[2] ($rand.Next(54, 104))), $rand.Next(2, 5))
        $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        $points = [System.Drawing.Point[]]@(
          [System.Drawing.Point]::new($rand.Next(-120, 220), $floorTop + $rand.Next(20, 340)),
          [System.Drawing.Point]::new($rand.Next(120, 420), $floorTop + $rand.Next(50, 460)),
          [System.Drawing.Point]::new($rand.Next(420, 780), $floorTop + $rand.Next(80, 560)),
          [System.Drawing.Point]::new($rand.Next(780, 1320), $floorTop + $rand.Next(120, 640))
        )
        $Graphics.DrawCurve($pen, $points, 0.68)
        $pen.Dispose()
      }
    }
    "concrete" {
      Add-Grain -Graphics $Graphics -Width $imageWidth -Height ($imageHeight - $floorTop) -Count 760 -Hex "FFFFFF" -AlphaMin 8 -AlphaMax 24 -SizeMin 2 -SizeMax 7
      Add-Grain -Graphics $Graphics -Width $imageWidth -Height ($imageHeight - $floorTop) -Count 520 -Hex "000000" -AlphaMin 6 -AlphaMax 18 -SizeMin 2 -SizeMax 8
      for ($i = 0; $i -lt 12; $i++) {
        $pen = [System.Drawing.Pen]::new((New-Color $Palette[2] ($rand.Next(24, 58))), 3)
        $y = $floorTop + 60 + ($i * 60) + $rand.Next(-16, 16)
        $Graphics.DrawLine($pen, 0, $y, $imageWidth, $y + $rand.Next(-10, 10))
        $pen.Dispose()
      }
    }
    "terracotta" {
      $tile = 150
      for ($row = 0; $row -lt 8; $row++) {
        for ($col = 0; $col -lt 9; $col++) {
          $x = ($col * $tile) - (($row % 2) * 24)
          $y = $floorTop + ($row * 118)
          $colorHex = $Palette[$rand.Next(0, $Palette.Length)]
          $brush = [System.Drawing.SolidBrush]::new((New-Color $colorHex))
          $Graphics.FillRectangle($brush, $x, $y, $tile - 6, 110)
          $brush.Dispose()
          $pen = [System.Drawing.Pen]::new((New-Color "F7E6D1" 66), 3)
          $Graphics.DrawRectangle($pen, $x, $y, $tile - 6, 110)
          $pen.Dispose()
        }
      }
      Add-Grain -Graphics $Graphics -Width $imageWidth -Height ($imageHeight - $floorTop) -Count 240 -Hex "FFFFFF" -AlphaMin 8 -AlphaMax 26 -SizeMin 2 -SizeMax 5
    }
    "slate" {
      $tile = 210
      for ($row = 0; $row -lt 6; $row++) {
        for ($col = 0; $col -lt 6; $col++) {
          $x = $col * ($tile - 6)
          $y = $floorTop + ($row * 136)
          $brush = [System.Drawing.SolidBrush]::new((New-Color $Palette[$rand.Next(0, $Palette.Length)]))
          $Graphics.FillRectangle($brush, $x, $y, $tile - 12, 132)
          $brush.Dispose()
          $pen = [System.Drawing.Pen]::new((New-Color "FFFFFF" 22), 2)
          $Graphics.DrawRectangle($pen, $x, $y, $tile - 12, 132)
          $pen.Dispose()
        }
      }
      Add-Grain -Graphics $Graphics -Width $imageWidth -Height ($imageHeight - $floorTop) -Count 340 -Hex "FFFFFF" -AlphaMin 8 -AlphaMax 24 -SizeMin 2 -SizeMax 6
    }
    "carpet" {
      $brush = [System.Drawing.SolidBrush]::new((New-Color $Palette[0]))
      $Graphics.FillRectangle($brush, $floorRect)
      $brush.Dispose()
      Add-Grain -Graphics $Graphics -Width $imageWidth -Height ($imageHeight - $floorTop) -Count 1400 -Hex $Palette[1] -AlphaMin 18 -AlphaMax 48 -SizeMin 1 -SizeMax 4
      Add-Grain -Graphics $Graphics -Width $imageWidth -Height ($imageHeight - $floorTop) -Count 840 -Hex "FFFFFF" -AlphaMin 8 -AlphaMax 24 -SizeMin 1 -SizeMax 3
    }
  }
}

function Draw-RoomOverlay {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$WallTopHex,
    [string]$WallBottomHex,
    [string]$FloorHighlightHex,
    [string]$AccentHex,
    [string]$FurnitureShape = "sofa"
  )

  $wallRect = [System.Drawing.Rectangle]::new(0, 0, $imageWidth, $floorTop)
  $wallBrush = New-GradientBrush -Rect $wallRect -StartHex $WallTopHex -EndHex $WallBottomHex -Angle 90
  $Graphics.FillRectangle($wallBrush, $wallRect)
  $wallBrush.Dispose()

  $lightPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $lightPath.AddEllipse(-180, 120, 520, 800)
  $lightBrush = [System.Drawing.Drawing2D.PathGradientBrush]::new($lightPath)
  $lightBrush.CenterColor = (New-Color "FFF7E6" 110)
  $lightBrush.SurroundColors = [System.Drawing.Color[]]@((New-Color "FFF7E6" 0))
  $Graphics.FillEllipse($lightBrush, -180, 120, 520, 800)
  $lightBrush.Dispose()
  $lightPath.Dispose()

  $baseboardPen = [System.Drawing.Pen]::new((New-Color "F3E6D9" 74), 7)
  $Graphics.DrawLine($baseboardPen, 0, $floorTop, $imageWidth, $floorTop)
  $baseboardPen.Dispose()

  switch ($FurnitureShape) {
    "sofa" {
      $brush = [System.Drawing.SolidBrush]::new((New-Color $FloorHighlightHex 122))
      $Graphics.FillRoundedRectangle($brush, [System.Drawing.Rectangle]::new(320, 420, 560, 170), 34)
      $Graphics.FillRoundedRectangle($brush, [System.Drawing.Rectangle]::new(280, 490, 110, 92), 24)
      $Graphics.FillRoundedRectangle($brush, [System.Drawing.Rectangle]::new(810, 490, 110, 92), 24)
      $brush.Dispose()
    }
    "bed" {
      $brush = [System.Drawing.SolidBrush]::new((New-Color $FloorHighlightHex 132))
      $Graphics.FillRoundedRectangle($brush, [System.Drawing.Rectangle]::new(240, 420, 730, 190), 36)
      $headBrush = [System.Drawing.SolidBrush]::new((New-Color $AccentHex 84))
      $Graphics.FillRoundedRectangle($headBrush, [System.Drawing.Rectangle]::new(300, 320, 620, 120), 32)
      $headBrush.Dispose()
      $brush.Dispose()
    }
    "table" {
      $brush = [System.Drawing.SolidBrush]::new((New-Color $FloorHighlightHex 120))
      $Graphics.FillRectangle($brush, 420, 430, 360, 36)
      $Graphics.FillRectangle($brush, 470, 466, 28, 170)
      $Graphics.FillRectangle($brush, 702, 466, 28, 170)
      $brush.Dispose()
    }
  }

  $plantBrush = [System.Drawing.SolidBrush]::new((New-Color $AccentHex 98))
  $Graphics.FillEllipse($plantBrush, 930, 455, 120, 140)
  $plantBrush.Dispose()
}

Update-TypeData -TypeName System.Drawing.Graphics -MemberType ScriptMethod -MemberName FillRoundedRectangle -Value {
  param([System.Drawing.Brush]$Brush, [System.Drawing.Rectangle]$Rect, [int]$Radius)
  $diameter = $Radius * 2
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc($Rect.X, $Rect.Y, $diameter, $diameter, 180, 90)
  $path.AddArc($Rect.Right - $diameter, $Rect.Y, $diameter, $diameter, 270, 90)
  $path.AddArc($Rect.Right - $diameter, $Rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($Rect.X, $Rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  $this.FillPath($Brush, $path)
  $path.Dispose()
} -Force

function Save-Art {
  param(
    [string]$Path,
    [scriptblock]$Painter
  )

  $bitmap = [System.Drawing.Bitmap]::new($imageWidth, $imageHeight)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  & $Painter $graphics

  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq "image/jpeg"
  $encoderParams = [System.Drawing.Imaging.EncoderParameters]::new(1)
  $encoderParams.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, 92L)
  $bitmap.Save($Path, $codec, $encoderParams)

  $encoderParams.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$floorItems = @(
  @{ File = "natural-oak.jpg"; Kind = "wood"; Wall = @("E7D8C7", "D7C6B2"); Palette = @("D8B58E", "BE9468", "8C623F") },
  @{ File = "walnut-wood.jpg"; Kind = "wood"; Wall = @("D8C8B8", "C7B09C"); Palette = @("764B31", "5B3726", "A26E47") },
  @{ File = "carrara-marble.jpg"; Kind = "marble"; Wall = @("EDE3D8", "DCCFC0"); Palette = @("F3F0EB", "DDD7D1", "B8B4AF") },
  @{ File = "polished-concrete.jpg"; Kind = "concrete"; Wall = @("E3DCCF", "D0C5B6"); Palette = @("71767D", "585E66", "A6ACB4") },
  @{ File = "herringbone-oak.jpg"; Kind = "herringbone"; Wall = @("EFE4D6", "DDCFBF"); Palette = @("C49262", "9B6B42", "6E462A") },
  @{ File = "terracotta-tile.jpg"; Kind = "terracotta"; Wall = @("EADCC9", "D8C6AE"); Palette = @("C67A46", "AF6037", "E0A16B") },
  @{ File = "slate-tile.jpg"; Kind = "slate"; Wall = @("D8D4D0", "C6C1BC"); Palette = @("34383F", "262A31", "51565E") },
  @{ File = "plush-carpet.jpg"; Kind = "carpet"; Wall = @("EBE0D5", "D8C9BA"); Palette = @("E9E1D5", "D8D0C4", "F7F2EA") },
  @{ File = "weathered-oak.jpg"; Kind = "wood"; Wall = @("E4D9CE", "D0C1B2"); Palette = @("B58761", "8D6547", "D0A37E") }
)

$wallItems = @(
  @{ File = "sage-green.jpg"; Wall = @("C4C9A7", "AEB486"); Floor = @("D7C2A0", "A98561", "7A543D"); Accent = "6E7C54"; Shape = "sofa" },
  @{ File = "midnight-navy.jpg"; Wall = @("2B2C36", "151722"); Floor = @("CBB7A1", "A78E73", "71553E"); Accent = "3D4256"; Shape = "bed" },
  @{ File = "terracotta-glow.jpg"; Wall = @("D36C34", "AF4D21"); Floor = @("D09D68", "A87443", "6A4328"); Accent = "F0B57F"; Shape = "table" },
  @{ File = "dusty-rose.jpg"; Wall = @("D9A4B1", "C58595"); Floor = @("E6D6C4", "C5A88A", "8B6B54"); Accent = "B36A7D"; Shape = "bed" },
  @{ File = "gallery-charcoal.jpg"; Wall = @("444548", "262729"); Floor = @("CBB59D", "A58665", "6B4E39"); Accent = "6A6C70"; Shape = "sofa" },
  @{ File = "soft-ivory.jpg"; Wall = @("F0E4CF", "E1D0B6"); Floor = @("E7D7BF", "C9AD87", "8B6A50"); Accent = "C2A585"; Shape = "table" },
  @{ File = "olive-grove.jpg"; Wall = @("5C6341", "3A402A"); Floor = @("C7B090", "9E7D5E", "6B4A33"); Accent = "74805A"; Shape = "table" },
  @{ File = "lavender-mist.jpg"; Wall = @("D7C1DD", "B89BC6"); Floor = @("E6D9CB", "C5AA8C", "8D6E58"); Accent = "8A6CA2"; Shape = "table" },
  @{ File = "pearl-gray.jpg"; Wall = @("D9DADB", "C6C8CB"); Floor = @("E8DCC8", "CDB495", "8E7058"); Accent = "8B9197"; Shape = "sofa" }
)

foreach ($item in $floorItems) {
  $output = Join-Path $floorDir $item.File
  Save-Art -Path $output -Painter {
    param($graphics)
    Draw-RoomOverlay -Graphics $graphics -WallTopHex $item.Wall[0] -WallBottomHex $item.Wall[1] -FloorHighlightHex "F5E9D8" -AccentHex "8B6A4E" -FurnitureShape "sofa"
    Draw-FloorTexture -Graphics $graphics -Kind $item.Kind -Palette $item.Palette

    $shadowBrush = [System.Drawing.SolidBrush]::new((New-Color "000000" 52))
    $graphics.FillEllipse($shadowBrush, 118, 1000, 390, 112)
    $shadowBrush.Dispose()
  }
}

foreach ($item in $wallItems) {
  $output = Join-Path $wallDir $item.File
  Save-Art -Path $output -Painter {
    param($graphics)
    $floorRect = [System.Drawing.Rectangle]::new(0, $floorTop, $imageWidth, $imageHeight - $floorTop)
    $floorBrush = New-GradientBrush -Rect $floorRect -StartHex $item.Floor[0] -EndHex $item.Floor[1] -Angle 90
    $graphics.FillRectangle($floorBrush, $floorRect)
    $floorBrush.Dispose()

    Draw-RoomOverlay -Graphics $graphics -WallTopHex $item.Wall[0] -WallBottomHex $item.Wall[1] -FloorHighlightHex $item.Floor[2] -AccentHex $item.Accent -FurnitureShape $item.Shape

    $rugBrush = [System.Drawing.SolidBrush]::new((New-Color "F6EAD9" 54))
    $graphics.FillEllipse($rugBrush, 120, 1040, 420, 128)
    $rugBrush.Dispose()
  }
}

Write-Output "Generated floor discover assets in $floorDir"
Write-Output "Generated wall discover assets in $wallDir"
