from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageStat


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "assets" / "media" / "discover" / "collages" / "source"
OUTPUT_ROOT = ROOT / "assets" / "media" / "discover" / "generated"
TARGET_COUNT = 7


@dataclass(frozen=True)
class DiscoverCategory:
    id: str
    title: str
    service: str
    source_name: str
    output_dir_name: str


CATEGORIES = (
    DiscoverCategory("kitchen", "Kitchen", "interior", "kitchen.png", "kitchen"),
    DiscoverCategory("living-room", "Living Room", "interior", "living-room.png", "living-room"),
    DiscoverCategory("dining-room", "Dining Room", "interior", "dining-room.png", "dining-room"),
    DiscoverCategory("bedroom", "Bedroom", "interior", "bedroom.png", "bedroom"),
    DiscoverCategory("bathroom", "Bathroom", "interior", "master-suite.png", "master-suite"),
    DiscoverCategory("gaming-room", "Gaming Room", "interior", "gaming-room.png", "gaming-room"),
    DiscoverCategory("home-office", "Home Office", "interior", "home-office.png", "home-office"),
    DiscoverCategory("coffee-shop", "Coffee Shop", "interior", "coffee-shop.png", "coffee-shop"),
    DiscoverCategory("study-room", "Study Room", "interior", "study-room.png", "study-room"),
    DiscoverCategory("restaurant", "Restaurant", "interior", "restaurant.png", "restaurant"),
    DiscoverCategory("attic", "Attic", "interior", "attic.png", "attic"),
    DiscoverCategory("toilet", "Toilet", "interior", "bathroom.png", "bathroom"),
    DiscoverCategory("balcony", "Balcony", "interior", "balcony.png", "balcony"),
    DiscoverCategory("hall", "Hall", "interior", "entryway.png", "entryway"),
    DiscoverCategory("deck", "Deck", "interior", "terrace.png", "terrace"),
    DiscoverCategory("villa", "Villa", "exterior", "villa.png", "villa"),
    DiscoverCategory("apartment", "Apartment", "exterior", "apartment.png", "apartment"),
    DiscoverCategory("house", "House", "exterior", "house.png", "house"),
    DiscoverCategory("office-building", "Office Building", "exterior", "office-building.png", "office-building"),
    DiscoverCategory("retail", "Retail", "exterior", "retail.png", "retail"),
    DiscoverCategory("residential", "Residential", "exterior", "exterior.png", "exterior"),
    DiscoverCategory("garden", "Garden", "garden", "garden.png", "garden"),
)


def white_ratio_by_row(image: Image.Image) -> list[float]:
    pixels = image.convert("RGB").load()
    width, height = image.size
    ratios: list[float] = []
    for y in range(height):
        white_pixels = 0
        for x in range(width):
            r, g, b = pixels[x, y]
            if r >= 245 and g >= 245 and b >= 245:
                white_pixels += 1
        ratios.append(white_pixels / width)
    return ratios


def white_ratio_by_column(image: Image.Image) -> list[float]:
    pixels = image.convert("RGB").load()
    width, height = image.size
    ratios: list[float] = []
    for x in range(width):
        white_pixels = 0
        for y in range(height):
            r, g, b = pixels[x, y]
            if r >= 245 and g >= 245 and b >= 245:
                white_pixels += 1
        ratios.append(white_pixels / height)
    return ratios


def collect_segments(values: list[float], cutoff: float, minimum_length: int) -> list[tuple[int, int]]:
    segments: list[tuple[int, int]] = []
    start: int | None = None
    for index, value in enumerate(values):
        if value < cutoff:
            if start is None:
                start = index
            continue
        if start is not None and index - start >= minimum_length:
            segments.append((start, index))
        start = None

    if start is not None and len(values) - start >= minimum_length:
        segments.append((start, len(values)))

    return segments


