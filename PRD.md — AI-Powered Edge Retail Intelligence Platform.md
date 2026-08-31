# PRD.md — AI-Powered Edge Retail Intelligence Platform

## 1. Product Overview

**Product Name:** TBD  
**Problem Statement:** SIH 26179  
**Organization:** Qualcomm Inc.  
**Category:** Hardware  
**Theme:** Miscellaneous

### Product Vision

Build an AI-powered retail intelligence platform that uses **on-device Edge AI, computer vision, and optional IoT sensors** to provide real-time shopper analytics, inventory visibility, queue intelligence, and operational recommendations while minimizing cloud dependency and protecting customer privacy.

The system will convert camera and sensor data into **anonymous operational events and actionable business insights**, rather than depending on continuous cloud processing.

---

# 2. Problem Statement

Retail stores face several operational problems:

- High billing queues
- Stock-outs
- Low inventory visibility
- Inefficient shelf replenishment
- Customer traffic uncertainty
- Poor understanding of shopper movement
- Lack of real-time operational intelligence
- Staffing inefficiency
- Internet connectivity limitations
- Privacy concerns related to continuous video surveillance

The proposed solution addresses these problems using **local Edge AI processing**.

---

# 3. Core Product Concept

The platform consists of four major layers:

```text
┌─────────────────────────────────────────────┐
│             RETAIL STORE                   │
│                                             │
│ Cameras + ESP32 Sensors + POS (Optional)  │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│             EDGE AI LAYER                  │
│                                             │
│ Person Detection                            │
│ Person Tracking                              │
│ Shopper Analytics                            │
│ Shelf/Product Detection                     │
│ Queue Detection                              │
│ Local AI Inference                           │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│             INTELLIGENCE LAYER             │
│                                             │
│ Event Processing                             │
│ Sensor Fusion                                │
│ Queue Prediction                             │
│ Stock Alerts                                 │
│ Operational Recommendations                 │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│             RETAIL DASHBOARD               │
│                                             │
│ Live Store Status                            │
│ Shopper Analytics                            │
│ Inventory                                    │
│ Queue Intelligence                           │
│ Alerts                                       │
│ Reports                                      │
└─────────────────────────────────────────────┘
```

---

# 4. Requirement Classification

The following classification must be followed throughout development.

### 🟢 OFFICIAL REQUIREMENT

Directly mentioned or clearly required by SIH Problem Statement 26179.

### 🔵 PROPOSED IMPLEMENTATION

Our recommended technical approach for satisfying the requirement.

### 🔴 UNCONFIRMED / ASSUMED

This is NOT explicitly guaranteed by the problem statement and must not be presented as an official requirement.

Examples include:

- Exact camera models
- Exact Edge AI hardware
- Exact AI models
- Exact number of cameras
- Exact sensors
- Exact database
- Exact UI
- Exact prediction algorithm
- Exact communication protocol
- Exact product categories
- Exact POS/ERP integration

---

# 5. Target Users

## Primary Users

### Store Manager

Needs:

- Store overview
- Footfall
- Inventory alerts
- Queue status
- Operational alerts
- Analytics
- Staffing insights

### Store Staff

Needs:

- Replenishment alerts
- Queue alerts
- Priority tasks
- Shelf status

## 🔴 UNCONFIRMED / ASSUMED

The SIH problem statement does not explicitly define detailed user roles or permissions.

---

# 6. Main Functional Modules

The platform will contain the following major modules:

1. Shopper Analytics
2. Inventory Intelligence
3. Queue Intelligence
4. Edge AI Processing
5. Privacy Layer
6. Store Operations Dashboard
7. Alerts
8. Analytics
9. Device Management
10. Optional Sensor Fusion
11. Optional External Integrations
12. Optional Multi-Store Management

---

# 7. Shopper Analytics

## 7.1 Customer Detection

### 🟢 Requirement

The system should detect customers entering and exiting the store.

### 🔵 Proposed Implementation

Use a lightweight object detection model to detect people.

Recommended first implementation:

```text
Camera
   ↓
OpenCV
   ↓
YOLO Person Detection
   ↓
Person Bounding Boxes
```

---

# 8. Anonymous Person Tracking

### 🟢 Requirement

The system should provide anonymous shopper analytics.

### 🔵 Proposed Implementation

Use:

- YOLO for person detection
- ByteTrack for temporary tracking IDs

Example:

```text
Person #17
Person #21
Person #25
```

Tracking IDs must not represent real identities.

The system should not require names, phone numbers, facial identities, or other personally identifiable information.

---

# 9. Entry / Exit Detection

### 🟢 Requirement

Detect customers entering and exiting.

### 🔵 Proposed Implementation

Use a virtual line:

```text
           STORE
────────────────────────

        Person
           ↓
           ↓
════════════════════════
       ENTRY LINE
════════════════════════
```

If a tracked person crosses:

```text
Outside → Inside = ENTRY

Inside → Outside = EXIT
```

The system calculates:

```text
Current Occupancy =
Total Entries - Total Exits
```

---

# 10. Footfall Analytics

### 🟢 Requirement

Analyze footfall trends by:

- Time
- Day
- Store zone

### 🔵 Proposed Metrics

- Current footfall
- Hourly footfall
- Daily footfall
- Weekly footfall
- Peak traffic period
- Lowest traffic period
- Zone traffic
- Entry count
- Exit count

---

# 11. Shopper Movement

### 🟢 Requirement

Analyze customer movement patterns.

### 🔵 Proposed Implementation

Track anonymous person coordinates over time.

```text
Camera Frame
      ↓
Person Detection
      ↓
Tracking
      ↓
Coordinates
      ↓
Movement Path
```

Example:

```text
Entrance
   ↓
Grocery
   ↓
Electronics
   ↓
Checkout
```

---

# 12. Store Zones

### 🔵 Proposed Implementation

The store will be divided into configurable zones.

Example:

```text
┌──────────────────────────────────┐
│                                  │
│ Grocery          Electronics     │
│ ZONE A             ZONE B        │
│                                  │
│                                  │
│ Household        Checkout        │
│ ZONE C             ZONE D        │
│                                  │
│ Entrance                         │
└──────────────────────────────────┘
```

Zones must be configurable from the dashboard.

## 🔴 UNCONFIRMED / ASSUMED

The actual number and names of store zones are not specified by the SIH problem statement.

---

# 13. Dwell Time

### 🟢 Requirement

Measure shopper dwell time near products and promotional displays.

