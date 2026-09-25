# AI-Powered Smart Cart with ESP32-CAM & 1.3" OLED Display

A retail edge intelligence platform featuring an **ESP32-CAM smart cart device** with a **1.3-inch OLED display**, an intelligent **Market Basket Recommendation Engine**, a **Customer Membership System** with admin portal, and a **Retail Operations Command Dashboard**.

---

## 🚀 Key Features

1. **ESP32-CAM Edge Cart Controller (`esp32_cam_cart.ino`)**:
   - Camera vision product scanning with the onboard OV2640 camera.
   - **Live Web Video Stream**: Built-in HTTP server on port 80 allowing you to open `http://<ESP32_IP>/` in any browser to see the live camera feed in real time!
   - High-contrast **1.3" I2C OLED display (128×64)** for live cart status, item additions, and real-time recommendation tickers.
   - Dual trigger: Hardware push-button on **GPIO 12** or web interface trigger to snap photos and send them to the Django AI vision backend.

2. **AI Vision Product Analysis (`smart_cart/vision.py`)**:
   - Backend receives captured images and analyzes which product the customer has taken.
   - Employs multi-layer detection: QR/Barcode lookup, YOLOv8 object detection, and color/feature spatial signature matching.
   - Automatically determines product (e.g. Milk, Bread, Eggs, Coffee, Pasta) with confidence scoring and feeds it into the recommendation engine.

3. **Market Basket Recommendation Engine (`smart_cart/recommender.py`)**:
   - **Normal / Guest Shoppers**: Recommendations are computed from aggregate purchase co-occurrences of all previous customers (e.g., buying **Milk** automatically recommends **Bread** and **Fresh Eggs**).
   - **Registered Members**: Analyzes the member's personal purchase history and combination habits, blending member preferences with store-wide trends.
   - **Zero-History Fallback**: If a registered member has no prior orders (brand new member), the engine automatically falls back to store-wide trends.
   - **Continuous Real-Time Learning**: Every completed checkout converts cart items into `PastOrder` records, updating the recommendation dataset instantly.

4. **Admin Membership Management (Frontend Bottom Tab)**:
   - Dedicated admin portal at the bottom of the Smart Cart tab.
   - Add new members with Member ID / RFID tag, Full Name, Contact info, and Tier.
   - Tier perks: **Bronze (0% off)**, **Silver (5% off)**, **Gold (10% off)**, **Platinum (15% off)**.
   - Member directory with instant **"Set Active in Cart"** switcher for live simulation.

5. **Interactive Command Dashboard**:
   - **Live Camera Viewfinder**: View the ESP32-CAM live stream directly in the browser dashboard.
   - **AI Vision Inspector**: Shows what the AI identified from the camera frame with confidence percentage and method.
   - Virtual 1.3" OLED preview rendering live 128×64 pixel text.
   - Photo upload input to test any product picture directly against the AI.

---

## 🛠️ Hardware Wiring & Pinout

### ESP32-CAM (AI-Thinker) to 1.3" I2C OLED Display (SH1106 / SSD1306)

Because the ESP32-CAM's OV2640 camera uses most GPIO pins, use the dedicated I2C pins below to avoid hardware bus conflicts:

| ESP32-CAM Pin | Device / Component | Function / Notes |
| :--- | :--- | :--- |
| **GPIO 13** | **1.3" OLED SDA** | I2C Data Line (Software I2C / U8g2) |
| **GPIO 14** | **1.3" OLED SCL** | I2C Clock Line (Software I2C / U8g2) |
| **3.3V** | OLED VCC / Mic VDD | 3.3V Power Line |
| **GND** | OLED GND / Mic GND | Common Ground |
| **GPIO 2** | **INMP441 SCK** | I2S Serial Clock (BCLK) |
| **GPIO 12** | **INMP441 WS** | I2S Word Select (LRCLK) |
| **GPIO 15** | **INMP441 SD** | I2S Serial Audio Data Out (DOUT) |
| **GPIO 1** | **Forward Button** | Scroll Next Recommendation / Cart Item |
| **GPIO 3** | **Backward Button** | Scroll Prev Item / Long Press: Voice Query |
| **GPIO 0** | **Pay / OK Button** | Short Click: AI Scan \| Long Hold: Final Price \| OK: QR Code |
| **GPIO 16** | **Bought LED** | **Lights up when item is bought / added to cart & paid!** |
| **GPIO 4** | Onboard Flash | Flash LED for low-light shelf tag capture |

---

### 💳 Two-Step UPI Payment QR Flow

1. **Step 1: Final Price Confirmation**
   - Shopper holds the Pay/OK button (or clicks pay in dashboard).
   - OLED screen displays:
     ```
     +-------------------------------+
     | CHECKOUT & PAY                |
     | FINAL: Rs. 148.00             |
     | 3 ITEMS (10% OFF)             |
     | >> PRESS OK FOR QR CODE <<    |
     +-------------------------------+
     ```
