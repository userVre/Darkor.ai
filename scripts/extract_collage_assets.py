from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


STYLE_TILE_NAMES = [
    "modern",
    "luxury",
    "japandi",
    "cyberpunk",
    "tropical",
    "minimalist",
    "scandinavian",
    "bohemian",
    "midcentury",
    "art-deco",
    "coastal",
    "rustic",
    "vintage",
    "mediterranean",
    "glam",
    "coastal-alt",
    "rustic-alt",
    "hollywood-regency",
    "neo-classic",
    "shabby-chic",
    "french-country",
    "brutalist",
    "hollywood-regency-alt",
    "neo-classic-alt",
    "art-nouveau",
]

ROOM_TILE_NAMES = [
    "kitchen",
    "living-room",
    "master-suite",
    "bathroom",
    "home-office",
    "dining-room",
    "nursery",
    "home-theater",
    "hall",
]


def _white_ratio_by_column(image: Image.Image) -> list[float]:
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    values: list[float] = []
    for x in range(width):
        white_pixels = 0
        for y in range(height):
            r, g, b = pixels[x, y]
            if r > 245 and g > 245 and b > 245:
                white_pixels += 1
        values.append(white_pixels / height)
    return values


def _white_ratio_by_row(image: Image.Image) -> list[float]:
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    values: list[float] = []
    for y in range(height):
        white_pixels = 0
        for x in range(width):
            r, g, b = pixels[x, y]
            if r > 245 and g > 245 and b > 245:
                white_pixels += 1
        values.append(white_pixels / width)
    return values


def _segments(values: list[float], predicate) -> list[tuple[int, int]]:
    ranges: list[tuple[int, int]] = []
    start: int | None = None
    for index, value in enumerate(values):
        if predicate(value):
            if start is None:
                start = index
            continue
        if start is not None:
            ranges.append((start, index - 1))
            start = None
    if start is not None:
        ranges.append((start, len(values) - 1))
    return ranges


def _save_crops(
    image_path: Path,
    x_ranges: list[tuple[int, int]],
    y_ranges: list[tuple[int, int]],
    names: list[str],
    prefix: str,
    output_dir: Path,
) -> None:
    image = Image.open(image_path).convert("RGB")
    output_dir.mkdir(parents=True, exist_ok=True)
    expected = len(x_ranges) * len(y_ranges)
    if expected != len(names):
        raise ValueError(f"Expected {len(names)} crop names, found {expected} tiles.")

    tile_index = 0
    for y0, y1 in y_ranges:
        for x0, x1 in x_ranges:
            crop = image.crop((x0, y0, x1 + 1, y1 + 1))
            target_path = output_dir / f"{prefix}-{names[tile_index]}.jpg"
            crop.save(target_path, format="JPEG", quality=92, optimize=True)
            tile_index += 1


def extract_style_tiles(source: Path, output_root: Path) -> None:
    image = Image.open(source)
    x_ranges = _segments(_white_ratio_by_column(image), lambda ratio: ratio < 0.98)
    y_ranges = _segments(_white_ratio_by_row(image), lambda ratio: ratio < 0.98)
    _save_crops(source, x_ranges, y_ranges, STYLE_TILE_NAMES, "style", output_root / "styles")


def extract_room_tiles(source: Path, output_root: Path) -> None:
    image = Image.open(source)
    x_ranges = _segments(_white_ratio_by_column(image), lambda ratio: ratio < 0.5)
    y_ranges = _segments(_white_ratio_by_row(image), lambda ratio: ratio < 0.5)
    _save_crops(source, x_ranges, y_ranges, ROOM_TILE_NAMES, "room", output_root / "rooms")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract room and style thumbnails from Darkor collage images.")
    parser.add_argument("--styles-collage", type=Path, required=True)
    parser.add_argument("--rooms-collage", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, default=Path("assets/media"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    extract_style_tiles(args.styles_collage, args.output_dir)
    extract_room_tiles(args.rooms_collage, args.output_dir)
    print(f"Assets extracted to {args.output_dir.resolve()}")


if __name__ == "__main__":
    main()