### 🔵 Proposed Implementation

When an anonymous tracked person enters a zone:

```text
Zone Entry
    ↓
Start Timer
    ↓
Person remains inside
    ↓
Person leaves
    ↓
Stop Timer
```

Metrics:

- Average dwell time
- Maximum dwell time
- Minimum dwell time
- Zone dwell time
- Promotional area dwell time

---

# 14. Shopper Heatmap

### 🟢 Requirement

Generate heatmaps showing customer movement.

### 🔵 Proposed Implementation

Use tracked person coordinates.

```text
Person Position
      ↓
X,Y Coordinates
      ↓
Position Accumulation
      ↓
Heatmap
```

Example:

```text
LOW TRAFFIC          HIGH TRAFFIC

░░░░░░░░              ░░▒▒▓▓▒░
░░▒░░░░░              ░▒▓██▓▒░
░░░░░░░░              ░░▒▓▓▒░░
```

---

# 15. Inventory Monitoring

## 15.1 Low Stock Detection

### 🟢 Requirement

Detect low-stock situations.

### 🔵 Proposed Implementation

Use shelf-facing cameras and product detection.

```text
Shelf Camera
     ↓
Shelf ROI
     ↓
Product Detection
     ↓
Product Count / Occupancy
     ↓
Stock Level
```

---

# 16. Out-of-Stock Detection

### 🟢 Requirement

Detect out-of-stock products.

### 🔵 Proposed Implementation

Define expected shelf/product positions.

Example:

```text
Expected Shelf

[Product][Product][Product][Product][Product]

Detected

[Product][Product][EMPTY ][EMPTY ][Product]
```

Generate:

```text
OUT OF STOCK
```

or:

```text
LOW STOCK
```

---

# 17. Product Detection

### 🔵 Proposed Implementation

Use a lightweight object detection model.

Initial model:

**YOLO**

For generic detection, a pretrained model may be used.

For actual store-specific products, create a custom dataset.

Example:

```text
Product A
Product B
Product C
Product D
```

Then fine-tune a detector.

## 🔴 UNCONFIRMED / ASSUMED

The SIH problem statement does not specify which products must be detected.

---

# 18. Custom Product Dataset

### 🔵 Proposed Implementation

Create a dataset containing actual prototype products.

Process:

```text
Collect Images
      ↓
Annotate Products
      ↓
Train / Fine-tune Model
      ↓
Validate
      ↓
Deploy on Edge
```

Potential tools:

- Roboflow
- CVAT
- Label Studio

## 🔴 UNCONFIRMED / ASSUMED

No specific dataset or annotation platform is mandated by the problem statement.

---

# 19. Planogram Compliance

### 🟢 Requirement

Monitor planogram compliance and product placement.

### 🔵 Proposed Implementation

Represent shelf positions as expected slots.

Example:

```text
Expected:

A B C D E

Actual:

A B D C E

Result:

⚠ PRODUCT MISPLACEMENT
```

The system compares:

```text
Expected Product Position
        vs
Detected Product Position
```

---

# 20. Replenishment Alerts

### 🟢 Requirement

Alert store staff when replenishment is required.

Example:

```text
🔴 REPLENISHMENT REQUIRED

Shelf: A12
Product: Product A
Detected Stock: 12%
Threshold: 20%
```

---

# 21. Queue Intelligence

## 21.1 Queue Detection

### 🟢 Requirement

Monitor checkout counters and queues.

### 🔵 Proposed Implementation

Use:

```text
YOLO
+
ByteTrack
+
Checkout ROI
```

Example:

```text
┌─────────────────────────────┐
│       CHECKOUT ROI          │
│                             │
│       👤                    │
│       👤                    │
│       👤                    │
│       👤                    │
│                             │
└─────────────────────────────┘
```

---

# 22. Queue Length

### 🟢 Requirement

Monitor queue length.

Metrics:

- Current queue length
- Queue length by counter
- Maximum queue length
- Average queue length
- Queue growth rate

---

# 23. Waiting Time

### 🟢 Requirement

Measure average waiting time.

### 🔵 Proposed Implementation

Track anonymous IDs entering and leaving the queue.

```text
Queue Entry
     ↓
Start Timer
     ↓
Billing Begins
     ↓
Stop Timer
```

Calculate:

```text
Average Waiting Time
```

---

# 24. Service Time

### 🟢 Requirement

Measure average service time.

### 🔵 Proposed Implementation

Estimate:

```text
Customer reaches counter
       ↓
Service starts
       ↓
Customer leaves
       ↓
Service duration
```

---

# 25. Queue Congestion Prediction

### 🟢 Requirement

Predict queue congestion before it becomes excessive.

### 🔵 Proposed Implementation

Possible inputs:

```text
Current Queue Length
Queue Growth Rate
Historical Queue Pattern
Time of Day
Day of Week
Current Store Footfall
```

Possible first model:

- Logistic Regression
- Random Forest
- XGBoost
- LightGBM

## 🔴 UNCONFIRMED / ASSUMED

The SIH problem statement does not specify which prediction algorithm must be used.

The exact prediction model will be selected after collecting sufficient prototype data.

---

# 26. Additional Counter Recommendation

### 🟢 Requirement

Recommend opening additional billing counters.

Example:

```text
QUEUE 2

Current: 11 people
Growth: +2/min

⚠ HIGH CONGESTION

Recommendation:
OPEN COUNTER 4
```

---

# 27. Edge AI

### 🟢 CRITICAL REQUIREMENT

AI inference should happen locally on edge devices.

The system should:

- Process camera data locally
- Reduce cloud dependency
- Continue functioning during internet outages
- Reduce bandwidth consumption
- Reduce latency
- Improve privacy

---

# 28. Proposed Edge Architecture

### 🔵 Proposed Implementation

```text
Camera
   ↓
Edge Computer
   ↓
AI Inference
   ↓
Event Generation
   ↓
Local Backend
   ↓
Dashboard
```

The edge computer may run:

- Python
- OpenCV
- YOLO
- Tracking
- Product detection
- Queue analysis

## 🔴 UNCONFIRMED / ASSUMED

The SIH problem statement does not mandate a particular edge computer.

Potential prototype hardware:

- Qualcomm Edge AI hardware
- NVIDIA Jetson
- Raspberry Pi + accelerator
- Other compatible edge AI hardware

The final hardware should be selected based on availability, performance, and SIH/Qualcomm requirements.

---

# 29. Camera Architecture

### 🔵 Proposed Prototype

Start with:

