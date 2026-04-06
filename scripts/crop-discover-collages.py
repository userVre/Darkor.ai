from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = Path(r"C:\Users\LENOVO\Desktop\New folder")

MAX_EDGE_TRIM = 28
LOCAL_PEAK_WINDOW = 2
MIN_SEGMENT_SIZE = 120


@dataclass(frozen=True)
class CollageSpec:
    input_file: Path
    output_dir: Path
    layout: Sequence[int]
    outputs: Sequence[str]


COLLAGE_SPECS: Sequence[CollageSpec] = [
    CollageSpec(
        input_file=SOURCE_ROOT / "ac8176bb-9e5e-4c87-a29a-5c4d6709bccc.png",
        output_dir=ROOT / "assets" / "media" / "discover" / "injected" / "floor",
        layout=(2, 2, 1),
        outputs=("scene-1.png", "scene-2.png", "scene-3.png", "scene-4.png", "scene-5.png"),
    ),
    CollageSpec(
        input_file=SOURCE_ROOT / "3f9473b0-adfb-45b1-8f2d-fe12ea284ed8.png",
        output_dir=ROOT / "assets" / "media" / "discover" / "injected" / "wall",
        layout=(2, 2, 1),
        outputs=("scene-1.png", "scene-2.png", "scene-3.png", "scene-4.png", "scene-5.png"),
    ),
    CollageSpec(
        input_file=SOURCE_ROOT / "3ef40e86-879c-41b5-9f08-b1c077465c6d.png",
        output_dir=ROOT / "assets" / "media" / "discover" / "injected" / "home-core",
        layout=(2, 3, 2),
        outputs=tuple(f"scene-{index}.png" for index in range(1, 8)),
    ),
    CollageSpec(
        input_file=SOURCE_ROOT / "ef218354-2bb9-4ad0-bcf0-b48c3c95958b.png",
        output_dir=ROOT / "assets" / "media" / "discover" / "injected" / "exterior-primary",
        layout=(2, 2, 1),
        outputs=tuple(f"scene-{index}.png" for index in range(1, 6)),
    ),
    CollageSpec(
        input_file=SOURCE_ROOT / "9e937a98-84c3-49b9-8179-82350909649f.png",
        output_dir=ROOT / "assets" / "media" / "discover" / "injected" / "home-flex",
        layout=(2, 2, 2),
        outputs=tuple(f"scene-{index}.png" for index in range(1, 7)),
    ),
    CollageSpec(
        input_file=SOURCE_ROOT / "d298df67-6ffd-49fd-aba4-2031fdd2dbf2.png",
        output_dir=ROOT / "assets" / "media" / "discover" / "injected" / "exterior-secondary",
        layout=(2, 1, 2),
        outputs=tuple(f"scene-{index}.png" for index in range(1, 6)),
    ),
    CollageSpec(
        input_file=SOURCE_ROOT / "529fdbaf-c1af-4936-83f3-677af3353b96.png",
        output_dir=ROOT / "assets" / "media" / "discover" / "injected" / "living-room",
        layout=(2, 2, 1),
        outputs=tuple(f"scene-{index}.png" for index in range(1, 6)),
    ),
    CollageSpec(
        input_file=SOURCE_ROOT / "b9c2d605-51d1-4024-9c59-719d2e2fb73d.png",
        output_dir=ROOT / "assets" / "media" / "discover" / "injected" / "garden-primary",
        layout=(2, 2, 2),
        outputs=tuple(f"scene-{index}.png" for index in range(1, 7)),
    ),
    CollageSpec(
        input_file=SOURCE_ROOT / "79162ec2-2930-49e0-bfab-95de308ca288.png",
        output_dir=ROOT / "assets" / "media" / "discover" / "injected" / "home-luxe",
        layout=(2, 3, 3),
        outputs=tuple(f"scene-{index}.png" for index in range(1, 9)),
    ),
    CollageSpec(
        input_file=SOURCE_ROOT / "1e139c9e-6141-4568-bcfb-24c3f8de1569.png",
        output_dir=ROOT / "assets" / "media" / "discover" / "injected" / "garden-secondary",
        layout=(2, 2, 2),
        outputs=tuple(f"scene-{index}.png" for index in range(1, 7)),
    ),
]


def average(values: Sequence[float]) -> float:
    return sum(values) / max(len(values), 1)


def pixel_average(pixel: tuple[int, int, int]) -> float:
    return (pixel[0] + pixel[1] + pixel[2]) / 3


