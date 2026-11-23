#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <Preferences.h>
#include <time.h>

const char* DEFAULT_WIFI_SSID = "ISI_NAMA_WIFI";
const char* DEFAULT_WIFI_PASSWORD = "ISI_PASSWORD_WIFI";
const char* FIREBASE_HOST = "smart-greenhouse-esp32-default-rtdb.asia-southeast1.firebasedatabase.app";
const char* FIREBASE_AUTH_TOKEN = "";

const char* FIREBASE_ROOT_CA =
"-----BEGIN CERTIFICATE-----\n"
"MIIFVzCCAz+gAwIBAgINAgPlk28xsBNJiGuiFzANBgkqhkiG9w0BAQwFADBHMQsw\n"
"CQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2VzIExMQzEU\n"
"MBIGA1UEAxMLR1RTIFJvb3QgUjEwHhcNMTYwNjIyMDAwMDAwWhcNMzYwNjIyMDAw\n"
"MDAwWjBHMQswCQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZp\n"
"Y2VzIExMQzEUMBIGA1UEAxMLR1RTIFJvb3QgUjEwggIiMA0GCSqGSIb3DQEBAQUA\n"
"A4ICDwAwggIKAoICAQC2EQKLHuOhd5s73L+UPreVp0A8of2C+X0yBoJx9vaMf/vo\n"
"27xqLpeXo4xL+Sv2sfnOhB2x+cWX3u+58qPpvBKJXqeqUqv4IyfLpLGcY9vXmX7w\n"
"Cl7raKb0xlpHDU0QM+NOsROjyBhsS+z8CZDfnWQpJSMHobTSPS5g4M/SCYe7zUjw\n"
"TcLCeoiKu7rPWRnWr4+wB7CeMfGCwcDfLqZtbBkOtdh+JhpFAz2weaSUKK0Pfybl\n"
"qAj+lug8aJRT7oM6iCsVlgmy4HqMLnXWnOunVmSPlk9orj2XwoSPwLxAwAtcvfaH\n"
"szVsrBhQf4TgTM2S0yDpM7xSma8ytSmzJSq0SPly4cpk9+aCEI3oncKKiPo4Zor8\n"
"Y/kB+Xj9e1x3+naH+uzfsQ55lVe0vSbv1gHR6xYKu44LtcXFilWr06zqkUspzBmk\n"
"MiVOKvFlRNACzqrOSbTqn3yDsEB750Orp2yjj32JgfpMpf/VjsPOS+C12LOORc92\n"
"wO1AK/1TD7Cn1TsNsYqiA94xrcx36m97PtbfkSIS5r762DL8EGMUUXLeXdYWk70p\n"
"aDPvOmbsB4om3xPXV2V4J95eSRQAogB/mqghtqmxlbCluQ0WEdrHbEg8QOB+DVrN\n"
"VjzRlwW5y0vtOUucxD/SVRNuJLDWcfr0wbrM7Rv1/oFB2ACYPTrIrnqYNxgFlQID\n"
"AQABo0IwQDAOBgNVHQ8BAf8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4E\n"
"FgQU5K8rJnEaK0gnhS9SZizv8IkTcT4wDQYJKoZIhvcNAQEMBQADggIBAJ+qQibb\n"
"C5u+/x6Wki4+omVKapi6Ist9wTrYggoGxval3sBOh2Z5ofmmWJyq+bXmYOfg6LEe\n"
"QkEzCzc9zolwFcq1JKjPa7XSQCGYzyI0zzvFIoTgxQ6KfF2I5DUkzps+GlQebtuy\n"
"h6f88/qBVRRiClmpIgUxPoLW7ttXNLwzldMXG+gnoot7TiYaelpkttGsN/H9oPM4\n"
"7HLwEXWdyzRSjeZ2axfG34arJ45JK3VmgRAhpuo+9K4l/3wV3s6MJT/KYnAK9y8J\n"
"ZgfIPxz88NtFMN9iiMG1D53Dn0reWVlHxYciNuaCp+0KueIHoI17eko8cdLiA6Ef\n"
"MgfdG+RCzgwARWGAtQsgWSl4vflVy2PFPEz0tv/bal8xa5meLMFrUKTX5hgUvYU/\n"
"Z6tGn6D/Qqc6f1zLXbBwHSs09dR2CQzreExZBfMzQsNhFRAbd03OIozUhfJFfbdT\n"
"6u9AWpQKXCBfTkBdYiJ23//OYb2MI3jSNwLgjt7RETeJ9r/tSQdirpLsQBqvFAnZ\n"
"0E6yove+7u7Y/9waLd64NnHi/Hm3lCXRSHNboTXns5lndcEZOitHTtNCjv0xyBZm\n"
"2tIMPNuzjsmhDYAPexZ3FL//2wmUspO8IFgV6dtxQ/PeEMMA3KgqlbbC1j+Qa3bb\n"
"bP6MvPJwNQzcmRk13NfIRmPVNnGuV/u3gm3c\n"
"-----END CERTIFICATE-----\n";