**One 1080p USB UVC webcam**

Possible camera classes:

- Logitech-style USB webcam
- Arducam USB camera
- Other UVC-compatible camera

The software should not depend on a specific camera manufacturer.

Camera abstraction:

```text
Camera Interface
      │
 ┌────┴────┐
 │         │
USB       RTSP
Camera    Camera
```

## 🔴 UNCONFIRMED / ASSUMED

No camera model is specified by the problem statement.

The exact camera model has not been finalized.

---

# 30. Multi-Camera Architecture

### 🔵 Proposed Future Architecture

```text
Camera 1 → Entrance
Camera 2 → Store Floor
Camera 3 → Shelf
Camera 4 → Checkout
```

Each camera can have a specific purpose.

## 🔴 UNCONFIRMED / ASSUMED

The number of cameras is not specified by the problem statement.

A single-camera prototype may be used initially.

---

# 31. Recommended Computer Vision Stack

### 🔵 Proposed

## Person Detection

YOLO

## Person Tracking

ByteTrack

## Frame Processing

OpenCV

## Optional Depth

Depth Anything V2

## Product Detection

Custom YOLO model

## Queue Detection

YOLO + tracking + ROI

## Heatmaps

OpenCV / numerical processing

## Zone Detection

Polygon/rectangle geometry

---

# 32. Model References

### YOLO

GitHub:

https://github.com/ultralytics/ultralytics

Potential uses:

- Person detection
- Product detection
- Queue detection
- Shelf detection

### ByteTrack

GitHub:

https://github.com/ifzhang/ByteTrack

Potential use:

- Anonymous multi-object tracking

### Depth Anything V2

GitHub:

https://github.com/DepthAnything/Depth-Anything-V2

Potential use:

- Monocular depth estimation

### Hugging Face

https://huggingface.co/

Potential uses:

- Pretrained computer vision models
- Model experimentation
- Custom model hosting

## 🔴 UNCONFIRMED / ASSUMED

The problem statement does not mandate any of these models or repositories.

They are implementation choices.

---

# 33. Privacy Architecture

### 🟢 Requirement

The system must use privacy-aware analytics.

### Rules

The system should:

- Avoid facial identification
- Avoid storing customer names
- Avoid storing phone numbers
- Avoid unnecessary personal information
- Use anonymous tracking IDs
- Prefer local video processing
- Send metadata/events instead of raw video whenever possible

Example event:

```json
{
  "event": "person_entered",
  "zone": "grocery",
  "anonymous_id": "track_42",
  "timestamp": "..."
}
```

The system should NOT require:

```json
{
  "name": "John",
  "face": "...",
  "phone": "..."
}
```

---

# 34. Data Flow

```text
CAMERA
  ↓
VIDEO FRAME
  ↓
EDGE AI
  ↓
DETECTION
  ↓
TRACKING
  ↓
ANALYTICS
  ↓
EVENT
  ↓
DJANGO
  ↓
DATABASE
  ↓
WEBSOCKET
  ↓
REACT
```

---

# 35. Event-Based Backend

The backend should primarily receive **events and analytics**, rather than continuous raw video.

Example:

```json
{
  "device_id": "CAM-01",
  "event_type": "person_entered",
  "zone": "entrance",
  "timestamp": "2026-08-31T20:00:00"
}
```

Other event types:

```text
person_entered
person_exited
zone_entered
zone_exited
low_stock
out_of_stock
product_misplaced
queue_increased
queue_congestion
replenishment_required
device_online
device_offline
```

---

# 36. Django Backend

### 🔵 Proposed Technology

- Django
- Django REST Framework
- Django Channels
- PostgreSQL / SQLite for prototype

Backend responsibilities:

- Device registration
- Authentication
- Event ingestion
- Data storage
- Analytics aggregation
- Alert generation
- WebSocket communication
- Store configuration
- Zone configuration
- Camera configuration

---

# 37. Suggested API Architecture

Example:

```text
/api/devices/
/api/devices/{id}/events/
/api/analytics/footfall/
/api/analytics/dwell/
/api/analytics/heatmap/
/api/inventory/
/api/queues/
/api/alerts/
/api/zones/
/api/stores/
```

## 🔴 UNCONFIRMED / ASSUMED

These exact API endpoints are proposed architecture and are not specified by the SIH problem statement.

---

# 38. React Dashboard

### 🔵 Proposed Technology

- React
- TypeScript
- Vite
- WebSocket
- Charting library
- Optional Three.js / React Three Fiber

---

# 39. Dashboard Pages

## 39.1 Command Center

Display:

- Store status
- Current occupancy
- Footfall
- Inventory alerts
- Queue alerts
- Critical events

---

## 39.2 Live Store

Display:

- Store map
- Camera status
- Anonymous people positions
- Zone occupancy
- Queue status

## 🔴 UNCONFIRMED / ASSUMED

A 3D store map is a proposed UI feature and is not explicitly required by the problem statement.

---

# 40. Shopper Intelligence Dashboard

Display:

- Footfall
- Entry/exit trends
- Zone popularity
- Dwell time
- Movement patterns
- Heatmaps
- Peak traffic periods

---

# 41. Inventory Dashboard

Display:

- Total monitored shelves
- Low-stock products
- Out-of-stock products
- Product placement issues
- Planogram compliance
- Replenishment alerts

---

# 42. Queue Dashboard

Display:

- Queue length
- Waiting time
- Service time
- Queue growth
- Congestion prediction
- Counter status
- Recommended additional counter

---

# 43. Alerts

Alert levels:

```text
INFO
WARNING
CRITICAL
```

Examples:

```text
🟡 LOW STOCK

🟠 QUEUE INCREASING

🔴 OUT OF STOCK

🔴 HIGH QUEUE CONGESTION
```

---

# 44. Analytics

The system should provide:

### Daily

- Footfall
- Average dwell time
- Queue performance
- Inventory issues

### Weekly

- Traffic trends
- Popular zones
- Frequent stock-outs
- Queue patterns
- Operational trends

---

# 45. KPI System

Potential KPIs:

```text
Footfall
Current Occupancy
Average Dwell Time
Average Queue Length
Average Waiting Time
Average Service Time
Stock Availability
Out-of-Stock Events
Planogram Compliance
Replenishment Events
```

## 🔴 UNCONFIRMED / ASSUMED

The exact KPI definitions are not specified by the SIH problem statement.

---

# 46. ESP32 Integration

### 🔵 Proposed Role