def mono_ratio(values: Sequence[tuple[int, int, int]]) -> float:
    matches = 0
    for red, green, blue in values:
        if max(red, green, blue) - min(red, green, blue) <= 18:
            matches += 1
    return matches / max(len(values), 1)


def mono_extreme_ratio(values: Sequence[tuple[int, int, int]]) -> float:
    matches = 0
    for red, green, blue in values:
        avg = pixel_average((red, green, blue))
        if max(red, green, blue) - min(red, green, blue) <= 18 and (avg <= 55 or avg >= 200):
            matches += 1
    return matches / max(len(values), 1)


def line_stats(values: Sequence[tuple[int, int, int]]) -> tuple[float, float, float]:
    means = [pixel_average(pixel) for pixel in values]
    return average(means), mono_ratio(values), mono_extreme_ratio(values)


def trim_frame(image: Image.Image) -> Image.Image:
    left = 0
    right = image.width
    top = 0
    bottom = image.height

    def should_trim_row(index: int) -> bool:
        values = [image.getpixel((x, index))[:3] for x in range(image.width)]
        mean, mono, extreme = line_stats(values)
        return mono >= 0.94 and extreme >= 0.72 and (mean <= 45 or mean >= 210)

    def should_trim_col(index: int) -> bool:
        values = [image.getpixel((index, y))[:3] for y in range(image.height)]
        mean, mono, extreme = line_stats(values)
        return mono >= 0.94 and extreme >= 0.72 and (mean <= 45 or mean >= 210)

    trimmed = 0
    while trimmed < MAX_EDGE_TRIM and top < bottom and should_trim_row(top):
      top += 1
      trimmed += 1

    trimmed = 0
    while trimmed < MAX_EDGE_TRIM and bottom - 1 > top and should_trim_row(bottom - 1):
      bottom -= 1
      trimmed += 1

    trimmed = 0
    while trimmed < MAX_EDGE_TRIM and left < right and should_trim_col(left):
      left += 1
      trimmed += 1

    trimmed = 0
    while trimmed < MAX_EDGE_TRIM and right - 1 > left and should_trim_col(right - 1):
      right -= 1
      trimmed += 1

    return image.crop((left, top, right, bottom))


def compute_row_boundary_scores(image: Image.Image) -> list[float]:
    pixels = image.load()
    scores: list[float] = []
    for y in range(image.height - 1):
        diff = 0.0
        current_row = []
        next_row = []
        for x in range(image.width):
            current = pixels[x, y][:3]
            next_value = pixels[x, y + 1][:3]
            diff += (
                abs(current[0] - next_value[0])
                + abs(current[1] - next_value[1])
                + abs(current[2] - next_value[2])
            )
            current_row.append(current)
            next_row.append(next_value)

        current_mean, current_mono, current_extreme = line_stats(current_row)
        next_mean, next_mono, next_extreme = line_stats(next_row)
        uniform_bonus = max(
            current_mono * 44,
            next_mono * 44,
            current_extreme * 52,
            next_extreme * 52,
        )
        contrast_bonus = abs(current_mean - next_mean) * 0.9
        scores.append(diff / image.width + uniform_bonus + contrast_bonus)
    return scores


def compute_col_boundary_scores(image: Image.Image) -> list[float]:
    pixels = image.load()
    scores: list[float] = []
    for x in range(image.width - 1):
        diff = 0.0
        current_col = []
        next_col = []
        for y in range(image.height):
            current = pixels[x, y][:3]
            next_value = pixels[x + 1, y][:3]
            diff += (
                abs(current[0] - next_value[0])
                + abs(current[1] - next_value[1])
                + abs(current[2] - next_value[2])
            )
            current_col.append(current)
            next_col.append(next_value)

        current_mean, current_mono, current_extreme = line_stats(current_col)
        next_mean, next_mono, next_extreme = line_stats(next_col)
        uniform_bonus = max(
            current_mono * 44,
            next_mono * 44,
            current_extreme * 52,
            next_extreme * 52,
        )
        contrast_bonus = abs(current_mean - next_mean) * 0.9
        scores.append(diff / image.height + uniform_bonus + contrast_bonus)
    return scores


def smooth_scores(scores: Sequence[float]) -> list[float]:
    smoothed: list[float] = []
    for index in range(len(scores)):
        start = max(0, index - 1)
        end = min(len(scores), index + 2)
        smoothed.append(average(scores[start:end]))
    return smoothed


