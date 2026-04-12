Discover collage workflow

1. Copy each source collage into `assets/media/discover/collages/source/`.
2. Add one `categories[]` entry per Discover row in `assets/media/discover/collages/crop-manifest.json`.
3. Define exactly seven crop rectangles for each category so the output matches the `CategoryName_Image_[Index].png` convention.
4. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\generate-discover-crops.ps1 -Force
```

Manifest shape:

```json
{
  "categories": [
    {
      "categoryName": "Kitchen",
      "source": "assets/media/discover/collages/source/kitchen-collage.png",
      "outputDir": "assets/media/discover/generated/kitchen",
      "crops": [
        { "x": 0, "y": 0, "width": 512, "height": 384 }
      ]
    }
  ]
}
```

Notes:

- Keep `categoryName` in Pascal/Title style without spaces if you want file names like `Kitchen_Image_1.png`.
- Crop rectangles use source-image pixels.
- Re-run with `-Force` when a collage or crop rectangle changes.