The normal ESP32 should act as an IoT/sensor node.

It should NOT be responsible for heavy AI inference.

Possible sensors:

- Load cell
- IR sensor
- ToF sensor
- Door sensor
- Environmental sensors
- Shelf occupancy sensors

## 🔴 UNCONFIRMED / ASSUMED

The SIH problem statement does not require an ESP32.

ESP32 integration is a proposed hardware enhancement.

---

# 47. Sensor Fusion

### 🔵 Proposed Innovation

Combine:

```text
Camera
+
ESP32 Sensors
+
POS Data
```

Example:

```text
Camera:
Shelf appears empty

ESP32:
Weight indicates product present

Result:
Possible misplaced product / visual obstruction
```

Another example:

```text
Camera:
High customer traffic

Queue:
Growing

POS:
Low checkout throughput

Result:
Recommend additional billing counter
```

## 🔴 UNCONFIRMED / ASSUMED

Sensor fusion is not explicitly required by the SIH problem statement.

It is proposed as a differentiating feature.

---

# 48. POS Integration

### 🟢 Requirement

The solution should support integration with POS systems.

### 🔵 Prototype

Create a configurable integration interface.

Example:

```text
POS
 ↓
API
 ↓
Django
 ↓
Analytics Engine
```

Possible data:

- Transactions
- Items sold
- Transaction time
- Billing duration

## 🔴 UNCONFIRMED / ASSUMED

Actual POS integration depends on availability of a real POS system/API.

For the prototype, simulated POS data may be used.

---

# 49. Inventory / ERP Integration

### 🟢 Requirement

The solution should support inventory management and ERP integration.

### 🔵 Proposed Architecture

```text
Inventory System
       ↓
REST API / Connector
       ↓
Django
       ↓
Retail Intelligence
```

## 🔴 UNCONFIRMED / ASSUMED

Actual ERP/API integration is not guaranteed during the prototype phase.

---

# 50. Offline Operation

### 🟢 Requirement

The system should work without continuous internet connectivity.

### 🔵 Proposed Architecture

```text
CAMERA
  ↓
EDGE AI
  ↓
LOCAL DATABASE
  ↓
LOCAL DASHBOARD
```

Internet:

```text
OPTIONAL
```

If internet becomes available:

```text
Local Data
    ↓
Sync
    ↓
Central Server
```

## 🔴 UNCONFIRMED / ASSUMED

The exact synchronization mechanism is not specified by the problem statement.

---

# 51. Multi-Store Scalability

### 🟢 Requirement

Support:

- Small stores
- Supermarkets
- Large-format stores
- Retail chains
- Multiple locations

### 🔵 Proposed Architecture

```text
              CENTRAL SERVER
                    │
       ┌────────────┼────────────┐
       │            │            │
     STORE 1      STORE 2      STORE 3
       │            │            │
    EDGE AI      EDGE AI      EDGE AI
```

Each store can operate independently.

---

# 52. Device Management

### 🔵 Proposed

Dashboard should display:

- Camera online/offline
- Edge computer status
- ESP32 status
- Last heartbeat
- Processing status
- Model status

## 🔴 UNCONFIRMED / ASSUMED

Device-management UI is not explicitly required but is recommended for a deployable system.

---

# 53. Hardware Prototype

Minimum prototype:

```text
1 × Edge Computer
1 × USB Camera
1 × ESP32
Optional Sensors
Local Network
```

## 🔴 UNCONFIRMED / ASSUMED

Exact hardware components have not been finalized.

---

# 54. Recommended Development Phases

## Phase 1 — Software Foundation

Build:

- Django backend
- React dashboard
- Database
- REST APIs
- WebSocket
- Store/zone configuration

No physical camera required initially.

---

# 55. Phase 2 — Laptop Camera

Use laptop webcam.

Implement:

```text
Webcam
 ↓
OpenCV
 ↓
YOLO
 ↓
Person Detection
 ↓
ByteTrack
 ↓
Counting
```

---

# 56. Phase 3 — Shopper Analytics

Implement:

- Entry
- Exit
- Footfall
- Zone detection
- Dwell time
- Heatmap
- Movement tracking

---

# 57. Phase 4 — Queue Intelligence

Implement:

- Checkout ROI
- Queue counting
- Waiting time
- Service time
- Queue growth
- Congestion prediction

---

# 58. Phase 5 — Inventory

Add:

- Shelf camera
- Product dataset
- Product detector
- Shelf occupancy
- Low-stock detection
- Out-of-stock detection
- Planogram checking

---

# 59. Phase 6 — ESP32

Add:

```text
ESP32
 ↓
Sensor
 ↓
Wi-Fi
 ↓
Django
```

Integrate sensor data with camera analytics.

---

# 60. Phase 7 — Edge Hardware

Move inference from development PC to selected Edge AI hardware.

Target:

```text
Camera
 ↓
Edge AI Hardware
 ↓
Local inference
 ↓
Events
 ↓
Django
```

---

# 61. Phase 8 — Offline Mode

Test:

- Internet disconnected
- AI continues
- Dashboard continues
- Local data continues
- Internet reconnects
- Data synchronization occurs

---

# 62. Phase 9 — Final Prototype

Final demonstration should include:

```text
PHYSICAL STORE MODEL
        ↓
CAMERAS
        ↓
EDGE AI HARDWARE
        ↓
ESP32 SENSORS
        ↓
LOCAL AI
        ↓
DJANGO
        ↓
REACT DASHBOARD
```

---

# 63. Privacy Requirements

The system must prioritize:

- Anonymous tracking
- No face recognition requirement
- No customer identity
- Local video processing
- Minimal data retention
- Event-based analytics
- Secure device communication

---

# 64. Security

### 🔵 Proposed

Implement:

- Device authentication
- API authentication
- HTTPS where applicable
- Secure WebSocket
- Input validation
- Role-based dashboard access
- Secure API keys
- Device registration

## 🔴 UNCONFIRMED / ASSUMED

Exact security standards are not specified in the problem statement.

---

# 65. Performance Goals

### 🔵 Proposed Targets

These are engineering targets, NOT SIH requirements.

Target:

- Real-time detection
- Low-latency event generation
- Stable multi-person tracking
- Local processing
- Graceful operation during network loss

## 🔴 UNCONFIRMED / ASSUMED

Exact FPS, latency, model accuracy, hardware utilization, and maximum camera count have not yet been established.

They must be benchmarked on the selected hardware.

---

# 66. AI Model Strategy

