# -*- coding: utf-8 -*-
from __future__ import annotations

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DESKTOP = Path.home() / 'Desktop'
OUTPUT = ROOT / 'assets' / 'media' / 'discover'


def find_file(prefix: str) -> Path:
    for path in DESKTOP.iterdir():
        if path.name.startswith(prefix):
            return path
    raise FileNotFoundError(prefix)


INTERIOR_SOURCE = find_file('Design ')
for candidate in DESKTOP.iterdir():
    if candidate.name.startswith('Design ') and 'collage' in candidate.name:
        INTERIOR_SOURCE = candidate
        break

GARDEN_SOURCE = find_file('ChatGPT Image 21 mars 2026')
EXTERIOR_SOURCE = find_file('Designs architecturaux')

INTERIOR_NAMES = [
    'kitchen', 'living-room', 'master-suite',
    'bathroom', 'home-office', 'dining-room',
    'nursery', 'study', 'home-theater',
    'hall', 'library', 'laundry',
]
GARDEN_NAMES = [
    'pool-courtyard', 'villa-entry', 'fireside-patio',
    'infinity-pool', 'sunset-lounge', 'spa-deck',
]
EXTERIOR_NAMES = [
    'modern-villa', 'pool-house', 'glass-office',
    'apartment-block', 'stone-manor', 'garage-suite',
]


def crop_grid(source: Path, rows: int, cols: int, names: list[str], target_dir: Path, prefix: str, inset: int = 8):
    image = Image.open(source).convert('RGB')
    width, height = image.size
    tile_width = width / cols
    tile_height = height / rows
    target_dir.mkdir(parents=True, exist_ok=True)
    index = 0
    for row in range(rows):
        for col in range(cols):
            left = int(round(col * tile_width)) + inset
            top = int(round(row * tile_height)) + inset
            right = int(round((col + 1) * tile_width)) - inset
            bottom = int(round((row + 1) * tile_height)) - inset
            crop = image.crop((left, top, right, bottom))
            crop.save(target_dir / f'{prefix}-{names[index]}.jpg', format='JPEG', quality=92, optimize=True)
            index += 1


def main():
    crop_grid(INTERIOR_SOURCE, rows=4, cols=3, names=INTERIOR_NAMES, target_dir=OUTPUT / 'home', prefix='home')
    crop_grid(GARDEN_SOURCE, rows=2, cols=3, names=GARDEN_NAMES, target_dir=OUTPUT / 'garden', prefix='garden')
    crop_grid(EXTERIOR_SOURCE, rows=2, cols=3, names=EXTERIOR_NAMES, target_dir=OUTPUT / 'exterior', prefix='exterior')
    print(f'Generated discover assets in {OUTPUT}')


if __name__ == '__main__':
    main()