const int PIN_TANAH = 0;
const int PIN_CAHAYA = 1;
const int PIN_DHT = 3;
const int PIN_TRIG = 4;
const int PIN_ECHO = 5;
const int PIN_POMPA = 6;
const int PIN_KIPAS = 7;
const int PIN_LAMPU = 10;
const int PIN_SERVO = 21;

const int RELAY_AKTIF = LOW;
const int RELAY_MATI = HIGH;
const int RELAY_LAMPU_AKTIF = HIGH;
const int RELAY_LAMPU_MATI = LOW;

const int ADC_MAKS = 4095;
const int JUMLAH_SAMPEL = 5;
const int BATAS_SELISIH_ADC = 800;

const int TANAH_ADC_KERING = 3200;
const int TANAH_ADC_BASAH = 1200;
const int CAHAYA_ADC_GELAP = 0;
const int CAHAYA_ADC_TERANG = 4095;

const int DEFAULT_TANAH_NYALA = 35;
const int DEFAULT_TANAH_MATI = 55;
const float DEFAULT_SUHU_NYALA = 30.0;
const float DEFAULT_SUHU_MATI = 27.0;
const int DEFAULT_CAHAYA_GELAP = 30;
const int DEFAULT_CAHAYA_TERANG = 45;
const float DEFAULT_JARAK_KOSONG = 15.0;
const float DEFAULT_JARAK_PENUH = 3.0;
const int DEFAULT_AIR_RENDAH = 20;
const int DEFAULT_SUDUT_TUTUP = 0;
const int DEFAULT_SUDUT_BUKA = 90;

int tanahNyalaPompa = DEFAULT_TANAH_NYALA;
int tanahMatiPompa = DEFAULT_TANAH_MATI;
float suhuNyalaKipas = DEFAULT_SUHU_NYALA;
float suhuMatiKipas = DEFAULT_SUHU_MATI;
int cahayaGelap = DEFAULT_CAHAYA_GELAP;
int cahayaTerang = DEFAULT_CAHAYA_TERANG;
float jarakKosongCm = DEFAULT_JARAK_KOSONG;
float jarakPenuhCm = DEFAULT_JARAK_PENUH;
int airRendahPersen = DEFAULT_AIR_RENDAH;
int sudutTutup = DEFAULT_SUDUT_TUTUP;
int sudutBuka = DEFAULT_SUDUT_BUKA;

String wifiSsidAktif = DEFAULT_WIFI_SSID;
String wifiPassAktif = DEFAULT_WIFI_PASSWORD;
bool wifiPakaiDefault = true;
String wifiPesan = "Menggunakan Wi-Fi default dari firmware";
String wifiReqTerakhir = "";

const unsigned long JEDA_SENSOR = 500;
const unsigned long JEDA_FIREBASE = 450;
const unsigned long JEDA_SAMBUNG_ULANG = 10000;
const unsigned long BATAS_WAKTU_WIFI = 15000;
const int BATAS_GAGAL = 5;

DHT dht(PIN_DHT, DHT22);
Preferences prefs;
WiFiClientSecure klienTls;
HTTPClient httpFb;
portMUX_TYPE muxData = portMUX_INITIALIZER_UNLOCKED;

int kelembapanTanah = -1;
int adcTanahTerakhir = -1;
int intensitasCahaya = -1;
int tinggiAir = -1;
float suhu = NAN;
float kelembapanUdara = NAN;

bool pompaMenyala = false;
bool kipasMenyala = false;
bool lampuMenyala = false;
bool ventilasiBuka = false;
int sudutTerakhir = -1;

bool modeManual = false;
int gagalBeruntun = 0;

unsigned long waktuSensorTerakhir = 0;
unsigned long waktuFirebaseTerakhir = 0;
unsigned long waktuWifiTerakhir = 0;

