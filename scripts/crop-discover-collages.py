from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class CollageTask:
    source: Path
    destination_dir: Path
    columns_per_row: Sequence[int]
    output_names: Sequence[str]


def axis_splits(length: int, parts: int) -> list[int]:
    return [round(length * index / parts) for index in range(parts + 1)]


def crop_bounds(start: int, end: int, trim: int, limit: int) -> tuple[int, int]:
    left = max(0, start + trim)
    right = min(limit, end - trim)

    if right <= left:
        return max(0, start), min(limit, end)

    return left, right


def trim_for_box(width: int, height: int) -> int:
    return min(10, max(6, min(width, height) // 42))


def export_collage(task: CollageTask) -> None:
    if len(task.output_names) != sum(task.columns_per_row):
        raise ValueError(f"Output count mismatch for {task.source}")

    if not task.source.exists():
        raise FileNotFoundError(task.source)

    image = Image.open(task.source).convert("RGB")
    width, height = image.size
    row_edges = axis_splits(height, len(task.columns_per_row))

    task.destination_dir.mkdir(parents=True, exist_ok=True)

    output_index = 0
    for row_index, columns in enumerate(task.columns_per_row):
        top = row_edges[row_index]
        bottom = row_edges[row_index + 1]
        column_edges = axis_splits(width, columns)

        for column_index in range(columns):
            left = column_edges[column_index]
            right = column_edges[column_index + 1]
            trim = trim_for_box(right - left, bottom - top)
            crop_left, crop_right = crop_bounds(left, right, trim, width)
            crop_top, crop_bottom = crop_bounds(top, bottom, trim, height)

            cropped = image.crop((crop_left, crop_top, crop_right, crop_bottom))
            output_path = task.destination_dir / f"{task.output_names[output_index]}.png"
            cropped.save(output_path, format="PNG", optimize=True)
            print(f"saved {output_path.relative_to(ROOT)}")
            output_index += 1


def main() -> None:
    tasks = [
        CollageTask(
            source=Path(r"C:/Users/LENOVO/Desktop/New folder/529fdbaf-c1af-4936-83f3-677af3353b96.png"),
            destination_dir=ROOT / "assets/media/discover/injected/home",
            columns_per_row=[2, 3, 2],
            output_names=[
                "kitchen",
                "living-room",
                "bedroom",
                "bathroom",
                "dining-room",
                "gaming-room",
                "home-office",
            ],
        ),
        CollageTask(
            source=Path(r"C:/Users/LENOVO/Desktop/New folder/ac8176bb-9e5e-4c87-a29a-5c4d6709bccc.png"),
            destination_dir=ROOT / "assets/media/discover/injected/home",
            columns_per_row=[2, 3, 3],
            output_names=[
                "coffee-shop",
                "study-room",
                "attic",
                "toilet",
                "balcony",
                "hall",
                "deck",
                "restaurant",
            ],
        ),
        CollageTask(
            source=Path(r"C:/Users/LENOVO/Desktop/New folder/3f9473b0-adfb-45b1-8f2d-fe12ea284ed8.png"),
            destination_dir=ROOT / "assets/media/discover/injected/interior",
            columns_per_row=[2, 2, 1],
            output_names=["scene-1", "scene-2", "scene-3", "scene-4", "scene-5"],
        ),
        CollageTask(
            source=Path(r"C:/Users/LENOVO/Desktop/New folder/ef218354-2bb9-4ad0-bcf0-b48c3c95958b.png"),
            destination_dir=ROOT / "assets/media/discover/injected/floor",
            columns_per_row=[2, 2, 1],
            output_names=["scene-1", "scene-2", "scene-3", "scene-4", "scene-5"],
        ),
        CollageTask(
            source=Path(r"C:/Users/LENOVO/Desktop/New folder/b9c2d605-51d1-4024-9c59-719d2e2fb73d.png"),
            destination_dir=ROOT / "assets/media/discover/injected/wall",
            columns_per_row=[2, 2, 1],
            output_names=["scene-1", "scene-2", "scene-3", "scene-4", "scene-5"],
        ),
    ]

    for task in tasks:
        export_collage(task)


if __name__ == "__main__":
    main()
