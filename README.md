# GreenLoop: Autonomous Smart Retail IoT Cart Platform

A state-of-the-art retail IoT and edge computing system designed for modern automated supermarkets. Features an **ESP32 microcontroller**, a **1.3-inch I2C OLED display (128×64)**, an **INMP441 I2S digital MEMS microphone**, an **AI-powered voice search & store aisle navigator**, a **mobile phone camera barcode scanner (`barcode_scanner_app`)**, a **Django AI backend**, and an **interactive store admin dashboard (`frontend`)**.

---

## 🌟 System Architecture & Concept

In this updated hardware configuration, the smart cart utilizes a standard **ESP32 (DevKit V1)**:
- **No cart camera is needed**: The shopper's **mobile phone camera** acts as the high-resolution handheld scanner (`barcode_scanner_app`), eliminating bulky wiring and lens obstruction on the cart.
- **Cart-to-Phone Pairing**: When powered on, the cart's 1.3" OLED displays a **Cart Pairing QR Code (`CART:CART-01`)**. The shopper scans this with their phone app to link the cart.
- **Voice AI & In-Store Navigation**: An onboard **INMP441 I2S digital microphone** captures the customer's voice queries (e.g., *"Where is Amul Milk?"* or *"Search Biscuits"*). The backend transcribes the audio, searches in-stock inventory, displays matching items in rows on the OLED screen, and provides exact aisle navigation directions (e.g., `>> Turn Right -> Dairy Chiller Shelf A`).
- **Two-Step Cashless UPI Checkout**: The shopper reviews the final total on the OLED/app and scans the dynamically rendered UPI QR code with **Google Pay, PhonePe, or Paytm**.

```
 +-------------------------------------------------------------------------+
 |                               SHOPPER FLOW                              |
 |                                                                         |
 |  [1. Cart OLED]           [2. Phone App]         [3. Product Scan]      |
 |   Shows Pairing QR ---->   Scans QR to Pair  -->  Phone Camera Scans    |
 |   "CART:CART-01"           to CART-01 Session     EAN-13 Barcodes       |
 |                                                         |               |
 |                                                         v               |
 |  [4. Voice Navigator]    [5. OLED Aisle Guide]   [Real-Time Backend]    |
 |   Cart INMP441 Mic  --->  Row List & Direction <-- Syncs Basket &       |
 |   "Where is Milk?"        ">> Turn Right -> Aisle 3"   LED Pin 16 Flash |
 |                                                         |               |
 |                                                         v               |
 |                                                  [6. UPI Cashless Pay]  |
 |                                                   Dynamic UPI QR on     |
 |                                                   OLED & Mobile Screen  |
 +-------------------------------------------------------------------------+
```

---

## 🛠️ Complete Hardware Wiring & Pinout (Standard ESP32 DevKit V1)

All pin assignments are selected to avoid strapping pins (GPIO 0, 2, 12, 15 boot traps) and UART pins (GPIO 1, 3):

| Component | Pin on Component | ESP32 Pin | Function / Description |
| :--- | :--- | :--- | :--- |
| **1.3" I2C OLED** | **VCC** | **3.3V / 5V** | Display Power (supports 3.3V or 5V) |
| *(SH1106 / SSD1306)* | **GND** | **GND** | Ground |
| *(128×64 Monochrome)*| **SDA** | **GPIO 21** | Hardware I2C Data |
| | **SCL** | **GPIO 22** | Hardware I2C Clock |
| **INMP441 Mic** | **VDD** | **3.3V** | Power (Strictly 3.3V) |
| *(I2S Digital MEMS)* | **GND** | **GND** | Ground |
| | **L/R** | **GND** | Left Channel Select (Tie to GND) |
| | **SCK (BCLK)** | **GPIO 14** | I2S Bit Clock |
| | **WS (LRCLK)** | **GPIO 15** | I2S Word Select / Frame Sync |
| | **SD (DOUT)** | **GPIO 32** | I2S Serial Audio Data Output |
| **Push Button 1** | Terminal 1 | **GPIO 18** | **Forward / Next Item** (Internal Pullup) |
| | Terminal 2 | **GND** | Ground |
| **Push Button 2** | Terminal 1 | **GPIO 19** | **Backward / Prev Item** (Hold: Voice Record) |
| | Terminal 2 | **GND** | Ground |
| **Push Button 3** | Terminal 1 | **GPIO 4** | **OK / Select / Checkout** (Hold: Checkout) |
| | Terminal 2 | **GND** | Ground |
| **Bought Indicator**| Anode (+) | **GPIO 16** | **Green LED** (via 220Ω resistor) |
| | Cathode (-) | **GND** | Ground |

