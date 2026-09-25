import os
import sys
import cv2
import json
import time
import pickle
import numpy as np
from datetime import datetime
from ultralytics import YOLO
from deep_sort_realtime.deepsort_tracker import DeepSort


# ============================================================
# CONFIGURATION
# ============================================================

CAMERA_INDEX = 1  # Using Iriun webcam for camera number 1

FRAME_WIDTH = 1280
FRAME_HEIGHT = 720

CONFIDENCE = 0.50

# How long Deep SORT keeps a temporary track alive
MAX_AGE = 90

# Deep SORT appearance threshold
MAX_COSINE_DISTANCE = 0.30

# Number of observations before accepting a new customer
NEW_CUSTOMER_CONFIRMATION = 8

# Minimum similarity to reconnect a returning customer
REID_THRESHOLD = 0.72

# Strong similarity
STRONG_REID_THRESHOLD = 0.80

# Maximum appearance vectors stored per customer
MAX_FEATURES_PER_CUSTOMER = 20

# Save memory every N seconds
MEMORY_SAVE_INTERVAL = 10

MEMORY_FILE = "customer_memory.pkl"
ANALYTICS_FILE = "customer_analytics.json"


# ============================================================
# PATH FOR LOCAL TORCHREID SOURCE
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REID_DIR = os.path.join(BASE_DIR, "deep-person-reid")

if os.path.exists(REID_DIR) and REID_DIR not in sys.path:
    sys.path.insert(0, REID_DIR)


# ============================================================
# LOAD MODELS
# ============================================================

print("\nLoading YOLO...")
model_path = "yolo26n.pt" if os.path.exists("yolo26n.pt") else ("backend/ai/models/yolo26n.pt" if os.path.exists("backend/ai/models/yolo26n.pt") else "yolo11n.pt")
print(f"\nLoading YOLO ({model_path})...")
model = YOLO(model_path)

print("Loading Deep SORT + ReID...")

try:
    tracker = DeepSort(
        max_age=MAX_AGE,
        n_init=3,
        max_cosine_distance=MAX_COSINE_DISTANCE,
        nn_budget=100,
        # OSNet through Torchreid
        embedder="torchreid",
        embedder_model_name="osnet_ain_x1_0",
        embedder_gpu=False
    )
except Exception as e:
    print(f"Torchreid not available ({e}), loading MobileNet ReID embedder...")
    tracker = DeepSort(
        max_age=MAX_AGE,
        n_init=3,
        max_cosine_distance=MAX_COSINE_DISTANCE,
        nn_budget=100,
        embedder="mobilenet",
        embedder_gpu=False
    )

print("Models loaded successfully.")


# ============================================================
# CUSTOMER MEMORY
# ============================================================

customer_memory = {}

next_customer_number = 1


def generate_customer_id():
    global next_customer_number

    customer_id = f"CUSTOMER_{next_customer_number:04d}"
    next_customer_number += 1

    return customer_id


# ============================================================
# LOAD EXISTING MEMORY
# ============================================================

def load_memory():

    global customer_memory
    global next_customer_number

    if not os.path.exists(MEMORY_FILE):

        print("No previous customer memory found.")
        return

    try:

        with open(MEMORY_FILE, "rb") as f:
            data = pickle.load(f)

        customer_memory = data.get("customers", {})
        next_customer_number = data.get(
            "next_customer_number",
            1
        )

        print(
            f"Loaded {len(customer_memory)} customers "
            f"from previous memory."
        )

    except Exception as e:

        print("Could not load customer memory:", e)


# ============================================================
# SAVE MEMORY
# ============================================================

def save_memory():

    try:

        data = {
            "customers": customer_memory,
            "next_customer_number": next_customer_number
        }

        temp_file = MEMORY_FILE + ".tmp"

        with open(temp_file, "wb") as f:
            pickle.dump(data, f)

        os.replace(temp_file, MEMORY_FILE)

    except Exception as e:

        print("Memory save error:", e)


# ============================================================
# NORMALIZE FEATURE
# ============================================================

def normalize_feature(feature):

    if feature is None:
        return None

    feature = np.asarray(feature, dtype=np.float32)

    norm = np.linalg.norm(feature)

    if norm == 0:
        return None

    return feature / norm


# ============================================================
# COSINE SIMILARITY
# ============================================================

def cosine_similarity(a, b):

    a = normalize_feature(a)
    b = normalize_feature(b)

    if a is None or b is None:
        return 0.0

    return float(np.dot(a, b))


# ============================================================
# GET BEST CUSTOMER MATCH
# ============================================================