The system should use **multiple lightweight models/components rather than forcing one model to perform every task**.

```text
             CAMERA
                │
                ▼
         Person Detector
                │
                ▼
            Tracker
                │
       ┌────────┼────────┐
       ▼        ▼        ▼
   Footfall   Dwell    Heatmap
       │        │        │
       └────────┼────────┘
                │
          Queue Engine
                │
                ▼
          Event Engine


Shelf Camera
     │
     ▼
Product Detector
     │
     ▼
Shelf Analyzer
     │
     ▼
Inventory Events
```

---

# 67. Classical Computer Vision

Not every feature needs deep learning.

Use classical CV/geometry where appropriate.

Examples:

- Line crossing
- Zone detection
- Heatmap generation
- ROI processing
- Shelf slot comparison
- Movement vectors
- Background/image difference
- Perspective transformation

This reduces computational requirements.

---

# 68. AI Model Optimization

### 🔵 Proposed

Models should eventually be optimized for edge deployment.

Potential approaches:

- ONNX
- TensorRT
- Quantization
- Model pruning
- Hardware-specific runtimes

## 🔴 UNCONFIRMED / ASSUMED

The final optimization framework depends on the selected Edge AI hardware.

---

# 69. Failure Handling

If camera fails:

```text
CAMERA OFFLINE
```

If ESP32 fails:

```text
SENSOR OFFLINE
```

If internet fails:

```text
OFFLINE MODE
```

AI should continue locally whenever possible.

---

# 70. System States

```text
ONLINE
DEGRADED
OFFLINE
CAMERA ERROR
SENSOR ERROR
AI ERROR
SYNCING
```

---

# 71. Database Entities

### 🔵 Proposed

Potential models:

```text
Store
Zone
Device
Camera
Sensor
Event
PersonTrack
FootfallRecord
DwellRecord
Shelf
Product
InventoryStatus
Queue
QueueRecord
Alert
AnalyticsRecord
```

## 🔴 UNCONFIRMED / ASSUMED

Exact database schema is an implementation decision.

---

# 72. Example Event Schema

```json
{
  "device_id": "CAM-001",
  "event_type": "queue_update",
  "zone_id": "CHECKOUT-01",
  "value": 7,
  "timestamp": "2026-08-31T20:30:00"
}
```

---

# 73. Example Inventory Event

```json
{
  "device_id": "SHELF-CAM-01",
  "event_type": "low_stock",
  "shelf_id": "A12",
  "product_id": "PRODUCT-001",
  "confidence": 0.91
}
```

---

# 74. Example Shopper Event

```json
{
  "device_id": "CAM-ENTRANCE",
  "event_type": "person_entered",
  "zone_id": "ENTRANCE",
  "anonymous_track_id": "track_42",
  "timestamp": "2026-08-31T20:35:00"
}
```

---

# 75. Example Queue Prediction

```json
{
  "queue_id": "COUNTER-03",
  "current_length": 9,
  "growth_rate": 1.8,
  "risk": "HIGH",
  "recommendation": "OPEN_ADDITIONAL_COUNTER"
}
```

---

# 76. Innovation Direction

The project should not be presented as simply:

> "YOLO-based retail surveillance."

Instead, the product should be positioned as:

> **A privacy-preserving Edge AI Retail Intelligence System that fuses computer vision and IoT signals to convert real-time store activity into actionable operational decisions without depending on continuous cloud connectivity.**

---

# 77. Differentiation

Potential differentiators:

1. Edge-first AI
2. Offline operation
3. Privacy-preserving analytics
4. Multi-camera intelligence
5. Sensor fusion
6. Real-time queue prediction
7. Real-time inventory intelligence
8. Actionable recommendations
9. Modular AI pipeline
10. Scalable multi-store architecture

## 🔴 UNCONFIRMED / ASSUMED

These differentiators are proposed positioning and should not be claimed as unique in the market without competitive research.

---

# 78. Minimum Viable Product

The MVP should contain:

### Hardware

- One Edge-capable computer
- One camera
- One ESP32
- At least one optional sensor

### AI

- Person detection
- Person tracking
- Entry/exit
- Footfall
- Dwell time
- Heatmap
- Queue detection
- Basic shelf detection

### Software

- Django backend
- React dashboard
- Real-time events
- Alerts
- Analytics
- Basic offline capability

---

# 79. Advanced Version

After MVP:

- Custom product detection
- Planogram compliance
- Multiple cameras
- Queue prediction
- Sensor fusion
- POS integration
- ERP integration
- Multi-store monitoring
- Edge model optimization
- Local-to-cloud synchronization

---

# 80. Out of Scope for Initial Prototype

The following should NOT block the first working prototype:

- Full commercial POS integration
- Full ERP integration
- Large-scale multi-store deployment
- Perfect product recognition
- Perfect queue prediction
- Facial recognition
- Customer identification
- Cloud-dependent architecture
- Mobile application

## 🔴 UNCONFIRMED / ASSUMED

These are development priorities recommended by the team, not official exclusions in the SIH problem statement.

---

# 81. Important Development Principle

The system must be **dynamic**.

Avoid hard-coded:

```text
Camera = fixed
Store = fixed
Zone = fixed
Product = fixed
Threshold = fixed
```

Instead provide configuration.

Example:

```text
Store
 ├── Cameras
 ├── Zones
 ├── Shelves
 ├── Products
 ├── Counters
 └── Sensors
```

The administrator should be able to configure these.

---

# 82. Final Target Architecture

```text
                         RETAIL STORE
                              │
             ┌────────────────┼────────────────┐
             │                │                │
          Camera           Shelf Camera      ESP32
             │                │                │
             ▼                ▼                ▼
       ┌──────────────────────────────────────────┐
       │             EDGE AI COMPUTER             │
       │                                          │
       │ YOLO                                     │
       │ ByteTrack                                │
       │ OpenCV                                   │
       │ Product Detection                        │
       │ Queue Analytics                          │
       │ Shelf Analytics                          │
       │ Local Event Engine                       │
       └───────────────────┬──────────────────────┘
                           │
                    Anonymous Events
                           │
                           ▼
                ┌──────────────────────┐
                │    DJANGO BACKEND    │
                │                      │
                │ REST API             │
                │ WebSocket             │
                │ Database              │
                │ Alerts                │
                │ Analytics             │
                │ Device Management    │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │    REACT DASHBOARD   │
                │                      │
                │ Command Center       │
                │ Shopper Analytics    │
                │ Inventory            │
                │ Queue Intelligence   │
                │ Heatmaps              │
                │ Alerts               │
                │ Reports              │
                └──────────────────────┘
```