void muatWifiLokal() {
  prefs.begin("gh_wifi", true);
  bool kustom = prefs.getBool("custom", false);
  String s = prefs.getString("ssid", "");
  String p = prefs.getString("pass", "");
  prefs.end();

  if (kustom && s.length() > 0) {
    wifiSsidAktif = s;
    wifiPassAktif = p;
    wifiPakaiDefault = false;
    wifiPesan = "Menggunakan Wi-Fi tersimpan di NVS";
  } else {
    wifiSsidAktif = DEFAULT_WIFI_SSID;
    wifiPassAktif = DEFAULT_WIFI_PASSWORD;
    wifiPakaiDefault = true;
    wifiPesan = "Menggunakan Wi-Fi default dari firmware";
  }
}

void simpanWifiLokal(const String &ssid, const String &pass, bool pakaiDefault) {
  prefs.begin("gh_wifi", false);
  if (pakaiDefault) {
    prefs.clear();
  } else {
    prefs.putBool("custom", true);
    prefs.putString("ssid", ssid);
    prefs.putString("pass", pass);
  }
  prefs.end();
}

void muatBatasLokal() {
  prefs.begin("gh_cfg", true);
  tanahNyalaPompa = prefs.getInt("soilOn", DEFAULT_TANAH_NYALA);
  tanahMatiPompa = prefs.getInt("soilOff", DEFAULT_TANAH_MATI);
  suhuNyalaKipas = prefs.getFloat("tempOn", DEFAULT_SUHU_NYALA);
  suhuMatiKipas = prefs.getFloat("tempOff", DEFAULT_SUHU_MATI);
  cahayaGelap = prefs.getInt("lightOn", DEFAULT_CAHAYA_GELAP);
  cahayaTerang = prefs.getInt("lightOff", DEFAULT_CAHAYA_TERANG);
  jarakKosongCm = prefs.getFloat("emptyCm", DEFAULT_JARAK_KOSONG);
  jarakPenuhCm = prefs.getFloat("fullCm", DEFAULT_JARAK_PENUH);
  airRendahPersen = prefs.getInt("waterLow", DEFAULT_AIR_RENDAH);
  sudutTutup = prefs.getInt("sClose", DEFAULT_SUDUT_TUTUP);
  sudutBuka = prefs.getInt("sOpen", DEFAULT_SUDUT_BUKA);
  prefs.end();
}

void simpanBatasLokal() {
  prefs.begin("gh_cfg", false);
  prefs.putInt("soilOn", tanahNyalaPompa);
  prefs.putInt("soilOff", tanahMatiPompa);
  prefs.putFloat("tempOn", suhuNyalaKipas);
  prefs.putFloat("tempOff", suhuMatiKipas);
  prefs.putInt("lightOn", cahayaGelap);
  prefs.putInt("lightOff", cahayaTerang);
  prefs.putFloat("emptyCm", jarakKosongCm);
  prefs.putFloat("fullCm", jarakPenuhCm);
  prefs.putInt("waterLow", airRendahPersen);
  prefs.putInt("sClose", sudutTutup);
  prefs.putInt("sOpen", sudutBuka);
  prefs.end();
}

void tulisRelay(int pin, bool menyala) {
  if (pin == PIN_LAMPU) {
    digitalWrite(pin, menyala ? RELAY_LAMPU_AKTIF : RELAY_LAMPU_MATI);
  } else {
    digitalWrite(pin, menyala ? RELAY_AKTIF : RELAY_MATI);
  }
}

void siapkanRelay(int pin) {
  int nilaiMati = (pin == PIN_LAMPU) ? RELAY_LAMPU_MATI : RELAY_MATI;
  digitalWrite(pin, nilaiMati);
  pinMode(pin, OUTPUT);
  digitalWrite(pin, nilaiMati);
}

void tulisServoSudut(int sudut) {
  int s = constrain(sudut, 0, 180);
  uint32_t pulseUs = (uint32_t)map(s, 0, 180, 500, 2400);
  uint32_t duty = (pulseUs * 16383UL) / 20000UL;
  ledcWrite(PIN_SERVO, duty);
}

void siapkanServo() {
  ledcAttach(PIN_SERVO, 50, 14);
  for (int pos = 0; pos <= 90; pos += 5) {
    tulisServoSudut(pos);
    delay(12);
  }
  for (int pos = 90; pos >= 0; pos -= 5) {
    tulisServoSudut(pos);
    delay(12);
  }
  tulisServoSudut(sudutTutup);
  sudutTerakhir = sudutTutup;
}

