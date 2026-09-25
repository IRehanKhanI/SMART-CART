from typing import Any

import cv2
import numpy as np


class OpenCVVideoSource:
    def __init__(self, source: str | int) -> None:
        self.source = int(source) if isinstance(source, str) and source.isdigit() else source
        self.capture: cv2.VideoCapture | None = None

    def open(self) -> None:
        import os
        if isinstance(self.source, int) and os.name == "nt":
            # Iriun webcam / DirectShow on Windows
            self.capture = cv2.VideoCapture(self.source, cv2.CAP_DSHOW)
            if not self.capture.isOpened():
                self.capture = cv2.VideoCapture(self.source)
        else:
            self.capture = cv2.VideoCapture(self.source)

        if not self.capture.isOpened():
            self.release()
            raise RuntimeError(f"Unable to open video source: {self.source}")

    def read(self) -> np.ndarray:
        if self.capture is None:
            self.open()
        success, frame = self.capture.read()
        if not success or frame is None:
            raise RuntimeError(f"Unable to read a frame from: {self.source}")
        return frame

    def release(self) -> None:
        if self.capture is not None:
            self.capture.release()
            self.capture = None

    def __enter__(self) -> "OpenCVVideoSource":
        self.open()
        return self

    def __exit__(self, *args: Any) -> None:
        self.release()