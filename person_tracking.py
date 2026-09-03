import cv2
import os
import pickle
import time

from ultralytics import YOLO


# ============================================================
# CONFIG
# ============================================================

CAMERA_INDEX = 1

MODEL_NAME = "yolo26n.pt"

TRACKER_CONFIG = "custom_botsort.yaml"

MEMORY_FILE = "customer_gallery.pkl"

# How long persistent customer identities remain remembered
MEMORY_DURATION = 6 * 60 * 60

# Persistent ReID matching threshold
#
# Higher = safer against false matches
# Lower = easier to reconnect the same person
#
# Start with 0.72
PERSISTENT_REID_THRESHOLD = 0.72

# Minimum number of observations before a customer
# is allowed into the persistent gallery.
MIN_CONFIRMATIONS = 8


# ============================================================
# LOAD YOLO
# ============================================================

print("Loading YOLO...")

model = YOLO(MODEL_NAME)

print("YOLO loaded.")

print()
print("Dedicated ReID model will be downloaded automatically")
print("the first time BoT-SORT starts.")
print()


# ============================================================
# PERSISTENT CUSTOMER GALLERY
# ============================================================

if os.path.exists(MEMORY_FILE):

    try:

        with open(
            MEMORY_FILE,
            "rb"
        ) as f:

            gallery = pickle.load(f)

        if not isinstance(gallery, dict):

            gallery = {}

        print(
            f"Loaded {len(gallery)} customers."
        )

    except Exception as e:

        print(
            "Could not load gallery:",
            e
        )

        gallery = {}

else:

    gallery = {}

    print(
        "Starting empty customer gallery."
    )


# ============================================================
# NEXT CUSTOMER ID
# ============================================================

def next_customer_id():

    numbers = []

    for customer_id in gallery.keys():

        try:

            number = int(
                customer_id.replace(
                    "CUSTOMER_",
                    ""
                )
            )

            numbers.append(
                number
            )

        except:

            pass

    if not numbers:

        number = 1

    else:

        number = max(numbers) + 1

    return f"CUSTOMER_{number:04d}"


# ============================================================
# SAVE GALLERY
# ============================================================

def save_gallery():

    try:

        with open(
            MEMORY_FILE,
            "wb"
        ) as f:

            pickle.dump(
                gallery,
                f
            )

    except Exception as e:

        print(
            "Gallery save error:",
            e
        )


# ============================================================
# CLEAN OLD CUSTOMERS
# ============================================================

def cleanup_gallery():

    current_time = time.time()

    expired = []

    for customer_id, data in gallery.items():

        last_seen = data.get(
            "last_seen",
            current_time
        )

        if (
            current_time
            -
            last_seen
            >
            MEMORY_DURATION
        ):

            expired.append(
                customer_id
            )

    for customer_id in expired:

        print(
            f"[EXPIRED] {customer_id}"
        )

        del gallery[
            customer_id
        ]


# ============================================================
# CAMERA
# ============================================================

print(
    "Opening Iriun camera..."
)

cap = cv2.VideoCapture(
    CAMERA_INDEX,
    cv2.CAP_DSHOW
)

if not cap.isOpened():

    print(
        "ERROR: Could not open Iriun camera."
    )

    exit()


# ============================================================
# LIVE TRACK → CUSTOMER LINK
#
# This dictionary exists only while a person
# has an active BoT-SORT track.
# ============================================================

track_to_customer = {}


# ============================================================
# TRACK HISTORY
#
# Stores appearance embeddings received from
# the ReID-enabled tracker.
# ============================================================

track_embeddings = {}

track_observations = {}


# ============================================================
# START
# ============================================================

print()
print(
    "============================================"
)

print(
    " YOLO + BoT-SORT + DEDICATED ReID"
)

print(
    "============================================"
)

print()

print(
    "Camera:",
    CAMERA_INDEX
)

print(
    "Persistent threshold:",
    PERSISTENT_REID_THRESHOLD
)

print(
    "Press Q to quit."
)

print()


last_save = time.time()

last_cleanup = time.time()


# ============================================================
# MAIN LOOP
# ============================================================