bool cobaSambungWifi(const String &ssid, const String &pass) {
  WiFi.disconnect(true);
  delay(200);
  WiFi.mode(WIFI_STA);
  WiFi.setTxPower(WIFI_POWER_8_5dBm);
  WiFi.setAutoReconnect(true);
  WiFi.begin(ssid.c_str(), pass.c_str());

  unsigned long mulai = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - mulai < BATAS_WAKTU_WIFI) {
    delay(200);
  }
  return WiFi.status() == WL_CONNECTED;
}

void sambungWifi() {
  Serial.printf("Menyambungkan Wi-Fi: %s...\n", wifiSsidAktif.c_str());
  if (cobaSambungWifi(wifiSsidAktif, wifiPassAktif)) {
    Serial.println("Wi-Fi terhubung");
    return;
  }

  if (!wifiPakaiDefault) {
    Serial.println("Wi-Fi kustom gagal, mencoba Wi-Fi default firmware...");
    if (cobaSambungWifi(DEFAULT_WIFI_SSID, DEFAULT_WIFI_PASSWORD)) {
      wifiSsidAktif = DEFAULT_WIFI_SSID;
      wifiPassAktif = DEFAULT_WIFI_PASSWORD;
      wifiPakaiDefault = true;
      wifiPesan = "Fallback ke Wi-Fi default karena Wi-Fi kustom gagal";
      simpanWifiLokal("", "", true);
      Serial.println("Terhubung ke Wi-Fi default");
      return;
    }
  }

  Serial.println("Wi-Fi gagal, sistem berjalan otomatis secara lokal");
}

int bacaAdcStabil(int pin, bool &valid) {
  int terkecil = ADC_MAKS;
  int terbesar = 0;
  long total = 0;

  for (int i = 0; i < JUMLAH_SAMPEL; i++) {
    int nilai = analogRead(pin);
    total += nilai;
    if (nilai < terkecil) terkecil = nilai;
    if (nilai > terbesar) terbesar = nilai;
    delay(3);
  }

  valid = (terbesar - terkecil) <= BATAS_SELISIH_ADC;
  return (int)(total / JUMLAH_SAMPEL);
}

int bacaKelembapanTanah() {
  bool valid = false;
  int adc = bacaAdcStabil(PIN_TANAH, valid);
  adcTanahTerakhir = adc;
  if (!valid) return -1;
  int persen = map(adc, TANAH_ADC_KERING, TANAH_ADC_BASAH, 0, 100);
  return constrain(persen, 0, 100);
}

int bacaIntensitasCahaya() {
  bool valid = false;
  int adc = bacaAdcStabil(PIN_CAHAYA, valid);
  if (!valid) return -1;
  int persen = map(adc, CAHAYA_ADC_GELAP, CAHAYA_ADC_TERANG, 0, 100);
  return constrain(persen, 0, 100);
}

float bacaJarakCm() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  unsigned long durasi = pulseIn(PIN_ECHO, HIGH, 25000UL);
  if (durasi == 0) return -1.0;
  return durasi * 0.0343 / 2.0;
}

int bacaTinggiAir() {
  float jarak = bacaJarakCm();
  if (jarak < 0) return -1;
  float rentang = jarakKosongCm - jarakPenuhCm;
  if (rentang < 1.0) rentang = 1.0;
  float persen = (jarakKosongCm - jarak) * 100.0 / rentang;
  return constrain((int)persen, 0, 100);
}

void bacaSemuaSensor() {
  kelembapanTanah = bacaKelembapanTanah();
  intensitasCahaya = bacaIntensitasCahaya();
  tinggiAir = bacaTinggiAir();
  suhu = dht.readTemperature();
  kelembapanUdara = dht.readHumidity();
}

void kendaliOtomatis() {
  if (kelembapanTanah < 0) {
    pompaMenyala = false;
  } else if (kelembapanTanah < tanahNyalaPompa) {
    pompaMenyala = true;
  } else if (kelembapanTanah >= tanahMatiPompa) {
    pompaMenyala = false;
  }

  if (isnan(suhu)) {
    kipasMenyala = false;
    ventilasiBuka = false;
  } else if (suhu > suhuNyalaKipas) {
    kipasMenyala = true;
    ventilasiBuka = true;
  } else if (suhu < suhuMatiKipas) {
    kipasMenyala = false;
    ventilasiBuka = false;
  }

  if (intensitasCahaya < 0) {
    lampuMenyala = false;
  } else if (intensitasCahaya < cahayaGelap) {
    lampuMenyala = true;
  } else if (intensitasCahaya > cahayaTerang) {
    lampuMenyala = false;
  }
}

