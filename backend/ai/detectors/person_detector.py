import numpy as np

from ai.contracts import Detection
from ai.models.registry import ModelRegistry


class YoloPersonDetector:
    def __init__(self, registry: ModelRegistry, confidence: float = 0.35) -> None:
        self.model = registry.load_yolo("person")
        self.confidence = confidence

    def detect(self, frame: np.ndarray) -> list[Detection]:
        height, width = frame.shape[:2]
        result = self.model.predict(frame, classes=[0], conf=self.confidence, device="cpu", verbose=False)[0]
        detections = []
        for box in result.boxes:
            x1, y1, x2, y2 = (float(value) for value in box.xyxy[0].tolist())
            detections.append(Detection(x1 / width, y1 / height, (x2 - x1) / width, (y2 - y1) / height, float(box.conf[0]), "person"))
        return detections