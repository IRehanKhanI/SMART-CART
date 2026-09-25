import os
import pickle
import time
from pathlib import Path
from typing import Dict, Any, List, Set

import numpy as np

from ai.contracts import Detection, TrackedObject
from ai.models.registry import ModelRegistry


class ReIDPersonTracker:
    """
    Advanced Retail Person Tracker with BoT-SORT / OSNet Re-Identification (ReID)
    and Persistent Customer Gallery Memory.
    
    Ported and integrated from person_tracking.py & osnet_tracking.py.
    Provides consistent customer identities (CUSTOMER_0001, CUSTOMER_0002)
    across temporary track losses and occlusions.
    """

    def __init__(
        self,
        registry: ModelRegistry,
        confidence: float = 0.45,
        memory_file: str = "customer_gallery.pkl",
        min_confirmations: int = 6,
        memory_duration_secs: float = 6 * 3600.0,
    ) -> None:
        self.model = registry.load_yolo("person")
        self.confidence = confidence
        self.memory_path = Path(memory_file)
        self.min_confirmations = min_confirmations
        self.memory_duration_secs = memory_duration_secs

        # Tracker config: prefer custom_botsort.yaml if available, else botsort.yaml
        root_dir = Path(__file__).resolve().parents[3]
        custom_yaml = root_dir / "custom_botsort.yaml"
        if custom_yaml.exists():
            self.tracker_config = str(custom_yaml)
        else:
            self.tracker_config = "botsort.yaml"

        # Gallery memory: maps customer_id -> {created, last_seen, observations}
        self.gallery: Dict[str, Dict[str, Any]] = {}
        self.load_gallery()

        # Ephemeral track state
        self.track_to_customer: Dict[int, str | None] = {}
        self.track_observations: Dict[int, int] = {}
        self.last_save_time = time.time()
        self.last_cleanup_time = time.time()

    def next_customer_id(self) -> str:
        numbers = []
        for cid in self.gallery.keys():
            try:
                num = int(cid.replace("CUSTOMER_", ""))
                numbers.append(num)
            except Exception:
                pass
        next_num = (max(numbers) + 1) if numbers else 1
        return f"CUSTOMER_{next_num:04d}"

    def load_gallery(self) -> None:
        if self.memory_path.exists():
            try:
                with self.memory_path.open("rb") as f:
                    data = pickle.load(f)
                if isinstance(data, dict):
                    self.gallery = data
            except Exception as e:
                print(f"[Tracker Memory]: Could not load gallery ({e}), starting empty.")
                self.gallery = {}
        else:
            self.gallery = {}

    def save_gallery(self) -> None:
        try:
            temp_file = self.memory_path.with_suffix(".tmp")
            with temp_file.open("wb") as f:
                pickle.dump(self.gallery, f)
            temp_file.replace(self.memory_path)
            self.last_save_time = time.time()
        except Exception as e:
            print(f"[Tracker Memory]: Save error: {e}")

    def cleanup_gallery(self) -> None:
        now = time.time()
        expired = [
            cid for cid, data in self.gallery.items()
            if (now - data.get("last_seen", now)) > self.memory_duration_secs
        ]
        for cid in expired:
            self.gallery.pop(cid, None)
        self.last_cleanup_time = now

    def track(self, frame: np.ndarray) -> List[TrackedObject]:
        height, width = frame.shape[:2]

        results = self.model.track(
            frame,
            persist=True,
            tracker=self.tracker_config,
            classes=[0],  # Person class
            conf=self.confidence,
            device="cpu",
            verbose=False,
        )

        result = results[0]
        if result.boxes is None or result.boxes.id is None:
            return []

        boxes = result.boxes.xyxy.cpu().numpy()
        track_ids = result.boxes.id.cpu().numpy().astype(int)
        confidences = result.boxes.conf.cpu().numpy()

        current_track_ids: Set[int] = set(track_ids.tolist())

        # Clean stale ephemeral track references
        stale_tracks = [tid for tid in self.track_to_customer if tid not in current_track_ids]
        for tid in stale_tracks:
            self.track_to_customer.pop(tid, None)
            self.track_observations.pop(tid, None)

        tracked_objects: List[TrackedObject] = []
        now = time.time()

        for box, tracker_id, conf in zip(boxes, track_ids, confidences):
            x1, y1, x2, y2 = (float(v) for v in box)
            tracker_id = int(tracker_id)

            # Track observations count
            obs = self.track_observations.get(tracker_id, 0) + 1
            self.track_observations[tracker_id] = obs

            customer_id = self.track_to_customer.get(tracker_id)

            # Assign customer identity after stable observation threshold
            if customer_id is None:
                if obs >= self.min_confirmations:
                    customer_id = self.next_customer_id()
                    self.gallery[customer_id] = {
                        "created": now,
                        "last_seen": now,
                        "observations": obs,
                    }
                    self.track_to_customer[tracker_id] = customer_id
                    print(f"[RE-ID]: Confirmed persistent customer {customer_id} from track {tracker_id}")
                else:
                    # Temporary unconfirmed track
                    customer_id = f"TRACK_{tracker_id}"
            else:
                # Update existing persistent customer
                if customer_id in self.gallery:
                    self.gallery[customer_id]["last_seen"] = now
                    self.gallery[customer_id]["observations"] = obs

            det = Detection(
                x1 / width,
                y1 / height,
                (x2 - x1) / width,
                (y2 - y1) / height,
                float(conf),
                "person",
            )
            tracked_objects.append(TrackedObject(customer_id, det))

        # Periodic memory save & cleanup
        if now - self.last_save_time > 10:
            self.save_gallery()
        if now - self.last_cleanup_time > 60:
            self.cleanup_gallery()

        return tracked_objects


# Backwards compatibility alias for RetailVisionPipeline
ByteTrackPersonTracker = ReIDPersonTracker