void terapkanKeluaran() {
  if (kelembapanTanah < 0) {
    pompaMenyala = false;
  }

  tulisRelay(PIN_POMPA, pompaMenyala);
  tulisRelay(PIN_KIPAS, kipasMenyala);
  tulisRelay(PIN_LAMPU, lampuMenyala);

  int targetSudut = ventilasiBuka ? sudutBuka : sudutTutup;
  if (targetSudut != sudutTerakhir) {
    tulisServoSudut(targetSudut);
    sudutTerakhir = targetSudut;
  }
}

void cetakStatus() {
  const char* mode = modeManual ? "MANUAL" : "AUTO";

  Serial.printf("T=%.1f H=%.1f | soil=%d%% (adc=%d) light=%d%%\n",
                suhu, kelembapanUdara, kelembapanTanah, adcTanahTerakhir, intensitasCahaya);
  Serial.printf("water=%d%% | fan=%s(%d) lamp=%s(%d) pump=%s(%d) servo=%s(%d,%ddeg)\n",
                tinggiAir, mode, kipasMenyala, mode, lampuMenyala, mode, pompaMenyala, mode, ventilasiBuka, sudutTerakhir);

  if (tinggiAir < 0) {
    Serial.println("PERINGATAN: sensor air tidak terbaca!");
  } else if (tinggiAir < airRendahPersen) {
    Serial.println("PERINGATAN: air rendah!");
  }
}

String teksBool(bool nilai) {
  return nilai ? "true" : "false";
}

String escapeJson(const String &s) {
  String out = "";
  for (unsigned int i = 0; i < s.length(); i++) {
    char c = s[i];
    if (c == '\"' || c == '\\') out += '\\';
    out += c;
  }
  return out;
}

float nilaiAman(float nilai) {
  return isnan(nilai) ? -99.0 : nilai;
}

String susunDataSensor() {
  String json = "{";
  json += "\"soilMoisture\":" + String(kelembapanTanah);
  json += ",\"temperature\":" + String(nilaiAman(suhu), 1);
  json += ",\"humidity\":" + String(nilaiAman(kelembapanUdara), 1);
  json += ",\"light\":" + String(intensitasCahaya);
  json += ",\"waterLevel\":" + String(tinggiAir);
  json += "}";
  return json;
}

String susunDataAktuator() {
  String json = "{";
  json += "\"pump\":" + teksBool(pompaMenyala);
  json += ",\"fan\":" + teksBool(kipasMenyala);
  json += ",\"lamp\":" + teksBool(lampuMenyala);
  json += ",\"servo\":" + teksBool(ventilasiBuka);
  json += "}";
  return json;
}

String susunDataBatas() {
  String json = "{";
  json += "\"soilOn\":" + String(tanahNyalaPompa);
  json += ",\"soilOff\":" + String(tanahMatiPompa);
  json += ",\"tempOn\":" + String(suhuNyalaKipas, 1);
  json += ",\"tempOff\":" + String(suhuMatiKipas, 1);
  json += ",\"lightOn\":" + String(cahayaGelap);
  json += ",\"lightOff\":" + String(cahayaTerang);
  json += ",\"waterLow\":" + String(airRendahPersen);
  json += ",\"tankEmptyCm\":" + String(jarakKosongCm, 1);
  json += ",\"tankFullCm\":" + String(jarakPenuhCm, 1);
  json += ",\"servoClose\":" + String(sudutTutup);
  json += ",\"servoOpen\":" + String(sudutBuka);
  json += "}";
  return json;
}

String susunDataKoneksi() {
  String json = "{";
  json += "\"esp32Status\":\"online\"";
  json += ",\"wifiSsid\":\"" + escapeJson(wifiSsidAktif) + "\"";
  json += ",\"wifiDefault\":" + teksBool(wifiPakaiDefault);
  json += ",\"wifiMsg\":\"" + escapeJson(wifiPesan) + "\"";
  json += "}";
  return json;
}

