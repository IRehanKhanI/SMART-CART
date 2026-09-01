from ai.analytics.geometry import line_side
from ai.contracts import Point, TrackedObject


class LineCrossingCounter:
    def __init__(self, start: Point, end: Point) -> None:
        self.start = start
        self.end = end
        self._last_side: dict[str, float] = {}

    def update(self, tracks: list[TrackedObject]) -> list[dict[str, str]]:
        events = []
        for track in tracks:
            side = line_side(track.detection.bottom_center, self.start, self.end)
            previous = self._last_side.get(track.track_id)
            if previous is not None and previous * side < 0:
                events.append({
                    "eventType": "person_entered" if previous < side else "person_exited",
                    "anonymousTrackId": track.track_id,
                })
            self._last_side[track.track_id] = side
        return events