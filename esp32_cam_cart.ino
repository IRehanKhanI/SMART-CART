/**
 * ============================================================================
 * AI-POWERED SMART CART - ESP32-CAM FIRMWARE
 * ============================================================================
 * Hardware Pin Mapping:
 *   [1.3" I2C OLED Display (SH1106 / SSD1306)]
 *     - SDA: GPIO 13
 *     - SCL: GPIO 14
 *     - VCC: 3.3V
 *     - GND: GND
 *
 *   [INMP441 I2S Digital Microphone Module]
 *     - SCK: GPIO 2  (Serial Clock - BCLK)
 *     - WS:  GPIO 12 (Word Select - LRCLK)
 *     - SD:  GPIO 15 (Serial Data Out - DOUT)
 *     - L/R: GND     (Selects Left channel)
 *     - VDD: 3.3V
 *     - GND: GND
 *
 *   [Physical Push Buttons]
 *     - Forward Button:  GPIO 1 (Next Item / Scroll Recommendations)
 *     - Backward Button: GPIO 3 (Previous Item / Scroll Up)
 *     - Pay / OK Button: GPIO 0 (Short Press: Camera Scan | Long Press: Pay & Checkout)
 *
 * Required Arduino Libraries:
 *   - U8g2 by olikraus
 *   - ArduinoJson (v6 or v7) by Benoit Blanchon
 *   - WiFi & HTTPClient (built-in with ESP32 board package)
 *   - driver/i2s.h (built-in ESP-IDF I2S driver)
 *
 * Board Settings in Arduino IDE:
 *   - Board: "AI Thinker ESP32-CAM"
 *   - Partition Scheme: "Huge APP (3MB No OTA/1MB SPIFFS)"
 *   - CPU Frequency: 240MHz (WiFi/BT)
 * ============================================================================
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <U8g2lib.h>
#include <ArduinoJson.h>
#include "esp_http_server.h"
#include "driver/i2s.h"

// ==========================================
// 1. NETWORK & BACKEND CONFIGURATION
// ==========================================
const char* WIFI_SSID       = "RehanLP";
const char* WIFI_PASSWORD   = "rehan123";
const char* SERVER_BASE_URL = "http://10.1.7.65:8000";
const char* CART_ID         = "CART-01";

// ==========================================
// 2. PIN DEFINITIONS
// ==========================================
// 1.3" I2C OLED Display (SH1106)
#define I2C_SDA_PIN        13
#define I2C_SCL_PIN        14

// INMP441 I2S Digital Microphone
#define I2S_SCK_PIN         2   // Serial Clock (BCLK)
#define I2S_WS_PIN         12   // Word Select (LRCLK)
#define I2S_SD_PIN         15   // Serial Data (DOUT)
#define I2S_PORT           I2S_NUM_0

// 3 Physical Push Buttons
#define BTN_FORWARD_PIN     1   // Forward / Next
#define BTN_BACKWARD_PIN    3   // Backward / Previous
#define BTN_OK_PAY_PIN      0   // OK (Short Click: Scan | Long Hold: Pay & Checkout)

#define FLASH_LED_PIN       4   // Onboard Flash LED (active HIGH)

// 1.3" I2C OLED Display constructor (SH1106 128x64 Software I2C)
U8G2_SH1106_128X64_NONAME_F_SW_I2C u8g2(U8G2_R0, I2C_SCL_PIN, I2C_SDA_PIN, U8X8_PIN_NONE);

// ==========================================
// 3. AI-THINKER CAMERA PIN CONFIGURATION
// ==========================================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0   // Camera XCLK shared pin
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// ==========================================
// 4. DISPLAY & CART STATE
// ==========================================
enum DisplayMode {
  MODE_CART,
  MODE_VOICE_CHAT,
  MODE_MESSAGE
};

struct CartDisplayState {
  String line1 = "CART #01 [READY]";
  String line2 = "READY TO SCAN";
  String line3 = "TOT: Rs.0.00 (0 ITEMS)";
  String line4 = "REC: MILK -> PARLE-G";
  float total = 0.0;
  int itemCount = 0;
  String shopperName = "GUEST";
  String lastItem = "";
  String ipStr = "";
  
  // Recommendations list for cycling via Forward/Backward buttons
  String recList[5];
  int recCount = 0;
  int activeRecIndex = 0;

  // Voice Chat state
  String voiceQuestion = "";
  String voiceAnswer = "";
};

CartDisplayState displayState;
DisplayMode currentMode = MODE_CART;

unsigned long lastStatusPoll = 0;
const unsigned long POLL_INTERVAL_MS = 10000;

httpd_handle_t camera_httpd = NULL;

// Forward declarations
String captureAndScan();
void recordAndSendVoice();
void checkoutAndPay();
void renderOLED();
void showMessage(const char* title, const char* msg);

// ==========================================
// 5. I2S MICROPHONE DRIVER SETUP (INMP441)
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
    .bck_io_num = I2S_SCK_PIN,   // GPIO 2
    .ws_io_num = I2S_WS_PIN,     // GPIO 12
    .data_out_num = -1,
    .data_in_num = I2S_SD_PIN    // GPIO 15
  };

  esp_err_t err = i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  if (err != ESP_OK) return false;

  err = i2s_set_pin(I2S_PORT, &pin_config);
  return (err == ESP_OK);
}

// Generate 44-byte standard WAV header for PCM audio
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
  header[16] = 16; header[17] = 0; header[18] = 0; header[19] = 0; // 16-byte chunk
  header[20] = 1; header[21] = 0; // PCM format
  header[22] = 1; header[23] = 0; // 1 Channel (Mono)
  header[24] = (byte)(sampleRate & 0xFF);
  header[25] = (byte)((sampleRate >> 8) & 0xFF);
  header[26] = (byte)((sampleRate >> 16) & 0xFF);
  header[27] = (byte)((sampleRate >> 24) & 0xFF);
  header[28] = (byte)(byteRate & 0xFF);
  header[29] = (byte)((byteRate >> 8) & 0xFF);
  header[30] = (byte)((byteRate >> 16) & 0xFF);
  header[31] = (byte)((byteRate >> 24) & 0xFF);
  header[32] = 2; header[33] = 0; // block align
  header[34] = 16; header[35] = 0; // bits per sample

  // "data" Chunk
  header[36] = 'd'; header[37] = 'a'; header[38] = 't'; header[39] = 'a';
  header[40] = (byte)(totalDataLen & 0xFF);
  header[41] = (byte)((totalDataLen >> 8) & 0xFF);
  header[42] = (byte)((totalDataLen >> 16) & 0xFF);
  header[43] = (byte)((totalDataLen >> 24) & 0xFF);
}

// ==========================================
// 6. OLED RENDERING HELPER (RUPEES CURRENCY)
// ==========================================
void renderOLED() {
  u8g2.clearBuffer();

  if (currentMode == MODE_VOICE_CHAT) {
    // OLED Header: VOICE AI
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawBox(0, 0, 128, 12);
    u8g2.setDrawColor(0);
    u8g2.drawStr(2, 9, "CART-01 [VOICE AI]");
    u8g2.setDrawColor(1);

    // Question line
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(2, 24, ("Q: " + displayState.voiceQuestion).substring(0, 24).c_str());

    // Divider
    u8g2.drawHLine(0, 28, 128);

    // Answer line (Bold)
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawStr(2, 42, ("A: " + displayState.voiceAnswer).substring(0, 20).c_str());

    // Bottom prompt
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(2, 60, "CLICK OK TO SCAN ITEMS");
  } else {
    // Normal Cart Mode:
    // Header Banner: Inverted bar with Cart ID & Shopper Name
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawBox(0, 0, 128, 12);
    u8g2.setDrawColor(0);
    u8g2.drawStr(2, 9, displayState.line1.c_str());
    u8g2.setDrawColor(1);

    // Line 2: Last scanned item & price (in Rupees)
    u8g2.setFont(u8g2_font_7x14B_tf);
    u8g2.drawStr(2, 27, displayState.line2.c_str());

    // Line 3: Cart total & item count (in Rupees)
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawStr(2, 43, displayState.line3.c_str());

    // Horizontal divider
    u8g2.drawHLine(0, 48, 128);

    // Line 4: Recommendations Ticker
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
// 7. CAMERA INITIALIZATION
// ==========================================
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size   = FRAMESIZE_VGA;  // 640x480
    config.jpeg_quality = 12;
    config.fb_count     = 2;
  } else {
    config.frame_size   = FRAMESIZE_QVGA; // 320x240
    config.jpeg_quality = 14;
    config.fb_count     = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  return (err == ESP_OK);
}

// ==========================================
// 8. BACKEND HTTP API CLIENT
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
      displayState.itemCount = doc["itemCount"] | displayState.itemCount;
      displayState.shopperName = doc["shopper"] | displayState.shopperName;
      renderOLED();
    }
  }
  http.end();
}

// 2. Capture Product Image & Send to Backend AI Vision
String captureAndScan() {
  currentMode = MODE_CART;
  showMessage("AI VISION", "SCANNING PRODUCT...");

  // Flash LED pulse
  digitalWrite(FLASH_LED_PIN, HIGH);
  delay(120);

  camera_fb_t *fb = esp_camera_fb_get();
  digitalWrite(FLASH_LED_PIN, LOW);

  if (!fb) {
    showMessage("CAMERA ERROR", "CAPTURE FAILED");
    delay(1500);
    renderOLED();
    return "";
  }

  if (WiFi.status() != WL_CONNECTED) {
    esp_camera_fb_return(fb);
    showMessage("WIFI OFFLINE", "CANNOT UPLOAD");
    delay(1500);
    renderOLED();
    return "";
  }

  showMessage("AI VISION", "ANALYZING IMAGE...");

  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/cart/scan/?cart_id=" + String(CART_ID);
  http.begin(url);
  http.setTimeout(8000);

  String boundary = "----ESP32CamBoundary12345";
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

  String headerStr = "--" + boundary + "\r\n" +
                     "Content-Disposition: form-data; name=\"image\"; filename=\"cart_snap.jpg\"\r\n" +
                     "Content-Type: image/jpeg\r\n\r\n";
  String footerStr = "\r\n--" + boundary + "--\r\n";

  int totalLen = headerStr.length() + fb->len + footerStr.length();
  uint8_t *payloadBuf = (uint8_t *)malloc(totalLen);

  String response = "";
  if (payloadBuf) {
    memcpy(payloadBuf, headerStr.c_str(), headerStr.length());
    memcpy(payloadBuf + headerStr.length(), fb->buf, fb->len);
    memcpy(payloadBuf + headerStr.length() + fb->len, footerStr.c_str(), footerStr.length());

    esp_camera_fb_return(fb);

    int httpCode = http.POST(payloadBuf, totalLen);
    free(payloadBuf);

    if (httpCode == HTTP_CODE_OK || httpCode == 201) {
      response = http.getString();
      StaticJsonDocument<2048> doc;
      deserializeJson(doc, response);

      String addedItem = doc["lastScanned"]["name"] | "Item Added";
      float itemPrice  = doc["lastScanned"]["price"] | 0.0;
      float cartTotal  = doc["total"] | 0.0;
      int count        = doc["itemCount"] | 1;

      // Extract Indian retail recommendations
      JsonArray recs = doc["recommendations"].as<JsonArray>();
      displayState.recCount = 0;
      for (JsonObject r : recs) {
        if (displayState.recCount < 5) {
          displayState.recList[displayState.recCount++] = r["name"].as<String>();
        }
      }
      displayState.activeRecIndex = 0;

      String recTicker = "REC: ";
      if (displayState.recCount > 0) {
        String r1 = displayState.recList[0];
        int sp = r1.indexOf(' ');
        recTicker += (sp > 0) ? r1.substring(0, sp) : r1;
        if (displayState.recCount > 1) {
          String r2 = displayState.recList[1];
          int sp2 = r2.indexOf(' ');
          recTicker += ", " + ((sp2 > 0) ? r2.substring(0, sp2) : r2);
        }
      }

      displayState.line1 = String(CART_ID) + " [" + (doc["isGuest"].as<bool>() ? "GUEST" : doc["member"]["name"].as<String>().substring(0, 7)) + "]";
      displayState.line2 = "+ " + addedItem.substring(0, 10) + " Rs." + String(itemPrice, 2);
      displayState.line3 = "TOT: Rs." + String(cartTotal, 2) + " (" + String(count) + " items)";
      displayState.line4 = recTicker;

      renderOLED();
      Serial.printf("AI Identified: %s | Total: Rs.%.2f\n", addedItem.c_str(), cartTotal);
    } else {
      showMessage("SCAN FAILED", ("HTTP " + String(httpCode)).c_str());
      delay(1500);
      renderOLED();
    }
  } else {
    esp_camera_fb_return(fb);
    showMessage("MEMORY ERROR", "OUT OF RAM");
    delay(1500);
    renderOLED();
  }

  http.end();
  return response;
}

// 3. Record Voice from INMP441 Microphone & Send to Local Voice Assistant
void recordAndSendVoice() {
  currentMode = MODE_VOICE_CHAT;
  showMessage("VOICE ASSISTANT", "RECORDING (3 SEC)...");

  // Allocate 16-bit PCM buffer (16000 samples * 2 bytes = 32KB per sec)
  int samplesToRead = MIC_SAMPLE_RATE * MIC_RECORD_SECS;
  int bytesToRead = samplesToRead * sizeof(int16_t);
  int16_t *pcmBuffer = (int16_t *)malloc(bytesToRead);

  if (!pcmBuffer) {
    showMessage("VOICE ERROR", "LOW MEMORY");
    delay(1500);
    renderOLED();
    return;
  }

  size_t bytesRead = 0;
  esp_err_t res = i2s_read(I2S_PORT, pcmBuffer, bytesToRead, &bytesRead, portMAX_DELAY);

  if (res != ESP_OK || bytesRead == 0) {
    free(pcmBuffer);
    showMessage("MIC ERROR", "FAILED TO READ I2S");
    delay(1500);
    renderOLED();
    return;
  }

  showMessage("VOICE ASSISTANT", "THINKING (AI STT)...");

  // Build WAV Payload (44 bytes header + PCM data)
  int wavLen = 44 + bytesRead;
  uint8_t *wavPayload = (uint8_t *)malloc(wavLen);

  if (!wavPayload) {
    free(pcmBuffer);
    showMessage("MEMORY ERROR", "WAV ALLOC FAILED");
    delay(1500);
    renderOLED();
    return;
  }

  createWavHeader(wavPayload, bytesRead);
  memcpy(wavPayload + 44, pcmBuffer, bytesRead);
  free(pcmBuffer);

  // Send Audio over Wi-Fi to Django
  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/cart/voice-chat/?cart_id=" + String(CART_ID);
  http.begin(url);
  http.setTimeout(10000);

  String boundary = "----ESP32VoiceBoundary9876";
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

  String headerStr = "--" + boundary + "\r\n" +
                     "Content-Disposition: form-data; name=\"audio\"; filename=\"shopper_voice.wav\"\r\n" +
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
      StaticJsonDocument<2048> doc;
      deserializeJson(doc, response);

      displayState.voiceQuestion = doc["transcript"] | "Audio query";
      displayState.voiceAnswer   = doc["oled_reply"] | doc["reply"] | "Ready";
      renderOLED();
      Serial.printf("Voice Q: %s | AI Answer: %s\n", displayState.voiceQuestion.c_str(), displayState.voiceAnswer.c_str());
    } else {
      showMessage("VOICE AI", ("HTTP " + String(httpCode)).c_str());
      delay(1500);
      renderOLED();
    }
  } else {
    free(wavPayload);
    showMessage("MEMORY ERROR", "UPLOAD FAILED");
    delay(1500);
    renderOLED();
  }

  http.end();
}

// 4. Pay & Checkout
void checkoutAndPay() {
  currentMode = MODE_CART;
  showMessage("PAYMENT", "PROCESSING PAY...");

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
    float amt = doc["totalAmount"] | 0.0;

    displayState.line1 = "PAID SUCCESSFUL!";
    displayState.line2 = "ORD: " + orderId;
    displayState.line3 = "AMOUNT: Rs." + String(amt, 2);
    displayState.line4 = "THANK YOU FOR SHOPPING";

    renderOLED();
    Serial.printf("Payment Success! Order: %s | Paid: Rs.%.2f\n", orderId.c_str(), amt);
    delay(3500);

    // Refresh cleared cart
    fetchCartOledStatus();
  } else {
    showMessage("CHECKOUT", "PAYMENT FAILED");
    delay(1500);
    renderOLED();
  }

  http.end();
}

// ==========================================
// 9. HTTP LIVE VIDEO STREAMING SERVER (PORT 80)
// ==========================================
#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t *fb = NULL;
  esp_err_t res = ESP_OK;
  char part_buf[64];

  res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
  if (res != ESP_OK) return res;

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      res = ESP_FAIL;
      break;
    }

    size_t hlen = snprintf(part_buf, 64, _STREAM_PART, fb->len);
    res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, part_buf, hlen);
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len);

    esp_camera_fb_return(fb);
    if (res != ESP_OK) break;
    delay(30);
  }
  return res;
}

static esp_err_t capture_handler(httpd_req_t *req) {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }
  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  esp_err_t res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
  esp_camera_fb_return(fb);
  return res;
}

static esp_err_t scan_handler(httpd_req_t *req) {
  String resStr = captureAndScan();
  httpd_resp_set_type(req, "application/json");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, resStr.c_str(), resStr.length());
}

static esp_err_t index_handler(httpd_req_t *req) {
  String html = "<!DOCTYPE html><html><head><title>ESP32-CAM Smart Cart</title>"
    "<meta name='viewport' content='width=device-width, initial-scale=1'>"
    "<style>"
    "body{font-family:sans-serif;background:#0d1117;color:#fff;margin:0;padding:20px;text-align:center;}"
    "h1{color:#10b981;font-size:22px;} img{border-radius:12px;border:3px solid #10b981;max-width:100%;height:auto;box-shadow:0 8px 24px rgba(0,0,0,0.5);}"
    ".btn{background:#10b981;color:#000;padding:12px 24px;border:none;border-radius:8px;font-weight:bold;font-size:16px;cursor:pointer;margin:10px;}"
    ".btn-pay{background:#6366f1;color:#fff;}"
    ".card{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:16px;max-width:480px;margin:20px auto;font-family:monospace;text-align:left;}"
    "</style></head><body>"
    "<h1>🛒 ESP32-CAM Smart Cart Live Feed</h1>"
    "<img src='/stream' /><br>"
    "<button class='btn' onclick=\"fetch('/scan').then(r=>r.json()).then(d=>alert('Scanned: ' + d.lastScanned.name + ' (Rs.' + d.lastScanned.price + ')'))\">📸 Scan Item with AI</button>"
    "<button class='btn btn-pay' onclick=\"fetch('" + String(SERVER_BASE_URL) + "/api/cart/checkout/?cart_id=" + String(CART_ID) + "', {method:'POST'}).then(r=>r.json()).then(d=>alert('Paid! Order: ' + d.orderId))\">💳 Pay & Checkout</button>"
    "<div class='card'>"
    "<div>OLED Line 1: " + displayState.line1 + "</div>"
    "<div>OLED Line 2: " + displayState.line2 + "</div>"
    "<div>OLED Line 3: " + displayState.line3 + "</div>"
    "<div>OLED Line 4: " + displayState.line4 + "</div>"
    "</div></body></html>";
  return httpd_resp_send(req, html.c_str(), html.length());
}

void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;

  httpd_uri_t index_uri = { .uri = "/", .method = HTTP_GET, .handler = index_handler, .user_ctx = NULL };
  httpd_uri_t stream_uri = { .uri = "/stream", .method = HTTP_GET, .handler = stream_handler, .user_ctx = NULL };
  httpd_uri_t capture_uri = { .uri = "/capture", .method = HTTP_GET, .handler = capture_handler, .user_ctx = NULL };
  httpd_uri_t scan_uri = { .uri = "/scan", .method = HTTP_GET, .handler = scan_handler, .user_ctx = NULL };

  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &index_uri);
    httpd_register_uri_handler(camera_httpd, &stream_uri);
    httpd_register_uri_handler(camera_httpd, &capture_uri);
    httpd_register_uri_handler(camera_httpd, &scan_uri);
    Serial.println("MJPEG Video Stream Server started on Port 80");
  }
}

// ==========================================
// 10. SETUP & MAIN LOOP (3 BUTTONS & MIC)
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n[ESP32-CAM Smart Cart Initializing...]");

  // 1. Initialize Buttons (GPIO 1, 3, 0)
  pinMode(BTN_FORWARD_PIN, INPUT_PULLUP);
  pinMode(BTN_BACKWARD_PIN, INPUT_PULLUP);
  pinMode(BTN_OK_PAY_PIN, INPUT_PULLUP);

  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW);

  // 2. Initialize 1.3" I2C OLED Display
  u8g2.begin();
  showMessage("SMART CART 1.3\"", "CONNECTING WIFI...");

  // 3. Connect to Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(400);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    displayState.ipStr = WiFi.localIP().toString();
    Serial.println("\nWi-Fi Connected!");
    Serial.println("==================================================");
    Serial.printf(">> LIVE STREAM: http://%s/stream\n", displayState.ipStr.c_str());
    Serial.printf(">> WEB CONTROL: http://%s/\n", displayState.ipStr.c_str());
    Serial.println("==================================================");
    showMessage("WIFI CONNECTED", displayState.ipStr.c_str());
    delay(1200);
  } else {
    Serial.println("\nWi-Fi Connection Failed (Offline Mode)");
    showMessage("OFFLINE MODE", "CHECK WIFI");
    delay(1200);
  }

  // 4. Initialize OV2640 Camera
  showMessage("CAMERA SETUP", "STARTING OV2640...");
  if (initCamera()) {
    Serial.println("OV2640 Camera initialized successfully.");
  } else {
    Serial.println("Camera initialization failed!");
    showMessage("CAMERA FAIL", "CHECK HARDWARE");
    delay(1500);
  }

  // 5. Initialize INMP441 I2S Microphone
  showMessage("MIC SETUP", "STARTING I2S...");
  if (initI2SMic()) {
    Serial.println("INMP441 I2S Microphone initialized (SCK=2, WS=12, SD=15).");
  } else {
    Serial.println("INMP441 Microphone initialization failed.");
  }

  // 6. Start Web Streaming Server
  if (WiFi.status() == WL_CONNECTED) {
    startCameraServer();
  }

  // 7. Initial Status
  fetchCartOledStatus();
}

void loop() {
  // -------------------------------------------------------------
  // 1. BUTTON OK / PAY (GPIO 0):
  //    - Short Press (< 1.0s):  Camera Scan with AI Vision
  //    - Long Press  (>= 1.2s): Pay & Checkout
  //    - Triple Press / Double: Voice Assistant Query
  // -------------------------------------------------------------
  if (digitalRead(BTN_OK_PAY_PIN) == LOW) {
    delay(40); // Debounce
    if (digitalRead(BTN_OK_PAY_PIN) == LOW) {
      unsigned long pressStart = millis();

      // Wait for release while tracking duration
      while (digitalRead(BTN_OK_PAY_PIN) == LOW) {
        delay(20);
        if (millis() - pressStart > 1200) {
          // Visual feedback for long press on OLED
          showMessage("ACTION TRIGGER", "RELEASE FOR PAY");
        }
      }

      unsigned long duration = millis() - pressStart;
      if (duration >= 1200) {
        // LONG PRESS -> Pay & Checkout!
        Serial.println("[Button OK Long Press]: Checkout & Pay");
        checkoutAndPay();
      } else {
        // SHORT CLICK -> Snap Photo & Scan Product!
        Serial.println("[Button OK Short Click]: Camera AI Scan");
        captureAndScan();
      }
    }
  }

  // -------------------------------------------------------------
  // 2. BUTTON FORWARD (GPIO 1):
  //    Scroll Forward in recommendations or switch to Voice Mode
  // -------------------------------------------------------------
  if (digitalRead(BTN_FORWARD_PIN) == LOW) {
    delay(40); // Debounce
    if (digitalRead(BTN_FORWARD_PIN) == LOW) {
      Serial.println("[Button Forward]: Next Recommendation");
      if (displayState.recCount > 0) {
        displayState.activeRecIndex = (displayState.activeRecIndex + 1) % displayState.recCount;
        displayState.line4 = "REC: " + displayState.recList[displayState.activeRecIndex];
        currentMode = MODE_CART;
        renderOLED();
      }
      while (digitalRead(BTN_FORWARD_PIN) == LOW) delay(30);
    }
  }

  // -------------------------------------------------------------
  // 3. BUTTON BACKWARD (GPIO 3):
  //    Scroll Backward or Trigger Voice Question
  // -------------------------------------------------------------
  if (digitalRead(BTN_BACKWARD_PIN) == LOW) {
    delay(40); // Debounce
    if (digitalRead(BTN_BACKWARD_PIN) == LOW) {
      unsigned long backPressStart = millis();
      while (digitalRead(BTN_BACKWARD_PIN) == LOW) {
        delay(20);
        if (millis() - backPressStart > 1000) {
          showMessage("VOICE RECORD", "RELEASE TO SPEAK");
        }
      }
      unsigned long backDuration = millis() - backPressStart;

      if (backDuration >= 1000) {
        // Long press Backward button -> Record voice with INMP441 mic!
        Serial.println("[Button Backward Long Press]: Recording Voice Question");
        recordAndSendVoice();
      } else {
        // Short press Backward button -> Previous recommendation
        Serial.println("[Button Backward]: Previous Recommendation");
        if (displayState.recCount > 0) {
          displayState.activeRecIndex = (displayState.activeRecIndex - 1 + displayState.recCount) % displayState.recCount;
          displayState.line4 = "REC: " + displayState.recList[displayState.activeRecIndex];
          currentMode = MODE_CART;
          renderOLED();
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 4. Periodic Status Poll (every 10s)
  // -------------------------------------------------------------
  if (millis() - lastStatusPoll > POLL_INTERVAL_MS) {
    lastStatusPoll = millis();
    fetchCartOledStatus();
  }

  delay(20);
}