String ambilObjek(const String &json, const char* kunci) {
  String cari = String("\"") + kunci + "\":{";
  int pos = json.indexOf(cari);
  if (pos < 0) return "";
  int start = pos + cari.length() - 1;
  int depth = 0;
  bool inStr = false;
  for (int i = start; i < (int)json.length(); i++) {
    char c = json[i];
    if (c == '\"' && (i == 0 || json[i - 1] != '\\')) inStr = !inStr;
    if (!inStr) {
      if (c == '{') depth++;
      else if (c == '}') {
        depth--;
        if (depth == 0) return json.substring(start, i + 1);
      }
    }
  }
  return "";
}

bool nilaiBenar(const String &json, const char* kunci) {
  String cari = String("\"") + kunci + "\":true";
  return json.indexOf(cari) >= 0;
}

bool adaKunci(const String &json, const char* kunci) {
  String cari = String("\"") + kunci + "\":";
  return json.indexOf(cari) >= 0;
}

bool ambilAngka(const String &json, const char* kunci, float &keluar) {
  String cari = String("\"") + kunci + "\":";
  int pos = json.indexOf(cari);
  if (pos < 0) return false;
  pos += cari.length();
  while (pos < (int)json.length() && (json[pos] == ' ' || json[pos] == '\"')) pos++;
  int akhir = pos;
  while (akhir < (int)json.length() && (isDigit(json[akhir]) || json[akhir] == '.' || json[akhir] == '-')) akhir++;
  if (akhir == pos) return false;
  keluar = json.substring(pos, akhir).toFloat();
  return true;
}

bool ambilTeks(const String &json, const char* kunci, String &keluar) {
  String cari = String("\"") + kunci + "\":\"";
  int pos = json.indexOf(cari);
  if (pos < 0) return false;
  pos += cari.length();
  String hasil = "";
  while (pos < (int)json.length()) {
    char c = json[pos++];
    if (c == '\\' && pos < (int)json.length()) {
      hasil += json[pos++];
    } else if (c == '\"') {
      keluar = hasil;
      return true;
    } else {
      hasil += c;
    }
  }
  return false;
}

void terapkanBatasDariJson(const String &json) {
  float v = 0;
  int nSoilOn = tanahNyalaPompa;
  int nSoilOff = tanahMatiPompa;
  float nTempOn = suhuNyalaKipas;
  float nTempOff = suhuMatiKipas;
  int nLightOn = cahayaGelap;
  int nLightOff = cahayaTerang;
  int nWaterLow = airRendahPersen;
  float nEmptyCm = jarakKosongCm;
  float nFullCm = jarakPenuhCm;
  int nSClose = sudutTutup;
  int nSOpen = sudutBuka;

  if (ambilAngka(json, "soilOn", v)) nSoilOn = constrain((int)round(v), 0, 99);
  if (ambilAngka(json, "soilOff", v)) nSoilOff = constrain((int)round(v), 1, 100);
  if (ambilAngka(json, "tempOn", v)) nTempOn = constrain(v, 5.0, 60.0);
  if (ambilAngka(json, "tempOff", v)) nTempOff = constrain(v, 0.0, 59.0);
  if (ambilAngka(json, "lightOn", v)) nLightOn = constrain((int)round(v), 0, 99);
  if (ambilAngka(json, "lightOff", v)) nLightOff = constrain((int)round(v), 1, 100);
  if (ambilAngka(json, "waterLow", v)) nWaterLow = constrain((int)round(v), 5, 80);
  if (ambilAngka(json, "tankEmptyCm", v)) nEmptyCm = constrain(v, 5.0, 200.0);
  if (ambilAngka(json, "tankFullCm", v)) nFullCm = constrain(v, 1.0, 195.0);
  if (ambilAngka(json, "servoClose", v)) nSClose = constrain((int)round(v), 0, 180);
  if (ambilAngka(json, "servoOpen", v)) nSOpen = constrain((int)round(v), 0, 180);

  bool berubah = false;
  if (nSoilOn < nSoilOff && (nSoilOn != tanahNyalaPompa || nSoilOff != tanahMatiPompa)) {
    tanahNyalaPompa = nSoilOn;
    tanahMatiPompa = nSoilOff;
    berubah = true;
  }
  if (nTempOff < nTempOn && (fabs(nTempOn - suhuNyalaKipas) >= 0.05 || fabs(nTempOff - suhuMatiKipas) >= 0.05)) {
    suhuNyalaKipas = nTempOn;
    suhuMatiKipas = nTempOff;
    berubah = true;
  }
  if (nLightOn < nLightOff && (nLightOn != cahayaGelap || nLightOff != cahayaTerang)) {
    cahayaGelap = nLightOn;
    cahayaTerang = nLightOff;
    berubah = true;
  }
  if (nWaterLow != airRendahPersen) {
    airRendahPersen = nWaterLow;
    berubah = true;
  }
  if (nFullCm < nEmptyCm && (fabs(nEmptyCm - jarakKosongCm) >= 0.05 || fabs(nFullCm - jarakPenuhCm) >= 0.05)) {
    jarakKosongCm = nEmptyCm;
    jarakPenuhCm = nFullCm;
    berubah = true;
  }
  if (nSClose != sudutTutup || nSOpen != sudutBuka) {
    sudutTutup = nSClose;
    sudutBuka = nSOpen;
    berubah = true;
  }

  if (berubah) {
    simpanBatasLokal();
    Serial.println("Ambang otomatisasi diperbarui dan disimpan ke memori lokal");
  }
}