def find_best_customer(feature, active_customer_ids):

    if feature is None:
        return None, 0.0

    best_customer = None
    best_similarity = 0.0

    for customer_id, data in customer_memory.items():

        # ----------------------------------------------------
        # Don't match against a customer currently visible
        # in another track.
        #
        # This helps prevent two visible people becoming
        # the same customer.
        # ----------------------------------------------------

        if customer_id in active_customer_ids:
            continue

        features = data.get("features", [])

        if not features:
            continue

        customer_best_similarity = 0.0

        for stored_feature in features:

            similarity = cosine_similarity(
                feature,
                stored_feature
            )

            if similarity > customer_best_similarity:
                customer_best_similarity = similarity

        if customer_best_similarity > best_similarity:

            best_similarity = customer_best_similarity
            best_customer = customer_id

    return best_customer, best_similarity


# ============================================================
# ADD FEATURE TO CUSTOMER
# ============================================================

def add_customer_feature(customer_id, feature):

    feature = normalize_feature(feature)

    if feature is None:
        return

    customer = customer_memory.get(customer_id)

    if customer is None:
        return

    features = customer.setdefault("features", [])

    features.append(feature)

    # Keep memory bounded
    if len(features) > MAX_FEATURES_PER_CUSTOMER:

        # Keep recent appearance samples
        features.pop(0)


# ============================================================
# CREATE CUSTOMER
# ============================================================

def create_customer(feature):

    customer_id = generate_customer_id()

    customer_memory[customer_id] = {

        "customer_id": customer_id,

        "created_at":
            datetime.now().isoformat(),

        "last_seen":
            datetime.now().isoformat(),

        "visit_count": 1,

        "features": [],

        "zones": [],

        "path": [],

        "total_visible_seconds": 0.0
    }

    add_customer_feature(
        customer_id,
        feature
    )

    print(
        f"\n[NEW CUSTOMER] {customer_id}"
    )

    return customer_id


# ============================================================
# UPDATE CUSTOMER MEMORY
# ============================================================

def update_customer(
    customer_id,
    x,
    y,
    zone,
    visible_seconds
):

    if customer_id not in customer_memory:
        return

    customer = customer_memory[customer_id]

    customer["last_seen"] = datetime.now().isoformat()

    customer["total_visible_seconds"] += visible_seconds

    # --------------------------------------------------------
    # Zone history
    # --------------------------------------------------------

    if zone:

        if not customer["zones"]:

            customer["zones"].append(zone)

        elif customer["zones"][-1] != zone:

            customer["zones"].append(zone)

    # --------------------------------------------------------
    # Position history
    # --------------------------------------------------------

    customer["path"].append({

        "x": int(x),

        "y": int(y),

        "zone": zone,

        "time":
            datetime.now().isoformat()
    })

    # Don't allow unlimited path growth
    if len(customer["path"]) > 2000:

        customer["path"] = customer["path"][-2000:]


# ============================================================
# ZONES
# ============================================================

ZONES = {

    "ENTRANCE":
        [0, 0, 320, FRAME_HEIGHT],

    "ELECTRONICS":
        [320, 0, 640, FRAME_HEIGHT],

    "CLOTHING":
        [640, 0, 960, FRAME_HEIGHT],

    "CHECKOUT":
        [960, 0, FRAME_WIDTH, FRAME_HEIGHT]
}


def get_zone(x, y):

    for name, box in ZONES.items():

        x1, y1, x2, y2 = box

        if (
            x1 <= x < x2
            and
            y1 <= y < y2
        ):

            return name

    return "UNKNOWN"


# ============================================================
# TRACK STATE
# ============================================================

track_to_customer = {}

track_observations = {}

track_last_time = {}

track_last_feature = {}

track_match_votes = {}


# ============================================================
# CAMERA (IRIUN WEBCAM ON INDEX 1)
# ============================================================

print(f"Opening Iriun camera (Index {CAMERA_INDEX})...")
cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)

cap.set(
    cv2.CAP_PROP_FRAME_WIDTH,
    FRAME_WIDTH
)

cap.set(
    cv2.CAP_PROP_FRAME_HEIGHT,
    FRAME_HEIGHT
)

cap.set(
    cv2.CAP_PROP_FPS,
    30
)


if not cap.isOpened():

    print(
        f"ERROR: Could not open camera {CAMERA_INDEX}"
    )

    exit()


print("\nCamera started.")
print("Press Q to quit.\n")


# ============================================================
# MEMORY LOAD
# ============================================================

load_memory()

last_memory_save = time.time()


# ============================================================
# MAIN LOOP
# ============================================================

