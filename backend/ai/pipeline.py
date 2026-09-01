from datetime import datetime, timezone
from time import perf_counter

import numpy as np

from ai.analytics.dwell import DwellTracker
from ai.analytics.footfall import LineCrossingCounter
from ai.analytics.heatmap import HeatmapAccumulator
from ai.analytics.queue import QueueAnalyzer
from ai.config import PipelineConfig, load_pipeline_config
from ai.contracts import Detector, FrameAnalysis, Tracker
from ai.detectors.product_detector import YoloProductDetector
from ai.inventory.shelf import analyze_shelf
from ai.models.registry import ModelRegistry
from ai.tracking.tracker import ByteTrackPersonTracker


class RetailVisionPipeline:
    def __init__(self, tracker: Tracker, config: PipelineConfig, product_detector: Detector | None = None) -> None:
        self.tracker = tracker
        self.config = config
        self.footfall = LineCrossingCounter(*config.entry_line) if config.entry_line else None
        self.dwell = DwellTracker(config.zone_polygons)
        self.heatmap = HeatmapAccumulator()
        self.queue = QueueAnalyzer(config.queue_polygon, config.service_minutes)
        self.product_detector = product_detector

    @classmethod
    def from_registry(cls, registry: ModelRegistry | None = None) -> "RetailVisionPipeline":
        config = load_pipeline_config()
        model_registry = registry or ModelRegistry()
        product_detector = None
        if config.shelves and model_registry.weights_path("retail_product").exists():
            product_detector = YoloProductDetector(model_registry, config.confidence)
        return cls(ByteTrackPersonTracker(model_registry, config.confidence), config, product_detector)

    def analyze(self, frame: np.ndarray, timestamp: datetime | None = None) -> FrameAnalysis:
        started = perf_counter()
        observed_at = timestamp or datetime.now(timezone.utc)
        tracks = self.tracker.track(frame)
        events = self.footfall.update(tracks) if self.footfall else []
        events.extend(self.dwell.update(tracks, observed_at))
        self.heatmap.update(tracks)
        queue_length, estimated_wait = self.queue.analyze(tracks)
        shelf_stock_percent = None
        empty_slots = None
        shelf_condition = "No shelf regions configured"
        if self.config.shelves and self.product_detector is None:
            shelf_condition = "Retail product model not downloaded"
        elif self.config.shelves and self.product_detector:
            products = self.product_detector.detect(frame)
            shelf_results = [analyze_shelf(shelf, products) for shelf in self.config.shelves]
            expected = sum(shelf.expected_facings for shelf in self.config.shelves)
            detected = sum(result["detected"] for result in shelf_results)
            empty_slots = sum(result["emptySlots"] for result in shelf_results)
            shelf_stock_percent = min(round(detected / max(expected, 1) * 100, 1), 100.0)
            shelf_condition = "Within configured threshold" if shelf_stock_percent >= 50 else "Replenishment required"
        if queue_length is None:
            advice = "Configure a checkout polygon to enable queue analysis."
        elif queue_length >= self.config.queue_threshold:
            advice = f"Queue threshold exceeded with {queue_length} people. Open an additional counter."
        else:
            advice = f"Observed {len(tracks)} people; checkout activity is within the configured threshold."
        if queue_length is not None:
            events.append({"eventType": "queue_update", "value": queue_length, "estimatedWaitMinutes": estimated_wait})
        return FrameAnalysis(people=tracks, queue_length=queue_length, shelf_stock_percent=shelf_stock_percent, empty_slots=empty_slots, shelf_condition=shelf_condition, advice=advice, latency_ms=round((perf_counter() - started) * 1000), events=events)

    def heatmap_snapshot(self) -> list[list[int]]:
        return self.heatmap.snapshot()