String buatUriFirebase(const String &jalur) {
  String uri = jalur + ".json";
  if (strlen(FIREBASE_AUTH_TOKEN) > 0 && strcmp(FIREBASE_AUTH_TOKEN, "ISI_AUTH_TOKEN") != 0) {
    uri += "?auth=" + String(FIREBASE_AUTH_TOKEN);
  }
  return uri;
}

bool firebaseRequest(const char* method, const String &jalur, const String &body, String &hasil) {
  String uri = buatUriFirebase(jalur);
  httpFb.setReuse(true);
  if (!httpFb.begin(klienTls, FIREBASE_HOST, 443, uri, true)) return false;
  httpFb.setTimeout(3500);
  int kode = -1;
  if (strcmp(method, "GET") == 0) {
    kode = httpFb.GET();
  } else {
    httpFb.addHeader("Content-Type", "application/json");
    kode = httpFb.sendRequest(method, body);
  }
  bool berhasil = (kode == 200);
  if (berhasil && strcmp(method, "GET") == 0) hasil = httpFb.getString();
  httpFb.end();
  return berhasil;
}

void prosesPerintahWifi(const String &json) {
  String aksi = "";
  String reqId = "";
  if (!ambilTeks(json, "action", aksi)) return;
  ambilTeks(json, "reqId", reqId);
  if (reqId.length() > 0 && reqId == wifiReqTerakhir) return;
  wifiReqTerakhir = reqId;

  String dummy;
  firebaseRequest("PUT", "/greenhouse/commands/wifi", "null", dummy);

  String lamaSsid = wifiSsidAktif;
  String lamaPass = wifiPassAktif;
  bool lamaDefault = wifiPakaiDefault;

  if (aksi == "reset") {
    Serial.println("Mereset Wi-Fi ke default bawaan firmware...");
    if (cobaSambungWifi(DEFAULT_WIFI_SSID, DEFAULT_WIFI_PASSWORD)) {
      wifiSsidAktif = DEFAULT_WIFI_SSID;
      wifiPassAktif = DEFAULT_WIFI_PASSWORD;
      wifiPakaiDefault = true;
      wifiPesan = "Wi-Fi berhasil direset ke default firmware";
      simpanWifiLokal("", "", true);
    } else {
      cobaSambungWifi(lamaSsid, lamaPass);
      wifiPesan = "Gagal menyambung ke Wi-Fi default, kembali ke Wi-Fi sebelumnya";
    }
    return;
  }

  if (aksi == "update") {
    String baruSsid = "";
    String baruPass = "";
    if (!ambilTeks(json, "ssid", baruSsid) || baruSsid.length() == 0) return;
    ambilTeks(json, "password", baruPass);

    Serial.printf("Mencoba Wi-Fi baru: %s...\n", baruSsid.c_str());
    if (cobaSambungWifi(baruSsid, baruPass)) {
      wifiSsidAktif = baruSsid;
      wifiPassAktif = baruPass;
      wifiPakaiDefault = false;
      wifiPesan = "Berhasil beralih ke Wi-Fi baru dan tersimpan di NVS";
      simpanWifiLokal(baruSsid, baruPass, false);
    } else {
      Serial.println("Wi-Fi baru gagal, mengembalikan ke Wi-Fi sebelumnya...");
      cobaSambungWifi(lamaSsid, lamaPass);
      wifiSsidAktif = lamaSsid;
      wifiPassAktif = lamaPass;
      wifiPakaiDefault = lamaDefault;
      wifiPesan = "Gagal terhubung ke " + baruSsid + ", otomatis kembali ke " + lamaSsid;
    }
  }
}

