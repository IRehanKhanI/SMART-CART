from datetime import datetime

from ai.analytics.geometry import point_in_polygon
from ai.contracts import Point, TrackedObject


class DwellTracker:
    def __init__(self, zones: dict[str, list[Point]]) -> None:
        self.zones = zones
        self._entered_at: dict[tuple[str, str], datetime] = {}

    def update(self, tracks: list[TrackedObject], timestamp: datetime) -> list[dict]:
        events = []
        active = {track.track_id for track in tracks}
        for track in tracks:
            for zone_name, polygon in self.zones.items():
                key = (track.track_id, zone_name)
                inside = point_in_polygon(track.detection.bottom_center, polygon)
                if inside and key not in self._entered_at:
                    self._entered_at[key] = timestamp
                    events.append({"eventType": "zone_entered", "zone": zone_name, "anonymousTrackId": track.track_id})
                elif not inside and key in self._entered_at:
                    entered_at = self._entered_at.pop(key)
                    events.append({"eventType": "zone_exited", "zone": zone_name, "anonymousTrackId": track.track_id, "dwellSeconds": (timestamp - entered_at).total_seconds()})
        for key in list(self._entered_at):
            if key[0] not in active:
                entered_at = self._entered_at.pop(key)
                events.append({"eventType": "zone_exited", "zone": key[1], "anonymousTrackId": key[0], "dwellSeconds": (timestamp - entered_at).total_seconds()})
        return events