---

# 83. Success Criteria

The prototype will be considered successful if it can demonstrate:

### Shopper

- Detect people
- Count people
- Detect entry/exit
- Track movement anonymously
- Calculate dwell time
- Generate heatmap

### Inventory

- Detect shelf/product presence
- Identify low stock
- Identify out-of-stock
- Generate replenishment alert

### Queue

- Detect queue
- Count queue length
- Estimate waiting time
- Detect congestion
- Generate recommendation

### Edge

- Perform AI inference locally
- Continue basic operation without internet

### Privacy

- No required facial identification
- No required customer identity
- Local processing of sensitive video

### Dashboard

- Show live analytics
- Show alerts
- Show historical data
- Show store status

---

# 84. 🔴 UNCONFIRMED ITEMS MASTER LIST

The following items are **NOT confirmed by the SIH problem statement** and must be treated as design decisions:

1. Exact product name
2. Exact camera model
3. Number of cameras
4. Edge computer model
5. ESP32 requirement
6. Exact sensors
7. YOLO as the final detector
8. ByteTrack as the final tracker
9. Depth Anything V2
10. Exact product dataset
11. Exact product categories
12. Exact store layout
13. Exact number of zones
14. Exact queue thresholds
15. Exact prediction algorithm
16. Exact database schema
17. Exact API endpoints
18. Exact React UI
19. Three.js/3D visualization
20. POS implementation
21. ERP implementation
22. Cloud synchronization
23. Multi-store implementation depth
24. Exact FPS target
25. Exact latency target
26. Exact model accuracy target
27. Exact privacy retention period
28. Exact hardware cost
29. Exact deployment architecture
30. Exact security standards

These should only be finalized after hardware testing, dataset availability, performance benchmarking, and SIH/Qualcomm-specific requirements are confirmed.

---

# 85. Official Requirement Summary

According to the supplied SIH Problem Statement 26179, the solution should address some or all of:

### Shopper Analytics

- Customer entry/exit detection
- Customer counting
- Footfall analysis
- Zone-level traffic
- Dwell time
- Movement heatmaps

### Inventory

- Low-stock detection
- Out-of-stock detection
- Shelf monitoring
- Planogram compliance
- Product placement
- Replenishment alerts
- Merchandise availability

### Queue

- Queue monitoring
- Queue length
- Congestion prediction
- Additional-counter recommendation
- Waiting time
- Service time

### Edge AI

- Local AI inference
- Low latency
- Offline operation
- Reduced bandwidth
- Reduced cloud dependency

### Privacy

- Anonymous people analytics
- Avoid PII
- Local processing

### Dashboard

- Real-time alerts
- Daily reports
- Weekly reports
- KPIs
- Inventory analytics
- Footfall analytics
- Staff efficiency
- Operational insights

### Scalability

- Small stores
- Supermarkets
- Large-format stores
- Retail chains
- POS integration
- Inventory integration
- ERP integration
- Centralized multi-store monitoring

---

# 86. Product Principle

> **Detect locally. Understand locally. Alert locally. Store minimally. Sync only what is necessary.**

The system should transform:

```text
VIDEO + SENSOR DATA
        ↓
EDGE AI
        ↓
ANONYMOUS EVENTS
        ↓
BUSINESS INTELLIGENCE
        ↓
ACTION
```

rather than simply storing or streaming surveillance footage.

---

# 87. Final Product Definition

The final product is a:

> **Hardware-backed, privacy-aware, Edge AI retail intelligence platform that combines computer vision, optional IoT sensors, local AI inference, event processing, and a real-time web dashboard to help retailers understand shopper behavior, monitor inventory, manage queues, and make faster operational decisions even with limited internet connectivity.**

**Important:** All 🔴 sections in this document are assumptions or proposed implementation decisions. They must not be presented to judges as requirements explicitly mandated by SIH unless independently verified.



# Product Differentiation & Innovation

## 1. Core Differentiation

The proposed platform should **not** be positioned as a conventional CCTV analytics system.

Existing retail analytics solutions commonly follow:

```text
Camera
   ↓
Cloud / AI Server
   ↓
Detection
   ↓
Dashboard
```

Our proposed architecture follows:

```text
Mobile Camera + IoT Sensors
             ↓
        Local Edge AI
             ↓
       Multi-Model Analysis
             ↓
        Sensor Fusion
             ↓
     Contextual Reasoning
             ↓
   Operational Recommendation
             ↓
       Retail Dashboard
```

The key difference is that the system is designed as an **Edge Intelligence and Decision System**, rather than simply a camera monitoring application.

---

# 2. Mobile Phone as Camera

## Prototype Approach

A normal smartphone will be used as the camera during development and demonstration.

```text
SMARTPHONE
    │
    │ Wi-Fi / Local Network
    ▼
LAPTOP / EDGE COMPUTER
    │
    ▼
AI PROCESSING
```

The smartphone should provide a live video stream over the local network.

The AI processing system should consume the stream and perform:

* Person detection
* Person tracking
* Shopper movement analysis
* Dwell-time analysis
* Queue detection
* Shelf/product detection

### Important Architecture Principle

The mobile phone is only the **camera source**.

It should NOT be responsible for:

* YOLO inference
* Heavy computer vision
* Database processing
* Business analytics
* Queue prediction

Those operations should run on the local laptop/edge computer.

---

# 3. Camera Abstraction

The application must not be hard-coded to a specific camera.

The video source should be configurable.

Possible sources:

```text
Mobile Phone Camera
       │
       ├── Wi-Fi Stream
       │
       ▼
    AI Engine


Future USB Camera
       │
       ▼
    AI Engine


Future IP Camera
       │
       ▼
    AI Engine
```

The same AI pipeline should work regardless of the camera source whenever the stream format is supported.

## 🔴 UNCONFIRMED / ASSUMED

The exact mobile streaming application, streaming protocol, resolution, FPS, and network configuration have not yet been finalized.

---

# 4. Multi-Model AI Architecture

Instead of using one large AI model for the complete system, the platform should use **multiple lightweight AI models and computer-vision algorithms**, each optimized for a particular task.

```text
                  VIDEO STREAM
                       │
                       ▼
                 Frame Processor
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
     Person AI     Product AI    Queue AI
          │            │            │
          ▼            ▼            ▼
      Tracking      Shelf AI     Queue Logic
          │            │            │
          └────────────┼────────────┘
                       ▼
                Intelligence Engine
                       │
                       ▼
                  Recommendations
```