> **Note on Bought LED**: Flashes when a product is added to the cart via barcode scan or voice selection, and illuminates solid upon payment confirmation.

---

## 🔄 End-to-End Operational Workflow

### 1. Cart Pairing (`MODE_PAIRING_QR`)
- On startup, the cart initializes Wi-Fi and connects to the store network.
- The 1.3" OLED displays the **Cart Pairing QR Code (`CART:CART-01`)**.
- The shopper opens `barcode_scanner_app` on their smartphone and scans the QR code.
- The app immediately pairs with `CART-01` via `POST /api/cart/pair/` and switches to the active shopping session.

### 2. Dual Scanner Engines via Mobile Camera (`barcode_scanner_app`)
The mobile application features **2 specialized scanner modes** with full **Single** & **Multi-Scan (Batch)** support:
- **🛒 Mode 1: Cart Scanner (Shopper Mode)**:
  - Designed for shoppers walking down aisles.
  - Automatically adds scanned barcodes or QR codes directly to the active cart session (`CART-01`).
  - Does **not** interrupt the shopper with catalog modals.
  - Displays instant animated Toast confirmations (`✅ Added Amul Gold Milk — ₹66.00`) and vibrates with haptics.
  - **Single Scan**: Scans 1 item, updates cart running total, and pauses with quick "Scan Next" and "View Cart" buttons.
  - **Multi-Scan (Continuous Batch)**: Keeps camera feed live and debounced (1.5s per barcode) so shoppers can rapidly scan multiple items one after another without touching the screen!
  - Synchronizes with the ESP32 OLED display and flashes the **Bought LED (GPIO 16)**.
- **📦 Mode 2: Catalog / SKU Scanner (Inventory Mode)**:
  - Designed for store staff and administrators to register new products or edit existing inventory records.
  - Scanning known barcodes opens the product editor modal.
  - Scanning unregistered barcodes immediately opens the **New Product Registration Modal** to input name, category, price, shelf location, and stock.
  - Supports both single capture and continuous intake.

### 3. Voice & Item Search with Shelf Direction Guidance
- **In-App Search Bar**: Real-time debounced live search as the customer types, explicit "Search" button, quick chips (Milk, Biscuits, Coke, Butter, etc.), and hybrid online + offline fallback engine that never fails even without network connectivity.
- **Cart Hardware Voice**: Shopper holds the **Mic Button (GPIO 19)** on the cart for 1 second.
- The OLED displays `LISTENING... SPEAK NOW`.
- The INMP441 I2S microphone records 3 seconds of 16kHz mono audio and POSTs the WAV data to `POST /api/cart/voice-search/`.
- The backend AI transcribes the audio using **Faster-Whisper / SpeechRecognition**.

### 4. Row Display & Aisle Direction Guide (`MODE_SEARCH_RESULTS` & `MODE_ITEM_DIRECTION`)
- The backend filters available products with `current_stock > 0` and formats rows for the 1.3" OLED:
  ```
  +-------------------------------+
  | IN-STOCK ITEMS (3)            |
  | > 1.Amul Gold Rs66            |
  |   2.Britannia Rs40            |
  |   3.Coca-Cola Rs40            |
  | [FWD/BACK: Nav | OK: DIR]     |
  +-------------------------------+
  ```
- The shopper presses **Forward (GPIO 18)** or **Backward (GPIO 19)** to navigate the cursor `>`.
- Pressing **OK (GPIO 4)** switches to **Item Direction Mode**:
  ```
  +-------------------------------+
  | ITEM NAVIGATION [AISLE]       |
  | Amul Taaza Milk Rs54          |
  | Dairy Chiller - Shelf A       |
  | >> Turn Right -> Dairy Chiller|
  +-------------------------------+
  ```
- Pressing OK again puts the item directly into the cart!

