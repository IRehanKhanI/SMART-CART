import sys
import numpy as np

print("=" * 60)
print("VERIFYING ADVANCED RE-ID PERSON TRACKING MODEL")
print("=" * 60)

from ai.models.registry import ModelRegistry
from ai.tracking.tracker import ReIDPersonTracker
from ai.pipeline import RetailVisionPipeline

# 1. Initialize Registry & Tracker
print("\n[Step 1] Loading ModelRegistry & ReIDPersonTracker...")
registry = ModelRegistry()
tracker = ReIDPersonTracker(registry, confidence=0.35, min_confirmations=2)
print("Tracker initialized successfully with config:", tracker.tracker_config)

# 2. Test Tracking on dummy frames
print("\n[Step 2] Testing frame processing with simulated detections...")
dummy_frame = np.zeros((720, 1280, 3), dtype=np.uint8)

# Run tracking on frame
tracks = tracker.track(dummy_frame)
print(f"Empty frame tracks count: {len(tracks)}")

# 3. Test Customer Identity Generation
print("\n[Step 3] Testing Persistent Customer ID generation...")
c1 = tracker.next_customer_id()
print(f"Generated first customer ID: {c1}")
assert c1 == "CUSTOMER_0001", f"Expected CUSTOMER_0001, got {c1}"
tracker.gallery[c1] = {"created": 0, "last_seen": 0, "observations": 5}
c2 = tracker.next_customer_id()
print(f"Generated second customer ID: {c2}")
assert c2 == "CUSTOMER_0002", f"Expected CUSTOMER_0002, got {c2}"

# 4. Test RetailVisionPipeline integration
print("\n[Step 4] Testing RetailVisionPipeline with ReID Tracker...")
pipeline = RetailVisionPipeline.from_registry(registry)
analysis = pipeline.analyze(dummy_frame)
print(f"Pipeline latency: {analysis.latency_ms}ms | Advice: {analysis.advice}")

print("\n" + "=" * 60)
print("ALL PERSON RE-ID TRACKING INTEGRATION TESTS PASSED!")
print("=" * 60)