This architecture makes the platform modular and allows models to be replaced or upgraded independently.

---

# 5. Sensor Fusion

One of the primary proposed differentiators is combining **computer vision with physical sensor data**.

The system can combine:

```text
Camera
   +
ESP32
   +
Optional Sensors
   +
POS Data
```

Example:

```text
Camera:
Shelf appears empty

ESP32:
Weight sensor detects 2.4 kg

        ↓

Sensor Fusion Engine

        ↓

Result:
"Possible visual stock conflict"
```

Instead of immediately generating a false:

```text
OUT OF STOCK
```

the system can determine that:

```text
Stock may still be physically present.
Possible causes:
- Product misplaced
- Product hidden behind another item
- Camera obstruction
- Incorrect shelf configuration
```

## 🔴 UNCONFIRMED / ASSUMED

ESP32 and physical shelf sensors are proposed enhancements. The SIH problem statement does not explicitly require ESP32 or weight sensors.

---

# 6. From Detection to Decision

Traditional computer-vision systems generally stop at detection.

Example:

```text
YOLO
 ↓
Queue = 8 people
 ↓
ALERT
```

Our system should continue beyond detection.

```text
Detection
    ↓
Context
    ↓
Multiple Signals
    ↓
Analysis
    ↓
Prediction
    ↓
Recommendation
```

Example:

```text
Footfall increasing
        +
Queue length increasing
        +
Checkout throughput decreasing
        +
Historical pattern indicates peak period

        ↓

AI Decision Engine

        ↓

HIGH QUEUE RISK

        ↓

Recommendation:
"Open an additional billing counter"
```

The goal is to provide **actionable intelligence**, not just computer-vision output.

---

# 7. Context-Aware Inventory Intelligence

The inventory system should not only ask:

> "Is the shelf empty?"

It should attempt to understand:

> "Why does the shelf appear empty?"

Potential signals:

```text
Product Detection
      +
Shelf Position
      +
Historical Stock
      +
ESP32 Sensor
      +
POS Data
```

Possible outcomes:

```text
LOW STOCK
OUT OF STOCK
PRODUCT MISPLACED
VISUAL OBSTRUCTION
STOCK CONFLICT
REPLENISHMENT REQUIRED
```

This provides more useful information to store staff.

---

# 8. Predictive Queue Management

A conventional queue system reports:

```text
Current Queue = 7
```

The proposed system should additionally estimate:

```text
Current Queue
+
Queue Growth Rate
+
Waiting Time
+
Historical Traffic
+
Time of Day
+
Checkout Activity
```

Then produce:

```text
QUEUE STATUS
    ↓
NORMAL
WARNING
HIGH RISK
CRITICAL
```

Example:

```text
Current Queue: 6

Growth Rate: +2 people/min

Predicted Queue:
10+ people in approximately 3 minutes

Recommendation:
OPEN ADDITIONAL COUNTER
```

## 🔴 UNCONFIRMED / ASSUMED

The exact prediction model and prediction time horizon are engineering decisions and must be validated using collected data.

---

# 9. Privacy by Architecture

Privacy should not be an afterthought.

The architecture should minimize the amount of sensitive data leaving the store.

```text
CAMERA
  │
  ▼
LOCAL EDGE AI
  │
  ├── Raw Video → Preferably remains local
  │
  └── Anonymous Events
             │
             ▼
          Backend
```

The backend should primarily receive:

```text
Person count
Zone
Dwell time
Movement statistics
Queue length
Shelf status
Alerts
Analytics
```

rather than continuously receiving raw video.

The system should not require:

* Face recognition
* Customer names
* Phone numbers
* Personal identities
* Customer profiles

---

# 10. Offline-First Operation

A major proposed differentiator is the ability to continue operating when internet connectivity is unavailable.

```text
             INTERNET
                │
        ┌───────┴────────┐
        │                │
    AVAILABLE        UNAVAILABLE
        │                │
        ▼                ▼
    Sync Data       LOCAL MODE
                         │
                         ▼
                    Edge AI
                         │
                         ▼
                  Local Database
                         │
                         ▼
                    Dashboard
```

When connectivity returns:

```text
Local Events
     ↓
Synchronization
     ↓
Central Server
```

## 🔴 UNCONFIRMED / ASSUMED

The exact cloud synchronization mechanism is not specified by the problem statement.

---

# 11. Low-Cost Deployment Strategy

The platform should be designed so that a retailer does not necessarily need to purchase an expensive camera infrastructure for the prototype.

Initial prototype:

```text
Existing Smartphone
       +
Laptop / Edge Computer
       +
ESP32
       +
Low-cost Sensors
```

Future deployment:

```text
IP Cameras
      +
Dedicated Edge AI Hardware
      +
ESP32 Sensor Nodes
      +
Local Network
```

The software architecture should remain largely the same.

---

# 12. Modular Edge AI

The AI system should be modular.

Example:

```text
                  EDGE AI ENGINE
                        │
       ┌────────────────┼────────────────┐
       │                │                │
   Shopper AI       Inventory AI      Queue AI
       │                │                │
       ▼                ▼                ▼
 Person Detection   Product Detection   Person Detection
 Tracking            Shelf Analysis      Queue Tracking
 Dwell               Stock Analysis      Wait Time
 Heatmap             Planogram           Prediction
```

Each module can be independently upgraded.

For example:

```text
YOLO Model V1
      ↓
Replace with
      ↓
Optimized YOLO Model V2
```

without redesigning the entire application.

---

# 13. Classical Computer Vision + AI

The platform should not unnecessarily use deep learning for every task.

Deep learning can be used where it provides significant value.

Classical computer vision and geometry can be used for:

* Line crossing
* Zone detection
* Heatmap generation
* ROI analysis
* Shelf slot analysis
* Movement calculation
* Perspective correction
* Frame preprocessing

This reduces computational requirements and improves edge deployment feasibility.

---

# 14. Store-Specific Intelligence

The system should become configurable for each store rather than assuming one fixed layout.

Example:

```text
STORE
 ├── Entrance
 ├── Zones
 │    ├── Grocery
 │    ├── Electronics
 │    └── Household
 │
 ├── Shelves
 │    ├── A01
 │    ├── A02
 │    └── A03
 │
 ├── Checkout Counters
 │    ├── Counter 1
 │    ├── Counter 2
 │    └── Counter 3
 │
 └── Cameras
      ├── Entrance Camera
      ├── Floor Camera
      └── Shelf Camera
```

