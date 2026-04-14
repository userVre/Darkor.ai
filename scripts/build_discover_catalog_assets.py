from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageStat


ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = Path.home() / "Downloads"
SOURCE_ROOT = ROOT / "assets" / "media" / "discover" / "collages" / "source"
OUTPUT_ROOT = ROOT / "assets" / "media" / "discover" / "generated"
TARGET_COUNT = 7


@dataclass(frozen=True)
class DiscoverCategory:
    id: str
    title: str
    service: str
    source_name: str


CATEGORIES = (
    DiscoverCategory("garden", "Garden", "garden", "Jardins du monde en harmonie.png"),
    DiscoverCategory("apartment", "Apartment", "exterior", "Diff\u00e9rents types de complexes r\u00e9sidentiels.png"),
    DiscoverCategory("retail", "Retail", "exterior", "Magasins diversifi\u00e9s et modernes.png"),
    DiscoverCategory("office-building", "Office Building", "exterior", "B\u00e2timents de bureaux innovants et modernes.png"),
    DiscoverCategory("house", "House", "exterior", "Maisons aux styles vari\u00e9s et uniques.png"),
    DiscoverCategory("exterior", "Exterior", "exterior", "Collage d'architectures modernes et vari\u00e9es.png"),
    DiscoverCategory("villa", "Villa", "exterior", "Sept villas de luxe et styles uniques.png"),
    DiscoverCategory("terrace", "Terrace", "garden", "Terrasses de luxe au bord de l'eau.png"),
    DiscoverCategory("entryway", "Entryway", "interior", "Entr\u00e9es majestueuses et vari\u00e9es.png"),
    DiscoverCategory("balcony", "Balcony", "garden", "Balcons divers _ styles et ambiances.png"),
    DiscoverCategory("bathroom", "Bathroom", "interior", "Sept styles de salle de bain modernes.png"),
    DiscoverCategory("attic", "Attic", "interior", "Conversions d'attiques _ id\u00e9es cr\u00e9atives.png"),
    DiscoverCategory("restaurant", "Restaurant", "interior", "Interiors de restaurants vari\u00e9s et \u00e9l\u00e9gants.png"),
    DiscoverCategory("study-room", "Study Room", "interior", "Des chambres d'\u00e9tude vari\u00e9es et styl\u00e9es.png"),
    DiscoverCategory("coffee-shop", "Coffee Shop", "interior", "ChatGPT Image 11 avr. 2026, 08_44_28.png"),
    DiscoverCategory("home-office", "Home Office", "interior", "Configurations de bureaux \u00e0 domicile.png"),
    DiscoverCategory("gaming-room", "Gaming Room", "interior", "ChatGPT Image 11 avr. 2026, 08_44_15.png"),
    DiscoverCategory("master-suite", "Master Suite", "interior", "ChatGPT Image 11 avr. 2026, 08_38_08.png"),
    DiscoverCategory("bedroom", "Bedroom", "interior", "Styles vari\u00e9es pour chambres modernes.png"),
    DiscoverCategory("dining-room", "Dining Room", "interior", "Sept styles de salles \u00e0 manger.png"),
    DiscoverCategory("living-room", "Living Room", "interior", "S\u00e9lection de salons aux styles vari\u00e9s.png"),
    DiscoverCategory("kitchen", "Kitchen", "interior", "Sept cuisines aux styles distincts.png"),
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
    source_path = DOWNLOADS / category.source_name
    if not source_path.exists():
        raise FileNotFoundError(f"Missing source collage: {source_path}")

    SOURCE_ROOT.mkdir(parents=True, exist_ok=True)
    copied_source_path = SOURCE_ROOT / f"{category.id}.png"
    copied_source_path.write_bytes(source_path.read_bytes())

    image = Image.open(source_path).convert("RGB")
    candidate_boxes = dedupe_boxes(build_candidate_boxes(image))
    meaningful_boxes = [box for box in candidate_boxes if is_meaningful_crop(image, box)]
    selected_boxes = ensure_target_count(image, meaningful_boxes)

    output_dir = OUTPUT_ROOT / category.id
    output_dir.mkdir(parents=True, exist_ok=True)
    for existing in output_dir.glob("*.jpg"):
        existing.unlink()

    for index, box in enumerate(selected_boxes, start=1):
        crop = image.crop(box)
        output_path = output_dir / f"{category.id}-{index}.jpg"
        crop.save(output_path, format="JPEG", quality=94, optimize=True, progressive=True)

    print(f"{category.id}: exported {len(selected_boxes)} crops from {source_path.name}")


def main() -> None:
    for category in CATEGORIES:
        export_category(category)


if __name__ == "__main__":
    main()
