from ai.analytics.geometry import point_in_polygon
from ai.contracts import Point, TrackedObject


class QueueAnalyzer:
    def __init__(self, polygon: list[Point] | None, service_minutes: float = 2.0) -> None:
        self.polygon = polygon
        self.service_minutes = service_minutes

    def analyze(self, tracks: list[TrackedObject]) -> tuple[int | None, float | None]:
        if not self.polygon:
            return None, None
        queue_length = sum(point_in_polygon(track.detection.bottom_center, self.polygon) for track in tracks)
        return queue_length, round(queue_length * self.service_minutes, 1)