### 5. Two-Step Cashless UPI Checkout (`MODE_FINAL_PRICE` & `MODE_PAY_QR`)
- Shopper taps "Checkout" in the app or holds **OK/Pay (GPIO 4)** on the cart.
- **Step 1**: Final Price breakdown is displayed on the OLED (total, item count, membership tier discount applied).
- **Step 2**: Shopper presses OK; the ESP32 renders a **real 2D UPI QR code** (`upi://pay?pa=greenloop@upi&pn=GreenLoop&am=...`).
- The shopper scans the QR code with **Google Pay, PhonePe, or Paytm** to complete payment.
- The Bought LED flashes, the OLED displays `"PAID SUCCESSFUL! THANK YOU"`, and the session resets for the next shopper.

---

## 💻 Setup & Running Instructions

### 1. Backend (Django REST API & Database)
```bash
# Navigate to backend directory
cd backend

# Install dependencies (Python 3.10+)
pip install -r requirements.txt
pip install faster-whisper speechrecognition qrcode pillow

# Run migrations & populate retail database
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```
> The backend runs on port 8000 and is accessible to ESP32 and mobile phones on the same Wi-Fi network.

### 2. ESP32 Firmware (`esp32_cart.ino`)
1. Open **Arduino IDE**.
2. Install board support: **Tools -> Board -> Boards Manager -> ESP32 by Espressif**.
3. Install required libraries via Library Manager:
   - **U8g2** (by *olikraus*)
   - **ArduinoJson** (by *Benoit Blanchon*, v6 or v7)
4. Open `esp32_cart.ino` in the project root.
5. Update your Wi-Fi credentials and PC backend IP:
   ```cpp
   const char* ssid = "YOUR_WIFI_OR_HOTSPOT";
   const char* password = "YOUR_PASSWORD";
   const char* backendUrl = "http://192.168.137.1:8000"; // Your PC IP
   ```
6. Select Board: **ESP32 Dev Module** (or **DOIT ESP32 DEVKIT V1**).
7. Connect ESP32 via USB and click **Upload**.

### 3. Mobile Phone Barcode Scanner App (`barcode_scanner_app`)
```bash
cd barcode_scanner_app

# Install Expo dependencies
npm install

# Start the Expo development server
npx expo start
```
- Open **Expo Go** on your Android or iPhone and scan the Metro terminal QR code.
- In the app **Settings** tab, verify the backend URL (or click the IP preset like `192.168.137.1`).
- Scan the cart OLED pairing QR code or enter `CART-01` to begin scanning items!

### 4. Store Admin Dashboard (`frontend`)
```bash
cd frontend

# Install dependencies
npm install

# Run the Vite dev server
npm run dev
```
- Open `http://localhost:5173/` in your browser.
- Navigate to the **Smart Cart** tab to see:
  - **🎒 School Exhibition Presentation Banner** with live status.
  - **1-Click Interactive Presentation Action Bar** for instant demonstrations.
  - **Virtual 1.3" OLED Screen** with all 7 display modes (`Pair QR`, `Cart`, `Voice`, `Results`, `Direction`, `Price`, `Pay QR`).
  - **Interactive Store Floorplan & Aisle Radar** showing highlighted aisles in real time.
  - **Customer Membership Center** for Gold/Silver/Platinum member loyalty discounts.

---

## 🎒 School Students Presentation Walkthrough (Tomorrow's Demo)

When presenting to school students and educators, follow this high-impact 5-minute demonstration script:

### Step 1: Hook & Introduction (30 seconds)
> *"Hello everyone! Have you ever waited in a long queue at the supermarket on a busy weekend? Today, we are presenting GreenLoop — an autonomous IoT Smart Cart that eliminates queues completely using edge computing, digital voice AI, and smartphone computer vision!"*

### Step 2: Cart Pairing (1 minute)
- Point to the cart's **1.3" OLED display** showing the Cart Pairing QR code.
- Open the mobile app on your phone:
  > *"Instead of an expensive fixed camera on every cart, the shopper simply scans this OLED QR code with their mobile phone. Instantly, their phone pairs with Cart #01!"*
- Show the app header changing to `CART-01 [PAIRED]`.

### Step 3: Barcode Scanning & Physical Feedback (1 minute)
- Scan a packet of Milk or Biscuits with the phone camera.
- Point out:
  1. The item immediately appears in the phone basket.
  2. The **Bought LED (GPIO 16)** flashes on the ESP32.
  3. The **1.3" OLED** updates with the product name and running total.
  4. The **Store Admin Dashboard** updates across the room in real time.

