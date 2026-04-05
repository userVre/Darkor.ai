from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ROOT = ROOT / "assets" / "media" / "discover" / "injected"

COLLAGES = {
    "interior": Path(r"C:/Users/LENOVO/Desktop/New folder/529fdbaf-c1af-4936-83f3-677af3353b96.png"),
    "exterior": Path(r"C:/Users/LENOVO/Desktop/New folder/ef218354-2bb9-4ad0-bcf0-b48c3c95958b.png"),
    "garden": Path(r"C:/Users/LENOVO/Desktop/New folder/b9c2d605-51d1-4024-9c59-719d2e2fb73d.png"),
    "floor": Path(r"C:/Users/LENOVO/Desktop/New folder/ac8176bb-9e5e-4c87-a29a-5c4d6709bccc.png"),
    "wall": Path(r"C:/Users/LENOVO/Desktop/New folder/3f9473b0-adfb-45b1-8f2d-fe12ea284ed8.png"),
}


def find_separator_runs(
    image: Image.Image,
    axis: str,
    threshold: int = 248,
    fraction: float = 0.94,
    min_run: int = 1,
) -> list[tuple[int, int]]:
    grayscale = image.convert("L")
    pixels = grayscale.load()
    width, height = image.size
    axis_size = height if axis == "y" else width
    other_size = width if axis == "y" else height
    ratios: list[float] = []

    for axis_index in range(axis_size):
        bright_pixels = 0
        for other_index in range(other_size):
            value = pixels[other_index, axis_index] if axis == "y" else pixels[axis_index, other_index]
            if value >= threshold:
                bright_pixels += 1
        ratios.append(bright_pixels / other_size)

    runs: list[tuple[int, int]] = []
    start: int | None = None

    for index, ratio in enumerate(ratios):
        if ratio >= fraction:
            if start is None:
                start = index
            continue

        if start is not None and index - start >= min_run:
            runs.append((start, index))
        start = None

    if start is not None and axis_size - start >= min_run:
        runs.append((start, axis_size))

    return runs


def runs_to_segments(size: int, runs: Iterable[tuple[int, int]]) -> list[tuple[int, int]]:
    segments: list[tuple[int, int]] = []
    cursor = 0

    for start, end in runs:
        if start - cursor > 8:
            segments.append((cursor, start))
        cursor = end

    if size - cursor > 8:
        segments.append((cursor, size))

    return segments


def trim_whitespace(image: Image.Image) -> Image.Image:
    grayscale = image.convert("L")
    pixels = grayscale.load()
    width, height = image.size

    def is_white_column(x: int) -> bool:
        white_pixels = 0
        for y in range(height):
            if pixels[x, y] >= 248:
                white_pixels += 1
        return white_pixels / height >= 0.99

    def is_white_row(y: int) -> bool:
        white_pixels = 0
        for x in range(width):
            if pixels[x, y] >= 248:
                white_pixels += 1
        return white_pixels / width >= 0.99

    left = 0
    while left < width - 1 and is_white_column(left):
        left += 1

    right = width - 1
    while right > left and is_white_column(right):
        right -= 1

    top = 0
    while top < height - 1 and is_white_row(top):
        top += 1

    bottom = height - 1
    while bottom > top and is_white_row(bottom):
        bottom -= 1

    return image.crop((left, top, right + 1, bottom + 1))


def split_equal_ranges(size: int, parts: int) -> list[tuple[int, int]]:
    return [
        (round(index * size / parts), round((index + 1) * size / parts))
        for index in range(parts)
    ]


def find_primary_vertical_split(row_image: Image.Image) -> int:
    runs = find_separator_runs(row_image, axis="x")
    if runs:
        widest = max(runs, key=lambda run: run[1] - run[0])
        return round((widest[0] + widest[1]) / 2)

    return row_image.size[0] // 2


def crop_collage(path: Path) -> list[Image.Image]:
    with Image.open(path) as source:
        image = source.convert("RGB")

    horizontal_runs = find_separator_runs(image, axis="y")
    row_segments = runs_to_segments(image.size[1], horizontal_runs)
    if len(row_segments) != 3:
        row_segments = split_equal_ranges(image.size[1], 3)

    crops: list[Image.Image] = []
    for row_index, (top, bottom) in enumerate(row_segments):
        row_image = image.crop((0, top, image.size[0], bottom))

        if row_index < 2:
            split = find_primary_vertical_split(row_image)
            column_segments = [(0, split), (split, row_image.size[0])]
        else:
            column_segments = [(0, row_image.size[0])]

        for left, right in column_segments:
            cell = row_image.crop((left, 0, right, row_image.size[1]))
            crops.append(trim_whitespace(cell))

    return crops


def main() -> None:
    for collection, source_path in COLLAGES.items():
        if not source_path.exists():
            raise FileNotFoundError(f"Missing collage source: {source_path}")

        output_dir = OUTPUT_ROOT / collection
        output_dir.mkdir(parents=True, exist_ok=True)

        for existing in output_dir.glob("scene-*.png"):
            existing.unlink()

        crops = crop_collage(source_path)
        for index, crop in enumerate(crops, start=1):
            output_path = output_dir / f"scene-{index}.png"
            crop.save(output_path, format="PNG", optimize=True)
            print(f"{collection}|scene-{index}|{crop.size[0]}x{crop.size[1]}|{output_path}")


if __name__ == "__main__":
    main()