The administrator should be able to configure:

* Zones
* Cameras
* Shelves
* Products
* Checkout counters
* Alert thresholds

This avoids hard-coded store logic.

---

# 15. Event-Based Intelligence

Instead of continuously sending everything to the backend, the Edge AI system should convert observations into meaningful events.

Example:

```json
{
  "event_type": "LOW_STOCK",
  "store": "STORE_01",
  "shelf": "A12",
  "product": "PRODUCT_03",
  "confidence": 0.91
}
```

Another example:

```json
{
  "event_type": "QUEUE_CONGESTION",
  "counter": "COUNTER_03",
  "queue_length": 10,
  "risk": "HIGH"
}
```

This reduces:

* Network traffic
* Backend processing
* Storage requirements

and supports offline operation.

---

# 16. Action-Oriented Dashboard

The dashboard should not overwhelm the store manager with raw AI information.

Instead of showing:

```text
Person #32
X = 412
Y = 281
Confidence = 0.91
```

the dashboard should show:

```text
🟠 HIGH TRAFFIC

Electronics zone has unusually high
shopper activity.

Average dwell time:
2m 14s
```

Instead of:

```text
Queue Detection:
person_count = 11
```

show:

```text
🔴 QUEUE CONGESTION

Counter 3

11 customers waiting

Recommendation:
Open Counter 4
```

The system should translate technical AI output into **simple operational decisions**.

---

# 17. Proposed Unique Product Architecture

The final product should be positioned as:

```text
                 ┌──────────────────┐
                 │ MOBILE / IP CAMS  │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │   EDGE AI HUB    │
                 │                  │
                 │ Person AI        │
                 │ Product AI       │
                 │ Queue AI         │
                 │ OpenCV            │
                 │ Tracking          │
                 └────────┬─────────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
            ▼             ▼             ▼
         CAMERA         ESP32         POS
         EVENTS        SENSORS       DATA
            │             │             │
            └─────────────┼─────────────┘
                          ▼
                 ┌──────────────────┐
                 │ SENSOR FUSION +  │
                 │ DECISION ENGINE  │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ ACTIONABLE       │
                 │ RETAIL INSIGHTS  │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ REACT DASHBOARD  │
                 └──────────────────┘
```

---

# 18. What Makes the Product Different

### 1. Edge-First

AI inference happens locally instead of depending on continuous cloud processing.

### 2. Multi-Model

Different lightweight AI/CV components specialize in different retail tasks.

### 3. Sensor Fusion

Camera observations can be combined with physical sensor data to reduce false alerts.

### 4. Decision-Oriented

The system converts detections into recommendations instead of merely displaying AI results.

### 5. Predictive

The system attempts to identify future queue congestion instead of only reporting current queue length.

### 6. Privacy-Aware

The architecture prioritizes anonymous analytics and minimizes movement of raw video.

### 7. Offline Capable

Core analytics should continue even when internet connectivity is unavailable.

### 8. Low-Cost Prototype

A smartphone can act as the camera during development, reducing initial hardware requirements.

### 9. Modular

Cameras, models, sensors and analytics modules can be replaced independently.

### 10. Store Configurable

The same platform can be adapted to different store layouts, shelves and checkout configurations.

---

# 19. Competitive Positioning

The project should NOT claim:

> "No existing system does this."

There are already commercial retail analytics systems providing combinations of:

* Shopper analytics
* Shelf monitoring
* Queue analytics
* Edge AI
* Heatmaps
* Dwell time
* Inventory intelligence

Therefore, the project should instead emphasize its proposed combination of:

```text
LOW-COST HARDWARE
        +
EDGE AI
        +
MULTI-MODAL SENSOR FUSION
        +
PREDICTIVE ANALYTICS
        +
ACTIONABLE DECISIONS
        +
PRIVACY
        +
OFFLINE OPERATION
```

## 🔴 IMPORTANT — CLAIM VERIFICATION REQUIRED

The team must perform a proper competitor/market analysis before claiming that any individual feature or the complete architecture is "unique", "first", or "not available in existing products."

---

# 20. Final Innovation Statement

> **The proposed system is a privacy-aware Edge AI retail intelligence platform that does more than detect shoppers, shelves, and queues. It combines multiple lightweight computer-vision models with optional IoT sensor data, processes intelligence locally, detects operational problems, predicts emerging issues, and converts them into actionable recommendations for store staff—all while minimizing cloud dependency and preserving customer anonymity.**

---

# 21. Prototype Innovation Demonstration

The final SIH demonstration should preferably show a complete physical-to-digital loop:

```text
PERSON WALKS INTO STORE
        ↓
MOBILE CAMERA
        ↓
EDGE AI
        ↓
PERSON DETECTED
        ↓
TRACK CREATED
        ↓
FOOTFALL UPDATED
        ↓
ZONE UPDATED
        ↓
DWELL TIME CALCULATED
        ↓
DASHBOARD UPDATED
```

Then:

```text
CUSTOMERS MOVE TO CHECKOUT
        ↓
QUEUE DETECTED
        ↓
QUEUE GROWS
        ↓
PREDICTION ENGINE
        ↓
HIGH CONGESTION RISK
        ↓
RECOMMENDATION
        ↓
"OPEN ADDITIONAL COUNTER"
```

And:

```text
SHELF BECOMES LOW
        ↓
CAMERA DETECTS LOW STOCK
        +
ESP32 SENSOR PROVIDES PHYSICAL DATA
        ↓
SENSOR FUSION
        ↓
CONFIDENCE CHECK
        ↓
REPLENISHMENT ALERT
        ↓
STAFF ACTION
```

This physical demonstration will communicate the product much more effectively than a dashboard-only demonstration.

---

# 22. 🔴 Items That Must Not Yet Be Treated as Final

The following are currently proposed rather than confirmed:

* Smartphone camera streaming application
* Streaming protocol
* Exact camera resolution
* Exact FPS
* Exact Edge AI hardware
* Exact YOLO model/version
* Exact tracking algorithm
* Exact product detection model
* Exact queue prediction model
* ESP32 sensor selection
* Weight sensor implementation
* POS integration
* ERP integration
* Cloud synchronization
* Exact privacy retention policy
* Exact hardware cost
* Exact number of cameras
* Exact number of sensors
* Exact number of store zones
* Exact performance targets

These decisions should be finalized after prototype testing and hardware availability are confirmed.