def pick_boundaries(length: int, scores: Sequence[float], count: int) -> list[int]:
    if count <= 0:
        return []

    smoothed = smooth_scores(scores)
    min_gap = max(MIN_SEGMENT_SIZE // 2, length // max((count + 1) * 3, 3))
    edge_margin = max(24, min(length // 12, 54))

    candidates: list[tuple[float, int]] = []
    for index, score in enumerate(smoothed):
        position = index + 1
        if position <= edge_margin or position >= length - edge_margin:
            continue

        start = max(0, index - LOCAL_PEAK_WINDOW)
        end = min(len(smoothed), index + LOCAL_PEAK_WINDOW + 1)
        if score < max(smoothed[start:end]):
            continue
        candidates.append((score, position))

    candidates.sort(reverse=True)

    chosen: list[int] = []
    for _, position in candidates:
        if any(abs(position - current) < min_gap for current in chosen):
            continue
        chosen.append(position)
        if len(chosen) == count:
            break

    if len(chosen) < count:
        fallback_step = length / (count + 1)
        for index in range(count):
            position = round(fallback_step * (index + 1))
            if position <= edge_margin or position >= length - edge_margin:
                continue
            if any(abs(position - current) < min_gap for current in chosen):
                continue
            chosen.append(position)
            if len(chosen) == count:
                break

    return sorted(chosen[:count])


def split_axis(length: int, boundaries: Sequence[int]) -> list[tuple[int, int]]:
    ranges: list[tuple[int, int]] = []
    start = 0
    for boundary in boundaries:
        end = max(start, boundary - 1)
        if end - start >= 1:
            ranges.append((start, end))
        start = boundary + 1
    if length - 1 - start >= 1:
        ranges.append((start, length - 1))
    return ranges


def detect_boxes(image: Image.Image, layout: Sequence[int]) -> list[tuple[int, int, int, int]]:
    row_boundaries = pick_boundaries(image.height, compute_row_boundary_scores(image), len(layout) - 1)
    row_ranges = split_axis(image.height, row_boundaries)
    if len(row_ranges) != len(layout):
        raise RuntimeError(f"Expected {len(layout)} row ranges but found {len(row_ranges)}.")

    boxes: list[tuple[int, int, int, int]] = []
    for row_index, columns in enumerate(layout):
        y0, y1 = row_ranges[row_index]
        row_image = image.crop((0, y0, image.width, y1 + 1))
        col_boundaries = pick_boundaries(row_image.width, compute_col_boundary_scores(row_image), columns - 1)
        col_ranges = split_axis(row_image.width, col_boundaries)
        if len(col_ranges) != columns:
            raise RuntimeError(
                f"Expected {columns} columns for row {row_index + 1} but found {len(col_ranges)}."
            )
        for x0, x1 in col_ranges:
            boxes.append((x0, y0, x1 + 1, y1 + 1))

    return boxes


def export_collage(spec: CollageSpec) -> dict[str, object]:
    image = Image.open(spec.input_file).convert("RGB")
    trimmed = trim_frame(image)
    boxes = detect_boxes(trimmed, spec.layout)

    if len(boxes) != len(spec.outputs):
        raise RuntimeError(
            f"{spec.input_file.name}: expected {len(spec.outputs)} crops, found {len(boxes)}."
        )

    spec.output_dir.mkdir(parents=True, exist_ok=True)

    exported_files: list[str] = []
    crop_manifest: list[dict[str, object]] = []

    for output_name, box in zip(spec.outputs, boxes):
        target = spec.output_dir / output_name
        crop = trimmed.crop(box)
        crop.save(target, format="PNG", optimize=True)
        exported_files.append(str(target.relative_to(ROOT)).replace("\\", "/"))
        crop_manifest.append(
            {
                "output": output_name,
                "box": [int(value) for value in box],
                "size": [crop.width, crop.height],
            }
        )

    return {
        "input": str(spec.input_file),
        "trimmed_size": [trimmed.width, trimmed.height],
        "layout": list(spec.layout),
        "exports": exported_files,
        "crops": crop_manifest,
    }


def main() -> None:
    manifest = [export_collage(spec) for spec in COLLAGE_SPECS]
    manifest_path = ROOT / "assets" / "media" / "discover" / "injected" / "crop-manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote {len(manifest)} collage manifests to {manifest_path}")


if __name__ == "__main__":
    main()