2. **Step 2: Scannable 2D QR Code Generation**
   - Shopper presses the **OK Button (`GPIO 0`)**.
   - ESP32 renders the **real 2D UPI QR Code** directly on the 1.3" OLED display (25×25 / 29×29 pixel matrix)!
   - Can be scanned with **Google Pay**, **PhonePe**, **Paytm**, or any UPI banking app.
3. **Step 3: Confirmation & LED Signal**
   - Once payment is confirmed, the shopper clicks OK:
     - **Pin 16 LED lights up** to celebrate the successful purchase.
     - OLED announces: `"PAID SUCCESSFUL! THANK YOU"`.
     - Cart clears automatically for the next shopper.

---

## 💻 Arduino IDE Setup & Flashing

1. **Install ESP32 Board Support**:
   - Open Arduino IDE -> File -> Preferences.
   - Add Additional Boards Manager URL: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Go to Tools -> Board -> Boards Manager -> Search `esp32` and install.

2. **Install Required Libraries**:
   - **U8g2** by *olikraus* (Tools -> Manage Libraries -> Search `U8g2`).
   - **ArduinoJson** by *Benoit Blanchon* (Version 6.x or 7.x).

3. **Configure the Sketch (`esp32_cam_cart.ino`)**:
   - Open `esp32_cam_cart.ino` located in the root repository.
   - Update your Wi-Fi credentials:
     ```cpp
     const char* WIFI_SSID     = "YOUR_WIFI_SSID";
     const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
     ```
   - Update the IP address of your host running the Django backend:
     ```cpp
     const char* SERVER_BASE_URL = "http://192.168.1.100:8000"; // Replace with your PC IP
     const char* CART_ID         = "CART-01";
     ```

4. **Board Settings**:
   - Board: **AI Thinker ESP32-CAM**
   - Upload Speed: `115200`
   - CPU Frequency: `240MHz (WiFi/BT)`
   - Flash Frequency: `80MHz`
   - Flash Mode: `QIO`
   - Partition Scheme: `Huge APP (3MB No OTA/1MB SPIFFS)`

5. **Flash**:
   - Connect FTDI programmer to ESP32-CAM (TX->RX, RX->TX, 5V->5V, GND->GND, IO0->GND).
   - Press Reset button, then click **Upload**.
   - After upload completes, disconnect IO0 from GND and press Reset to start.

---

## ⚙️ Backend Setup (Django `smart_cart`)

The backend runs on Python 3.11+ and Django 5.2.

1. **Install Dependencies**:
   ```powershell
   cd backend
   python -m pip install -r requirements.txt
   ```

2. **Run Migrations**:
   ```powershell
   python manage.py makemigrations smart_cart
   python manage.py migrate
   ```

3. **Seed Database with Realistic Products & Market Basket History**:
   ```powershell
   python manage.py seed_cart_data
   ```
   *This seeds 12 grocery products, 4 customer tiers, and 84 realistic historical purchases establishing the strong Milk $\to$ Bread + Eggs association.*

4. **Start the Development Server**:
   ```powershell
   python manage.py runserver 0.0.0.0:8000
   ```
   *(Binding to `0.0.0.0:8000` allows the ESP32-CAM on your local Wi-Fi to reach the API).*

5. **Run Verification Suite**:
   ```powershell
   python test_cart.py
   ```

---

## 🌐 Frontend Setup (React + Vite)

1. **Install Frontend Dependencies**:
   ```powershell
   cd frontend
   npm install
   ```

