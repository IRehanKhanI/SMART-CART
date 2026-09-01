import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from ai.contracts import Point
from ai.inventory.shelf import ShelfRegion

AI_ROOT = Path(__file__).resolve().parent


@dataclass(frozen=True)
class PipelineConfig:
    confidence: float
    entry_line: tuple[Point, Point] | None
    queue_polygon: list[Point]
    zone_polygons: dict[str, list[Point]]
    queue_threshold: int
    service_minutes: float
    shelves: list[ShelfRegion]


def _points(raw_points: list[list[float]]) -> list[Point]:
    return [Point(float(x), float(y)) for x, y in raw_points]


def load_json(path: str | Path | None = None) -> dict[str, Any]:
    config_path = Path(path or os.environ.get("RETAIL_AI_CONFIG", AI_ROOT / "config.json"))
    with config_path.open(encoding="utf-8") as config_file:
        return json.load(config_file)


def load_pipeline_config(path: str | Path | None = None) -> PipelineConfig:
    data = load_json(path)
    raw_line = data.get("entryLine")
    line_points = _points(raw_line) if raw_line else []
    return PipelineConfig(
        confidence=float(data.get("confidence", 0.35)),
        entry_line=(line_points[0], line_points[1]) if len(line_points) == 2 else None,
        queue_polygon=_points(data.get("queue", {}).get("polygon", [])),
        zone_polygons={zone["name"]: _points(zone["polygon"]) for zone in data.get("zones", [])},
        queue_threshold=int(data.get("queue", {}).get("threshold", 6)),
        service_minutes=float(data.get("queue", {}).get("serviceMinutes", 2.0)),
        shelves=[ShelfRegion(shelf["name"], _points(shelf["polygon"]), int(shelf["expectedFacings"])) for shelf in data.get("shelves", [])],
    )