### Step 4: Digital Voice Search & Aisle Navigation (1.5 minutes)
- Press and hold the **Mic Button (GPIO 19)** on the cart and ask:
  > *"Where is Amul Milk?"*
- Explain:
  > *"The INMP441 digital microphone captures audio directly through the I2S digital protocol. The backend AI transcribes the speech and searches available in-stock inventory."*
- Show the rows of results on the OLED display.
- Press **OK** on the cart:
  > *"Look at the OLED — it displays the exact aisle direction: '>> Turn Right -> Dairy Chiller Shelf A'. On our store admin map, Aisle 3 lights up with a glowing radar pin!"*

### Step 5: Instant Cashless Checkout (1 minute)
- Click **Proceed to Payment** on the phone or hold the Pay button on the cart.
- Show the final price breakdown, followed by the dynamic UPI QR code.
- Explain:
  > *"No cash counter, no barcode guns, no waiting in lines. You scan the UPI code with Google Pay or PhonePe, walk out of the store, and the cart resets for the next shopper!"*

> 💡 **Backup Presentation Tip**: If physical Wi-Fi or hardware is ever disconnected during your talk, use the **1-Click Presentation Quick Trigger Bar** at the top of the admin webpage to demonstrate all 5 steps interactively with 100% confidence!

---

## 📁 Repository Structure

```
RETAIL/
├── esp32_cart.ino            # Standard ESP32 DevKit V1 firmware (OLED, Mic, Buttons, LED)
├── esp32_cam_cart.ino        # Legacy ESP32-CAM firmware (retained for reference)
├── README.md                 # System documentation, wiring, and presentation guide
│
├── backend/                  # Django 5.x REST API & AI Recommender Backend
│   ├── db.sqlite3            # SQLite database with 34+ retail items & membership profiles
│   ├── retail_backend/       # Django project configuration & root URL routing
│   │   ├── settings.py
│   │   └── urls.py           # Routes /api/products/ and /api/cart/ endpoints
│   └── smart_cart/           # Core IoT smart cart application
│       ├── models.py         # Product, CartSession, CartItem, CustomerMembership, PastOrder
│       ├── views.py          # Pairing QR, Voice Search, Direction Guide, UPI Payment
│       ├── urls.py           # Cart endpoints
│       └── recommender.py    # Market Basket Co-occurrence & Membership Personalization
│
├── barcode_scanner_app/      # React Native Expo 57 Mobile Scanner App
│   ├── App.tsx               # Main mobile app router with QR scanner & bottom tabs
│   └── src/
│       ├── components/
│       │   ├── CartView.tsx          # Real-time cart basket, sync, quantity adjust & checkout
│       │   ├── VoiceSearchView.tsx   # Voice & item finder with Interactive Direction Card
│       │   ├── TopStatusBar.tsx      # Paired Cart ID badge & status indicator
│       │   └── SettingsView.tsx      # Django Backend IP selector & Cart Pairing modal
│       ├── services/
│       │   └── productDb.ts          # API connector with dynamic IP fallback & offline cache
│       ├── types/                    # CartSessionData, CartItemData, SearchResultItem
│       └── theme.ts                  # Design system tokens, radius helpers & typography
│
└── frontend/                 # Vite + React 19 + Tailwind CSS Admin Operations Dashboard
    └── src/
        └── components/
            └── views/
                └── SmartCartView.tsx # School Exhibition Showcase, 1-Click Demo Bar,
                                      # Virtual 1.3" OLED (7 Modes), Store Floorplan & Radar
```

---

## 🏆 Technologies Used

- **Embedded Systems**: ESP32 DevKit V1, I2C Protocol, I2S Digital Audio, SH1106 OLED (U8g2), ArduinoJson.
- **Mobile Development**: React Native, Expo 57, TypeScript, Expo Camera, Expo Haptics.
- **Backend & AI**: Python 3.12, Django REST, Faster-Whisper, SpeechRecognition, OpenCV, PIL, QRcode.
- **Frontend Dashboard**: React 19, Vite 6, Tailwind CSS, Motion/React, Lucide / Material Symbols.
- **Payment Integration**: NPCI UPI Protocol (`upi://pay`), Base64 Bitmap Matrix Generation.
