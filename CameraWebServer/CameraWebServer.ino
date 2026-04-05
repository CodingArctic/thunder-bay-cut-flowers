#include <Arduino.h>
#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include "esp_sleep.h"
#include "time.h"
#include <ArduinoJson.h>
#include "arduino_secrets.h"

#include "ESP32_OV5640_AF.h"

// ===================
// Select camera model
// ===================
#define CAMERA_MODEL_XIAO_ESP32S3
#include "camera_pins.h"

// -------- Debug --------
#define DEBUG_SERIAL 1

void logMsg(const String &msg) {
#if DEBUG_SERIAL
  Serial.println(msg);
#endif
}

// -------- Camera AF helper --------
OV5640 ov5640;

// -------- Server config --------
String serverName = "thunderbay.webdev.gccis.rit.edu";
String serverPath = "/api/record/1";
const char* ssid     = SECRET_SSID;
const char* password = SECRET_PASSWORD;
const char* apiKey   = SECRET_API_KEY;

// -------- Sleep config --------
#define SLEEP_MINUTES 10
#define uS_TO_S_FACTOR 1000000ULL

// -------- Time / NTP config --------
const char* ntpServer1 = "pool.ntp.org";
const char* ntpServer2 = "time.nist.gov";
const char* tzEST = "EST5EDT,M3.2.0,M11.1.0";

// -------- Sunrise/Sunset API --------
const char* sunriseApiBase = "https://api.sunrise-sunset.org/json";
const double LAT = 43.1566;
const double LNG = -77.6088;

// -------- Data --------
struct SunTimes {
  time_t sunrise;
  time_t sunset;
  bool valid;
};

// -------- Forward declarations --------
bool initCamera();
camera_fb_t* captureWithRetry(int attempts = 3);
String sendPhotoHTTP();
bool getSunTimes(SunTimes &st);
bool isDaylightNow(const SunTimes &st);
uint64_t secondsUntilNextSunrise(const SunTimes &st);
time_t utcTmToTimeT(struct tm tmUtc);
bool parseUtcTimestamp(const char* iso8601, time_t &outTime);

void setup() {
  Serial.begin(115200);
  delay(1500);
  Serial.println();
  Serial.println("=== Boot ===");

  if (!initCamera()) {
    Serial.println("Sleeping because camera init failed.");
    delay(2000);
    esp_sleep_enable_timer_wakeup((uint64_t)SLEEP_MINUTES * 60 * uS_TO_S_FACTOR);
    esp_deep_sleep_start();
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  WiFi.setSleep(false);

  Serial.printf("Connecting to WiFi SSID: %s\n", ssid);

  unsigned long startAttempt = millis();
  const unsigned long wifiTimeout = 15000;

  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < wifiTimeout) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connect failed or timed out");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Starting NTP sync...");
    configTzTime(tzEST, ntpServer1, ntpServer2);

    struct tm timeinfo;
    if (getLocalTime(&timeinfo, 10000)) {
      Serial.println("NTP sync OK");
      Serial.print("Local time: ");
      Serial.printf("%04d-%02d-%02d %02d:%02d:%02d\n",
                    timeinfo.tm_year + 1900,
                    timeinfo.tm_mon + 1,
                    timeinfo.tm_mday,
                    timeinfo.tm_hour,
                    timeinfo.tm_min,
                    timeinfo.tm_sec);
    } else {
      Serial.println("NTP sync failed");
    }
  }

  SunTimes st{0, 0, false};
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Fetching sunrise/sunset...");
    st.valid = getSunTimes(st);
    Serial.print("Sun time fetch result: ");
    Serial.println(st.valid ? "OK" : "FAILED");
  } else {
    Serial.println("Skipping sunrise/sunset fetch because WiFi is down");
  }

  if (!st.valid) {
    Serial.println("Sun times invalid, using fallback short sleep.");
    uint64_t sleepSeconds = (uint64_t)SLEEP_MINUTES * 60;
    Serial.printf("Sleeping for %llu seconds\n", sleepSeconds);
    esp_sleep_enable_timer_wakeup(sleepSeconds * uS_TO_S_FACTOR);
    esp_deep_sleep_start();
  }

  if (!isDaylightNow(st)) {
    uint64_t sleepSeconds = secondsUntilNextSunrise(st);
    Serial.printf("Outside daylight hours, sleeping for %llu seconds\n", sleepSeconds);
    esp_sleep_enable_timer_wakeup(sleepSeconds * uS_TO_S_FACTOR);
    esp_deep_sleep_start();
  } else {
    Serial.println("Daylight hours detected, taking photo...");
  }

  if (WiFi.status() == WL_CONNECTED) {
    String response = sendPhotoHTTP();
    Serial.print("Upload response: ");
    Serial.println(response);
  } else {
    Serial.println("WiFi not connected, skipping upload");
  }

  delay(2000);

  uint64_t sleepSeconds = (uint64_t)SLEEP_MINUTES * 60;
  Serial.printf("Sleeping for %llu seconds\n", sleepSeconds);
  esp_sleep_enable_timer_wakeup(sleepSeconds * uS_TO_S_FACTOR);
  esp_deep_sleep_start();
}