2. **Run the Frontend**:
   ```powershell
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

3. **Access Smart Cart**:
   - Click the **"Smart Cart"** tab in the left sidebar or the mobile bottom navigation bar.
   - Try the hardware scanner buttons:
     - Click **"🥛 Scan Milk"**: Observe recommendations updating to **Artisan Sliced Bread** and **Farm Fresh Eggs**!
     - Switch between **Guest Shopper** and **Alice Johnson (Gold Member)** to observe personalized vs. global store-wide recommendation modes.
   - Scroll to the bottom to access the **Admin Membership Center**:
     - Register new members with custom RFID/Card IDs.
     - View membership directory and past order counts.
     - Click **"Set Active in Cart"** to immediately test shopping under that member's account.

---

## 🧠 Recommendation Engine Deep Dive

The recommendation system (`backend/smart_cart/recommender.py`) implements a hybrid **Market Basket Analysis (Association Rules & Co-Occurrence Matrix)**:

### 1. Mathematical Scoring
For any set of items in the cart $C = \{p_1, p_2, \dots, p_k\}$ and a candidate item $p_{rec} \notin C$:
- **Global Co-occurrence Frequency**:
  $$Score_{global}(p_{rec}) = \frac{\sum_{o \in O_{C}} \mathbb{I}(p_{rec} \in o)}{|O_{C}|}$$
  Where $O_{C}$ is the set of all past orders containing any item in cart $C$.

### 2. Normal Shoppers (Guest / Non-Members)
- No user ID is linked to the cart session.
- The engine computes candidate scores purely from aggregate global purchase patterns across all shoppers.
- High-confidence combinations (e.g. Milk + Bread, Milk + Eggs) appear with `"Customer Favorite"` badges and match percentages.

### 3. Registered Members
- When member $M$ is active:
  - If member $M$ has past orders containing items from $C$:
    $$Score_{final}(p_{rec}) = 0.70 \times Score_{member}(p_{rec}) + 0.30 \times Score_{global}(p_{rec})$$
    The recommendation highlights personalized habits: *"Alice's go-to pairing with Whole Farm Milk"*.
  - If member $M$ has past orders, but no direct combination history with $C$:
    Blends the member's overall top favorite repurchases with the global co-occurrences.
  - **Zero-History Fallback**: If member $M$ is brand new (0 orders), the system seamlessly falls back 100% to normal people / global patterns: *"Store-wide favorite with Whole Farm Milk (Welcome {Name})"*.

### 4. Real-Time Feedback Loop
When the customer clicks **"Complete Checkout"**:
1. A new `PastOrder` is recorded.
2. `PastOrderItem` entries are linked for all cart products.
3. Loyalty points are automatically credited based on the member's tier.
4. Future recommendation queries immediately incorporate this completed transaction.

---

## 📡 REST API Reference

| Method | Endpoint | Description | Sample Parameters / Body |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/cart/session/` | Get current active cart state & recommendations | `?cart_id=CART-01` |
| `POST` | `/api/cart/session/` | Set active member, clear cart, or switch cart | `{"action": "set_member", "member_id": "MEM-101"}` |
| `POST` | `/api/cart/scan/` | Trigger product scan via camera image or SKU | `{"sku": "MILK-001"}` or multipart image file |
| `GET` | `/api/cart/items/` | List all items in current cart | `?cart_id=CART-01` |
| `POST` | `/api/cart/items/` | Add product to cart with quantity | `{"sku": "BREAD-001", "quantity": 1}` |
| `DELETE`| `/api/cart/items/` | Remove item from cart | `{"item_id": 12}` or empty to clear |
| `GET` | `/api/cart/recommendations/` | Get live basket recommendations | `?cart_id=CART-01` |
| `POST` | `/api/cart/checkout/` | Checkout cart, create PastOrder, earn points | `?cart_id=CART-01` |
| `GET` | `/api/cart/oled-status/` | Compact 4-line text buffer for 1.3" OLED | `?cart_id=CART-01` |
| `GET` | `/api/cart/members/` | Admin list & search members | `?search=Alice` |
| `POST` | `/api/cart/members/` | Admin register new member | `{"name": "...", "tier": "Gold", ...}` |
| `GET` | `/api/cart/products/` | List all products available in store | — |

---

## 📁 Repository Structure

```
RETAIL/
├── esp32_cam_cart.ino              # Arduino sketch for ESP32-CAM + 1.3" OLED
├── README.md                       # Comprehensive system documentation
├── backend/
│   ├── manage.py                   # Django management script
│   ├── test_cart.py                # Verification suite for recommendations & OLED
│   ├── smart_cart/                 # New Smart Cart Django Application
│   │   ├── models.py               # CustomerMembership, Product, CartSession, PastOrder
│   │   ├── recommender.py          # Market Basket Analysis Engine (Member vs Guest)
│   │   ├── views.py                # Cart, Scan, Checkout, OLED & Admin views
│   │   ├── urls.py                 # REST API endpoints (/api/cart/...)
│   │   └── management/commands/
│   │       └── seed_cart_data.py   # Seed script for products, members & past orders
│   ├── operations/                 # Store operations & telemetry app
│   └── retail_backend/             # Django root configuration (settings, urls)
└── frontend/
    ├── src/
    │   ├── types.ts                # TypeScript declarations including TabType & Cart
    │   ├── App.tsx                 # Main App component with Cart tab routing
    │   └── components/
    │       ├── layout/
    │       │   ├── SideNavBar.tsx  # Side navigation with Smart Cart tab
    │       │   ├── BottomTabBar.tsx# Mobile bottom navigation with Cart tab
    │       │   └── TopAppBar.tsx   # Top bar with Cart header title
    │       └── views/
    │           └── SmartCartView.tsx# Smart Cart UI, Virtual OLED & Admin Member tab
```