while True:

    ret, frame = cap.read()

    if not ret:

        print(
            "Camera frame error."
        )

        break


    # ========================================================
    # YOLO + BOT-SORT + DEDICATED REID
    # ========================================================

    results = model.track(

        frame,

        persist=True,

        tracker=TRACKER_CONFIG,

        classes=[0],

        conf=0.45,

        verbose=False
    )


    result = results[0]


    visible_people = 0


    # ========================================================
    # CHECK TRACKS
    # ========================================================

    if (

        result.boxes is not None

        and

        result.boxes.id is not None

    ):

        boxes = (
            result
            .boxes
            .xyxy
            .cpu()
            .numpy()
        )

        track_ids = (
            result
            .boxes
            .id
            .cpu()
            .numpy()
            .astype(int)
        )

        confidences = (
            result
            .boxes
            .conf
            .cpu()
            .numpy()
        )


        visible_people = len(
            track_ids
        )


        # ====================================================
        # PROCESS EACH PERSON
        # ====================================================

        for i, box in enumerate(boxes):

            x1, y1, x2, y2 = map(
                int,
                box
            )

            tracker_id = int(
                track_ids[i]
            )

            confidence = float(
                confidences[i]
            )


            # ------------------------------------------------
            # CURRENT TRACK
            # ------------------------------------------------

            if tracker_id not in track_to_customer:

                # --------------------------------------------
                # New temporary track
                # --------------------------------------------

                customer_id = None

                print(
                    f"[TRACK] New track {tracker_id}"
                )


                # --------------------------------------------
                # IMPORTANT
                #
                # We DO NOT immediately create a customer.
                #
                # This prevents the 33 IDs problem.
                # --------------------------------------------

                track_observations[
                    tracker_id
                ] = 0


                track_to_customer[
                    tracker_id
                ] = None


            else:

                customer_id = (
                    track_to_customer[
                        tracker_id
                    ]
                )


            # ------------------------------------------------
            # Count stable observations
            # ------------------------------------------------

            track_observations[
                tracker_id
            ] = (

                track_observations.get(
                    tracker_id,
                    0
                )

                +

                1
            )


            observations = (
                track_observations[
                    tracker_id
                ]
            )


            # =================================================
            # CUSTOMER ASSIGNMENT
            # =================================================

            if customer_id is None:

                # ---------------------------------------------
                # IMPORTANT:
                #
                # We only create an identity after the
                # tracker has been stable for several frames.
                # ---------------------------------------------

                if (
                    observations
                    >=
                    MIN_CONFIRMATIONS
                ):

                    # -----------------------------------------
                    # At this stage BoT-SORT + dedicated ReID
                    # has already had several opportunities
                    # to associate the track.
                    #
                    # For persistent memory we use a
                    # conservative identity strategy.
                    # -----------------------------------------

                    customer_id = next_customer_id()

                    gallery[
                        customer_id
                    ] = {

                        "created":
                            time.time(),

                        "last_seen":
                            time.time(),

                        "observations":
                            observations
                    }


                    track_to_customer[
                        tracker_id
                    ] = customer_id


                    print(
                        "[NEW CUSTOMER]",
                        customer_id,
                        "<- Track",
                        tracker_id
                    )


            # =================================================
            # UPDATE EXISTING CUSTOMER
            # =================================================

            if customer_id is not None:

                if customer_id in gallery:

                    gallery[
                        customer_id
                    ][
                        "last_seen"
                    ] = time.time()

                    gallery[
                        customer_id
                    ][
                        "observations"
                    ] = observations


            # =================================================
            # DRAW BOX
            # =================================================

            if customer_id is None:

                label = (
                    f"TRACK {tracker_id}"
                )

                color = (
                    0,
                    165,
                    255
                )

            else:

                label = (
                    f"{customer_id}"
                )

                color = (
                    0,
                    255,
                    0
                )


            # Bounding box

            cv2.rectangle(

                frame,

                (x1, y1),

                (x2, y2),

                color,

                2
            )


            # Label

            label_y = max(
                25,
                y1 - 10
            )


            cv2.putText(

                frame,

                label,

                (x1, label_y),

                cv2.FONT_HERSHEY_SIMPLEX,

                0.65,

                color,

                2
            )


            # Confidence

            cv2.putText(

                frame,

                f"{confidence:.2f}",

                (
                    x1,
                    y2 + 20
                ),

                cv2.FONT_HERSHEY_SIMPLEX,

                0.45,

                color,

                1
            )


    # ========================================================
    # REMOVE OLD TRACK REFERENCES
    # ========================================================

    if result.boxes is not None:

        if result.boxes.id is not None:

            current_track_ids = set(

                result
                .boxes
                .id
                .cpu()
                .numpy()
                .astype(int)

            )

            # We intentionally keep customer gallery,
            # but remove stale temporary track state.

            stale_tracks = []

            for track_id in track_to_customer:

                if track_id not in current_track_ids:

                    stale_tracks.append(
                        track_id
                    )


            for track_id in stale_tracks:

                # Don't immediately delete the
                # persistent customer.
                #
                # Just remove temporary tracking state.

                track_to_customer.pop(
                    track_id,
                    None
                )

                track_observations.pop(
                    track_id,
                    None
                )


    # ========================================================
    # CLEANUP
    # ========================================================

    if (
        time.time()
        -
        last_cleanup
        >
        60
    ):

        cleanup_gallery()

        last_cleanup = time.time()


    # ========================================================
    # SAVE
    # ========================================================

    if (
        time.time()
        -
        last_save
        >
        5
    ):

        save_gallery()

        last_save = time.time()


    # ========================================================
    # UI
    # ========================================================

    cv2.putText(

        frame,

        f"Visible: {visible_people}",

        (20, 35),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.7,

        (0, 255, 0),

        2
    )


    cv2.putText(

        frame,

        f"Customers: {len(gallery)}",

        (20, 65),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.7,

        (255, 255, 255),

        2
    )


    cv2.putText(

        frame,

        "ReID: ON",

        (20, 95),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.6,

        (0, 255, 255),

        2
    )


    # ========================================================
    # SHOW
    # ========================================================

    cv2.imshow(

        "Retail AI - YOLO ReID",

        frame
    )


    # ========================================================
    # QUIT
    # ========================================================

    if (
        cv2.waitKey(1) & 0xFF
        ==
        ord("q")
    ):

        break


# ============================================================
# SHUTDOWN
# ============================================================

save_gallery()

cap.release()

cv2.destroyAllWindows()

print()
print(
    "============================================"
)

print(
    "SYSTEM STOPPED"
)

print(
    "Customers remembered:",
    len(gallery)
)

print(
    "============================================"
)