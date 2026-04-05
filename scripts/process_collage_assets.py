from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = Path(r"C:\Users\LENOVO\Desktop\New folder")


@dataclass(frozen=True)
class CropTarget:
    name: str
    box: tuple[int, int, int, int]
    trim: bool = False


@dataclass(frozen=True)
class CollageJob:
    source_name: str
    output_dir: Path
    crops: tuple[CropTarget, ...]


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def trim_background(image: Image.Image, tolerance: int = 10) -> Image.Image:
    sample_points = [
        image.getpixel((0, 0)),
        image.getpixel((image.width - 1, 0)),
        image.getpixel((0, image.height - 1)),
        image.getpixel((image.width - 1, image.height - 1)),
    ]
    background = tuple(int(sum(channel) / len(sample_points)) for channel in zip(*sample_points))
    diff = ImageChops.difference(image, Image.new(image.mode, image.size, background))
    bbox = diff.point(lambda value: 255 if value > tolerance else 0).getbbox()
    if not bbox:
      return image

    left, top, right, bottom = bbox
    padded_box = (
        max(left - 6, 0),
        max(top - 6, 0),
        min(right + 6, image.width),
        min(bottom + 6, image.height),
    )
    return image.crop(padded_box)


def export_crops(job: CollageJob) -> list[Path]:
    source_path = SOURCE_DIR / job.source_name
    image = Image.open(source_path).convert("RGB")
    ensure_directory(job.output_dir)

    generated: list[Path] = []
    for crop in job.crops:
        panel = image.crop(crop.box)
        if crop.trim:
            panel = trim_background(panel)

        target_path = job.output_dir / f"{crop.name}.jpg"
        panel.save(target_path, format="JPEG", quality=94, optimize=True, progressive=True)
        generated.append(target_path)

    return generated


