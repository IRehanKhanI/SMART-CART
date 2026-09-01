import numpy as np

from ai.contracts import Detection, TrackedObject
from ai.models.registry import ModelRegistry


class ByteTrackPersonTracker:
    def __init__(self, registry: ModelRegistry, confidence: float = 0.35) -> None:
        self.model = registry.load_yolo("person")
        self.confidence = confidence

    def track(self, frame: np.ndarray) -> list[TrackedObject]:
        height, width = frame.shape[:2]
        result = self.model.track(frame, persist=True, tracker="bytetrack.yaml", classes=[0], conf=self.confidence, device="cpu", verbose=False)[0]
        if result.boxes.id is None:
            return []
        tracks = []
        for box, track_id in zip(result.boxes, result.boxes.id.tolist()):
            x1, y1, x2, y2 = (float(value) for value in box.xyxy[0].tolist())
            detection = Detection(x1 / width, y1 / height, (x2 - x1) / width, (y2 - y1) / height, float(box.conf[0]), "person")
            tracks.append(TrackedObject(f"track_{int(track_id)}", detection))
        return tracks