#include <Arduino.h>
#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include "esp_sleep.h"
#include "time.h"

#include "ESP32_OV5640_AF.h"

// ===================
// Select camera model
// ===================
#define CAMERA_MODEL_XIAO_ESP32S3 // Has PSRAM
#include "camera_pins.h"

// -------- Camera AF helper --------
OV5640 ov5640;

// -------- Server config --------
String serverName = "thunderbay.webdev.gccis.rit.edu";
String serverPath = "/api/record/1";
const int serverPort = 80; // not used directly with HTTPS URL but kept for reference

// -------- WiFi config --------
const char* ssid     = "RIT-WiFi";
const char* password = "";

// -------- Sleep config --------
#define SLEEP_MINUTES 10
#define uS_TO_S_FACTOR 1000000ULL

// -------- Time / NTP config (US Eastern with DST) --------
const char* ntpServer1 = "pool.ntp.org";
const char* ntpServer2 = "time.nist.gov";
const char* tzEST = "EST5EDT,M3.2.0,M11.1.0";  // US Eastern with DST rules [web:2][web:11]

// Forward declarations
String sendPhotoHTTP();
bool isWorkingHours();
uint64_t secondsUntilNext9();

// Optional: LED flash setup if defined by camera_pins.h

void setup() {
  // Serial.begin(115200);
  // Serial.setDebugOutput(true);
  // Serial.println();
  // Serial.println("Booting, initializing camera...");

  // ----- Camera configuration -----
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.frame_size = FRAMESIZE_UXGA;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 12;
  config.fb_count = 1;

  if (config.pixel_format == PIXFORMAT_JPEG) {
    if (psramFound()) {
      config.jpeg_quality = 10;
      config.fb_count = 2;
      config.grab_mode = CAMERA_GRAB_LATEST;
    } else {
      config.frame_size = FRAMESIZE_SVGA;
      config.fb_location = CAMERA_FB_IN_DRAM;
    }
  } else {
    config.frame_size = FRAMESIZE_240X240;
  #if CONFIG_IDF_TARGET_ESP32S3
    config.fb_count = 2;
  #endif
  }

  // Initialize camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    // Serial.printf("Camera init failed with error 0x%x\n", err);
    delay(2000);
    // If camera fails, still go to sleep to save power
    esp_sleep_enable_timer_wakeup((uint64_t)SLEEP_MINUTES * 60 * uS_TO_S_FACTOR);
    esp_deep_sleep_start();
  }

  sensor_t *s = esp_camera_sensor_get();

  s->set_vflip(s, 1);    // vertical flip
  s->set_hmirror(s, 1);

  // Example sensor tweaks
  if (s->id.PID == OV3660_PID) {
    s->set_vflip(s, 1);
    s->set_brightness(s, 1);
    s->set_saturation(s, -2);
  }

  // For OV5640 AF, FHD is usually good for focusing
  if (config.pixel_format == PIXFORMAT_JPEG) {
    s->set_framesize(s, FRAMESIZE_FHD);
  }

  // Autofocus init
  ov5640.start(s);
  ov5640.focusInit();
  ov5640.autoFocusMode();

#if defined(LED_GPIO_NUM)
  setupLedFlash(LED_GPIO_NUM);
