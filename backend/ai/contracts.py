from dataclasses import dataclass, field
from typing import Any, Protocol

import numpy as np


@dataclass(frozen=True)
class Point:
    x: float
    y: float


@dataclass(frozen=True)
class Detection:
    x: float
    y: float
    width: float
    height: float
    confidence: float
    label: str

    @property
    def bottom_center(self) -> Point:
        return Point(self.x + self.width / 2, self.y + self.height)


@dataclass(frozen=True)
class TrackedObject:
    track_id: str
    detection: Detection


@dataclass
class FrameAnalysis:
    people: list[TrackedObject]
    queue_length: int | None
    shelf_stock_percent: float | None
    empty_slots: int | None
    shelf_condition: str
    advice: str
    latency_ms: int
    events: list[dict[str, Any]] = field(default_factory=list)


class Detector(Protocol):
    def detect(self, frame: np.ndarray) -> list[Detection]: ...


class Tracker(Protocol):
    def track(self, frame: np.ndarray) -> list[TrackedObject]: ...