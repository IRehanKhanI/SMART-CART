import unittest
from datetime import datetime, timedelta, timezone

import numpy as np

from ai.analytics.dwell import DwellTracker
from ai.analytics.footfall import LineCrossingCounter
from ai.analytics.heatmap import HeatmapAccumulator
from ai.analytics.queue import QueueAnalyzer
from ai.analytics.prediction import QueueRiskEstimator
from ai.config import PipelineConfig
from ai.contracts import Detection, Point, TrackedObject
from ai.inventory.shelf import ShelfRegion
from ai.inventory.planogram import compare_planogram
from ai.pipeline import RetailVisionPipeline


def track(track_id: str, x: float, y: float) -> TrackedObject:
    return TrackedObject(track_id, Detection(x, y, 0.1, 0.1, 0.9, "person"))


class AnalyticsTests(unittest.TestCase):
    def test_line_crossing_emits_one_entry(self) -> None:
        counter = LineCrossingCounter(Point(0, 0.5), Point(1, 0.5))
        self.assertEqual(counter.update([track("1", 0.4, 0.2)]), [])
        self.assertEqual(counter.update([track("1", 0.4, 0.6)])[0]["eventType"], "person_entered")
        self.assertEqual(counter.update([track("1", 0.4, 0.7)]), [])

    def test_dwell_closes_when_track_leaves_zone(self) -> None:
        dwell = DwellTracker({"checkout": [Point(0, 0), Point(1, 0), Point(1, 1), Point(0, 1)]})
        started = datetime(2026, 1, 1, tzinfo=timezone.utc)
        dwell.update([track("7", 0.4, 0.4)], started)
        result = dwell.update([], started + timedelta(seconds=12))
        self.assertEqual(result[0]["dwellSeconds"], 12)

    def test_queue_and_heatmap_use_track_coordinates(self) -> None:
        tracks = [track("1", 0.2, 0.2), track("2", 0.8, 0.8)]
        polygon = [Point(0, 0), Point(0.5, 0), Point(0.5, 0.5), Point(0, 0.5)]
        self.assertEqual(QueueAnalyzer(polygon).analyze(tracks), (1, 2.0))
        heatmap = HeatmapAccumulator(2, 2)
        heatmap.update(tracks)
        self.assertEqual(sum(map(sum, heatmap.snapshot())), 2)

    def test_planogram_reports_deviation(self) -> None:
        result = compare_planogram(["a", "b", "c"], ["a", "c", "x"])
        self.assertFalse(result["compliant"])
        self.assertEqual(result["missing"], ["b"])

    def test_queue_forecast_uses_observed_growth(self) -> None:
        forecast = QueueRiskEstimator().predict(current_length=5, growth_per_minute=1, capacity=8)
        self.assertEqual(forecast.projected_length, 10)
        self.assertEqual(forecast.risk, "CRITICAL")

    def test_pipeline_uses_configured_product_detector_for_shelf(self) -> None:
        shelf = ShelfRegion("A1", [Point(0, 0), Point(1, 0), Point(1, 1), Point(0, 1)], 2)
        config = PipelineConfig(0.35, None, [], {}, 6, 2.0, [shelf])
        fake_tracker = type("FakeTracker", (), {"track": lambda self, frame: []})()
        product = Detection(0.1, 0.1, 0.2, 0.2, 0.9, "product")
        fake_detector = type("FakeDetector", (), {"detect": lambda self, frame: [product]})()
        result = RetailVisionPipeline(fake_tracker, config, fake_detector).analyze(np.zeros((10, 10, 3)))
        self.assertEqual(result.shelf_stock_percent, 50)
        self.assertEqual(result.empty_slots, 1)


if __name__ == "__main__":
    unittest.main()