void loop() {}

bool initCamera() {
  Serial.println("Initializing camera...");

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

  config.xclk_freq_hz = 10000000;
  config.frame_size = FRAMESIZE_UXGA;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_LATEST;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 12;
  config.fb_count = 2;

  if (!psramFound()) {
    Serial.println("PSRAM not found, falling back to DRAM settings");
    config.frame_size = FRAMESIZE_SVGA;
    config.fb_location = CAMERA_FB_IN_DRAM;
    config.fb_count = 1;
  } else {
    Serial.println("PSRAM found");
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return false;
  }

  Serial.println("Camera init OK");

  sensor_t *s = esp_camera_sensor_get();
  if (!s) {
    Serial.println("Failed to get camera sensor");
    return false;
  }

  s->set_vflip(s, 1);
  s->set_hmirror(s, 1);

  if (s->id.PID == OV3660_PID) {
    s->set_vflip(s, 1);
    s->set_brightness(s, 1);
    s->set_saturation(s, -2);
  }

  s->set_framesize(s, FRAMESIZE_FHD);

  Serial.println("Starting autofocus...");
  ov5640.start(s);
  ov5640.focusInit();
  ov5640.autoFocusMode();

  Serial.println("Waiting for camera/AF to settle...");
  delay(1500);

#if defined(LED_GPIO_NUM)
  setupLedFlash(LED_GPIO_NUM);
#endif

  Serial.println("Camera sensor and autofocus configured");
  return true;
}

camera_fb_t* captureWithRetry(int attempts) {
  for (int i = 1; i <= attempts; i++) {
    Serial.printf("Capture attempt %d/%d\n", i, attempts);

    delay(300);

    camera_fb_t *fb = esp_camera_fb_get();
    if (fb) {
      Serial.print("Capture OK, bytes: ");
      Serial.println(fb->len);
      return fb;
    }

    Serial.println("Capture failed");

    sensor_t *s = esp_camera_sensor_get();
    if (s) {
      Serial.println("Re-triggering autofocus...");
      ov5640.start(s);
      ov5640.focusInit();
      ov5640.autoFocusMode();
    }

    delay(1000);
  }

  Serial.println("All capture attempts failed");
  return nullptr;
}

bool getSunTimes(SunTimes &st) {
  st.valid = false;

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("getSunTimes: WiFi not connected");
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = String(sunriseApiBase) +
               "?lat=" + String(LAT, 6) +
               "&lng=" + String(LNG, 6) +
               "&formatted=0";

  Serial.print("Sunrise API URL: ");
  Serial.println(url);

  if (!http.begin(client, url)) {
    Serial.println("getSunTimes: http.begin failed");
    return false;
  }

  int code = http.GET();
  Serial.print("Sunrise API HTTP code: ");
  Serial.println(code);

  if (code != HTTP_CODE_OK) {
    String errBody = http.getString();
    Serial.println("HTTP body on error:");
    Serial.println(errBody);
    http.end();
    return false;
  }

  String payload = http.getString();
  http.end();

  Serial.println("Raw API payload:");
  Serial.println(payload);

  DynamicJsonDocument doc(4096);
  DeserializationError err = deserializeJson(doc, payload);

  if (err) {
    Serial.print("JSON parse failed: ");
    Serial.println(err.c_str());
    return false;
  }

  const char* status = doc["status"];
  const char* sunriseStr = doc["results"]["sunrise"];
  const char* sunsetStr  = doc["results"]["sunset"];

  Serial.print("API status: ");
  Serial.println(status ? status : "(null)");
  Serial.print("Raw sunrise: ");
  Serial.println(sunriseStr ? sunriseStr : "(null)");
  Serial.print("Raw sunset: ");
  Serial.println(sunsetStr ? sunsetStr : "(null)");

  if (!status || String(status) != "OK") {
    Serial.println("API status not OK");
    return false;
  }

  if (!sunriseStr || !sunsetStr) {
    Serial.println("Missing sunrise or sunset field");
    return false;
  }

  if (!parseUtcTimestamp(sunriseStr, st.sunrise)) {
    Serial.println("Failed to parse sunrise");
    return false;
  }

  if (!parseUtcTimestamp(sunsetStr, st.sunset)) {
    Serial.println("Failed to parse sunset");
    return false;
  }

  st.valid = true;

  Serial.print("Parsed sunrise epoch: ");
  Serial.println((uint32_t)st.sunrise);
  Serial.print("Parsed sunset epoch: ");
  Serial.println((uint32_t)st.sunset);

  return true;
}