while True:

    ret, frame = cap.read()

    if not ret:

        print("Camera frame failed.")

        break


    # --------------------------------------------------------
    # YOLO PERSON DETECTION
    # --------------------------------------------------------

    results = model.predict(

        frame,

        classes=[0],

        conf=CONFIDENCE,

        verbose=False
    )


    detections = []


    for result in results:

        boxes = result.boxes

        for box in boxes:

            x1, y1, x2, y2 = (
                box.xyxy[0]
                .cpu()
                .numpy()
            )

            confidence = float(
                box.conf[0]
                .cpu()
                .numpy()
            )

            width = x2 - x1
            height = y2 - y1

            detections.append(
                (
                    [
                        float(x1),
                        float(y1),
                        float(width),
                        float(height)
                    ],
                    confidence,
                    "person"
                )
            )


    # --------------------------------------------------------
    # DEEP SORT
    # --------------------------------------------------------

    tracks = tracker.update_tracks(

        detections,

        frame=frame
    )


    # --------------------------------------------------------
    # FIND CURRENTLY ACTIVE CUSTOMERS
    # --------------------------------------------------------

    active_customer_ids = set()


    for track in tracks:

        if not track.is_confirmed():
            continue

        if track.time_since_update > 0:
            continue

        track_id = str(track.track_id)

        if track_id in track_to_customer:

            active_customer_ids.add(
                track_to_customer[track_id]
            )


    # --------------------------------------------------------
    # PROCESS TRACKS
    # --------------------------------------------------------

    for track in tracks:

        if not track.is_confirmed():
            continue

        if track.time_since_update > 0:
            continue


        track_id = str(track.track_id)


        # ----------------------------------------------------
        # BOUNDING BOX
        # ----------------------------------------------------

        ltrb = track.to_ltrb()

        x1, y1, x2, y2 = map(
            int,
            ltrb
        )

        center_x = int(
            (x1 + x2) / 2
        )

        center_y = int(
            (y1 + y2) / 2
        )


        # ----------------------------------------------------
        # GET OSNET FEATURE
        # ----------------------------------------------------

        feature = None

        try:

            feature = track.get_feature()

        except Exception:

            feature = None


        feature = normalize_feature(
            feature
        )


        # ----------------------------------------------------
        # TRACK TIMING
        # ----------------------------------------------------

        current_time = time.time()

        previous_time = track_last_time.get(
            track_id,
            current_time
        )

        elapsed = current_time - previous_time

        track_last_time[track_id] = current_time


        # ----------------------------------------------------
        # CUSTOMER ALREADY ASSIGNED?
        # ----------------------------------------------------

        customer_id = track_to_customer.get(
            track_id
        )


        # ====================================================
        # NEW DEEP SORT TRACK
        # ====================================================

        if customer_id is None:

            observations = track_observations.get(
                track_id,
                0
            )

            observations += 1

            track_observations[track_id] = observations


            # ------------------------------------------------
            # Try persistent Re-ID
            # ------------------------------------------------

            matched_customer = None
            similarity = 0.0

            if feature is not None:

                matched_customer, similarity = (
                    find_best_customer(
                        feature,
                        active_customer_ids
                    )
                )


            # ------------------------------------------------
            # Strong match
            # ------------------------------------------------

            if (
                matched_customer is not None
                and
                similarity >= STRONG_REID_THRESHOLD
            ):

                customer_id = matched_customer

                track_to_customer[
                    track_id
                ] = customer_id

                customer_memory[
                    customer_id
                ]["visit_count"] += 1

                add_customer_feature(
                    customer_id,
                    feature
                )

                print(
                    f"\n[RE-ID STRONG] "
                    f"{customer_id} "
                    f"<- Track {track_id} "
                    f"similarity={similarity:.3f}"
                )


            # ------------------------------------------------
            # Medium match
            # Require repeated agreement
            # ------------------------------------------------

            elif (
                matched_customer is not None
                and
                similarity >= REID_THRESHOLD
            ):

                previous_match = track_match_votes.get(
                    track_id
                )

                if previous_match is not None:

                    previous_customer, votes = previous_match

                    if previous_customer == matched_customer:

                        votes += 1

                    else:

                        votes = 1

                else:

                    votes = 1


                track_match_votes[
                    track_id
                ] = (
                    matched_customer,
                    votes
                )


                # Require 3 consecutive matching observations
                if votes >= 3:

                    customer_id = matched_customer

                    track_to_customer[
                        track_id
                    ] = customer_id

                    customer_memory[
                        customer_id
                    ]["visit_count"] += 1

                    add_customer_feature(
                        customer_id,
                        feature
                    )

                    print(
                        f"\n[RE-ID] "
                        f"{customer_id} "
                        f"<- Track {track_id} "
                        f"similarity={similarity:.3f}"
                    )


            # ------------------------------------------------
            # No existing customer
            # ------------------------------------------------

            if customer_id is None:

                # Don't immediately create a customer.
                #
                # Require several stable observations.
                #

                if observations >= NEW_CUSTOMER_CONFIRMATION:

                    customer_id = create_customer(
                        feature
                    )

                    track_to_customer[
                        track_id
                    ] = customer_id

                else:

                    # Temporary candidate
                    customer_id = "VERIFYING"


        # ====================================================
        # UPDATE CUSTOMER
        # ====================================================

        if (
            customer_id != "VERIFYING"
            and
            customer_id is not None
        ):

            zone = get_zone(
                center_x,
                center_y
            )

            update_customer(

                customer_id,

                center_x,

                center_y,

                zone,

                elapsed
            )


            # ------------------------------------------------
            # Store good appearance samples
            # ------------------------------------------------

            previous_feature = track_last_feature.get(
                track_id
            )

            if feature is not None:

                should_store = False

                if previous_feature is None:

                    should_store = True

                else:

                    feature_change = 1.0 - cosine_similarity(
                        feature,
                        previous_feature
                    )

                    # Store meaningfully different poses
                    if feature_change > 0.03:

                        should_store = True


                if should_store:

                    add_customer_feature(
                        customer_id,
                        feature
                    )

                    track_last_feature[
                        track_id
                    ] = feature


        else:

            zone = get_zone(
                center_x,
                center_y
            )


        # ====================================================
        # DRAW
        # ====================================================

        cv2.rectangle(

            frame,

            (x1, y1),

            (x2, y2),

            (0, 255, 0),

            2
        )


        # ----------------------------------------------------
        # Display ID
        # ----------------------------------------------------

        if customer_id == "VERIFYING":

            label = (
                f"VERIFYING "
                f"| Track {track_id}"
            )

        else:

            label = (
                f"{customer_id} "
                f"| Track {track_id}"
            )


        cv2.putText(

            frame,

            label,

            (x1, max(y1 - 10, 20)),

            cv2.FONT_HERSHEY_SIMPLEX,

            0.65,

            (0, 255, 0),

            2
        )


        # ----------------------------------------------------
        # Center point
        # ----------------------------------------------------

        cv2.circle(

            frame,

            (center_x, center_y),

            5,

            (0, 0, 255),

            -1
        )


        # ----------------------------------------------------
        # Zone
        # ----------------------------------------------------

        cv2.putText(

            frame,

            zone,

            (
                center_x - 50,
                center_y + 25
            ),

            cv2.FONT_HERSHEY_SIMPLEX,

            0.5,

            (255, 255, 0),

            1
        )


    # ========================================================
    # DRAW ZONES
    # ========================================================

    for zone_name, box in ZONES.items():

        x1, y1, x2, y2 = box

        cv2.rectangle(

            frame,

            (x1, y1),

            (x2, y2),

            (100, 100, 100),

            1
        )

        cv2.putText(

            frame,

            zone_name,

            (x1 + 10, 30),

            cv2.FONT_HERSHEY_SIMPLEX,

            0.6,

            (255, 255, 255),

            2
        )


    # ========================================================
    # DISPLAY STATISTICS
    # ========================================================

    active_count = len(
        active_customer_ids
    )

    total_customers = len(
        customer_memory
    )


    cv2.putText(

        frame,

        f"ACTIVE: {active_count}",

        (20, 660),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.7,

        (255, 255, 255),

        2
    )


    cv2.putText(

        frame,

        f"MEMORY: {total_customers}",

        (20, 690),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.7,

        (255, 255, 255),

        2
    )


    # ========================================================
    # SAVE MEMORY
    # ========================================================

    if (
        time.time() - last_memory_save
        >= MEMORY_SAVE_INTERVAL
    ):

        save_memory()

        last_memory_save = time.time()


    # ========================================================
    # SHOW
    # ========================================================

    cv2.imshow(

        "Retail AI - Persistent Customer Tracking",

        frame
    )


    key = cv2.waitKey(1) & 0xFF

    if key == ord("q"):

        break


# ============================================================
# CLEANUP
# ============================================================

save_memory()

cap.release()

cv2.destroyAllWindows()


# ============================================================
# SAVE ANALYTICS
# ============================================================

try:

    analytics = {}

    for customer_id, data in customer_memory.items():

        analytics[customer_id] = {

            "customer_id":
                customer_id,

            "created_at":
                data.get("created_at"),

            "last_seen":
                data.get("last_seen"),

            "visit_count":
                data.get("visit_count", 0),

            "zones":
                data.get("zones", []),

            "path":
                data.get("path", []),

            "total_visible_seconds":
                data.get(
                    "total_visible_seconds",
                    0
                )
        }


    with open(
        ANALYTICS_FILE,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            analytics,
            f,
            indent=2
        )


except Exception as e:

    print(
        "Analytics save error:",
        e
    )


print("\nTracking stopped.")
print(
    f"Customers remembered: "
    f"{len(customer_memory)}"
)