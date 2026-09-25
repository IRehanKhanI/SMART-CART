/**
 * ============================================================================
 * AI-POWERED SMART CART - STANDARD ESP32 FIRMWARE
 * ============================================================================
 * Hardware Pin Mapping for Standard ESP32 (ESP32 DevKit V1 / 30-pin / 38-pin):
 *
 *   [1.3" I2C OLED Display (SH1106 / SSD1306 128x64)]
 *     - SDA: GPIO 21  (Standard Hardware I2C SDA)
 *     - SCL: GPIO 22  (Standard Hardware I2C SCL)
 *     - VCC: 3.3V
 *     - GND: GND
 *
 *   [INMP441 I2S Digital Microphone Module]
 *     - SCK: GPIO 14  (Serial Clock - BCLK)
 *     - WS:  GPIO 15  (Word Select - LRCLK)
 *     - SD:  GPIO 32  (Serial Data Out - DOUT)
 *     - L/R: GND      (Selects Left channel)
 *     - VDD: 3.3V
 *     - GND: GND
 *
 *   [Physical Push Buttons (Active LOW with internal pull-up)]
 *     - Forward Button:  GPIO 18 (Next Item / Move Down Rows)
 *     - Backward Button: GPIO 19 (Short: Prev Row / Long-press: MIC Voice Search)
 *     - OK / Pay Button: GPIO 4  (Short: Select / Direction | Long: Checkout)
 *
 *   [Bought Indicator LED]
 *     - Pin 16 (GPIO 16) or Onboard Pin 2: Lights up when item is added or paid!
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <U8g2lib.h>
#include <ArduinoJson.h>
#include "driver/i2s.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ==========================================
// 1. NETWORK & BACKEND CONFIGURATION
// ==========================================
const char* WIFI_SSID       = "RehanLP";
const char* WIFI_PASSWORD   = "12345678";

// Auto-detected server URL (Hotspot, Campus Wi-Fi, or Gateway)
String serverBaseUrl        = "http://192.168.137.1:8000";
#define SERVER_BASE_URL (serverBaseUrl.c_str())
const char* CART_ID         = "CART-01";

// ==========================================
// 2. PIN DEFINITIONS
// ==========================================
// 1.3" I2C OLED Display (Default ESP32 I2C Pins)
#define I2C_SDA_PIN        21
#define I2C_SCL_PIN        22

// INMP441 I2S Digital Microphone
#define I2S_SCK_PIN        14   // BCLK
#define I2S_WS_PIN         15   // LRCLK
#define I2S_SD_PIN         32   // DOUT
#define I2S_PORT           I2S_NUM_0

// 3 Physical Push Buttons
#define BTN_FORWARD_PIN    18   // Forward / Next Row
#define BTN_BACKWARD_PIN   19   // Backward / Prev Row / Long-press: Voice Search
#define BTN_OK_PIN          4   // OK / Select / Long-press: Pay Checkout

// Indicator LED
#define BOUGHT_LED_PIN     16   // Lights up on item scan & checkout confirmation

// 1.3" I2C OLED Display constructor (SH1106 128x64 Software I2C for universal compatibility)
U8G2_SH1106_128X64_NONAME_F_SW_I2C u8g2(U8G2_R0, I2C_SCL_PIN, I2C_SDA_PIN, U8X8_PIN_NONE);

// ==========================================
// 3. DISPLAY & CART STATE
// ==========================================
enum DisplayMode {
  MODE_PAIRING_QR,     // Shows Cart Pairing QR Code on startup for Mobile App
  MODE_CART,           // Normal Cart & recommendations
  MODE_VOICE_LISTENING,// Recording audio from mic
  MODE_SEARCH_RESULTS, // Shows available items in rows
  MODE_ITEM_DIRECTION, // Shows direction/location of selected item
  MODE_FINAL_PRICE,    // Shows final price before QR
  MODE_PAY_QR,         // Shows 2D UPI QR Code for payment
  MODE_MESSAGE         // Temporary status popup
};

// Maximum items in voice search results
#define MAX_SEARCH_ITEMS 5

struct SearchItem {
  String name;
  String sku;
  float price;
  int stock;
  String shelfLocation;
  String direction;
  String shortDirection;
  String arrow;
  String oledRow;
};

// Pre-baked offline 21x21 QR Code for "CART:CART-01"
const char DEFAULT_PAIRING_QR[21][22] = {
  "111111100100101111111",
  "100000101011001000001",
  "101110101111001011101",
  "101110101110101011101",
  "101110100100101011101",
  "100000100111001000001",
  "111111101010101111111",
  "000000001000000000000",
  "100000101111011001110",
  "100111010001101010000",
  "000101100010100101110",
  "110011000111100010001",
  "011100100011110110011",
  "000000001100100000001",
  "111111100011000001100",
  "100000100100001111000",
  "101110100111000011010",
  "101110100011111010100",
  "101110100101110001011",
  "100000100101111010101",
  "111111101010100010100"
};

struct CartDisplayState {
  String line1 = "CART-01 [READY]";
  String line2 = "READY TO SCAN";
  String line3 = "TOT: Rs.0.00 (0 ITEMS)";
  String line4 = "REC: MILK -> PARLE-G";
  float total = 0.0;
  int itemCount = 0;
  String shopperName = "GUEST";
  String ipStr = "";
  bool isPaired = false;

  // Recommendations list
  String recList[5];
  int recCount = 0;
  int activeRecIndex = 0;

  // Voice Search Results state
  String searchQuery = "";
  SearchItem searchResults[MAX_SEARCH_ITEMS];
  int searchCount = 0;
  int selectedSearchIndex = 0;

  // Payment & QR state
  float finalPayAmount = 0.0;
  float discountPercent = 0.0;
  int qrSize = 21;
  char qrMatrix[35][35];
  bool hasQrCode = false;
};

CartDisplayState displayState;
DisplayMode currentMode = MODE_PAIRING_QR;

unsigned long lastStatusPoll = 0;
const unsigned long POLL_INTERVAL_MS = 3000;

// Forward declarations
void recordAndSearchVoice();
void fetchCartOledStatus();
void fetchPairingQR();
void fetchPaymentQRAndShowPrice();
void checkoutAndPay();
void triggerBoughtLed();
void renderOLED();
void showMessage(const char* title, const char* msg);

// ==========================================
// 4. BOUGHT INDICATOR LED
// ==========================================
void triggerBoughtLed() {
  Serial.println("[LED]: ITEM EVENT! Pulsing Bought LED.");
  digitalWrite(BOUGHT_LED_PIN, HIGH);
  delay(1000);
  digitalWrite(BOUGHT_LED_PIN, LOW);
}

// ==========================================
// 5. I2S MICROPHONE SETUP (INMP441)
// ==========================================
#define MIC_SAMPLE_RATE     16000
#define MIC_RECORD_SECS     3
#define MIC_BUFFER_SAMPLES  (MIC_SAMPLE_RATE * MIC_RECORD_SECS)

bool initI2SMic() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = MIC_SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 4,
    .dma_buf_len = 512,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK_PIN,   // GPIO 14
    .ws_io_num = I2S_WS_PIN,     // GPIO 15
    .data_out_num = -1,
    .data_in_num = I2S_SD_PIN    // GPIO 32
  };

  esp_err_t err = i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  if (err != ESP_OK) return false;

  err = i2s_set_pin(I2S_PORT, &pin_config);
  return (err == ESP_OK);
}

// Standard 44-byte WAV header generator
void createWavHeader(byte* header, int totalDataLen) {
  int totalFileLen = totalDataLen + 36;
  int sampleRate = MIC_SAMPLE_RATE;
  int byteRate = sampleRate * 1 * 2; // mono 16-bit

  // RIFF Header
  header[0] = 'R'; header[1] = 'I'; header[2] = 'F'; header[3] = 'F';
  header[4] = (byte)(totalFileLen & 0xFF);
  header[5] = (byte)((totalFileLen >> 8) & 0xFF);
  header[6] = (byte)((totalFileLen >> 16) & 0xFF);
  header[7] = (byte)((totalFileLen >> 24) & 0xFF);
  header[8] = 'W'; header[9] = 'A'; header[10] = 'V'; header[11] = 'E';

  // "fmt " Chunk
  header[12] = 'f'; header[13] = 'm'; header[14] = 't'; header[15] = ' ';
  header[16] = 16; header[17] = 0; header[18] = 0; header[19] = 0;
  header[20] = 1; header[21] = 0;   // PCM format
  header[22] = 1; header[23] = 0;   // Mono channel
  header[24] = (byte)(sampleRate & 0xFF);
  header[25] = (byte)((sampleRate >> 8) & 0xFF);
  header[26] = (byte)((sampleRate >> 16) & 0xFF);
  header[27] = (byte)((sampleRate >> 24) & 0xFF);
  header[28] = (byte)(byteRate & 0xFF);
  header[29] = (byte)((byteRate >> 8) & 0xFF);
  header[30] = (byte)((byteRate >> 16) & 0xFF);
  header[31] = (byte)((byteRate >> 24) & 0xFF);
  header[32] = 2; header[33] = 0;   // Block align (1 channel * 2 bytes)
  header[34] = 16; header[35] = 0;  // 16 bits per sample

  // "data" Chunk
  header[36] = 'd'; header[37] = 'a'; header[38] = 't'; header[39] = 'a';
  header[40] = (byte)(totalDataLen & 0xFF);
  header[41] = (byte)((totalDataLen >> 8) & 0xFF);
  header[42] = (byte)((totalDataLen >> 16) & 0xFF);
  header[43] = (byte)((totalDataLen >> 24) & 0xFF);
}

// ==========================================
// 6. OLED RENDERING (ALL SCREEN MODES)
// ==========================================
void renderOLED() {
  u8g2.clearBuffer();

  // ----------------------------------------------------------
  // MODE 1: CART PAIRING QR CODE (SHOWN ON STARTUP & IDLE)
  // ----------------------------------------------------------
  if (currentMode == MODE_PAIRING_QR) {
    // Left column: Instructions & Cart ID
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawStr(2, 10, CART_ID);

    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(2, 22, "SCAN QR");
    u8g2.drawStr(2, 32, "TO PAIR");
    u8g2.drawStr(2, 42, "WITH APP");
    u8g2.drawStr(2, 54, "HOLD BACK:");
    u8g2.drawStr(2, 62, "MIC SEARCH");

    // Right column: Render 21x21 QR Code at 2x Scale (42x42 pixels)
    int scale = 2;
    int qrPixelWidth = 21 * scale;
    int startX = 128 - qrPixelWidth - 4;
    int startY = (64 - qrPixelWidth) / 2;

    for (int y = 0; y < 21; y++) {
      for (int x = 0; x < 21; x++) {
        char cell = displayState.hasQrCode ? displayState.qrMatrix[y][x] : DEFAULT_PAIRING_QR[y][x];
        if (cell == '1') {
          u8g2.drawBox(startX + x * scale, startY + y * scale, scale, scale);
        }
      }
    }

  // ----------------------------------------------------------
  // MODE 2: VOICE RECORDING / LISTENING
  // ----------------------------------------------------------
  } else if (currentMode == MODE_VOICE_LISTENING) {
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawBox(0, 0, 128, 12);
    u8g2.setDrawColor(0);
    u8g2.drawStr(2, 9, "VOICE ASSISTANT");
    u8g2.setDrawColor(1);

    u8g2.setFont(u8g2_font_7x14B_tf);
    u8g2.drawStr(4, 28, "LISTENING...");

    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawStr(4, 44, "Speak item name");

    u8g2.drawHLine(0, 48, 128);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(4, 60, "e.g. 'Milk', 'Parle-G', 'Coke'");

  // ----------------------------------------------------------
  // MODE 3: SEARCH RESULTS (ROWS WITH CURSOR)
  // ----------------------------------------------------------
  } else if (currentMode == MODE_SEARCH_RESULTS) {
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawBox(0, 0, 128, 12);
    u8g2.setDrawColor(0);
    String header = "FOUND: " + displayState.searchQuery.substring(0, 7) + " (" + String(displayState.searchCount) + ")";
    u8g2.drawStr(2, 9, header.c_str());
    u8g2.setDrawColor(1);

    // Display rows of items
    u8g2.setFont(u8g2_font_5x8_tf);
    int startIdx = 0;
    if (displayState.selectedSearchIndex >= 3) {
      startIdx = displayState.selectedSearchIndex - 2;
    }

    int yPos = 24;
    for (int i = startIdx; i < displayState.searchCount && i < startIdx + 3; i++) {
      bool isSelected = (i == displayState.selectedSearchIndex);
      if (isSelected) {
        u8g2.drawStr(2, yPos, ">");
        u8g2.setFont(u8g2_font_6x10_tf);
        u8g2.drawStr(10, yPos, displayState.searchResults[i].oledRow.c_str());
        u8g2.setFont(u8g2_font_5x8_tf);
      } else {
        u8g2.drawStr(10, yPos, displayState.searchResults[i].oledRow.c_str());
      }
      yPos += 13;
    }

    u8g2.drawHLine(0, 52, 128);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(2, 62, "FWD/BACK:MOVE | OK:VIEW LOC");

  // ----------------------------------------------------------
  // MODE 4: ITEM DIRECTION SCREEN
  // ----------------------------------------------------------
  } else if (currentMode == MODE_ITEM_DIRECTION) {
    const SearchItem& item = displayState.searchResults[displayState.selectedSearchIndex];

    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawBox(0, 0, 128, 12);
    u8g2.setDrawColor(0);
    u8g2.drawStr(2, 9, "ITEM DIRECTION");
    u8g2.setDrawColor(1);

    // Item Name & Price
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawStr(2, 24, item.name.substring(0, 20).c_str());

    // Price & Stock
    u8g2.setFont(u8g2_font_5x8_tf);
    String pStock = "Rs." + String((int)item.price) + " | Stock: " + String(item.stock) + " available";
    u8g2.drawStr(2, 34, pStock.c_str());

    // Navigation direction in bold/prominent text
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawStr(2, 47, (">> " + item.shortDirection).substring(0, 20).c_str());

    u8g2.drawHLine(0, 51, 128);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(2, 61, "PRESS OK: BACK TO CART");

  // ----------------------------------------------------------
  // MODE 5: FINAL PRICE SCREEN (CHECKOUT STEP 1)
  // ----------------------------------------------------------
  } else if (currentMode == MODE_FINAL_PRICE) {
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawBox(0, 0, 128, 12);
    u8g2.setDrawColor(0);
    u8g2.drawStr(2, 9, "CHECKOUT & PAY");
    u8g2.setDrawColor(1);

    u8g2.setFont(u8g2_font_7x14B_tf);
    u8g2.drawStr(2, 28, ("FINAL: Rs." + String(displayState.finalPayAmount, 2)).c_str());

    u8g2.setFont(u8g2_font_6x10_tf);
    String info = String(displayState.itemCount) + " ITEMS (" + String((int)displayState.discountPercent) + "% OFF)";
    u8g2.drawStr(2, 44, info.c_str());

    u8g2.drawHLine(0, 48, 128);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(2, 60, ">> PRESS OK FOR UPI QR <<");

  // ----------------------------------------------------------
  // MODE 6: UPI PAYMENT QR CODE (CHECKOUT STEP 2)
  // ----------------------------------------------------------
  } else if (currentMode == MODE_PAY_QR && displayState.hasQrCode) {
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawStr(2, 10, "PAY NOW");

    u8g2.setFont(u8g2_font_7x14B_tf);
    u8g2.drawStr(2, 26, ("Rs." + String((int)displayState.finalPayAmount)).c_str());

    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(2, 38, "SCAN UPI");
    u8g2.drawStr(2, 48, "GPay/Paytm");
    u8g2.drawStr(2, 60, "OK: PAID");

    int scale = (displayState.qrSize <= 25) ? 2 : 1;
    int qrPixelWidth = displayState.qrSize * scale;
    int startX = 128 - qrPixelWidth - 2;
    int startY = (64 - qrPixelWidth) / 2;

    for (int y = 0; y < displayState.qrSize; y++) {
      for (int x = 0; x < displayState.qrSize; x++) {
        if (displayState.qrMatrix[y][x] == '1') {
          u8g2.drawBox(startX + x * scale, startY + y * scale, scale, scale);
        }
      }
    }

  // ----------------------------------------------------------
  // MODE 7: NORMAL CART VIEW
  // ----------------------------------------------------------
  } else {
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawBox(0, 0, 128, 12);
    u8g2.setDrawColor(0);
    u8g2.drawStr(2, 9, displayState.line1.c_str());
    u8g2.setDrawColor(1);

    // Line 2: Last scanned item & price
    u8g2.setFont(u8g2_font_7x14B_tf);
    u8g2.drawStr(2, 27, displayState.line2.c_str());

    // Line 3: Cart total & item count
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawStr(2, 43, displayState.line3.c_str());

    // Line 4: Recommendations Ticker
    u8g2.drawHLine(0, 48, 128);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(2, 60, displayState.line4.c_str());
  }

  u8g2.sendBuffer();
}

void showMessage(const char* title, const char* msg) {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.drawBox(0, 0, 128, 12);
  u8g2.setDrawColor(0);
  u8g2.drawStr(2, 9, title);
  u8g2.setDrawColor(1);
  u8g2.setFont(u8g2_font_6x12_tf);
  u8g2.drawStr(4, 36, msg);
  u8g2.sendBuffer();
}

// ==========================================
// 7. BACKEND HTTP API CLIENT
// ==========================================

// 1. Fetch Cart OLED Status from Django
void fetchCartOledStatus() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/cart/oled-status/?cart_id=" + String(CART_ID);

  http.begin(url);
  http.setTimeout(3000);
  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (!error) {
      displayState.line1 = doc["line1"] | displayState.line1;
      displayState.line2 = doc["line2"] | displayState.line2;
      displayState.line3 = doc["line3"] | displayState.line3;
      displayState.line4 = doc["line4"] | displayState.line4;
      displayState.total = doc["total"] | displayState.total;
      displayState.itemCount = doc["count"] | displayState.itemCount;
      displayState.isPaired = doc["is_paired"] | false;

      // If user was on pairing screen and app paired, auto-switch to cart mode!
      if (currentMode == MODE_PAIRING_QR && displayState.isPaired) {
        currentMode = MODE_CART;
        Serial.println("[Smart Cart]: Mobile app paired! Switching to Cart mode.");
      }

      if (currentMode == MODE_CART) {
        renderOLED();
      }
    }
  }
  http.end();
}

// 2. Fetch Pairing QR from backend
void fetchPairingQR() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/cart/pairing-qr/?cart_id=" + String(CART_ID);
  http.begin(url);
  http.setTimeout(4000);

  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<4096> doc;
    deserializeJson(doc, payload);

    displayState.qrSize = doc["qrSize"] | 21;
    JsonArray rows = doc["qrMatrix"].as<JsonArray>();
    int rIdx = 0;
    for (const char* rowStr : rows) {
      if (rIdx < 35 && rowStr) {
        strncpy(displayState.qrMatrix[rIdx], rowStr, 34);
        displayState.qrMatrix[rIdx][34] = '\0';
        rIdx++;
      }
    }
    displayState.hasQrCode = (rIdx > 0);
    renderOLED();
  }
  http.end();
}

// 3. Record Audio from INMP441 Microphone & Perform Item Voice Search
void recordAndSearchVoice() {
  currentMode = MODE_VOICE_LISTENING;
  renderOLED();

  Serial.println("[Voice Search]: Starting 3-second recording from INMP441 mic...");

  // Allocate 16-bit PCM buffer (16000 samples * 2 bytes = 32KB per sec -> 96KB for 3s)
  int samplesToRead = MIC_SAMPLE_RATE * MIC_RECORD_SECS;
  int bytesToRead = samplesToRead * sizeof(int16_t);
  int16_t *pcmBuffer = (int16_t *)malloc(bytesToRead);

  if (!pcmBuffer) {
    showMessage("VOICE ERROR", "LOW MEMORY");
    delay(1500);
    currentMode = MODE_CART;
    renderOLED();
    return;
  }

  size_t bytesRead = 0;
  esp_err_t res = i2s_read(I2S_PORT, pcmBuffer, bytesToRead, &bytesRead, portMAX_DELAY);

  if (res != ESP_OK || bytesRead == 0) {
    free(pcmBuffer);
    showMessage("MIC ERROR", "FAILED TO READ I2S");
    delay(1500);
    currentMode = MODE_CART;
    renderOLED();
    return;
  }

  showMessage("VOICE SEARCH", "SEARCHING ITEMS...");

  // Build WAV Payload (44 bytes header + PCM data)
  int wavLen = 44 + bytesRead;
  uint8_t *wavPayload = (uint8_t *)malloc(wavLen);

  if (!wavPayload) {
    free(pcmBuffer);
    showMessage("MEMORY ERROR", "WAV ALLOC FAILED");
    delay(1500);
    currentMode = MODE_CART;
    renderOLED();
    return;
  }

  createWavHeader(wavPayload, bytesRead);
  memcpy(wavPayload + 44, pcmBuffer, bytesRead);
  free(pcmBuffer);

  // Send Audio over Wi-Fi to Django voice search endpoint
  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/cart/voice-search/?cart_id=" + String(CART_ID);
  http.begin(url);
  http.setTimeout(12000);

  String boundary = "----ESP32VoiceSearchBoundary999";
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

  String headerStr = "--" + boundary + "\r\n" +
                     "Content-Disposition: form-data; name=\"audio\"; filename=\"search.wav\"\r\n" +
                     "Content-Type: audio/wav\r\n\r\n";
  String footerStr = "\r\n--" + boundary + "--\r\n";

  int postTotalLen = headerStr.length() + wavLen + footerStr.length();
  uint8_t *multiBuf = (uint8_t *)malloc(postTotalLen);

  if (multiBuf) {
    memcpy(multiBuf, headerStr.c_str(), headerStr.length());
    memcpy(multiBuf + headerStr.length(), wavPayload, wavLen);
    memcpy(multiBuf + headerStr.length() + wavLen, footerStr.c_str(), footerStr.length());

    free(wavPayload);

    int httpCode = http.POST(multiBuf, postTotalLen);
    free(multiBuf);

    if (httpCode == HTTP_CODE_OK) {
      String response = http.getString();
      StaticJsonDocument<4096> doc;
      deserializeJson(doc, response);

      displayState.searchQuery = doc["transcript"] | "Search";
      JsonArray items = doc["items"].as<JsonArray>();

      displayState.searchCount = 0;
      for (JsonObject it : items) {
        if (displayState.searchCount < MAX_SEARCH_ITEMS) {
          SearchItem& s = displayState.searchResults[displayState.searchCount++];
          s.name = it["name"].as<String>();
          s.sku = it["sku"].as<String>();
          s.price = it["price"].as<float>();
          s.stock = it["stock"].as<int>();
          s.shelfLocation = it["shelfLocation"].as<String>();
          s.direction = it["direction"].as<String>();
          s.shortDirection = it["shortDirection"].as<String>();
          s.arrow = it["arrow"].as<String>();
          s.oledRow = it["oledRow"].as<String>();
        }
      }

      displayState.selectedSearchIndex = 0;
      if (displayState.searchCount > 0) {
        currentMode = MODE_SEARCH_RESULTS;
      } else {
        showMessage("NO ITEMS", "NOT IN STOCK");
        delay(1500);
        currentMode = MODE_CART;
      }
      renderOLED();
      Serial.printf("[Voice Search Success]: Query: '%s' | Found: %d items\n", displayState.searchQuery.c_str(), displayState.searchCount);

    } else {
      Serial.printf("[Voice Search]: HTTP Error %d\n", httpCode);
      showMessage("VOICE SEARCH", ("HTTP " + String(httpCode)).c_str());
      delay(1500);
      currentMode = MODE_CART;
      renderOLED();
    }
  } else {
    free(wavPayload);
    showMessage("MEMORY ERROR", "UPLOAD FAILED");
    delay(1500);
    currentMode = MODE_CART;
    renderOLED();
  }

  http.end();
}

// 4. Fetch Payment QR & Show FINAL PRICE
void fetchPaymentQRAndShowPrice() {
  showMessage("CHECKOUT", "CALCULATING PRICE...");

  if (WiFi.status() != WL_CONNECTED) {
    showMessage("OFFLINE", "CANNOT FETCH QR");
    delay(1500);
    renderOLED();
    return;
  }

  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/cart/payment-qr/?cart_id=" + String(CART_ID);
  http.begin(url);
  http.setTimeout(6000);

  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<4096> doc;
    deserializeJson(doc, payload);

    displayState.finalPayAmount  = doc["finalTotal"] | 0.0;
    displayState.discountPercent = doc["discountPercent"] | 0.0;
    displayState.itemCount       = doc["itemCount"] | 0;
    displayState.qrSize          = doc["qrSize"] | 25;

    JsonArray rows = doc["qrMatrix"].as<JsonArray>();
    int rIdx = 0;
    for (const char* rowStr : rows) {
      if (rIdx < 35 && rowStr) {
        strncpy(displayState.qrMatrix[rIdx], rowStr, 34);
        displayState.qrMatrix[rIdx][34] = '\0';
        rIdx++;
      }
    }
    displayState.hasQrCode = (rIdx > 0);

    // Transition to FINAL PRICE screen!
    currentMode = MODE_FINAL_PRICE;
    renderOLED();
    Serial.printf("Final Price: Rs.%.2f | Press OK for QR code.\n", displayState.finalPayAmount);
  } else {
    showMessage("CHECKOUT", "FETCH FAILED");
    delay(1500);
    currentMode = MODE_CART;
    renderOLED();
  }

  http.end();
}

// 5. Pay & Checkout Completion
void checkoutAndPay() {
  currentMode = MODE_CART;
  showMessage("PAYMENT", "CONFIRMING PAY...");

  if (WiFi.status() != WL_CONNECTED) {
    showMessage("OFFLINE", "CANNOT PAY");
    delay(1500);
    renderOLED();
    return;
  }

  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/cart/checkout/?cart_id=" + String(CART_ID);
  http.begin(url);
  http.setTimeout(6000);

  int httpCode = http.POST("{}");
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<1024> doc;
    deserializeJson(doc, payload);

    String orderId = doc["orderId"] | "PAID";
    float amt = doc["totalPaid"] | displayState.finalPayAmount;

    // Light up LED to signal payment & order completion!
    digitalWrite(BOUGHT_LED_PIN, HIGH);

    displayState.line1 = "PAID SUCCESSFUL!";
    displayState.line2 = "ORD: " + orderId;
    displayState.line3 = "AMOUNT: Rs." + String(amt, 2);
    displayState.line4 = "THANK YOU FOR SHOPPING";

    renderOLED();
    Serial.printf("Payment Success! Order: %s | Paid: Rs.%.2f\n", orderId.c_str(), amt);

    delay(2500);
    digitalWrite(BOUGHT_LED_PIN, LOW);

    // Reset back to pairing screen for next shopper
    currentMode = MODE_PAIRING_QR;
    fetchCartOledStatus();
    renderOLED();
  } else {
    showMessage("CHECKOUT", "PAYMENT FAILED");
    delay(1500);
    renderOLED();
  }

  http.end();
}

// ==========================================
// 8. SETUP & MAIN LOOP
// ==========================================
void setup() {
  // Disable brownout detector
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(300);
  Serial.println("\n==================================================");
  Serial.println("  GREENLOOP AI SMART CART - STANDARD ESP32 FIRMWARE");
  Serial.println("==================================================");

  // 1. Initialize Buttons (GPIO 18, 19, 4)
  pinMode(BTN_FORWARD_PIN, INPUT_PULLUP);
  pinMode(BTN_BACKWARD_PIN, INPUT_PULLUP);
  pinMode(BTN_OK_PIN, INPUT_PULLUP);

  // 2. Initialize Bought Indicator LED
  pinMode(BOUGHT_LED_PIN, OUTPUT);
  digitalWrite(BOUGHT_LED_PIN, LOW);

  // 3. Initialize 1.3" I2C OLED Display
  u8g2.begin();
  showMessage("SMART CART 1.3\"", "STARTING UP...");
  delay(500);

  // Show Cart Pairing QR Code right away on boot!
  currentMode = MODE_PAIRING_QR;
  renderOLED();

  // 4. Initialize INMP441 I2S Microphone
  if (initI2SMic()) {
    Serial.println("[Mic]: INMP441 I2S Microphone Initialized (SCK=14, WS=15, SD=32).");
  } else {
    Serial.println("[Mic Error]: INMP441 Microphone initialization failed.");
  }

  // 5. Connect to Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(300);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    displayState.ipStr = WiFi.localIP().toString();
    IPAddress localIp = WiFi.localIP();
    if (localIp[0] == 192 && localIp[1] == 168 && localIp[2] == 137) {
      serverBaseUrl = "http://192.168.137.1:8000";
    } else if (localIp[0] == 10) {
      serverBaseUrl = "http://10.1.7.65:8000";
    } else {
      serverBaseUrl = "http://" + WiFi.gatewayIP().toString() + ":8000";
    }
    Serial.println("\n[Wi-Fi Connected!]");
    Serial.printf(">> ESP32 IP: %s\n", displayState.ipStr.c_str());
    Serial.printf(">> BACKEND URL: %s\n", serverBaseUrl.c_str());
    
    // Fetch live pairing QR matrix from backend
    fetchPairingQR();
    fetchCartOledStatus();
  } else {
    Serial.println("\n[Wi-Fi Notice]: Offline Mode, using pre-baked Pairing QR.");
    renderOLED();
  }
}

void loop() {
  // -------------------------------------------------------------
  // 1. BUTTON OK (GPIO 4):
  //    - In MODE_PAIRING_QR:
  //        * Click: Switch to Cart mode directly (or test)
  //    - In MODE_CART:
  //        * Long Press (>= 1.2s): Show FINAL PRICE before QR
  //    - In MODE_SEARCH_RESULTS:
  //        * Click: Select highlighted item -> Show ITEM DIRECTION!
  //    - In MODE_ITEM_DIRECTION:
  //        * Click: Return to Cart mode
  //    - In MODE_FINAL_PRICE:
  //        * Click: Generate & Show UPI QR CODE!
  //    - In MODE_PAY_QR:
  //        * Click once paid: Complete Checkout
  // -------------------------------------------------------------
  if (digitalRead(BTN_OK_PIN) == LOW) {
    delay(40); // Debounce
    if (digitalRead(BTN_OK_PIN) == LOW) {
      unsigned long pressStart = millis();

      while (digitalRead(BTN_OK_PIN) == LOW && (millis() - pressStart < 2500)) {
        delay(20);
        if (currentMode == MODE_CART && millis() - pressStart > 1200) {
          showMessage("PAY CHECKOUT", "RELEASE FOR FINAL");
        }
      }

      unsigned long duration = millis() - pressStart;

      if (currentMode == MODE_PAIRING_QR) {
        // Toggle to cart mode
        currentMode = MODE_CART;
        renderOLED();

      } else if (currentMode == MODE_SEARCH_RESULTS) {
        // Shopper selected item from rows -> SHOW DIRECTION!
        Serial.printf("[Button OK]: Selected row %d -> Showing direction for %s\n",
          displayState.selectedSearchIndex,
          displayState.searchResults[displayState.selectedSearchIndex].name.c_str()
        );
        currentMode = MODE_ITEM_DIRECTION;
        renderOLED();

      } else if (currentMode == MODE_ITEM_DIRECTION) {
        // Shopper confirmed direction -> return to cart
        currentMode = MODE_CART;
        renderOLED();

      } else if (currentMode == MODE_FINAL_PRICE) {
        currentMode = MODE_PAY_QR;
        renderOLED();

      } else if (currentMode == MODE_PAY_QR) {
        checkoutAndPay();

      } else {
        // In Normal Cart Mode
        if (duration >= 1200) {
          // LONG PRESS -> Checkout & Final Price
          fetchPaymentQRAndShowPrice();
        } else {
          // Short click: show QR pairing screen or cycle view
          currentMode = MODE_PAIRING_QR;
          renderOLED();
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 2. BUTTON FORWARD (GPIO 18):
  //    - In MODE_SEARCH_RESULTS: Move cursor down through item rows!
  //    - In MODE_CART: Cycle forward recommendations
  //    - In MODE_FINAL_PRICE / MODE_PAY_QR: Cancel back to cart
  // -------------------------------------------------------------
  if (digitalRead(BTN_FORWARD_PIN) == LOW) {
    delay(40); // Debounce
    if (digitalRead(BTN_FORWARD_PIN) == LOW) {
      if (currentMode == MODE_SEARCH_RESULTS) {
        // Move selection cursor down
        if (displayState.searchCount > 0) {
          displayState.selectedSearchIndex = (displayState.selectedSearchIndex + 1) % displayState.searchCount;
          renderOLED();
        }
      } else if (currentMode == MODE_FINAL_PRICE || currentMode == MODE_PAY_QR) {
        currentMode = MODE_CART;
        renderOLED();
      } else if (currentMode == MODE_ITEM_DIRECTION) {
        currentMode = MODE_SEARCH_RESULTS;
        renderOLED();
      } else {
        // Cycle recommendations
        if (displayState.recCount > 0) {
          displayState.activeRecIndex = (displayState.activeRecIndex + 1) % displayState.recCount;
          displayState.line4 = "REC: " + displayState.recList[displayState.activeRecIndex];
          currentMode = MODE_CART;
          renderOLED();
        }
      }
      unsigned long fwdWait = millis();
      while (digitalRead(BTN_FORWARD_PIN) == LOW && (millis() - fwdWait < 1500)) delay(30);
    }
  }

  // -------------------------------------------------------------
  // 3. BUTTON BACKWARD (GPIO 19):
  //    - LONG PRESS (>= 1.0s): ACTIVATE MIC VOICE SEARCH!
  //    - Short click in MODE_SEARCH_RESULTS: Move cursor up through rows!
  //    - Short click in MODE_CART: Previous recommendation
  //    - In MODE_FINAL_PRICE / MODE_PAY_QR: Cancel back to cart
  // -------------------------------------------------------------
  if (digitalRead(BTN_BACKWARD_PIN) == LOW) {
    delay(40); // Debounce
    if (digitalRead(BTN_BACKWARD_PIN) == LOW) {
      unsigned long backPressStart = millis();

      while (digitalRead(BTN_BACKWARD_PIN) == LOW && (millis() - backPressStart < 2500)) {
        delay(20);
        if (millis() - backPressStart > 1000) {
          showMessage("VOICE MIC", "RELEASE TO SPEAK");
        }
      }

      unsigned long backDuration = millis() - backPressStart;

      if (backDuration >= 1000) {
        // LONG PRESS: Record voice with INMP441 mic and search items!
        Serial.println("[Button Backward Long Press]: Activating Voice Search Mic...");
        recordAndSearchVoice();

      } else {
        // SHORT CLICK
        if (currentMode == MODE_SEARCH_RESULTS) {
          // Move cursor up through rows
          if (displayState.searchCount > 0) {
            displayState.selectedSearchIndex = (displayState.selectedSearchIndex - 1 + displayState.searchCount) % displayState.searchCount;
            renderOLED();
          }
        } else if (currentMode == MODE_ITEM_DIRECTION) {
          currentMode = MODE_SEARCH_RESULTS;
          renderOLED();
        } else if (currentMode == MODE_FINAL_PRICE || currentMode == MODE_PAY_QR) {
          currentMode = MODE_CART;
          renderOLED();
        } else {
          // Previous recommendation
          if (displayState.recCount > 0) {
            displayState.activeRecIndex = (displayState.activeRecIndex - 1 + displayState.recCount) % displayState.recCount;
            displayState.line4 = "REC: " + displayState.recList[displayState.activeRecIndex];
            currentMode = MODE_CART;
            renderOLED();
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 4. Periodic Status Poll (every 3s when in Cart or Pairing mode)
  // -------------------------------------------------------------
  if ((currentMode == MODE_CART || currentMode == MODE_PAIRING_QR) && (millis() - lastStatusPoll > POLL_INTERVAL_MS)) {
    lastStatusPoll = millis();
    fetchCartOledStatus();
  }

  delay(20);
}
