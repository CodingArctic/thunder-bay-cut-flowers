#include <Arduino.h>
#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include "esp_sleep.h"

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
#define SLEEP_MINUTES   10
#define uS_TO_S_FACTOR  1000000ULL

// Forward declarations
String sendPhotoHTTP();

// Optional: LED flash setup if defined by camera_pins.h


void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();
  Serial.println("Booting, initializing camera...");

  // ----- Camera configuration -----
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
  config.frame_size   = FRAMESIZE_UXGA;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location  = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 12;
  config.fb_count     = 1;

  if (config.pixel_format == PIXFORMAT_JPEG) {
    if (psramFound()) {
      config.jpeg_quality = 10;
      config.fb_count     = 2;
      config.grab_mode    = CAMERA_GRAB_LATEST;
    } else {
      config.frame_size   = FRAMESIZE_SVGA;
      config.fb_location  = CAMERA_FB_IN_DRAM;
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
    Serial.printf("Camera init failed with error 0x%x\n", err);
    delay(2000);
    // If camera fails, still go to sleep to save power
    esp_sleep_enable_timer_wakeup((uint64_t)SLEEP_MINUTES * 60 * uS_TO_S_FACTOR);
    esp_deep_sleep_start();
  }

  sensor_t *s = esp_camera_sensor_get();

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
  if (ov5640.focusInit() == 0) {
    Serial.println("OV5640_Focus_Init Successful!");
  } else {
    Serial.println("OV5640_Focus_Init Failed");
  }

  if (ov5640.autoFocusMode() == 0) {
    Serial.println("OV5640_Auto_Focus Enabled");
  } else {
    Serial.println("OV5640_Auto_Focus Failed");
  }

#if defined(LED_GPIO_NUM)
  setupLedFlash(LED_GPIO_NUM);
#endif

  // ----- WiFi connect -----
  Serial.println("Connecting to WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  WiFi.setSleep(false);

  unsigned long startAttempt = millis();
  const unsigned long wifiTimeout = 15000; // 15s timeout

  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < wifiTimeout) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connection failed, continuing without upload.");
  }

  // ----- Take photo and upload -----
  if (WiFi.status() == WL_CONNECTED) {
    String res = sendPhotoHTTP();
    Serial.println("Upload result:");
    Serial.println(res);
  }

  // Small delay for logs to flush
  delay(2000);

  // ----- Deep sleep -----
  Serial.printf("Going to deep sleep for %d minutes...\n", SLEEP_MINUTES);
  Serial.flush();

  esp_sleep_enable_timer_wakeup((uint64_t)SLEEP_MINUTES * 60 * uS_TO_S_FACTOR);
  esp_deep_sleep_start();
}

void loop() {
  // Not used; device sleeps from setup()
}

// HTTPS multipart upload
String sendPhotoHTTP() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return "capture_failed";
  }

  Serial.print("Image size: ");
  Serial.print(fb->len);
  Serial.println(" bytes");

  HTTPClient http;
  WiFiClientSecure client;

  client.setInsecure(); // no certificate validation

  String url = "https://" + serverName + serverPath;
  Serial.println("Posting to: " + url);

  http.begin(client, url);
  http.addHeader("Content-Type", "multipart/form-data; boundary=Esp32Boundary");

  String boundary = "Esp32Boundary";
  String head =
    "--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"flower\"; filename=\"esp32.jpg\"\r\n"
    "Content-Type: image/jpeg\r\n\r\n";
  String tail =
    "\r\n--" + boundary + "--\r\n";

  uint32_t totalLen = head.length() + fb->len + tail.length();

  uint8_t *payload = (uint8_t*)malloc(totalLen);
  if (!payload) {
    Serial.println("Failed to allocate memory");
    esp_camera_fb_return(fb);
    return "malloc_failed";
  }

  memcpy(payload, head.c_str(), head.length());
  memcpy(payload + head.length(), fb->buf, fb->len);
  memcpy(payload + head.length() + fb->len, tail.c_str(), tail.length());

  esp_camera_fb_return(fb);

  Serial.println("Sending POST request...");
  int httpResponseCode = http.POST(payload, totalLen);

  free(payload);

  String response = "";
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    response = http.getString();
    Serial.println("Response:");
    Serial.println(response);
  } else {
    Serial.print("Error code: ");
    Serial.println(httpResponseCode);
  }

  http.end();
  return response;
}
