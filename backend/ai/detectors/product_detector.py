import numpy as np

from ai.contracts import Detection
from ai.models.registry import ModelRegistry


class YoloProductDetector:
    def __init__(self, registry: ModelRegistry, confidence: float = 0.35) -> None:
        self.model = registry.load_yolo("retail_product")
        self.confidence = confidence

    def detect(self, frame: np.ndarray) -> list[Detection]:
        height, width = frame.shape[:2]
        result = self.model.predict(frame, conf=self.confidence, device="cpu", verbose=False)[0]
        detections = []
        for box in result.boxes:
            x1, y1, x2, y2 = (float(value) for value in box.xyxy[0].tolist())
            class_id = int(box.cls[0])
            label = str(result.names.get(class_id, class_id))
            detections.append(Detection(x1 / width, y1 / height, (x2 - x1) / width, (y2 - y1) / height, float(box.conf[0]), label))
        return detections