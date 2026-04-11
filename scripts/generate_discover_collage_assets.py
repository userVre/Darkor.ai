from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image

SOURCE_DIR = Path(r"C:/Users/LENOVO/Downloads")
OUTPUT_DIR = Path(r"C:/Users/LENOVO/Desktop/Darkor.ai/assets/media/discover/crops")
CANVAS_WIDTH = 1536
CANVAS_HEIGHT = 1024
DEFAULT_INSET = 8


@dataclass(frozen=True)
class CategorySpec:
  tab: str
  slug: str
  pattern: str
  boxes: tuple[tuple[int, int, int, int], ...]


def inset_box(box: tuple[int, int, int, int], inset: int = DEFAULT_INSET) -> tuple[int, int, int, int]:
  left, top, right, bottom = box
  return (left + inset, top + inset, right - inset, bottom - inset)


def grid_boxes(
  cols: int,
  rows: int,
  *,
  include: Iterable[tuple[int, int]] | None = None,
  inset: int = DEFAULT_INSET,
) -> tuple[tuple[int, int, int, int], ...]:
  cell_width = CANVAS_WIDTH / cols
  cell_height = CANVAS_HEIGHT / rows
  selected = list(include) if include is not None else [(row, col) for row in range(rows) for col in range(cols)]
  boxes: list[tuple[int, int, int, int]] = []

  for row, col in selected:
    left = round(col * cell_width)
    top = round(row * cell_height)
    right = round((col + 1) * cell_width)
    bottom = round((row + 1) * cell_height)
    boxes.append(inset_box((left, top, right, bottom), inset))

  return tuple(boxes)


def manual_boxes(*boxes: tuple[int, int, int, int], inset: int = DEFAULT_INSET) -> tuple[tuple[int, int, int, int], ...]:
  return tuple(inset_box(box, inset) for box in boxes)


CATEGORY_SPECS: tuple[CategorySpec, ...] = (
  CategorySpec("garden", "garden", "*Jardins*", grid_boxes(3, 3)),
  CategorySpec("exterior", "residential", "*complexes*", grid_boxes(3, 3)),
  CategorySpec("exterior", "retail", "*Magasins*", grid_boxes(3, 3)),
  CategorySpec(
    "exterior",
    "office-building",
    "*bureaux innovants*",
    manual_boxes(
      (0, 0, 512, 512),
      (512, 0, 1024, 256),
      (1024, 0, 1536, 256),
      (512, 256, 1024, 512),
      (1024, 256, 1536, 512),
      (0, 512, 512, 1024),
      (512, 512, 1024, 1024),
      (1024, 512, 1536, 1024),
    ),
  ),
  CategorySpec(
    "exterior",
    "house",
    "*Maisons*",
    manual_boxes(
      (0, 0, 512, 256),
      (512, 0, 1024, 256),
      (1024, 0, 1536, 256),
      (0, 256, 512, 768),
      (512, 256, 1024, 640),
      (1024, 256, 1536, 640),
      (512, 640, 1024, 1024),
      (1024, 640, 1536, 1024),
    ),
  ),
  CategorySpec(
    "exterior",
    "apartment",
    "*architectures modernes*",
    manual_boxes(
      (0, 0, 384, 512),
      (384, 0, 768, 512),
      (768, 0, 1152, 512),
      (1152, 0, 1536, 512),
      (0, 512, 512, 1024),
      (512, 512, 1024, 1024),
      (1024, 512, 1536, 1024),
    ),
  ),
  CategorySpec(
    "exterior",
    "villa",
    "*villas*",
    manual_boxes(
      (0, 0, 512, 341),
      (512, 0, 1024, 341),
      (1024, 0, 1536, 341),
      (0, 341, 512, 682),
      (512, 341, 1536, 682),
      (0, 682, 512, 1024),
      (512, 682, 1024, 1024),
      (1024, 682, 1536, 1024),
    ),
  ),
  CategorySpec("home", "deck", "*Terrasses*", grid_boxes(3, 3)),
  CategorySpec("home", "hall", "*Entrées*", grid_boxes(3, 3)),
  CategorySpec("home", "balcony", "*Balcons*", grid_boxes(3, 3)),
  CategorySpec("home", "bathroom", "*salle de bain*", grid_boxes(3, 2)),
  CategorySpec("home", "attic", "*attiques*", grid_boxes(3, 3)),
  CategorySpec("home", "restaurant", "*restaurants*", grid_boxes(3, 3)),
  CategorySpec("home", "study-room", "*étude*", grid_boxes(3, 3)),
  CategorySpec("home", "toilet", "*08_44_28*", grid_boxes(4, 2)),
  CategorySpec("home", "home-office", "*bureaux à domicile*", grid_boxes(3, 3)),
  CategorySpec("home", "coffee-shop", "*08_44_15*", grid_boxes(3, 3)),
  CategorySpec("home", "gaming-room", "*08_38_08*", grid_boxes(3, 3)),
  CategorySpec(
    "home",
    "bedroom",
    "*chambres modernes*",
    manual_boxes(
      (0, 0, 512, 341),
      (512, 0, 1024, 341),
      (1024, 0, 1536, 341),
      (0, 341, 512, 682),
      (512, 341, 1024, 682),
      (1024, 341, 1536, 682),
      (256, 682, 1280, 1024),
    ),
  ),
  CategorySpec("home", "dining-room", "*salles à manger*", grid_boxes(3, 2)),
  CategorySpec(
    "home",
    "living-room",
    "*salons*",
    manual_boxes(
      (0, 0, 512, 341),
      (512, 0, 1024, 341),
      (1024, 0, 1536, 341),
      (0, 341, 512, 682),
      (512, 341, 1024, 682),
      (1024, 341, 1536, 682),
      (256, 682, 1280, 1024),
    ),
  ),
  CategorySpec("home", "kitchen", "*cuisines*", grid_boxes(3, 2)),
)


def main() -> None:
  OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

  for spec in CATEGORY_SPECS:
    matches = sorted(SOURCE_DIR.glob(spec.pattern))
    if len(matches) != 1:
      raise RuntimeError(f"Expected exactly 1 source for {spec.slug}, found {len(matches)} using {spec.pattern!r}")

    source_path = matches[0]
    category_dir = OUTPUT_DIR / spec.tab / spec.slug
    category_dir.mkdir(parents=True, exist_ok=True)

    with Image.open(source_path) as image:
      rgb_image = image.convert("RGB")
      if rgb_image.size != (CANVAS_WIDTH, CANVAS_HEIGHT):
        raise RuntimeError(f"Unexpected size for {source_path.name}: {rgb_image.size}")

      for index, box in enumerate(spec.boxes, start=1):
        output_path = category_dir / f"{spec.slug}-{index:02d}.png"
        rgb_image.crop(box).save(output_path, format="PNG", optimize=True)
        print(f"saved {output_path.relative_to(OUTPUT_DIR)}")


if __name__ == "__main__":
  main()