def trim_gutters(image: Image.Image, box: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    left, top, right, bottom = box
    crop = image.crop(box)
    row_segments = collect_segments(white_ratio_by_row(crop), cutoff=0.96, minimum_length=8)
    column_segments = collect_segments(white_ratio_by_column(crop), cutoff=0.96, minimum_length=8)

    if row_segments:
        trimmed_top = row_segments[0][0]
        trimmed_bottom = row_segments[-1][1]
        top += trimmed_top
        bottom = top + (trimmed_bottom - trimmed_top)

    if column_segments:
        trimmed_left = column_segments[0][0]
        trimmed_right = column_segments[-1][1]
        left += trimmed_left
        right = left + (trimmed_right - trimmed_left)

    return left, top, right, bottom


def build_candidate_boxes(image: Image.Image) -> list[tuple[int, int, int, int]]:
    width, height = image.size
    row_segments = collect_segments(white_ratio_by_row(image), cutoff=0.98, minimum_length=24)
    candidates: list[tuple[int, int, int, int]] = []

    for top, bottom in row_segments:
        row_image = image.crop((0, top, width, bottom))
        column_segments = collect_segments(white_ratio_by_column(row_image), cutoff=0.98, minimum_length=24)
        for left, right in column_segments:
            candidates.append(trim_gutters(image, (left, top, right, bottom)))

    return candidates


def score_crop(image: Image.Image, box: tuple[int, int, int, int]) -> tuple[float, int]:
    crop = image.crop(box)
    stddev = max(ImageStat.Stat(crop.convert("RGB")).stddev)
    area = crop.width * crop.height
    return stddev, area


def is_meaningful_crop(image: Image.Image, box: tuple[int, int, int, int]) -> bool:
    crop = image.crop(box)
    if crop.width < 120 or crop.height < 120:
        return False

    stddev, area = score_crop(image, box)
    return stddev >= 16 and area >= 90_000


def dedupe_boxes(boxes: list[tuple[int, int, int, int]]) -> list[tuple[int, int, int, int]]:
    deduped: list[tuple[int, int, int, int]] = []
    for candidate in boxes:
        if any(
            abs(candidate[0] - existing[0]) < 20
            and abs(candidate[1] - existing[1]) < 20
            and abs(candidate[2] - existing[2]) < 20
            and abs(candidate[3] - existing[3]) < 20
            for existing in deduped
        ):
            continue
        deduped.append(candidate)

    return deduped


def fallback_focus_box(image: Image.Image, index: int) -> tuple[int, int, int, int]:
    width, height = image.size
    crop_width = int(width * 0.42)
    crop_height = int(height * 0.38)
    x_offsets = [0.06, 0.29, 0.52, 0.06, 0.29, 0.52, 0.18]
    y_offsets = [0.06, 0.06, 0.06, 0.34, 0.34, 0.34, 0.56]
    left = int((width - crop_width) * x_offsets[index % len(x_offsets)])
    top = int((height - crop_height) * y_offsets[index % len(y_offsets)])
    return left, top, left + crop_width, top + crop_height


def ensure_target_count(image: Image.Image, boxes: list[tuple[int, int, int, int]]) -> list[tuple[int, int, int, int]]:
    result = boxes[:TARGET_COUNT]
    fallback_index = 0

    while len(result) < TARGET_COUNT:
        candidate = fallback_focus_box(image, fallback_index)
        fallback_index += 1
        if any(
            abs(candidate[0] - existing[0]) < 24
            and abs(candidate[1] - existing[1]) < 24
            and abs(candidate[2] - existing[2]) < 24
            and abs(candidate[3] - existing[3]) < 24
            for existing in result
        ):
            continue
        result.append(candidate)

    return result


def export_category(category: DiscoverCategory) -> None:
    source_path = SOURCE_ROOT / category.source_name
    if not source_path.exists():
        raise FileNotFoundError(f"Missing source collage: {source_path}")

    image = Image.open(source_path).convert("RGB")
    candidate_boxes = dedupe_boxes(build_candidate_boxes(image))
    meaningful_boxes = [box for box in candidate_boxes if is_meaningful_crop(image, box)]
    selected_boxes = ensure_target_count(image, meaningful_boxes)

    output_dir = OUTPUT_ROOT / category.output_dir_name
    output_dir.mkdir(parents=True, exist_ok=True)
    for existing in output_dir.glob("*.jpg"):
        existing.unlink()

    for index, box in enumerate(selected_boxes, start=1):
        crop = image.crop(box)
        output_path = output_dir / f"{category.output_dir_name}-{index}.jpg"
        crop.save(output_path, format="JPEG", quality=94, optimize=True, progressive=True)

    print(f"{category.id}: exported {len(selected_boxes)} crops from {source_path.name} -> {output_dir.name}")


def main() -> None:
    for category in CATEGORIES:
        export_category(category)


if __name__ == "__main__":
    main()