bool parseUtcTimestamp(const char* iso8601, time_t &outTime) {
  struct tm tmUtc = {};
  int year, month, day, hour, minute, second;

  Serial.print("Parsing UTC timestamp: ");
  Serial.println(iso8601);

  if (strlen(iso8601) < 19) {
    Serial.println("Timestamp too short");
    return false;
  }

  char buf[20];
  memcpy(buf, iso8601, 19);
  buf[19] = '\0';

  if (sscanf(buf, "%d-%d-%dT%d:%d:%d",
             &year, &month, &day, &hour, &minute, &second) != 6) {
    Serial.println("sscanf parse failed");
    return false;
  }

  tmUtc.tm_year = year - 1900;
  tmUtc.tm_mon  = month - 1;
  tmUtc.tm_mday = day;
  tmUtc.tm_hour = hour;
  tmUtc.tm_min  = minute;
  tmUtc.tm_sec  = second;
  tmUtc.tm_isdst = 0;

  outTime = utcTmToTimeT(tmUtc);

  Serial.print("Converted epoch: ");
  Serial.println((uint32_t)outTime);

  return true;
}

time_t utcTmToTimeT(struct tm tmUtc) {
  char* oldTz = getenv("TZ");
  String savedTz = oldTz ? String(oldTz) : String("");

  setenv("TZ", "UTC0", 1);
  tzset();

  time_t t = mktime(&tmUtc);

  if (savedTz.length() > 0) {
    setenv("TZ", savedTz.c_str(), 1);
  } else {
    unsetenv("TZ");
  }
  tzset();

  return t;
}

bool isDaylightNow(const SunTimes &st) {
  struct tm nowTm;
  if (!getLocalTime(&nowTm)) {
    Serial.println("isDaylightNow: getLocalTime failed, assuming daylight");
    return true;
  }

  time_t now = mktime(&nowTm);

  Serial.print("Now epoch: ");
  Serial.println((uint32_t)now);
  Serial.print("Sunrise epoch: ");
  Serial.println((uint32_t)st.sunrise);
  Serial.print("Sunset epoch: ");
  Serial.println((uint32_t)st.sunset);

  bool daylight = (now >= st.sunrise && now < st.sunset);
  Serial.print("Daylight result: ");
  Serial.println(daylight ? "true" : "false");

  return daylight;
}

uint64_t secondsUntilNextSunrise(const SunTimes &st) {
  struct tm nowTm;
  if (!getLocalTime(&nowTm)) {
    Serial.println("secondsUntilNextSunrise: getLocalTime failed, using 8 hours");
    return 8ULL * 3600ULL;
  }

  time_t now = mktime(&nowTm);

  Serial.print("Now epoch: ");
  Serial.println((uint32_t)now);

  if (now < st.sunrise) {
    uint64_t delta = (uint64_t)(st.sunrise - now);
    Serial.print("Sleeping until today's sunrise in seconds: ");
    Serial.println((uint32_t)delta);
    return delta;
  }

  uint64_t delta = (uint64_t)((st.sunrise + 24 * 3600) - now);
  Serial.print("Sleeping until tomorrow's sunrise in seconds: ");
  Serial.println((uint32_t)delta);
  return delta;
}

String sendPhotoHTTP() {
  Serial.println("Capturing photo...");
  camera_fb_t *fb = captureWithRetry(3);
  if (!fb) {
    Serial.println("Camera capture failed after retries");
    return "capture_failed";
  }

  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();

  String url = "https://" + serverName + serverPath;
  Serial.print("POST URL: ");
  Serial.println(url);

  http.begin(client, url);

  String boundary = "Esp32Boundary";
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
  http.addHeader("x-api-key", apiKey);

  Serial.println("Added header: x-api-key");

  String head =
    "--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"flower\"; filename=\"esp32.jpg\"\r\n"
    "Content-Type: image/jpeg\r\n\r\n";

  String tail =
    "\r\n--" + boundary + "--\r\n";

  uint32_t totalLen = head.length() + fb->len + tail.length();
  Serial.print("Upload payload size: ");
  Serial.println(totalLen);

  uint8_t *payload = (uint8_t*)malloc(totalLen);
  if (!payload) {
    Serial.println("malloc failed");
    esp_camera_fb_return(fb);
    http.end();
    return "malloc_failed";
  }

  memcpy(payload, head.c_str(), head.length());
  memcpy(payload + head.length(), fb->buf, fb->len);
  memcpy(payload + head.length() + fb->len, tail.c_str(), tail.length());

  esp_camera_fb_return(fb);

  Serial.println("Sending POST...");
  int httpResponseCode = http.POST(payload, totalLen);
  free(payload);

  Serial.print("HTTP response code: ");
  Serial.println(httpResponseCode);

  String response = "";
  if (httpResponseCode > 0) {
    response = http.getString();
    Serial.print("Response body: ");
    Serial.println(response);
  } else {
    Serial.println("POST failed");
  }

  http.end();
  return response;
}