#endif

  // ----- WiFi connect -----
  // Serial.println("Connecting to WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  WiFi.setSleep(false);

  unsigned long startAttempt = millis();
  const unsigned long wifiTimeout = 15000; // 15s timeout

  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < wifiTimeout) {
    delay(500);
    // Serial.print(".");
  }
  // Serial.println();

  // ----- Time sync (only if we got WiFi) -----
  if (WiFi.status() == WL_CONNECTED) {
    // Use timezone rules for US Eastern and NTP. [web:2][web:14]
    configTzTime(tzEST, ntpServer1, ntpServer2);

    // Give it some time to get the first sync.
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo, 10000)) {
      // Serial.println("Failed to obtain time");
    } else {
      // Serial.print("Current local time: ");
      // Serial.println(&timeinfo, "%Y-%m-%d %H:%M:%S");
    }
  }

  // ----- Decide if we should run or sleep for the night -----
  if (!isWorkingHours()) {
    // Outside 9–17 Eastern: long sleep until next 09:00.
    uint64_t sleepSeconds = secondsUntilNext9();
    // Serial.print("Outside working hours, sleeping for ");
    // Serial.print((unsigned long)sleepSeconds);
    // Serial.println(" seconds until next 09:00 Eastern.");

    esp_sleep_enable_timer_wakeup(sleepSeconds * uS_TO_S_FACTOR);
    esp_deep_sleep_start();
  }

  // ----- Take photo and upload (only during 9–17) -----
  if (WiFi.status() == WL_CONNECTED) {
    String res = sendPhotoHTTP();
    // Serial.println("Upload result:");
    // Serial.println(res);
  } else {
    // Serial.println("WiFi not connected; skipping upload this cycle.");
  }

  // Small delay for logs to flush
  delay(2000);

  // ----- Short deep sleep between captures (1 minute) -----
  uint64_t sleepSeconds = (uint64_t)SLEEP_MINUTES * 60;
  // Serial.print("In working hours, sleeping for ");
  // Serial.print((unsigned long)sleepSeconds);
  // Serial.println(" seconds.");

  esp_sleep_enable_timer_wakeup(sleepSeconds * uS_TO_S_FACTOR);
  esp_deep_sleep_start();
}

void loop() {
  // Not used; device sleeps from setup()
}

// Returns true if current local time is between 09:00:00 and 16:59:59 Eastern.
bool isWorkingHours() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    // If we can't get time, default to "working" so it still runs.
    return true;
  }

  int hour = timeinfo.tm_hour; // 0–23 in local time
  // 9:00–16:59 inclusive. Change <17 to <=17 if you want 17:00–17:59 included.
  bool working = (hour >= 9 && hour < 17);

  // Serial.print("Local hour: ");
  // Serial.print(hour);
  // Serial.print(" -> workingHours=");
  // Serial.println(working ? "true" : "false");

  return working;
}

// Compute seconds until next 09:00 Eastern from current local time.
uint64_t secondsUntilNext9() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    // If no time, fall back to e.g. 8 hours.
    return 8ULL * 3600ULL;
  }

  int hour   = timeinfo.tm_hour;
  int minute = timeinfo.tm_min;
  int second = timeinfo.tm_sec;

  int todaySeconds  = hour * 3600 + minute * 60 + second;
  int targetSeconds = 9 * 3600; // 09:00:00

  int delta = targetSeconds - todaySeconds;
  if (delta <= 0) {
    // Already past 09:00 today; schedule for tomorrow 09:00.
    delta += 24 * 3600;
  }

  return (uint64_t)delta;
}

// HTTPS multipart upload
String sendPhotoHTTP() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    // Serial.println("Camera capture failed");
    return "capture_failed";
  }

  // Serial.print("Image size: ");
  // Serial.print(fb->len);
  // Serial.println(" bytes");

  HTTPClient http;
  WiFiClientSecure client;

  client.setInsecure(); // no certificate validation

  String url = "https://" + serverName + serverPath;
  // Serial.println("Posting to: " + url);

  http.begin(client, url);
  String boundary = "Esp32Boundary";
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

  String head =
    "--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"flower\"; filename=\"esp32.jpg\"\r\n"
    "Content-Type: image/jpeg\r\n\r\n";
  String tail =
    "\r\n--" + boundary + "--\r\n";

  uint32_t totalLen = head.length() + fb->len + tail.length();
  uint8_t *payload = (uint8_t*)malloc(totalLen);
  if (!payload) {
    // Serial.println("Failed to allocate memory");
    esp_camera_fb_return(fb);
    return "malloc_failed";
  }

  memcpy(payload, head.c_str(), head.length());
  memcpy(payload + head.length(), fb->buf, fb->len);
  memcpy(payload + head.length() + fb->len, tail.c_str(), tail.length());

  esp_camera_fb_return(fb);

  // Serial.println("Sending POST request...");
  int httpResponseCode = http.POST(payload, totalLen);

  free(payload);

  String response = "";
  if (httpResponseCode > 0) {
    // Serial.print("HTTP Response code: ");
    // Serial.println(httpResponseCode);
    response = http.getString();
    // Serial.println("Response:");
    // Serial.println(response);
  } else {
    // Serial.print("Error code: ");
    // Serial.println(httpResponseCode);
  }

  http.end();
  return response;
}