void catatGagal() {
  gagalBeruntun++;
  if (gagalBeruntun >= BATAS_GAGAL) {
    modeManual = false;
  }
}

void sinkronFirebase() {
  if (WiFi.status() != WL_CONNECTED) {
    catatGagal();
    return;
  }

  String semuaData;
  if (firebaseRequest("GET", "/greenhouse", "", semuaData) && semuaData.length() > 4 && semuaData != "null") {
    gagalBeruntun = 0;

    String objCmd = ambilObjek(semuaData, "commands");
    if (objCmd.length() > 4) {
      String objWifi = ambilObjek(objCmd, "wifi");
      if (objWifi.length() > 4) {
        prosesPerintahWifi(objWifi);
      }
    }

    String objThresh = ambilObjek(semuaData, "thresholds");
    bool perluKirimBatas = false;
    if (objThresh.length() > 4) {
      terapkanBatasDariJson(objThresh);
    } else {
      perluKirimBatas = true;
    }

    String objMode = ambilObjek(semuaData, "mode");
    if (objMode.length() > 4) {
      modeManual = objMode.indexOf("MANUAL") >= 0;
    }

    if (modeManual) {
      if (objCmd.length() > 4) {
        if (adaKunci(objCmd, "pump")) pompaMenyala = nilaiBenar(objCmd, "pump");
        if (adaKunci(objCmd, "fan")) kipasMenyala = nilaiBenar(objCmd, "fan");
        if (adaKunci(objCmd, "lamp")) lampuMenyala = nilaiBenar(objCmd, "lamp");
        if (adaKunci(objCmd, "servo")) ventilasiBuka = nilaiBenar(objCmd, "servo");
        terapkanKeluaran();
      }
    }

    String batch = "{";
    batch += "\"sensors\":" + susunDataSensor();
    batch += ",\"actuators\":" + susunDataAktuator();
    batch += ",\"connection\":" + susunDataKoneksi();
    if (perluKirimBatas) {
      batch += ",\"thresholds\":" + susunDataBatas();
    }
    unsigned long waktuSekarang = (unsigned long)time(nullptr);
    if (waktuSekarang > 1700000000UL) {
      batch += ",\"timestamp\":{\"updatedAt\":" + String(waktuSekarang) + "}";
    }
    batch += "}";

    String dummy;
    if (!firebaseRequest("PATCH", "/greenhouse", batch, dummy)) {
      catatGagal();
    }
  } else {
    catatGagal();
  }
}

void taskFirebase(void *param) {
  (void)param;
  for (;;) {
    if (WiFi.status() == WL_CONNECTED) {
      sinkronFirebase();
    }
    vTaskDelay(pdMS_TO_TICKS(JEDA_FIREBASE));
  }
}

void setup() {
  Serial.begin(115200);
  unsigned long tungguSerial = millis();
  while (!Serial && millis() - tungguSerial < 1500) {
    delay(10);
  }

  muatWifiLokal();
  muatBatasLokal();
  analogReadResolution(12);

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  digitalWrite(PIN_TRIG, LOW);

  siapkanRelay(PIN_POMPA);
  siapkanRelay(PIN_KIPAS);
  siapkanRelay(PIN_LAMPU);

  dht.begin();
  siapkanServo();

  klienTls.setCACert(FIREBASE_ROOT_CA);
  sambungWifi();
  configTime(25200, 0, "pool.ntp.org");

  xTaskCreate(taskFirebase, "fb_sync", 8192, NULL, 1, NULL);

  Serial.println("Smart Greenhouse siap");
}

void loop() {
  unsigned long sekarang = millis();

  if (WiFi.status() != WL_CONNECTED && sekarang - waktuWifiTerakhir >= JEDA_SAMBUNG_ULANG) {
    waktuWifiTerakhir = sekarang;
    WiFi.disconnect(false);
    WiFi.setTxPower(WIFI_POWER_8_5dBm);
    WiFi.begin(wifiSsidAktif.c_str(), wifiPassAktif.c_str());
  }

  if (sekarang - waktuSensorTerakhir >= JEDA_SENSOR) {
    waktuSensorTerakhir = sekarang;
    bacaSemuaSensor();
    if (!modeManual) {
      kendaliOtomatis();
    }
    terapkanKeluaran();
    cetakStatus();
  }

  delay(20);
}