def build_jobs() -> Iterable[CollageJob]:
    return (
        CollageJob(
            source_name="3e1d6dcc-92c2-4c30-a923-8e94de9f21d5.png",
            output_dir=ROOT / "assets" / "media" / "examples" / "interior",
            crops=(
                CropTarget("interior-before-empty-room", (0, 0, 508, 595)),
                CropTarget("interior-before-messy-lounge", (516, 0, 1024, 595)),
                CropTarget("interior-before-worn-reading-room", (0, 603, 508, 1078)),
                CropTarget("interior-before-empty-kitchen", (516, 603, 1024, 1078)),
                CropTarget("interior-before-damaged-room", (0, 1086, 508, 1536)),
                CropTarget("interior-before-outdated-kitchen", (516, 1086, 1024, 1536)),
            ),
        ),
        CollageJob(
            source_name="77fcde43-d7fe-4253-af8d-2f06ec925910.png",
            output_dir=ROOT / "assets" / "media" / "examples" / "wall",
            crops=(
                CropTarget("wall-before-raw-concrete", (0, 0, 507, 544)),
                CropTarget("wall-before-peeling-plaster", (517, 0, 1024, 544)),
                CropTarget("wall-before-worn-white", (0, 554, 507, 998)),
                CropTarget("wall-before-exposed-brick", (517, 554, 1024, 998)),
                CropTarget("wall-before-stained-plaster", (0, 1008, 507, 1536)),
                CropTarget("wall-before-damp-streaks", (517, 1008, 1024, 1536)),
            ),
        ),
        CollageJob(
            source_name="54a4b50f-0931-46fe-a90e-adbc1abced2a.png",
            output_dir=ROOT / "assets" / "media" / "examples" / "floor",
            crops=(
                CropTarget("floor-before-cracked-concrete", (0, 0, 560, 466)),
                CropTarget("floor-before-damaged-planks", (561, 0, 1121, 466)),
                CropTarget("floor-before-broken-tile", (0, 469, 560, 932)),
                CropTarget("floor-before-renovation-subfloor", (561, 469, 1121, 932)),
                CropTarget("floor-before-worn-plywood", (0, 935, 1121, 1402)),
            ),
        ),
        CollageJob(
            source_name="e0e9940b-941e-4385-8b8f-740a9b0b71eb.png",
            output_dir=ROOT / "assets" / "media" / "examples" / "exterior",
            crops=(
                CropTarget("exterior-before-scaffold-house", (0, 0, 508, 548)),
                CropTarget("exterior-before-weathered-house", (516, 0, 1024, 548)),
                CropTarget("exterior-before-brick-shell", (0, 557, 508, 992)),
                CropTarget("exterior-before-overgrown-cottage", (516, 557, 1024, 992)),
                CropTarget("exterior-before-abandoned-home", (0, 1001, 508, 1536)),
                CropTarget("exterior-before-concrete-frame", (516, 1001, 1024, 1536)),
            ),
        ),
        CollageJob(
            source_name="18fee9e5-d05a-4fb9-a7f5-6dce57e71fe5.png",
            output_dir=ROOT / "assets" / "media" / "examples" / "garden",
            crops=(
                CropTarget("garden-before-muddy-yard", (0, 0, 508, 530)),
                CropTarget("garden-before-weedy-yard", (516, 0, 1024, 530)),
                CropTarget("garden-before-rubble-yard", (0, 539, 508, 943)),
                CropTarget("garden-before-overgrown-corner", (516, 539, 1024, 943)),
                CropTarget("garden-before-abandoned-backyard", (0, 952, 508, 1536)),
                CropTarget("garden-before-cracked-patio", (516, 952, 1024, 1536)),
            ),
        ),
        CollageJob(
            source_name="529fdbaf-c1af-4936-83f3-677af3353b96.png",
            output_dir=ROOT / "assets" / "media" / "discover" / "home",
            crops=(
                CropTarget("interior-after-serene-lounge", (0, 0, 512, 513)),
                CropTarget("interior-after-moody-club", (520, 0, 1024, 513)),
                CropTarget("interior-after-organic-living", (0, 561, 512, 949)),
                CropTarget("interior-after-grand-salon", (520, 561, 1024, 949)),
                CropTarget("interior-after-editorial-lounge", (120, 997, 904, 1536), trim=True),
            ),
        ),
        CollageJob(
            source_name="ac8176bb-9e5e-4c87-a29a-5c4d6709bccc.png",
            output_dir=ROOT / "assets" / "media" / "discover" / "floor-scenes",
            crops=(
                CropTarget("floor-after-heritage-herringbone", (0, 0, 560, 466)),
                CropTarget("floor-after-carrara-marble", (561, 0, 1121, 466)),
                CropTarget("floor-after-satin-concrete", (0, 467, 560, 933)),
                CropTarget("floor-after-walnut-gloss", (561, 467, 1121, 933)),
                CropTarget("floor-after-soft-limestone", (0, 935, 1121, 1402)),
            ),
        ),
        CollageJob(
            source_name="3f9473b0-adfb-45b1-8f2d-fe12ea284ed8.png",
            output_dir=ROOT / "assets" / "media" / "discover" / "wall-scenes",
            crops=(
                CropTarget("wall-after-sage-plaster", (0, 0, 560, 468)),
                CropTarget("wall-after-linear-slats", (561, 0, 1121, 468)),
                CropTarget("wall-after-veined-marble", (0, 469, 560, 942)),
                CropTarget("wall-after-minimal-concrete", (561, 469, 1121, 942)),
                CropTarget("wall-after-botanical-mural", (0, 944, 1121, 1402)),
            ),
        ),
        CollageJob(
            source_name="ef218354-2bb9-4ad0-bcf0-b48c3c95958b.png",
            output_dir=ROOT / "assets" / "media" / "discover" / "exterior",
            crops=(
                CropTarget("exterior-after-modern-house-day", (0, 0, 560, 438)),
                CropTarget("exterior-after-modern-house-night", (561, 0, 1121, 438)),
                CropTarget("exterior-after-stone-villa", (0, 440, 560, 919)),
                CropTarget("exterior-after-glass-office", (561, 440, 1121, 919)),
                CropTarget("exterior-after-eco-apartments", (0, 921, 1121, 1402)),
            ),
        ),
        CollageJob(
            source_name="b9c2d605-51d1-4024-9c59-719d2e2fb73d.png",
            output_dir=ROOT / "assets" / "media" / "discover" / "garden",
            crops=(
                CropTarget("garden-after-infinity-pool", (0, 0, 560, 470)),
                CropTarget("garden-after-waterfall-court", (561, 0, 1121, 470)),
                CropTarget("garden-after-sunset-fire-pit", (0, 472, 560, 947)),
                CropTarget("garden-after-tropical-pool-lounge", (561, 472, 1121, 947)),
                CropTarget("garden-after-luminous-garden-walk", (0, 949, 1121, 1402)),
            ),
        ),
    )


def main() -> None:
    all_outputs: list[Path] = []
    for job in build_jobs():
        all_outputs.extend(export_crops(job))

    print(f"Generated {len(all_outputs)} cropped assets.")
    for output in all_outputs:
        print(output.relative_to(ROOT))


if __name__ == "__main__":
    main()
