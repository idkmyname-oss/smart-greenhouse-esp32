import { SceneManager } from './three-scenes.js';
import { SERIES_META, drawLineChart, drawDeviceActivityChart, DiagramController } from './visuals.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const elFrom = (h) => {
  const t = document.createElement('template');
  t.innerHTML = h.trim();
  return t.content.firstElementChild;
};
const safeLoad = (k, d) => {
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return Array.isArray(d) ? [...d] : { ...d };
    const parsed = JSON.parse(raw);
    return Array.isArray(d) ? (Array.isArray(parsed) ? parsed : [...d]) : Object.assign({}, d, parsed);
  } catch {
    return Array.isArray(d) ? [...d] : { ...d };
  }
};
const safeSave = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    Toast.show('Penyimpanan lokal penuh', 'err');
  }
};
const clock = (t) => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const validNum = (v, min) => typeof v === 'number' && Number.isFinite(v) && v > min;
const motionEnabled = () => document.documentElement.dataset.motion !== 'off' && !!window.gsap;

const ROUTES = [
  { id: 'overview', num: '01', label: 'Ringkasan', dock: true, icon: '<path d="M4 11l8-7 8 7v9H4z"/>', scene: 'greenhouse' },
  { id: 'water', num: '02', label: 'Air & Pompa', dock: true, icon: '<path d="M12 3s6 6.8 6 11a6 6 0 1 1-12 0c0-4.2 6-11 6-11z"/>', scene: 'water' },
  { id: 'servo', num: '03', label: 'Ventilasi', dock: false, icon: '<rect x="4" y="13" width="16" height="7" rx="2"/><path d="M12 13V5m0 0 6 4"/>', scene: 'servo' },
  { id: 'fan', num: '04', label: 'Kipas DC', dock: true, icon: '<circle cx="12" cy="12" r="2.5"/><path d="M12 9.5C11 5 15 3 16 5.5c.8 2-1.2 4-4 4zM14.5 12c4.5-1 6.5 3 4 4-2 .8-4-1.2-4-4zM12 14.5c1 4.5-3 6.5-4 4-.8-2 1.2-4 4-4zM9.5 12C5 13 3 9 5.5 8c2-.8 4 1.2 4 4z"/>', scene: 'fan' },
  { id: 'lighting', num: '05', label: 'Pencahayaan', dock: false, icon: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/>', scene: 'lighting' },
  { id: 'temperature', num: '06', label: 'Suhu & Udara', dock: false, icon: '<path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0z"/>', scene: 'temperature' },
  { id: 'soil', num: '07', label: 'Tanah', dock: false, icon: '<path d="M3 19h18M5 15h14M12 15V7m0 0c0-2.5 2-4 4-4 0 2.5-1.5 4-4 4zm0 2c0-2-1.5-3.2-3.5-3.2 0 2 1 3.2 3.5 3.2z"/>', scene: 'soil' },
  { id: 'diagram', num: '08', label: 'Diagram', dock: true, icon: '<rect x="3" y="4" width="6" height="5" rx="1"/><rect x="15" y="4" width="6" height="5" rx="1"/><rect x="9" y="15" width="6" height="5" rx="1"/><path d="M6 9v3h12V9M12 12v3"/>', scene: null },
  { id: 'analytics', num: '09', label: 'Analitik', dock: true, icon: '<path d="M4 20V4M4 20h16M8 15l4-4 3 3 5-6"/>', scene: null },
  { id: 'logs', num: '10', label: 'Log', dock: false, icon: '<path d="M6 4h12v16H6zM9 9h6M9 13h6M9 17h3"/>', scene: null },
  { id: 'settings', num: '11', label: 'Setelan', dock: true, icon: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>', scene: null },
];

const FMT = {
  temperature: (v) => (validNum(v, -90) ? `${v.toFixed(1)}°C` : '—'),
  humidity: (v) => (validNum(v, -90) ? `${v.toFixed(1)}%` : '—'),
  soilMoisture: (v) => (validNum(v, -1) ? `${v}%` : '—'),
  light: (v) => (validNum(v, -1) ? `${v}%` : '—'),
  waterLevel: (v) => (validNum(v, -1) ? `${v}%` : '—'),
};

const SENSORS_LIST = [
  { key: 'temperature', name: 'Suhu Udara', pin: 'DHT22 · GPIO3', tone: 'amb', page: 'temperature', max: 50, rule: 'Kipas ON > 30°C · OFF < 27°C' },
  { key: 'humidity', name: 'Kelembapan Udara', pin: 'DHT22 · GPIO3', tone: 'stone', page: 'temperature', max: 100, rule: 'Rentang 0–100% RH' },
  { key: 'soilMoisture', name: 'Kelembapan Tanah', pin: 'Capacitive · GPIO0', tone: 'soil', page: 'soil', max: 100, rule: 'Pompa ON < 35% · OFF ≥ 55%' },
  { key: 'waterLevel', name: 'Tinggi Air Tangki', pin: 'HC-SR04 · GPIO4/5', tone: 'hydro', page: 'water', max: 100, rule: 'Peringatan < 20%' },
  { key: 'light', name: 'Intensitas Cahaya', pin: 'LDR AO · GPIO1', tone: 'amb', page: 'lighting', max: 100, rule: 'Lampu ON < 30% · OFF > 45%' },
];

const DEVICES_LIST = [
  { key: 'pump', name: 'Pompa Air DC', pin: 'Relay GPIO6 · Aktif LOW', page: 'water', verbOn: 'Menyala', verbOff: 'Mati' },
  { key: 'fan', name: 'Kipas Sirkulasi DC', pin: 'Relay GPIO7 · Aktif LOW', page: 'fan', verbOn: 'Berputar', verbOff: 'Berhenti' },
  { key: 'lamp', name: 'Lampu AC 220 V', pin: 'Relay GPIO10 · AC Terpisah', page: 'lighting', verbOn: 'Menyala', verbOff: 'Mati' },
  { key: 'servo', name: 'Ventilasi Servo SG90', pin: 'PWM GPIO20 · 5 V Terpisah', page: 'servo', verbOn: 'Terbuka (90°)', verbOff: 'Tertutup (0°)' },
];

const DEFAULT_FIREBASE_URL = 'https://smart-greenhouse-esp32-default-rtdb.asia-southeast1.firebasedatabase.app';

const DEFAULT_THRESHOLDS = {
  soilOn: 35,
  soilOff: 55,
  tempOn: 30.0,
  tempOff: 27.0,
  lightOn: 30,
  lightOff: 45,
  waterLow: 20,
  tankEmptyCm: 15.0,
  tankFullCm: 3.0,
  servoClose: 0,
  servoOpen: 90,
};

const initCfg = safeLoad('gh.cfg', { url: DEFAULT_FIREBASE_URL, persistAuth: false });
if (!initCfg.url && !initCfg.disconnected) initCfg.url = DEFAULT_FIREBASE_URL;

const Store = {
  cfg: initCfg,
  authToken: sessionStorage.getItem('gh.auth') || safeLoad('gh.cfg', { auth: '' }).auth || '',
  prefs: safeLoad('gh.prefs', { theme: null, dock: 'bottom', motion: true, quality: 'high' }),
  hist: safeLoad('gh.hist', []),
  log: safeLoad('gh.log', []),
  g: {},
  link: 'idle',
  onlineSince: null,
  pending: {},
  logFilter: 'all',
  currentRoute: 'overview',
  subs: new Set(),

  sub(fn) {
    this.subs.add(fn);
  },
  emit() {
    this.subs.forEach((fn) => fn(this));
  },
  note(kind, text) {
    this.log.unshift({ t: Date.now(), kind, text });
    if (this.log.length > 240) this.log.length = 240;
    safeSave('gh.log', this.log);
    App.renderLogs();
  },
  sensors() {
    return this.g.sensors || {};
  },
  confirmedAct() {
    return this.g.actuators || {};
  },
  commands() {
    return this.g.commands || {};
  },
  thresholds() {
    const raw = this.g.thresholds || {};
    const out = { ...DEFAULT_THRESHOLDS };
    Object.keys(DEFAULT_THRESHOLDS).forEach((k) => {
      if (typeof raw[k] === 'number' && Number.isFinite(raw[k])) out[k] = raw[k];
    });
    return out;
  },
  mode() {
    return this.g.mode?.controlMode === 'MANUAL' ? 'MANUAL' : 'AUTO';
  },
  age() {
    const ts = this.g.timestamp?.updatedAt;
    return typeof ts === 'number' ? Date.now() / 1000 - ts : null;
  },
  online() {
    return this.g.connection?.esp32Status === 'online' && this.age() !== null && this.age() < 25;
  },
  setPending(key, value) {
    if (this.pending[key]?.timer) clearTimeout(this.pending[key].timer);
    const timer = setTimeout(() => {
      if (this.pending[key]) {
        delete this.pending[key];
        Toast.show(`Timeout: ESP32-C3 belum mengonfirmasi status ${key}`, 'err');
        this.note('warn', `Timeout konfirmasi perangkat untuk ${key}`);
        this.emit();
      }
    }, 6000);
    this.pending[key] = { value, sentAt: Date.now(), timer };
    this.emit();
  },
  reconcilePending() {
    const confirmed = this.confirmedAct();
    const curMode = this.mode();
    Object.keys(this.pending).forEach((k) => {
      const p = this.pending[k];
      if (!p) return;
      const matched = k === 'mode' ? curMode === p.value : k in confirmed && confirmed[k] === p.value;
      if (matched) {
        clearTimeout(p.timer);
        delete this.pending[k];
        Toast.show(`Terkonfirmasi oleh ESP32-C3: ${k === 'mode' ? 'Mode ' + p.value : k.toUpperCase()}`);
      }
    });
  },
};

const Link = {
  es: null,
  timer: null,
  tries: 0,
  base() {
    return (Store.cfg.url || '').replace(/\/+$/, '');
  },
  query() {
    return Store.authToken ? '?auth=' + encodeURIComponent(Store.authToken) : '';
  },
  check(url) {
    return /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.(firebaseio\.com|firebasedatabase\.app)\/?$/i.test((url || '').trim());
  },
  set(s) {
    Store.link = s;
    Store.emit();
  },
  start() {
    this.stop();
    if (!this.check(Store.cfg.url)) {
      this.set('idle');
      return;
    }
    this.set('wait');
    const es = new EventSource(`${this.base()}/greenhouse.json${this.query()}`);
    this.es = es;
    es.onopen = () => {
      this.tries = 0;
      this.set('open');
      Store.note('info', 'Terhubung ke Firebase Realtime Database');
    };
    es.addEventListener('put', (e) => this.apply(JSON.parse(e.data), false));
    es.addEventListener('patch', (e) => this.apply(JSON.parse(e.data), true));
    es.addEventListener('auth_revoked', () => {
      this.stop();
      this.set('denied');
      Store.note('warn', 'Akses database ditolak oleh Security Rules');
    });
    es.onerror = () => {
      if (this.es !== es) return;
      es.close();
      this.es = null;
      if (Store.link === 'open') Store.note('warn', 'Koneksi database terputus, mencoba sambung ulang');
      this.set('error');
      this.tries += 1;
      this.timer = setTimeout(() => this.start(), Math.min(30000, 1500 * 2 ** this.tries));
    };
  },
  stop() {
    clearTimeout(this.timer);
    if (this.es) {
      this.es.close();
      this.es = null;
    }
  },
  apply({ path, data }, merge) {
    const parts = path.split('/').filter(Boolean);
    if (!parts.length) {
      Store.g = merge ? { ...Store.g, ...(data || {}) } : data || {};
    } else {
      let node = Store.g;
      parts.slice(0, -1).forEach((p) => {
        if (typeof node[p] !== 'object' || node[p] === null) node[p] = {};
        node = node[p];
      });
      const last = parts[parts.length - 1];
      if (merge && data && typeof data === 'object') node[last] = { ...(node[last] || {}), ...data };
      else if (data === null) delete node[last];
      else node[last] = data;
    }
    Store.reconcilePending();
    Track.after();
    Store.emit();
  },
  async put(path, value) {
    if (!this.check(Store.cfg.url)) throw new Error('Alamat database belum diatur');
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 5000);
    try {
      const r = await fetch(`${this.base()}/greenhouse/${path}.json${this.query()}`, {
        method: 'PUT',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
        signal: ctl.signal,
      });
      if (!r.ok) {
        throw new Error(r.status === 401 || r.status === 403 ? 'Ditolak oleh aturan keamanan database' : 'Gagal menyimpan (' + r.status + ')');
      }
    } finally {
      clearTimeout(to);
    }
  },
};

const Track = {
  lastTs: null,
  prevAct: {},
  prevOnline: null,
  prevWater: null,
  after() {
    const s = Store.sensors();
    const ts = Store.g.timestamp?.updatedAt;
    if (ts && ts !== this.lastTs && Object.keys(s).length) {
      this.lastTs = ts;
      Store.hist.push({
        t: Date.now(),
        temperature: validNum(s.temperature, -90) ? s.temperature : null,
        humidity: validNum(s.humidity, -90) ? s.humidity : null,
        soilMoisture: validNum(s.soilMoisture, -1) ? s.soilMoisture : null,
        light: validNum(s.light, -1) ? s.light : null,
        waterLevel: validNum(s.waterLevel, -1) ? s.waterLevel : null,
      });
      if (Store.hist.length > 1500) Store.hist.splice(0, Store.hist.length - 1500);
      safeSave('gh.hist', Store.hist);
    }
    const a = Store.confirmedAct();
    const names = { pump: 'Pompa', fan: 'Kipas', lamp: 'Lampu', servo: 'Ventilasi' };
    Object.keys(names).forEach((k) => {
      if (k in a && k in this.prevAct && a[k] !== this.prevAct[k]) {
        Store.note('act', `${names[k]} ${k === 'servo' ? (a[k] ? 'dibuka (90°)' : 'ditutup (0°)') : a[k] ? 'menyala' : 'mati'}`);
      }
    });
    this.prevAct = { ...a };
    const low = validNum(s.waterLevel, -1) && s.waterLevel < Store.thresholds().waterLow;
    if (low && this.prevWater === false) Store.note('warn', `Tinggi air rendah (${s.waterLevel}%)`);
    if (validNum(s.waterLevel, -1)) this.prevWater = low;
  },
  tick() {
    const on = Store.online();
    if (this.prevOnline !== null && on !== this.prevOnline) {
      Store.note(on ? 'info' : 'warn', on ? 'ESP32-C3 online' : 'ESP32-C3 berhenti mengirim data');
    }
    if (on && !Store.onlineSince) Store.onlineSince = Date.now();
    if (!on) Store.onlineSince = null;
    this.prevOnline = on;
  },
};

const Toast = {
  show(text, kind = 'ok') {
    const t = elFrom(`<div class="toast" data-k="${kind}"></div>`);
    t.textContent = text;
    $('#toasts').append(t);
    if (motionEnabled()) {
      window.gsap.fromTo(t, { opacity: 0, y: -14, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out' });
      setTimeout(() => {
        window.gsap.to(t, { opacity: 0, y: -10, duration: 0.35, onComplete: () => t.remove() });
      }, 3200);
    } else {
      setTimeout(() => t.remove(), 3400);
    }
  },
};

const Ask = {
  open(title, text, ok) {
    $('#dlgT').textContent = title;
    $('#dlgP').textContent = text;
    $('#dlgOk').textContent = ok || 'Lanjutkan';
    const d = $('#dlg');
    return new Promise((res) => {
      d.addEventListener('close', () => res(d.returnValue === 'yes'), { once: true });
      d.showModal();
    });
  },
};

const Control = {
  async send(path, value, label, pendingKey, pendingVal) {
    Toast.show(`Mengirim perintah: ${label}…`);
    try {
      await Link.put(path, value);
      Store.setPending(pendingKey, pendingVal);
      Store.note('cmd', `Perintah dikirim: ${label} (menunggu konfirmasi ESP32-C3)`);
      return true;
    } catch (e) {
      Toast.show(e.name === 'AbortError' ? 'Waktu habis, perintah tidak terkirim' : e.message || 'Perintah gagal', 'err');
      Store.note('warn', `Gagal mengirim: ${label}`);
      return false;
    }
  },
  async mode(m) {
    if (m === Store.mode()) return;
    await this.send('mode/controlMode', m, `Mode ${m}`, 'mode', m);
  },
  async device(key, value) {
    if (Store.mode() !== 'MANUAL') {
      const ok = await Ask.open(
        'Mode AUTO sedang aktif',
        'Kontrol manual aktuator hanya berlaku pada mode MANUAL. Beralih ke mode MANUAL sekarang?',
        'Beralih ke MANUAL'
      );
      if (!ok) return;
      const switched = await this.send('mode/controlMode', 'MANUAL', 'Mode MANUAL', 'mode', 'MANUAL');
      if (!switched) return;
    }
    if (key === 'pump' && value) {
      const ok = await Ask.open(
        'Nyalakan pompa secara manual?',
        'Pompa akan menyala mengabaikan ambang kelembapan tanah sampai dimatikan atau kembali ke AUTO.',
        'Nyalakan Pompa'
      );
      if (!ok) return;
    }
    const names = { pump: 'Pompa', fan: 'Kipas', lamp: 'Lampu', servo: 'Ventilasi' };
    const label = `${names[key]} ${key === 'servo' ? (value ? 'buka (90°)' : 'tutup (0°)') : value ? 'ON' : 'OFF'}`;
    const nextCmd = { ...Store.confirmedAct(), ...Store.commands(), [key]: value };
    await this.send('commands', nextCmd, label, key, value);
  },
};

const Out = {
  csv(rows, name) {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
};

function segHtml(id, items) {
  return `<div class="seg" id="${id}"><span class="thumb"></span>${items.map(([v, l]) => `<button type="button" data-v="${v}">${l}</button>`).join('')}</div>`;
}

function swHtml(k, label) {
  return `<button class="sw" role="switch" aria-checked="false" data-dev="${k}" aria-label="${label}"></button>`;
}

function componentPageHtml(cfg) {
  const controlSection = cfg.actKey
    ? `<div class="panel">
        <span class="eyebrow">KENDALI & STATUS TERKONFIRMASI</span>
        <div class="actuator-list">
          <div class="actuator-row">
            <div class="act-meta"><strong>${cfg.actLabel}</strong><small>${cfg.pin}</small></div>
            <div class="act-state-col">
              <span class="act-confirmed" data-st="${cfg.actKey}">—</span>
              <span class="act-pending" data-pend="${cfg.actKey}"></span>
            </div>
            ${swHtml(cfg.actKey, cfg.actLabel)}
          </div>
        </div>
        <div class="kv-list" style="margin-top:8px">
          <div class="kv-row"><span class="kv-k">Mode Operasi Aktif</span><span class="kv-v" data-mode-lbl>—</span></div>
          <div class="kv-row"><span class="kv-k">Batas Otomatis</span><span class="kv-v">${cfg.rule}</span></div>
        </div>
      </div>`
    : `<div class="panel">
        <span class="eyebrow">PARAMETER OTOMATISASI</span>
        <div class="kv-list" style="margin-top:10px">
          <div class="kv-row"><span class="kv-k">Mode Operasi Aktif</span><span class="kv-v" data-mode-lbl>—</span></div>
          <div class="kv-row"><span class="kv-k">Ambang Otomatis</span><span class="kv-v">${cfg.rule}</span></div>
          <div class="kv-row"><span class="kv-k">Pinout Perangkat</span><span class="kv-v">${cfg.pin}</span></div>
        </div>
      </div>`;

  const sensorRows = cfg.sensors
    .map((sk) => {
      const m = SENSORS_LIST.find((x) => x.key === sk);
      return `<div class="kv-row"><span class="kv-k">${m.name}</span><span class="kv-v" data-s="${sk}">—</span></div>`;
    })
    .join('');

  const chartHtml = cfg.chartKey
    ? `<div class="sec-block">
        <div class="sec-head">
          <div><span class="eyebrow">GRAFIK TELEMETRI LANGSUNG</span><h2 class="section-title">${cfg.chartTitle}</h2></div>
        </div>
        <div class="chart-shell mini-chart-shell"><canvas data-mini-chart="${cfg.chartKey}"></canvas><div class="chart-tip" data-mini-tip="${cfg.chartKey}"></div></div>
      </div>`
    : '';

  return `<section class="view-page" id="v-${cfg.id}">
    <div class="hero-editorial">
      <div>
        <span class="eyebrow">${cfg.eyebrow}</span>
        <h1 class="display-title" data-reveal>${cfg.title}</h1>
        <p class="lead-copy">${cfg.lead}</p>
      </div>
      <div class="hero-status-strip">
        <span class="badge acc">${cfg.pin}</span>
        <button class="btn-ghost" type="button" data-go="diagram" data-focus-node="${cfg.diagNode}">Lihat di Diagram</button>
      </div>
    </div>

    <div class="comp-grid">
      <div class="viewport-frame viewport-hero-sm">
        <div class="viewport-hud-top">
          <span class="hud-chip">3D LIVE · ${cfg.hudTag}</span>
          <span class="hud-chip" data-3d-badge="${cfg.id}">Menunggu data</span>
        </div>
        <div class="viewport-canvas-wrap" data-scene-mount="${cfg.scene}"></div>
        <div class="viewport-hud-bottom">
          <span class="hud-chip">Seret untuk memutar · Scroll untuk zoom</span>
        </div>
      </div>

      <div class="form-grid">
        ${controlSection}
        ${sensorRows ? `<div class="panel panel-subtle"><span class="eyebrow">DATA SENSOR AKTUAL</span><div class="kv-list" style="margin-top:10px">${sensorRows}</div></div>` : ''}
        <div class="panel panel-subtle">
          <span class="eyebrow">SPESIFIKASI TEKNIS</span>
          <p class="lead-copy" style="margin-top:10px;font-size:13.5px">${cfg.tech}</p>
        </div>
      </div>
    </div>

    ${chartHtml}

    <div class="sec-block panel">
      <div class="sec-head">
        <div><span class="eyebrow">RIWAYAT KOMPONEN</span><h2 class="section-title">Aktivitas Terakhir</h2></div>
        <button class="btn-ghost" type="button" data-go="logs">Semua Log</button>
      </div>
      <ul class="timeline-list" data-comp-log="${cfg.logFilter}"></ul>
    </div>
  </section>`;
}

const RULES_JSON = `{
  "rules": {
    "greenhouse": {
      ".read": "auth != null",
      "sensors": { ".write": "auth != null" },
      "actuators": { ".write": "auth != null" },
      "commands": { ".write": "auth != null" },
      "thresholds": { ".write": "auth != null" },
      "mode": { ".write": "auth != null" },
      "connection": { ".write": "auth != null" },
      "timestamp": { ".write": "auth != null" }
    }
  }
}`;

const App = {
  diagram: null,
  analyticsRange: 300000,
  analyticsKeys: new Set(['temperature', 'soilMoisture']),
  analyticsHover: null,
  analyticsCache: null,
  miniCaches: {},
  tempTween: { val: 0 },
  metricTweens: {},
  lastRenderedTemp: null,
  lastPacketTs: null,
  drawerOpen: false,
  threshDirty: false,
  servoTestOpen: false,
  servoSendTimer: null,
  servoSweepTimer: null,

  updateServoSliderUi(deg) {
    const val = Math.max(0, Math.min(180, Math.round(Number(deg) || 0)));
    const sl = $('#stSlider');
    if (sl) {
      sl.value = String(val);
      sl.style.setProperty('--pct', `${(val / 180) * 100}%`);
    }
    const dg = $('#stDegVal');
    if (dg) dg.textContent = `${val}°`;
    const pwm = $('#stPwmVal');
    if (pwm) pwm.textContent = `${Math.round(500 + (val / 180) * 1900)} µs · 50 Hz`;
    $$('#stTicks .st-tick-btn').forEach((b) => b.classList.toggle('on', Number(b.dataset.ang) === val));
  },

  sendServoTest(active, angle) {
    if (!Link.check(Store.cfg.url)) return;
    clearTimeout(this.servoSendTimer);
    this.servoSendTimer = setTimeout(async () => {
      try {
        await Link.put('commands/servoTest', !!active);
        if (active) await Link.put('commands/servoAngle', Math.max(0, Math.min(180, Math.round(angle))));
      } catch (e) {
        Toast.show(e.message || 'Gagal mengirim perintah uji servo', 'err');
      }
    }, active ? 75 : 0);
  },

  toggleServoTest(force) {
    const next = typeof force === 'boolean' ? force : !this.servoTestOpen;
    this.servoTestOpen = next;
    clearInterval(this.servoSweepTimer);
    this.servoSweepTimer = null;
    const panel = $('#servoTestPanel');
    const fab = $('#servoTestFab');
    if (!panel || !fab) return;
    fab.setAttribute('aria-expanded', String(next));
    panel.setAttribute('aria-hidden', String(!next));
    if (next) {
      const cur = typeof Store.confirmedAct().servoAngle === 'number' ? Store.confirmedAct().servoAngle : (Store.confirmedAct().servo ? 90 : 0);
      this.updateServoSliderUi(cur);
      panel.classList.add('open');
      if (motionEnabled()) {
        window.gsap.fromTo(panel, { opacity: 0, y: 14, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.34, ease: 'power3.out' });
      }
      this.sendServoTest(true, cur);
    } else {
      this.sendServoTest(false, 0);
      if (motionEnabled()) {
        window.gsap.to(panel, { opacity: 0, y: 10, scale: 0.96, duration: 0.22, onComplete: () => panel.classList.remove('open') });
      } else {
        panel.classList.remove('open');
      }
    }
  },

  fillThresholdForm(th) {
    const map = {
      thSoilOn: th.soilOn,
      thSoilOff: th.soilOff,
      thTempOn: th.tempOn,
      thTempOff: th.tempOff,
      thLightOn: th.lightOn,
      thLightOff: th.lightOff,
      thServoClose: th.servoClose,
      thServoOpen: th.servoOpen,
      thEmptyCm: th.tankEmptyCm,
      thFullCm: th.tankFullCm,
      thWaterLow: th.waterLow,
    };
    Object.entries(map).forEach(([id, val]) => {
      const inp = $('#' + id);
      if (inp) inp.value = String(val);
    });
  },

  readThresholdForm() {
    const num = (id) => Number($('#' + id).value);
    return {
      soilOn: Math.round(num('thSoilOn')),
      soilOff: Math.round(num('thSoilOff')),
      tempOn: Number(num('thTempOn').toFixed(1)),
      tempOff: Number(num('thTempOff').toFixed(1)),
      lightOn: Math.round(num('thLightOn')),
      lightOff: Math.round(num('thLightOff')),
      servoClose: Math.round(num('thServoClose')),
      servoOpen: Math.round(num('thServoOpen')),
      tankEmptyCm: Number(num('thEmptyCm').toFixed(1)),
      tankFullCm: Number(num('thFullCm').toFixed(1)),
      waterLow: Math.round(num('thWaterLow')),
    };
  },

  validateThresholds(t) {
    if (Object.values(t).some((v) => !Number.isFinite(v))) return 'Semua kolom batas harus diisi angka yang valid.';
    if (t.soilOn < 0 || t.soilOff > 100 || t.soilOn >= t.soilOff) return 'Pompa: batas NYALA tanah harus lebih kecil dari batas MATI (0–100%).';
    if (t.tempOff < 0 || t.tempOn > 60 || t.tempOff >= t.tempOn) return 'Kipas/Suhu: batas MATI harus lebih kecil dari batas NYALA (0–60 °C).';
    if (t.lightOn < 0 || t.lightOff > 100 || t.lightOn >= t.lightOff) return 'Lampu: batas NYALA cahaya harus lebih kecil dari batas MATI (0–100%).';
    if (t.servoClose < 0 || t.servoClose > 180 || t.servoOpen < 0 || t.servoOpen > 180) return 'Servo: sudut tutup dan buka harus antara 0° hingga 180°.';
    if (t.tankFullCm < 1 || t.tankEmptyCm > 200 || t.tankFullCm >= t.tankEmptyCm) return 'Tangki: jarak penuh (cm) harus lebih kecil dari jarak kosong (cm).';
    if (t.waterLow < 5 || t.waterLow > 80) return 'Peringatan air rendah harus antara 5% hingga 80%.';
    return '';
  },

  buildPages() {
    const root = $('#stageRoot');
    root.innerHTML = `
      <section class="view-page" id="v-overview">
        <div class="hero-editorial">
          <div>
            <span class="eyebrow">SMART GREENHOUSE AUTONOMOUS OS · ESP32-C3</span>
            <h1 class="display-title" id="heroHeadline" data-reveal>Menunggu Telemetri</h1>
            <p class="lead-copy" id="heroSubline">Hubungkan website ke Firebase Realtime Database yang digunakan ESP32-C3 untuk memantau dan mengendalikan greenhouse secara real-time.</p>
            <div class="hero-meta-row">
              <div class="hero-status-strip">
                <span class="badge acc" id="badgeMode">MODE: AUTO</span>
                <span class="badge" id="badgeEsp">ESP32-C3: OFFLINE</span>
                <span class="badge hydro" id="badgeSync">SYNC: —</span>
              </div>
            </div>
          </div>
          <div class="hero-number-wrap">
            <span class="hero-number" id="bigTemp">—</span>
            <span class="hero-unit">°C</span>
          </div>
        </div>

        <div class="alert-banner" id="alertWater">
          <span>PERINGATAN: Ketinggian air tangki di bawah 20%. Segera isi ulang wadah penampung.</span>
          <button class="btn-ghost" type="button" data-go="water">Buka Tangki 3D</button>
        </div>

        <div class="empty-panel" id="emptyBox">
          <div>
            <h3>Belum ada data aktual dari perangkat</h3>
            <p>Konfigurasikan alamat Firebase Realtime Database di halaman Setelan agar seluruh model 3D, grafik, dan kontrol tersinkronisasi langsung dengan ESP32-C3.</p>
          </div>
          <button class="btn-solid" type="button" data-go="settings">Atur Koneksi Firebase</button>
        </div>

        <div class="sec-block">
          <div class="sec-head">
            <div><span class="eyebrow">VISUALISASI 3D INTERAKTIF</span><h2 class="section-title">Digital Twin Greenhouse</h2></div>
            <span class="badge">WebGL · Status Terkonfirmasi</span>
          </div>
          <div class="viewport-frame">
            <div class="viewport-hud-top">
              <span class="hud-chip" id="sceneHudState">MODEL 3D · STANDBY</span>
              <span class="hud-chip" id="sceneHudAct">POMPA 0 · KIPAS 0 · LAMPU 0 · VENT 0°</span>
            </div>
            <div class="viewport-canvas-wrap" data-scene-mount="greenhouse"></div>
            <div class="viewport-hud-bottom">
              <div class="cam-bar" id="ghCamBar">
                <button class="cam-btn on" type="button" data-cam="all">Keseluruhan</button>
                <button class="cam-btn" type="button" data-cam="vent">Ventilasi</button>
                <button class="cam-btn" type="button" data-cam="water">Tangki & Pompa</button>
                <button class="cam-btn" type="button" data-cam="lamp">Pencahayaan</button>
                <button class="cam-btn" type="button" data-cam="soil">Media Tanam</button>
              </div>
              <span class="hud-chip">Seret 360° · Scroll Zoom</span>
            </div>
          </div>
        </div>

        <div class="sec-block">
          <div class="sec-head">
            <div><span class="eyebrow">PEMANTAUAN LINGKUNGAN</span><h2 class="section-title">Telemetri Sensor Real-Time</h2></div>
            <button class="btn-ghost" type="button" data-go="analytics">Buka Analitik</button>
          </div>
          <div class="telemetry-strip">
            ${SENSORS_LIST.map(
              (s) => `<button class="metric-cell" type="button" data-go="${s.page}" data-tone="${s.tone}">
                <div class="metric-top"><span class="metric-label">${s.name}</span><span class="metric-pin">${s.pin}</span></div>
                <div class="metric-val" data-s="${s.key}">—</div>
                <div class="metric-bar"><i data-bar="${s.key}"></i></div>
                <div class="metric-foot"><span>${s.rule}</span><span>→</span></div>
              </button>`
            ).join('')}
          </div>
        </div>

        <div class="sec-block bento-asym">
          <div class="panel">
            <div class="sec-head" style="margin-bottom:10px">
              <div><span class="eyebrow">KENDALI AKTUATOR</span><h2 class="section-title">Mode & Perangkat</h2></div>
              ${segHtml('modeSeg', [['AUTO', 'AUTO'], ['MANUAL', 'MANUAL']])}
            </div>
            <p class="lead-copy" style="margin-top:4px;font-size:13px">Perintah dikirim ke <code>/greenhouse/commands</code> dan status visual baru berubah penuh setelah dikonfirmasi oleh ESP32-C3 melalui <code>/greenhouse/actuators</code>.</p>
            <div class="actuator-list">
              ${DEVICES_LIST.map(
                (d) => `<div class="actuator-row">
                  <button class="act-meta" type="button" data-go="${d.page}" style="text-align:left">
                    <strong>${d.name}</strong>
                    <small>${d.pin}</small>
                  </button>
                  <div class="act-state-col">
                    <span class="act-confirmed" data-a="${d.key}">—</span>
                    <span class="act-pending" data-pend="${d.key}"></span>
                  </div>
                  ${swHtml(d.key, d.name)}
                </div>`
              ).join('')}
            </div>
          </div>

          <div class="form-grid">
            <div class="panel panel-subtle">
              <span class="eyebrow">KESEHATAN SISTEM</span>
              <div class="kv-list" style="margin-top:12px">
                <div class="kv-row"><span class="kv-k">Status Database</span><span class="kv-v" id="hDb">—</span></div>
                <div class="kv-row"><span class="kv-k">Heartbeat ESP32-C3</span><span class="kv-v" id="hDev">—</span></div>
                <div class="kv-row"><span class="kv-k">Pembaruan Terakhir</span><span class="kv-v" id="hLast">—</span></div>
                <div class="kv-row"><span class="kv-k">Durasi Online</span><span class="kv-v" id="hUp">—</span></div>
                <div class="kv-row"><span class="kv-k">Sampel Tersimpan</span><span class="kv-v" id="hSamples">0</span></div>
              </div>
            </div>
            <div class="panel">
              <div class="sec-head" style="margin-bottom:8px">
                <div><span class="eyebrow">LINIMASA LANGSUNG</span><h3 style="margin-top:4px">Aktivitas Terbaru</h3></div>
                <button class="btn-ghost" type="button" data-go="logs">Semua</button>
              </div>
              <ul class="timeline-list" id="overviewLog"></ul>
            </div>
          </div>
        </div>
      </section>

      ${componentPageHtml({
        id: 'water',
        eyebrow: 'SISTEM HIDROLOGI & PENYIRAMAN',
        title: 'Air & Pompa',
        lead: 'Visualisasi 3D tangki air transparan berbasis sensor ultrasonik HC-SR04 dan pompa irigasi DC dengan aliran air proporsional.',
        pin: 'Relay GPIO6 · HC-SR04 GPIO4/5 · Soil GPIO0',
        diagNode: 'pump',
        scene: 'water',
        hudTag: 'HYDRO TANK + PUMP',
        actKey: 'pump',
        actLabel: 'Pompa Air DC',
        rule: 'ON < 35% tanah · OFF ≥ 55%',
        sensors: ['waterLevel', 'soilMoisture'],
        chartKey: 'waterLevel',
        chartTitle: 'Riwayat Ketinggian Air (%)',
        tech: 'HC-SR04 mengukur jarak permukaan air (kosong 15 cm, penuh 3 cm) dengan pembagi tegangan Echo 5 V ke 3,3 V (1k/2k). Pompa DC disaklar relay aktif LOW di GPIO6 berdasarkan kelembapan tanah dan otomatis mati jika sensor tanah tidak valid.',
        logFilter: 'Pompa|Air|air',
      })}

      ${componentPageHtml({
        id: 'servo',
        eyebrow: 'MEKANIKA VENTILASI ATAP',
        title: 'Servo & Ventilasi',
        lead: 'Model 3D aktuator mikro-servo SG90 lengkap dengan gear, horn, pushrod linkage, dan panel ventilasi greenhouse yang bergerak mekanis 0° hingga 90°.',
        pin: 'PWM GPIO20 · LEDC 50 Hz · 5 V Terpisah',
        diagNode: 'srv',
        scene: 'servo',
        hudTag: 'SG90 VENT MECHANISM',
        actKey: 'servo',
        actLabel: 'Bukaan Ventilasi Servo',
        rule: 'Buka 90° > 30°C · Tutup 0° < 27°C',
        sensors: ['temperature'],
        chartKey: null,
        tech: 'Firmware menggerakkan Servo SG90 memakai PWM Hardware LEDC 50 Hz (500–2400 µs) pada GPIO20 (bebas konflik UART0 TX). Mendukung posisi otomatis 0°/90° dan panel kalibrasi uji sudut 0°–180°. Suplai 5 V terpisah dari ESP32-C3 dengan GND bersama.',
        logFilter: 'Ventilasi|Servo',
      })}

      ${componentPageHtml({
        id: 'fan',
        eyebrow: 'SIRKULASI & PENDINGINAN UDARA',
        title: 'Kipas DC',
        lead: 'Visualisasi 3D kipas sirkulasi dengan akselerasi spin-up dan deselerasi coasting natural serta partikel aliran udara mengikuti status aktual relay.',
        pin: 'Relay GPIO7 · Aktif LOW',
        diagNode: 'fan',
        scene: 'fan',
        hudTag: 'EXHAUST FAN 3D',
        actKey: 'fan',
        actLabel: 'Kipas Sirkulasi DC',
        rule: 'ON > 30°C · OFF < 27°C',
        sensors: ['temperature', 'humidity'],
        chartKey: 'temperature',
        chartTitle: 'Riwayat Suhu Pemicu Kipas (°C)',
        tech: 'Kipas DC dikendalikan melalui kontak relay pada GPIO7 (aktif LOW). Sistem menggunakan hysteresis 30°C/27°C untuk mencegah switching berulang. Perangkat mendukung saklar ON/OFF tanpa kontrol RPM PWM.',
        logFilter: 'Kipas',
      })}

      ${componentPageHtml({
        id: 'lighting',
        eyebrow: 'PENCAHAYAAN BUATAN GREENHOUSE',
        title: 'Lampu AC 220 V',
        lead: 'Simulasi pencahayaan 3D dengan emissive bulb, spotlight, dan bayangan lembut yang mengubah atmosfer lingkungan saat relay lampu aktif.',
        pin: 'Relay GPIO10 · Jalur AC 220 V Terpisah',
        diagNode: 'lamp',
        scene: 'lighting',
        hudTag: 'GROW LAMP ILLUMINATION',
        actKey: 'lamp',
        actLabel: 'Lampu AC 220 V',
        rule: 'ON < 30% cahaya · OFF > 45%',
        sensors: ['light'],
        chartKey: 'light',
        chartTitle: 'Riwayat Intensitas Cahaya (%)',
        tech: 'Lampu AC 220 V menggunakan sumber listrik AC yang terpisah total dari sistem baterai DC 18650. Modul relay di GPIO10 hanya menyaklarkan jalur AC. Sensor LDR pada GPIO1 (ADC) menentukan ambang gelap (< 30%) dan terang (> 45%).',
        logFilter: 'Lampu',
      })}

      ${componentPageHtml({
        id: 'temperature',
        eyebrow: 'TERMOMETRI & PSIKROMETRI',
        title: 'Suhu & Udara',
        lead: 'Visualisasi termometer 3D dengan kolom merkuri dinamis dan partikel termal yang bereaksi langsung terhadap data sensor DHT22.',
        pin: 'DHT22 · GPIO3 · 1-Wire Digital',
        diagNode: 'dht',
        scene: 'temperature',
        hudTag: 'THERMAL ATMOSPHERE',
        actKey: null,
        rule: 'Kipas & Ventilasi > 30°C / < 27°C',
        sensors: ['temperature', 'humidity'],
        chartKey: 'temperature',
        chartTitle: 'Kurva Suhu Udara (°C)',
        tech: 'Sensor DHT22 terhubung ke GPIO3 (3,3 V) membaca suhu (-40 hingga 80°C) dan kelembapan relatif (0–100% RH). Nilai -99 menandakan sensor tidak terbaca dan secara otomatis menonaktifkan kipas serta menutup ventilasi demi keamanan.',
        logFilter: 'Kipas|Ventilasi|ESP32',
      })}

      ${componentPageHtml({
        id: 'soil',
        eyebrow: 'SUBSTRAT & KELEMBAPAN MEDIA TANAM',
        title: 'Kelembapan Tanah',
        lead: 'Potongan melintang 3D lapisan tanah, probe kapasitif, dan tanaman yang mengubah tekstur kering-basah serta animasi tetesan air saat penyiraman aktif.',
        pin: 'Capacitive Soil · GPIO0 (ADC 12-bit)',
        diagNode: 'soil',
        scene: 'soil',
        hudTag: 'SOIL STRATA + PROBE',
        actKey: 'pump',
        actLabel: 'Pompa Penyiraman',
        rule: 'ON < 35% · OFF ≥ 55%',
        sensors: ['soilMoisture', 'waterLevel'],
        chartKey: 'soilMoisture',
        chartTitle: 'Riwayat Kelembapan Tanah (%)',
        tech: 'Sensor kelembapan tanah kapasitif di GPIO0 membaca 5 sampel ADC stabil (12-bit). Jika selisih ADC tidak stabil (> 800), pembacaan dianggap tidak valid (-1) dan pompa dipaksa mati sebagai proteksi failsafe.',
        logFilter: 'Pompa',
      })}

      <section class="view-page" id="v-diagram">
        <div class="hero-editorial">
          <div>
            <span class="eyebrow">ARSITEKTUR ELEKTRONIKA & IOT</span>
            <h1 class="display-title" data-reveal>Diagram Sistem</h1>
            <p class="lead-copy">Diagram teknik interaktif sesuai pemetaan pin ESP32-C3 SuperMini. Jalur data menyala real-time mengikuti kondisi aktual perangkat.</p>
          </div>
          <div class="hero-status-strip">
            <span class="badge acc">GPIO0 · 1 · 3 · 4 · 5 · 6 · 7 · 10 · 20</span>
          </div>
        </div>

        <div class="sec-block comp-grid">
          <div class="diagram-wrap" id="diagWrap">
            <div class="diagram-controls">
              <button class="icon-btn" data-z="1" type="button" aria-label="Perbesar"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
              <button class="icon-btn" data-z="-1" type="button" aria-label="Perkecil"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>
              <button class="icon-btn" data-z="0" type="button" aria-label="Reset tampilan"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 3-6M4 4v4h4"/></svg></button>
            </div>
            <svg id="dsvg"></svg>
          </div>

          <div class="form-grid">
            <div class="panel" id="diagInfo">
              <span class="eyebrow">INSPEKTOR KOMPONEN</span>
              <h3 style="margin-top:8px">Pilih blok pada diagram</h3>
              <p class="lead-copy" style="font-size:13.5px">Ketuk komponen pada diagram untuk memfokuskan kamera, melihat pinout, tipe I/O, nilai aktual, dan pratinjau 3D.</p>
            </div>
            <div class="viewport-frame" id="diagPreviewWrap" style="display:none">
              <div class="viewport-hud-top"><span class="hud-chip" id="diagPreviewLabel">PRATINJAU 3D</span></div>
              <div class="viewport-canvas-wrap" style="height:240px" id="diagPreviewCanvas"></div>
            </div>
          </div>
        </div>
      </section>

      <section class="view-page" id="v-analytics">
        <div class="hero-editorial">
          <div>
            <span class="eyebrow">ANALITIK TELEMETRI REAL-TIME</span>
            <h1 class="display-title" data-reveal>Grafik & Riwayat</h1>
            <p class="lead-copy">Visualisasi multi-parameter dari data aktual yang diterima Firebase. Tidak menggunakan data simulasi; tersimpan lokal hingga 1.500 titik.</p>
          </div>
          <div class="btn-row">
            ${segHtml('rangeSeg', [['300000', '5 mnt'], ['1800000', '30 mnt'], ['7200000', '2 jam'], ['0', 'Semua']])}
          </div>
        </div>

        <div class="sec-block">
          <div class="chip-row" id="seriesChips"></div>
          <div class="chart-shell">
            <canvas id="mainChart"></canvas>
            <div class="chart-tip" id="mainTip"></div>
          </div>
        </div>

        <div class="sec-block panel">
          <div class="sec-head">
            <div><span class="eyebrow">AKTIVITAS AKTUATOR</span><h2 class="section-title">Linimasa Perubahan Perangkat</h2></div>
            <button class="btn-ghost" type="button" id="expHistBtnTop">Ekspor CSV</button>
          </div>
          <div class="chart-shell mini-chart-shell" style="border:0;padding:0">
            <canvas id="actChart"></canvas>
          </div>
        </div>
      </section>

      <section class="view-page" id="v-logs">
        <div class="hero-editorial">
          <div>
            <span class="eyebrow">AUDIT & KEJADIAN SISTEM</span>
            <h1 class="display-title" data-reveal>Log Aktivitas</h1>
            <p class="lead-copy">Catatan kronologis koneksi Firebase, perubahan status aktuator terkonfirmasi, perintah manual, dan peringatan sistem.</p>
          </div>
          <div class="btn-row">
            <button class="btn-solid" id="expLogBtn" type="button">Ekspor Log CSV</button>
          </div>
        </div>

        <div class="sec-block">
          <div class="chip-row" id="logFilterChips">
            <button class="chip on" type="button" data-lf="all">Semua</button>
            <button class="chip" type="button" data-lf="act">Aktuator</button>
            <button class="chip" type="button" data-lf="cmd">Perintah</button>
            <button class="chip" type="button" data-lf="warn">Peringatan</button>
            <button class="chip" type="button" data-lf="info">Sistem</button>
          </div>
          <div class="panel">
            <ul class="timeline-list" id="logList"></ul>
          </div>
        </div>
      </section>

      <section class="view-page" id="v-settings">
        <div class="hero-editorial">
          <div>
            <span class="eyebrow">KONFIGURASI & KEAMANAN</span>
            <h1 class="display-title" data-reveal>Setelan Sistem</h1>
            <p class="lead-copy">Kelola koneksi Firebase Realtime Database, keamanan token, preferensi tampilan, kualitas rendering 3D, dan data lokal.</p>
          </div>
        </div>

        <div class="sec-block bento-2">
          <div class="panel">
            <span class="eyebrow">KONEKSI FIREBASE RTDB</span>
            <h3 style="margin-top:8px">Endpoint & Autentikasi</h3>
            <form class="form-grid" id="cfgForm" style="margin-top:16px" novalidate>
              <div class="field">
                <label for="cfgUrl">Alamat Firebase Realtime Database (HTTPS)</label>
                <input id="cfgUrl" placeholder="https://nama-proyek-default-rtdb.firebaseio.com" inputmode="url" autocomplete="off" spellcheck="false">
                <small id="cfgErr"></small>
              </div>
              <div class="field">
                <label for="cfgAuth">Firebase ID Token (Disimpan di Session Browser)</label>
                <input id="cfgAuth" type="password" placeholder="Opsional — gunakan Firebase Auth ID Token, hindari legacy Database Secret" autocomplete="off">
              </div>
              <div class="kv-row" style="padding:4px 0;border:0">
                <span class="kv-k">Ingat token di penyimpanan lokal browser</span>
                ${swHtml('persistAuth', 'Ingat token')}
              </div>
              <div class="btn-row">
                <button class="btn-solid" type="submit">Simpan & Hubungkan</button>
                <button class="btn-ghost" type="button" id="cfgOff">Putuskan</button>
              </div>
            </form>
          </div>

          <div class="panel panel-subtle">
            <span class="eyebrow">ARSITEKTUR KEAMANAN</span>
            <h3 style="margin-top:8px">Rekomendasi Firebase Security Rules</h3>
            <p class="lead-copy" style="font-size:13px;margin-top:8px">Jangan menanamkan Database Secret di kode frontend. Gunakan Firebase Authentication ID Token dan terapkan aturan berikut pada console Firebase:</p>
            <pre class="code-box">${RULES_JSON}</pre>
          </div>
        </div>

        <div class="sec-block panel">
          <div class="sec-head" style="margin-bottom:6px">
            <div>
              <span class="eyebrow">OTOMATISASI & KALIBRASI TANPA FLASH ULANG</span>
              <h2 class="section-title">Batas Ambang Perangkat</h2>
            </div>
            <span class="badge acc" id="threshSyncBadge">NODE: /greenhouse/thresholds</span>
          </div>
          <p class="lead-copy" style="margin-top:6px;font-size:13.5px">Atur batas nyala/mati otomatis untuk pompa, kipas, lampu AC, sudut ventilasi servo, dan kalibrasi tangki air. Setelah disimpan, ESP32-C3 otomatis menerapkan dan menyimpannya ke memori internal (NVS).</p>
          <form id="threshForm" novalidate>
            <div class="thresh-groups">
              <div class="thresh-group">
                <h4>Pompa Air & Tanah</h4>
                <div class="thresh-pair">
                  <div class="field"><label for="thSoilOn">Pompa NYALA (&lt; %)</label><input id="thSoilOn" type="number" min="0" max="99" step="1"></div>
                  <div class="field"><label for="thSoilOff">Pompa MATI (&ge; %)</label><input id="thSoilOff" type="number" min="1" max="100" step="1"></div>
                </div>
              </div>
              <div class="thresh-group">
                <h4>Kipas & Suhu (DHT22)</h4>
                <div class="thresh-pair">
                  <div class="field"><label for="thTempOn">NYALA (&gt; °C)</label><input id="thTempOn" type="number" min="5" max="60" step="0.5"></div>
                  <div class="field"><label for="thTempOff">MATI (&lt; °C)</label><input id="thTempOff" type="number" min="0" max="59" step="0.5"></div>
                </div>
              </div>
              <div class="thresh-group">
                <h4>Lampu AC 220 V (LDR)</h4>
                <div class="thresh-pair">
                  <div class="field"><label for="thLightOn">Lampu NYALA (&lt; %)</label><input id="thLightOn" type="number" min="0" max="99" step="1"></div>
                  <div class="field"><label for="thLightOff">Lampu MATI (&gt; %)</label><input id="thLightOff" type="number" min="1" max="100" step="1"></div>
                </div>
              </div>
              <div class="thresh-group">
                <h4>Ventilasi Servo SG90</h4>
                <div class="thresh-pair">
                  <div class="field"><label for="thServoClose">Sudut Tutup (°)</label><input id="thServoClose" type="number" min="0" max="180" step="1"></div>
                  <div class="field"><label for="thServoOpen">Sudut Buka (°)</label><input id="thServoOpen" type="number" min="0" max="180" step="1"></div>
                </div>
              </div>
              <div class="thresh-group">
                <h4>Tangki Air (HC-SR04)</h4>
                <div class="thresh-pair">
                  <div class="field"><label for="thEmptyCm">Jarak Kosong (cm)</label><input id="thEmptyCm" type="number" min="5" max="200" step="0.5"></div>
                  <div class="field"><label for="thFullCm">Jarak Penuh (cm)</label><input id="thFullCm" type="number" min="1" max="195" step="0.5"></div>
                </div>
                <div class="field"><label for="thWaterLow">Peringatan Air Rendah (&lt; %)</label><input id="thWaterLow" type="number" min="5" max="80" step="1"></div>
              </div>
            </div>
            <div class="thresh-err" id="threshErr" style="margin-top:14px"></div>
            <div class="btn-row" style="margin-top:10px">
              <button class="btn-solid" type="submit" id="threshSaveBtn">Simpan ke Perangkat</button>
              <button class="btn-ghost" type="button" id="threshResetBtn">Reset Default</button>
            </div>
          </form>
        </div>

        <div class="sec-block panel">
          <div class="sec-head" style="margin-bottom:6px">
            <div>
              <span class="eyebrow">JARINGAN PERANGKAT TANPA FLASH ULANG</span>
              <h2 class="section-title">Pengaturan Wi-Fi ESP32-C3</h2>
            </div>
            <span class="badge hydro" id="wifiModeBadge">SUMBER: —</span>
          </div>
          <p class="lead-copy" style="margin-top:6px;font-size:13.5px">Awalnya ESP32-C3 memakai Wi-Fi default yang ditulis di file <code>.ino</code>. Anda dapat mengganti SSID/Password dari sini; jika gagal terhubung, ESP32-C3 otomatis kembali ke Wi-Fi sebelumnya dan password langsung dihapus dari database setelah dibaca perangkat.</p>
          <div class="kv-list" style="margin-top:12px">
            <div class="kv-row"><span class="kv-k">SSID Aktif di ESP32-C3</span><span class="kv-v" id="wifiCurSsid">—</span></div>
            <div class="kv-row"><span class="kv-k">Status Wi-Fi Perangkat</span><span class="kv-v" id="wifiCurMsg">Menunggu laporan ESP32-C3</span></div>
          </div>
          <form class="form-grid" id="wifiForm" style="margin-top:16px" novalidate>
            <div class="thresh-pair">
              <div class="field">
                <label for="wifiSsid">Nama Wi-Fi (SSID Baru)</label>
                <input id="wifiSsid" placeholder="Masukkan nama Wi-Fi / hotspot" autocomplete="off" spellcheck="false">
              </div>
              <div class="field">
                <label for="wifiPass">Password Wi-Fi Baru</label>
                <input id="wifiPass" type="password" placeholder="Kosongkan jika Wi-Fi tanpa password" autocomplete="new-password">
              </div>
            </div>
            <div class="thresh-err" id="wifiErr"></div>
            <div class="btn-row">
              <button class="btn-solid" type="submit" id="wifiSaveBtn">Simpan & Ganti Wi-Fi</button>
              <button class="btn-ghost" type="button" id="wifiResetBtn">Reset Wi-Fi Default (.ino)</button>
            </div>
          </form>
        </div>

        <div class="sec-block bento-2">
          <div class="panel">
            <span class="eyebrow">ANTARMUKA & PERFORMA 3D</span>
            <div class="form-grid" style="margin-top:16px">
              <div class="kv-row"><span class="kv-k">Tema Tampilan</span>${segHtml('themeSeg', [['dark', 'Gelap'], ['light', 'Terang']])}</div>
              <div class="kv-row"><span class="kv-k">Kualitas Visual 3D</span>${segHtml('qualSeg', [['low', 'Rendah'], ['medium', 'Sedang'], ['high', 'Tinggi']])}</div>
              <div class="kv-row"><span class="kv-k">Animasi & Transisi GSAP</span>${swHtml('motion', 'Animasi')}</div>
              <div class="kv-row"><span class="kv-k">Posisi Navigasi di Atas</span>${swHtml('dockTop', 'Navigasi di atas')}</div>
            </div>
          </div>

          <div class="panel panel-subtle">
            <span class="eyebrow">DIAGNOSTIK & DATA LOKAL</span>
            <div class="kv-list" style="margin-top:12px">
              <div class="kv-row"><span class="kv-k">Titik Riwayat Sensor</span><span class="kv-v" id="dHist">0</span></div>
              <div class="kv-row"><span class="kv-k">Node Database Diterima</span><span class="kv-v" id="dNodes">0</span></div>
              <div class="kv-row"><span class="kv-k">Usia Data Terakhir</span><span class="kv-v" id="dAge">—</span></div>
            </div>
            <div class="btn-row" style="margin-top:18px">
              <button class="btn-ghost" id="expHistBtn" type="button">Ekspor Riwayat CSV</button>
              <button class="btn-ghost" id="clrAllBtn" type="button">Hapus Data Lokal</button>
            </div>
          </div>
        </div>
      </section>
      <aside class="servo-test-dock" id="servoTestDock" aria-label="Panel uji servo">
        <div class="servo-test-panel" id="servoTestPanel" aria-hidden="true">
          <div class="st-head">
            <div>
              <span class="eyebrow">SG90 PRECISION TEST</span>
              <h4 style="font-family:var(--font-display);font-size:16px;margin-top:3px">Uji Sudut 0°–180°</h4>
            </div>
            <button class="icon-btn" type="button" id="servoTestClose" aria-label="Tutup panel test servo" style="width:30px;height:30px">
              <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>
            </button>
          </div>
          <div class="st-readout">
            <span class="st-deg" id="stDegVal">0°</span>
            <div class="st-pwm">
              <div id="stPwmVal">500 µs · 50 Hz</div>
              <div id="stConfVal">Aktual: —</div>
            </div>
          </div>
          <input class="precision-slider" id="stSlider" type="range" min="0" max="180" step="1" value="0" aria-label="Sudut servo 0 hingga 180 derajat">
          <div class="st-ticks" id="stTicks">
            <button class="st-tick-btn" type="button" data-ang="0">0°</button>
            <button class="st-tick-btn" type="button" data-ang="45">45°</button>
            <button class="st-tick-btn" type="button" data-ang="90">90°</button>
            <button class="st-tick-btn" type="button" data-ang="135">135°</button>
            <button class="st-tick-btn" type="button" data-ang="180">180°</button>
          </div>
          <div class="btn-row" style="justify-content:space-between">
            <button class="btn-ghost" type="button" id="stSweepBtn" style="padding:7px 13px;font-size:12px">Sweep 0°→180°</button>
            <button class="btn-solid" type="button" id="stDoneBtn" style="padding:7px 14px;font-size:12px">Selesai Uji</button>
          </div>
        </div>
        <button class="servo-test-fab" id="servoTestFab" type="button" aria-expanded="false" title="Buka Panel Test Servo">
          <svg viewBox="0 0 24 24"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>
          <span>Test Servo</span>
        </button>
      </aside>
    `;
  },

  buildDock() {
    const track = $('#dockTrack');
    const drawer = $('#dockDrawer');
    const indicator = $('#dockIndicator');
    track.innerHTML = '';
    track.appendChild(indicator);

    ROUTES.filter((r) => r.dock).forEach((r) => {
      const btn = elFrom(`<button class="dock-item" type="button" data-go="${r.id}" aria-label="${r.label}"><svg viewBox="0 0 24 24">${r.icon}</svg><span>${r.label}</span></button>`);
      track.appendChild(btn);
    });

    drawer.innerHTML = ROUTES.map(
      (r) => `<button class="drawer-btn" type="button" data-go="${r.id}"><svg viewBox="0 0 24 24">${r.icon}</svg><span>${r.num} · ${r.label}</span></button>`
    ).join('');
  },

  toggleDrawer(force) {
    const next = typeof force === 'boolean' ? force : !this.drawerOpen;
    this.drawerOpen = next;
    const dr = $('#dockDrawer');
    const exp = $('#dockExpand');
    exp.setAttribute('aria-expanded', String(next));
    dr.setAttribute('aria-hidden', String(!next));
    if (next) {
      dr.classList.add('open');
      if (motionEnabled()) {
        window.gsap.fromTo(dr, { opacity: 0, y: 12, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.36, ease: 'power3.out' });
        window.gsap.fromTo($$('.drawer-btn', dr), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.025, ease: 'power2.out' });
      }
    } else {
      if (motionEnabled()) {
        window.gsap.to(dr, { opacity: 0, y: 8, duration: 0.22, onComplete: () => dr.classList.remove('open') });
      } else {
        dr.classList.remove('open');
      }
    }
  },

  moveDockIndicator() {
    const ind = $('#dockIndicator');
    const active = $('#dockTrack .dock-item.on');
    if (!ind) return;
    if (!active) {
      ind.style.width = '0px';
      return;
    }
    if (motionEnabled()) {
      window.gsap.to(ind, { left: active.offsetLeft, width: active.offsetWidth, duration: 0.45, ease: 'power3.out' });
    } else {
      ind.style.left = active.offsetLeft + 'px';
      ind.style.width = active.offsetWidth + 'px';
    }
  },

  revealTypography(section) {
    if (!motionEnabled()) return;
    const titles = $$('[data-reveal]', section);
    titles.forEach((el) => {
      if (el.dataset.splitDone) {
        window.gsap.fromTo($$('.rev-word', el), { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.65, stagger: 0.045, ease: 'power3.out' });
        return;
      }
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map((w) => `<span class="rev-mask"><span class="rev-word">${w}</span></span>`).join(' ');
      el.dataset.splitDone = '1';
      window.gsap.fromTo($$('.rev-word', el), { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.65, stagger: 0.045, ease: 'power3.out' });
    });
  },

  go(id, dir = 0, pushHist = true) {
    const route = ROUTES.find((r) => r.id === id) || ROUTES[0];
    const prevIdx = ROUTES.findIndex((r) => r.id === Store.currentRoute);
    const nextIdx = ROUTES.findIndex((r) => r.id === route.id);
    const slideDir = dir !== 0 ? dir : nextIdx >= prevIdx ? 1 : -1;

    Store.currentRoute = route.id;
    this.toggleDrawer(false);

    $$('.view-page').forEach((s) => s.classList.toggle('active', s.id === 'v-' + route.id));
    $$('#dockTrack .dock-item').forEach((b) => b.classList.toggle('on', b.dataset.go === route.id));
    $$('#dockDrawer .drawer-btn').forEach((b) => b.classList.toggle('on', b.dataset.go === route.id));

    $('#crumbIdx').textContent = route.num;
    $('#crumbName').textContent = route.label.toUpperCase();

    if (pushHist && location.hash !== '#' + route.id) {
      history.pushState({ route: route.id }, '', '#' + route.id);
    }

    const activeSection = $('#v-' + route.id);
    scrollTo({ top: 0, behavior: motionEnabled() ? 'smooth' : 'auto' });

    if (motionEnabled() && activeSection) {
      window.gsap.fromTo(
        activeSection,
        { opacity: 0, x: slideDir * 36, filter: 'blur(8px)', scale: 0.99 },
        { opacity: 1, x: 0, filter: 'blur(0px)', scale: 1, duration: 0.55, ease: 'power3.out', clearProps: 'filter,transform' }
      );
      const blocks = $$(':scope > .sec-block, :scope > .comp-grid', activeSection);
      if (blocks.length) {
        window.gsap.fromTo(blocks, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.07, ease: 'power3.out', clearProps: 'transform' });
      }
      this.revealTypography(activeSection);
    }

    if (route.scene) {
      const mountEl = $(`[data-scene-mount="${route.scene}"]`, activeSection);
      SceneManager.mount(mountEl, route.scene);
    } else {
      SceneManager.unmount();
    }

    if (route.id === 'diagram' && this.diagram) this.diagram.fit();
    if (route.id === 'analytics') this.drawAnalytics(true);
    const stDock = $('#servoTestDock');
    if (stDock) {
      stDock.classList.toggle('show', route.id === 'servo');
      if (route.id !== 'servo' && this.servoTestOpen) this.toggleServoTest(false);
    }
    this.drawActiveMiniCharts();
    this.moveDockIndicator();
    this.moveThumbs();
  },

  moveThumbs() {
    $$('.seg').forEach((s) => {
      const on = $('button.on', s);
      const th = $('.thumb', s);
      if (!on || !on.offsetWidth) return;
      th.style.left = on.offsetLeft + 'px';
      th.style.width = on.offsetWidth + 'px';
    });
  },

  setSeg(id, val) {
    $$(`#${id} button`).forEach((b) => b.classList.toggle('on', b.dataset.v === val));
  },

  renderLogs() {
    const renderList = (ul, items, emptyMsg) => {
      if (!ul) return;
      ul.innerHTML = '';
      if (!items.length) {
        ul.append(elFrom(`<li style="display:block;color:var(--mut)">${emptyMsg}</li>`));
        return;
      }
      items.forEach((e) => {
        const li = elFrom(`<li data-k="${e.kind}"><time></time><span class="log-tag"></span><span class="log-msg"></span></li>`);
        $('time', li).textContent = clock(e.t);
        $('.log-tag', li).textContent = e.kind;
        $('.log-msg', li).textContent = e.text;
        ul.append(li);
      });
    };

    const filtered = Store.logFilter === 'all' ? Store.log : Store.log.filter((l) => l.kind === Store.logFilter);
    renderList($('#logList'), filtered.slice(0, 140), 'Belum ada kejadian tercatat.');
    renderList($('#overviewLog'), Store.log.slice(0, 6), 'Belum ada aktivitas perangkat.');

    $$('[data-comp-log]').forEach((ul) => {
      const rx = new RegExp(ul.dataset.compLog, 'i');
      const items = Store.log.filter((l) => rx.test(l.text)).slice(0, 8);
      renderList(ul, items, 'Belum ada aktivitas untuk komponen ini.');
    });
  },

  getRangeData(rangeMs) {
    const lim = rangeMs ? Date.now() - rangeMs : 0;
    return Store.hist.filter((p) => p.t >= lim);
  },

  drawAnalytics(animate = false) {
    const cv = $('#mainChart');
    const tip = $('#mainTip');
    if (!cv || !$('#v-analytics').classList.contains('active')) return;
    const pts = this.getRangeData(this.analyticsRange);
    const keys = [...this.analyticsKeys];
    if (animate && motionEnabled() && pts.length >= 2) {
      const p = { v: 0.05 };
      window.gsap.to(p, {
        v: 1,
        duration: 0.75,
        ease: 'power2.out',
        onUpdate: () => {
          this.analyticsCache = drawLineChart(cv, tip, pts, keys, this.analyticsHover, p.v);
        },
      });
    } else {
      this.analyticsCache = drawLineChart(cv, tip, pts, keys, this.analyticsHover, 1);
    }
    drawDeviceActivityChart($('#actChart'), Store.log);
  },

  drawActiveMiniCharts() {
    const activeSec = $('.view-page.active');
    if (!activeSec) return;
    $$('[data-mini-chart]', activeSec).forEach((cv) => {
      const key = cv.dataset.miniChart;
      const tip = $(`[data-mini-tip="${key}"]`, activeSec);
      const pts = this.getRangeData(1800000);
      this.miniCaches[key] = drawLineChart(cv, tip, pts, [key], null, 1);
    });
  },

  update() {
    const s = Store.sensors();
    const a = Store.confirmedAct();
    const has = Object.keys(s).length > 0;
    const online = Store.online();
    const manual = Store.mode() === 'MANUAL';

    const th = Store.thresholds();
    $('#emptyBox').style.display = has ? 'none' : '';
    $('#alertWater').classList.toggle('on', validNum(s.waterLevel, -1) && s.waterLevel < th.waterLow);
    const alertSpan = $('#alertWater span');
    if (alertSpan) alertSpan.textContent = `PERINGATAN: Ketinggian air tangki di bawah ${th.waterLow}%. Segera isi ulang wadah penampung.`;
    if (!this.threshDirty) this.fillThresholdForm(th);

    const bigEl = $('#bigTemp');
    if (validNum(s.temperature, -90)) {
      if (motionEnabled() && this.lastRenderedTemp !== s.temperature) {
        window.gsap.to(this.tempTween, {
          val: s.temperature,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
          onUpdate: () => {
            bigEl.textContent = this.tempTween.val.toFixed(1);
          },
        });
      } else {
        bigEl.textContent = s.temperature.toFixed(1);
      }
      this.lastRenderedTemp = s.temperature;
    } else {
      bigEl.textContent = '—';
    }

    const headEl = $('#heroHeadline');
    const newHead = !has ? 'Menunggu Telemetri' : online ? (manual ? 'Kendali Manual Aktif' : 'Operasi Otomatis Optimal') : 'Perangkat Offline';
    if (headEl.textContent.replace(/\s+/g, ' ').trim() !== newHead) {
      headEl.textContent = newHead;
      delete headEl.dataset.splitDone;
    }

    $('#heroSubline').textContent = has
      ? `Mode ${Store.mode()} aktif. ${online ? 'ESP32-C3 mengirim telemetri secara real-time.' : 'Data terakhir mungkin sudah usang; memeriksa heartbeat ESP32-C3.'}`
      : 'Hubungkan website ke Firebase Realtime Database yang digunakan ESP32-C3 untuk memantau dan mengendalikan greenhouse secara real-time.';

    $('#badgeMode').textContent = `MODE: ${Store.mode()}${Store.pending.mode ? ' (PENDING)' : ''}`;
    $('#badgeEsp').textContent = `ESP32-C3: ${has ? (online ? 'ONLINE' : 'OFFLINE') : 'STANDBY'}`;
    $('#badgeEsp').className = `badge ${online ? 'acc' : has ? 'warn' : ''}`;

    const age = Store.age();
    $('#badgeSync').textContent = age === null ? 'SYNC: —' : `SYNC: ${Math.max(0, Math.round(age))}s`;

    const tsNow = Store.g.timestamp?.updatedAt || null;
    if (tsNow && tsNow !== this.lastPacketTs) {
      this.lastPacketTs = tsNow;
      const syncB = $('#badgeSync');
      if (syncB) {
        syncB.classList.add('flash');
        setTimeout(() => syncB.classList.remove('flash'), 420);
      }
    }

    SENSORS_LIST.forEach((m) => {
      const val = s[m.key];
      const minOk = m.key === 'temperature' || m.key === 'humidity' ? -90 : -1;
      const isValid = validNum(val, minOk);
      const nodes = $$(`[data-s="${m.key}"]`);
      if (isValid && motionEnabled()) {
        if (!this.metricTweens[m.key]) this.metricTweens[m.key] = { val };
        if (this.metricTweens[m.key].target !== val) {
          this.metricTweens[m.key].target = val;
          window.gsap.to(this.metricTweens[m.key], {
            val,
            duration: 0.26,
            ease: 'power2.out',
            overwrite: 'auto',
            onUpdate: () => {
              const cur = this.metricTweens[m.key].val;
              const txt = m.key === 'temperature' ? `${cur.toFixed(1)}°C` : m.key === 'humidity' ? `${cur.toFixed(1)}%` : `${Math.round(cur)}%`;
              nodes.forEach((n) => { n.textContent = txt; });
            },
          });
        }
      } else {
        nodes.forEach((n) => {
          n.textContent = FMT[m.key](val);
        });
      }
      const bar = $(`[data-bar="${m.key}"]`);
      if (bar) {
        const pct = isValid ? Math.min(100, Math.max(0, (val / m.max) * 100)) : 0;
        bar.style.width = pct + '%';
      }
    });

    DEVICES_LIST.forEach((d) => {
      const confirmed = d.key in a ? !!a[d.key] : null;
      const txt = confirmed === null ? '—' : confirmed ? d.verbOn : d.verbOff;
      $$(`[data-a="${d.key}"], [data-st="${d.key}"]`).forEach((n) => {
        n.textContent = txt;
      });
      const pend = Store.pending[d.key];
      $$(`[data-pend="${d.key}"]`).forEach((n) => {
        n.textContent = pend ? `Menunggu konfirmasi → ${pend.value ? 'ON' : 'OFF'}…` : '';
      });
      $$(`[data-dev="${d.key}"]`).forEach((sw) => {
        sw.setAttribute('aria-checked', String(!!confirmed));
        sw.dataset.pending = String(!!pend);
        sw.disabled = !online || Store.link !== 'open';
      });
    });

    $$('[data-mode-lbl]').forEach((n) => {
      n.textContent = Store.mode() + (Store.pending.mode ? ' (Menunggu konfirmasi…)' : '');
    });

    this.setSeg('modeSeg', Store.mode());

    const linkMap = { idle: 'Belum diatur', wait: 'Menghubungkan', open: 'Tersambung', error: 'Mencoba ulang', denied: 'Akses ditolak' };
    const ls = linkMap[Store.link] || '—';
    $('#hDb').textContent = ls;
    $('#hDev').textContent = has ? (online ? 'Online' : 'Offline') : '—';
    $('#hLast').textContent = age === null ? '—' : age < 90 ? `${Math.max(0, Math.round(age))} detik lalu` : `${Math.round(age / 60)} menit lalu`;
    $('#hUp').textContent = Store.onlineSince ? `${Math.floor((Date.now() - Store.onlineSince) / 60000)} menit` : '—';
    $('#hSamples').textContent = String(Store.hist.length);
    $('#dHist').textContent = String(Store.hist.length);
    $('#dNodes').textContent = String(Object.keys(Store.g).length);
    $('#dAge').textContent = age === null ? '—' : `${Math.round(age)} detik`;

    const conn = Store.g.connection || {};
    const curSsid = typeof conn.wifiSsid === 'string' && conn.wifiSsid ? conn.wifiSsid : '—';
    const isDef = conn.wifiDefault !== false;
    $('#wifiCurSsid').textContent = curSsid;
    $('#wifiCurMsg').textContent = typeof conn.wifiMsg === 'string' && conn.wifiMsg ? conn.wifiMsg : (online ? 'Terhubung' : 'Menunggu laporan ESP32-C3');
    $('#wifiModeBadge').textContent = curSsid === '—' ? 'SUMBER: —' : isDef ? 'SUMBER: DEFAULT (.ino)' : 'SUMBER: KUSTOM (NVS)';

    const pill = $('#linkPill');
    pill.dataset.s = online ? 'on' : Store.link === 'wait' || Store.link === 'error' ? 'wait' : has ? 'off' : '';
    $('.pill-label', pill).textContent = Store.link === 'idle' ? 'Belum terhubung' : online ? 'ESP32-C3 Online' : Store.link === 'open' ? 'Perangkat Offline' : ls;

    $('#sceneHudState').textContent = online ? `LIVE TELEMETRY · ${Store.mode()}` : 'MODEL 3D · MENUNGGU ESP32-C3';
    $('#sceneHudAct').textContent = `POMPA ${a.pump ? 1 : 0} · KIPAS ${a.fan ? 1 : 0} · LAMPU ${a.lamp ? 1 : 0} · VENT ${a.servo ? '90°' : '0°'}`;

    const set3dBadge = (id, text) => {
      const b = $(`[data-3d-badge="${id}"]`);
      if (b) b.textContent = text;
    };
    set3dBadge('water', `AIR ${FMT.waterLevel(s.waterLevel)} · POMPA ${a.pump ? 'ON' : 'OFF'}`);
    const sAngle = typeof a.servoAngle === 'number' ? a.servoAngle : (a.servo ? 90 : 0);
    set3dBadge('servo', `SUDUT ${sAngle}°${a.servoTest ? ' (TEST)' : a.servo ? ' (BUKA)' : ' (TUTUP)'}`);
    const stConf = $('#stConfVal');
    if (stConf) stConf.textContent = `Aktual: ${typeof a.servoAngle === 'number' ? a.servoAngle + '°' : '—'}`;
    set3dBadge('fan', `KIPAS ${a.fan ? 'BERPUTAR' : 'BERHENTI'} · ${FMT.temperature(s.temperature)}`);
    set3dBadge('lighting', `LAMPU ${a.lamp ? 'MENYALA' : 'MATI'} · LDR ${FMT.light(s.light)}`);
    set3dBadge('temperature', `${FMT.temperature(s.temperature)} · RH ${FMT.humidity(s.humidity)}`);
    set3dBadge('soil', `TANAH ${FMT.soilMoisture(s.soilMoisture)} · POMPA ${a.pump ? 'ON' : 'OFF'}`);

    SceneManager.setData({
      temperature: validNum(s.temperature, -90) ? s.temperature : -99,
      humidity: validNum(s.humidity, -90) ? s.humidity : -99,
      soilMoisture: validNum(s.soilMoisture, -1) ? s.soilMoisture : -1,
      light: validNum(s.light, -1) ? s.light : -1,
      waterLevel: validNum(s.waterLevel, -1) ? s.waterLevel : -1,
      pump: !!a.pump,
      fan: !!a.fan,
      lamp: !!a.lamp,
      servo: !!a.servo,
      servoAngle: typeof a.servoAngle === 'number' ? a.servoAngle : -1,
    });

    if (this.diagram) this.diagram.updateState(s, a, online);
    if ($('#v-analytics').classList.contains('active')) this.drawAnalytics(false);
    this.drawActiveMiniCharts();
    this.moveThumbs();
  },

  applyPrefs() {
    const theme = Store.prefs.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.motion = Store.prefs.motion === false ? 'off' : 'on';
    document.documentElement.dataset.dock = Store.prefs.dock || 'bottom';
    document.documentElement.dataset.quality = Store.prefs.quality || 'high';

    this.setSeg('themeSeg', theme);
    this.setSeg('qualSeg', Store.prefs.quality || 'high');
    $('[data-dev="motion"]').setAttribute('aria-checked', String(Store.prefs.motion !== false));
    $('[data-dev="dockTop"]').setAttribute('aria-checked', String(Store.prefs.dock === 'top'));
    $('[data-dev="persistAuth"]').setAttribute('aria-checked', String(!!Store.cfg.persistAuth));
    this.moveThumbs();
  },

  setPref(k, v) {
    Store.prefs[k] = v;
    safeSave('gh.prefs', Store.prefs);
    this.applyPrefs();
    if (k === 'theme' || k === 'quality') {
      SceneManager.refreshTheme();
      this.drawAnalytics(false);
      this.drawActiveMiniCharts();
    }
  },

  setupGestures() {
    let sx = 0, sy = 0, tracking = false;
    const isInteractive = (t) => !!t.closest('.viewport-canvas-wrap, .diagram-wrap, .chart-shell, input, select, textarea, .dock-shell, .seg, .cam-bar');

    document.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1 || isInteractive(e.target)) {
        tracking = false;
        return;
      }
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 68 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
      const idx = ROUTES.findIndex((r) => r.id === Store.currentRoute);
      const nextIdx = dx < 0 ? (idx + 1) % ROUTES.length : (idx - 1 + ROUTES.length) % ROUTES.length;
      const hint = $('#swipeHint');
      hint.textContent = `${dx < 0 ? '←' : '→'} ${ROUTES[nextIdx].label.toUpperCase()}`;
      if (motionEnabled()) {
        window.gsap.fromTo(hint, { opacity: 0, scale: 0.88 }, { opacity: 1, scale: 1, duration: 0.2, yoyo: true, repeat: 1, repeatDelay: 0.3 });
      }
      this.go(ROUTES[nextIdx].id, dx < 0 ? 1 : -1);
    }, { passive: true });

    const grip = $('#dockGrip');
    const shell = $('#dockShell');
    let dragY = null;
    grip.addEventListener('pointerdown', (e) => {
      dragY = e.clientY;
      grip.setPointerCapture(e.pointerId);
    });
    grip.addEventListener('pointermove', (e) => {
      if (dragY === null) return;
      const dy = Math.max(-70, Math.min(70, e.clientY - dragY));
      shell.style.transform = `translate(-50%, ${dy}px)`;
    });
    grip.addEventListener('pointerup', (e) => {
      if (dragY === null) return;
      const delta = e.clientY - dragY;
      dragY = null;
      shell.style.transform = 'translateX(-50%)';
      if (Math.abs(delta) > 42) {
        const nextPos = e.clientY < window.innerHeight / 2 ? 'top' : 'bottom';
        this.setPref('dock', nextPos);
        Toast.show(`Navigasi dipindahkan ke ${nextPos === 'top' ? 'atas' : 'bawah'}`);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        const idx = ROUTES.findIndex((r) => r.id === Store.currentRoute);
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const nextIdx = (idx + dir + ROUTES.length) % ROUTES.length;
        this.go(ROUTES[nextIdx].id, dir);
      }
    });
  },

  bindEvents() {
    document.addEventListener('click', (e) => {
      const goBtn = e.target.closest('[data-go]');
      if (goBtn) {
        const focusNode = goBtn.dataset.focusNode;
        this.go(goBtn.dataset.go);
        if (focusNode && this.diagram) setTimeout(() => this.diagram.pick(focusNode, true), 120);
        return;
      }

      const camBtn = e.target.closest('[data-cam]');
      if (camBtn) {
        $$('#ghCamBar .cam-btn').forEach((b) => b.classList.toggle('on', b === camBtn));
        SceneManager.focus(camBtn.dataset.cam);
        return;
      }

      const sw = e.target.closest('[data-dev]');
      if (sw) {
        const k = sw.dataset.dev;
        if (['pump', 'fan', 'lamp', 'servo'].includes(k)) {
          Control.device(k, sw.getAttribute('aria-checked') !== 'true');
        } else if (k === 'motion') {
          this.setPref('motion', Store.prefs.motion === false);
        } else if (k === 'dockTop') {
          this.setPref('dock', Store.prefs.dock === 'top' ? 'bottom' : 'top');
        } else if (k === 'persistAuth') {
          Store.cfg.persistAuth = !Store.cfg.persistAuth;
          if (!Store.cfg.persistAuth) {
            delete Store.cfg.auth;
          } else if (Store.authToken) {
            Store.cfg.auth = Store.authToken;
          }
          safeSave('gh.cfg', Store.cfg);
          this.applyPrefs();
        }
        return;
      }

      const modeBtn = e.target.closest('#modeSeg button');
      if (modeBtn) Control.mode(modeBtn.dataset.v);

      const themeSegBtn = e.target.closest('#themeSeg button');
      if (themeSegBtn) this.setPref('theme', themeSegBtn.dataset.v);

      const qualSegBtn = e.target.closest('#qualSeg button');
      if (qualSegBtn) this.setPref('quality', qualSegBtn.dataset.v);

      const rangeBtn = e.target.closest('#rangeSeg button');
      if (rangeBtn) {
        this.analyticsRange = Number(rangeBtn.dataset.v);
        this.setSeg('rangeSeg', rangeBtn.dataset.v);
        this.moveThumbs();
        this.drawAnalytics(true);
      }

      const lfBtn = e.target.closest('[data-lf]');
      if (lfBtn) {
        Store.logFilter = lfBtn.dataset.lf;
        $$('#logFilterChips .chip').forEach((c) => c.classList.toggle('on', c === lfBtn));
        this.renderLogs();
      }
    });

    $('#themeBtn').addEventListener('click', () => this.setPref('theme', document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    $('#dockBtn').addEventListener('click', () => this.setPref('dock', Store.prefs.dock === 'top' ? 'bottom' : 'top'));
    $('#dockExpand').addEventListener('click', () => this.toggleDrawer());

    $('#servoTestFab').addEventListener('click', () => this.toggleServoTest());
    $('#servoTestClose').addEventListener('click', () => this.toggleServoTest(false));
    $('#stDoneBtn').addEventListener('click', () => this.toggleServoTest(false));
    $('#stSlider').addEventListener('input', (e) => {
      clearInterval(this.servoSweepTimer);
      this.servoSweepTimer = null;
      const v = Number(e.target.value);
      this.updateServoSliderUi(v);
      this.sendServoTest(true, v);
    });
    $('#stTicks').addEventListener('click', (e) => {
      const b = e.target.closest('[data-ang]');
      if (!b) return;
      clearInterval(this.servoSweepTimer);
      this.servoSweepTimer = null;
      const v = Number(b.dataset.ang);
      this.updateServoSliderUi(v);
      this.sendServoTest(true, v);
    });
    $('#stSweepBtn').addEventListener('click', () => {
      if (this.servoSweepTimer) {
        clearInterval(this.servoSweepTimer);
        this.servoSweepTimer = null;
        return;
      }
      const steps = [0, 45, 90, 135, 180, 90, 0];
      let idx = 0;
      const run = () => {
        const v = steps[idx++];
        this.updateServoSliderUi(v);
        this.sendServoTest(true, v);
        if (idx >= steps.length) {
          clearInterval(this.servoSweepTimer);
          this.servoSweepTimer = null;
        }
      };
      run();
      this.servoSweepTimer = setInterval(run, 950);
    });

    const chipsWrap = $('#seriesChips');
    const renderChips = () => {
      chipsWrap.innerHTML = SERIES_META.map(
        ([k, n, c]) => `<button type="button" class="chip${this.analyticsKeys.has(k) ? ' on' : ''}" data-sk="${k}" style="--c:var(${c})"><i></i>${n}</button>`
      ).join('');
    };
    renderChips();
    chipsWrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sk]');
      if (!b) return;
      const k = b.dataset.sk;
      if (this.analyticsKeys.has(k)) {
        if (this.analyticsKeys.size > 1) this.analyticsKeys.delete(k);
      } else {
        this.analyticsKeys.add(k);
      }
      renderChips();
      this.drawAnalytics(false);
    });

    const mainCv = $('#mainChart');
    const handleHover = (e) => {
      if (!this.analyticsCache || !this.analyticsCache.pts.length) return;
      const r = mainCv.getBoundingClientRect();
      const x = e.clientX - r.left;
      let best = 0;
      let dist = Infinity;
      this.analyticsCache.pts.forEach((p, i) => {
        const d = Math.abs(this.analyticsCache.X(p.t) - x);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });
      this.analyticsHover = best;
      this.drawAnalytics(false);
    };
    mainCv.addEventListener('pointermove', handleHover);
    mainCv.addEventListener('pointerdown', handleHover);
    mainCv.addEventListener('pointerleave', () => {
      this.analyticsHover = null;
      this.drawAnalytics(false);
    });

    $('#cfgUrl').value = Store.cfg.url || '';
    $('#cfgAuth').value = Store.authToken || '';
    $('#cfgForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const url = $('#cfgUrl').value.trim();
      if (!Link.check(url)) {
        $('#cfgErr').textContent = 'Gunakan URL https yang berakhiran firebaseio.com atau firebasedatabase.app';
        return;
      }
      $('#cfgErr').textContent = '';
      const token = $('#cfgAuth').value.trim();
      Store.authToken = token;
      if (token) sessionStorage.setItem('gh.auth', token);
      else sessionStorage.removeItem('gh.auth');
      Store.cfg = { url, persistAuth: !!Store.cfg.persistAuth, ...(Store.cfg.persistAuth && token ? { auth: token } : {}) };
      safeSave('gh.cfg', Store.cfg);
      Store.g = {};
      Link.start();
      Toast.show('Menghubungkan ke Firebase Realtime Database…');
    });

    $('#cfgOff').addEventListener('click', () => {
      Link.stop();
      Store.g = {};
      Store.cfg.disconnected = true;
      safeSave('gh.cfg', Store.cfg);
      Link.set('idle');
      Toast.show('Koneksi database diputus');
    });

    const thForm = $('#threshForm');
    thForm.addEventListener('input', () => {
      this.threshDirty = true;
      $('#threshErr').textContent = '';
    });
    thForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const next = this.readThresholdForm();
      const err = this.validateThresholds(next);
      if (err) {
        $('#threshErr').textContent = err;
        return;
      }
      $('#threshErr').textContent = '';
      if (!Link.check(Store.cfg.url)) {
        $('#threshErr').textContent = 'Hubungkan Firebase Realtime Database terlebih dahulu untuk menyimpan ke ESP32-C3.';
        return;
      }
      Toast.show('Menyimpan batas otomatisasi ke Firebase…');
      try {
        await Link.put('thresholds', next);
        Store.g.thresholds = next;
        this.threshDirty = false;
        Store.note('cmd', `Batas otomatisasi diperbarui (Tanah ${next.soilOn}/${next.soilOff}%, Suhu ${next.tempOn}/${next.tempOff}°C, Lampu ${next.lightOn}/${next.lightOff}%)`);
        Store.emit();
        Toast.show('Batas tersimpan! ESP32-C3 akan menerapkan & menyimpannya di memori dalam ±5 detik.');
      } catch (ex) {
        Toast.show(ex.message || 'Gagal menyimpan batas otomatisasi', 'err');
      }
    });

    $('#threshResetBtn').addEventListener('click', async () => {
      const ok = await Ask.open(
        'Reset ke nilai default?',
        'Semua batas kembali ke standar awal (Tanah 35/55%, Suhu 30/27°C, Lampu 30/45%, Servo 0°/90°, Air <20%, Tangki 15/3 cm).',
        'Reset Default'
      );
      if (!ok) return;
      this.fillThresholdForm(DEFAULT_THRESHOLDS);
      this.threshDirty = false;
      $('#threshErr').textContent = '';
      if (Link.check(Store.cfg.url)) {
        try {
          await Link.put('thresholds', { ...DEFAULT_THRESHOLDS });
          Store.g.thresholds = { ...DEFAULT_THRESHOLDS };
          Store.note('cmd', 'Batas otomatisasi direset ke nilai default');
          Store.emit();
          Toast.show('Default tersimpan ke Firebase dan akan diterapkan oleh ESP32-C3.');
        } catch (ex) {
          Toast.show(ex.message || 'Gagal mengirim reset ke Firebase', 'err');
        }
      } else {
        Toast.show('Formulir direset ke angka default.');
      }
    });

    $('#wifiForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const ssid = $('#wifiSsid').value.trim();
      const password = $('#wifiPass').value;
      if (!ssid) {
        $('#wifiErr').textContent = 'Nama Wi-Fi (SSID) wajib diisi.';
        return;
      }
      if (!Link.check(Store.cfg.url)) {
        $('#wifiErr').textContent = 'Hubungkan Firebase Realtime Database terlebih dahulu.';
        return;
      }
      $('#wifiErr').textContent = '';
      const ok = await Ask.open(
        'Ganti Wi-Fi ESP32-C3?',
        `ESP32-C3 akan mencoba tersambung ke "${ssid}". Jika gagal dalam 15 detik, perangkat otomatis kembali ke Wi-Fi sebelumnya.`,
        'Ganti Wi-Fi'
      );
      if (!ok) return;
      Toast.show('Mengirim konfigurasi Wi-Fi ke ESP32-C3…');
      try {
        await Link.put('commands/wifi', { action: 'update', ssid, password, reqId: String(Date.now()) });
        $('#wifiPass').value = '';
        Store.note('cmd', `Permintaan ganti Wi-Fi ke "${ssid}" dikirim`);
        Toast.show('Terkirim! ESP32-C3 akan beralih Wi-Fi dalam ±5 detik dan menghapus password dari database.');
      } catch (ex) {
        Toast.show(ex.message || 'Gagal mengirim konfigurasi Wi-Fi', 'err');
      }
    });

    $('#wifiResetBtn').addEventListener('click', async () => {
      if (!Link.check(Store.cfg.url)) {
        $('#wifiErr').textContent = 'Hubungkan Firebase Realtime Database terlebih dahulu.';
        return;
      }
      $('#wifiErr').textContent = '';
      const ok = await Ask.open(
        'Reset Wi-Fi ke default (.ino)?',
        'ESP32-C3 akan menghapus Wi-Fi kustom di memori NVS dan kembali memakai DEFAULT_WIFI_SSID & DEFAULT_WIFI_PASSWORD dari file firmware.',
        'Reset Wi-Fi Default'
      );
      if (!ok) return;
      Toast.show('Mengirim perintah reset Wi-Fi default…');
      try {
        await Link.put('commands/wifi', { action: 'reset', reqId: String(Date.now()) });
        $('#wifiSsid').value = '';
        $('#wifiPass').value = '';
        Store.note('cmd', 'Permintaan reset Wi-Fi ke default firmware dikirim');
        Toast.show('Perintah reset Wi-Fi terkirim ke ESP32-C3.');
      } catch (ex) {
        Toast.show(ex.message || 'Gagal mengirim reset Wi-Fi', 'err');
      }
    });

    const exportHistory = () => {
      Out.csv(
        [['waktu', 'suhu', 'kelembapan_udara', 'kelembapan_tanah', 'cahaya', 'tinggi_air'], ...Store.hist.map((p) => [new Date(p.t).toISOString(), p.temperature, p.humidity, p.soilMoisture, p.light, p.waterLevel])],
        'riwayat-greenhouse.csv'
      );
    };
    $('#expHistBtn').addEventListener('click', exportHistory);
    $('#expHistBtnTop').addEventListener('click', exportHistory);
    $('#expLogBtn').addEventListener('click', () => {
      Out.csv([['waktu', 'jenis', 'kejadian'], ...Store.log.map((l) => [new Date(l.t).toISOString(), l.kind, l.text])], 'log-greenhouse.csv');
    });

    $('#clrAllBtn').addEventListener('click', async () => {
      if (!(await Ask.open('Hapus data lokal?', 'Seluruh riwayat sensor dan log di browser ini akan dihapus. Data di Firebase tidak berubah.', 'Hapus Data'))) return;
      Store.hist = [];
      Store.log = [];
      safeSave('gh.hist', []);
      safeSave('gh.log', []);
      this.renderLogs();
      this.drawAnalytics(false);
      Store.emit();
      Toast.show('Data lokal berhasil dibersihkan');
    });

    $$('[data-z]').forEach((b) => b.addEventListener('click', () => this.diagram?.zoom(Number(b.dataset.z))));

    let raf = 0;
    window.addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        $('#topbar').classList.toggle('scrolled', window.scrollY > 10);
        const bt = $('#bigTemp');
        if (bt && motionEnabled()) {
          bt.style.transform = `translateY(${Math.min(48, window.scrollY * 0.1)}px)`;
        }
      });
    }, { passive: true });

    window.addEventListener('resize', () => {
      this.moveThumbs();
      this.moveDockIndicator();
      this.drawAnalytics(false);
      this.drawActiveMiniCharts();
    });

    window.addEventListener('popstate', () => {
      const h = location.hash.slice(1);
      this.go(h || 'overview', 0, false);
    });
  },

  initDiagram() {
    this.diagram = new DiagramController($('#dsvg'), $('#diagInfo'), (n) => {
      const s = Store.sensors();
      const a = Store.confirmedAct();
      const val = n.v ? FMT[n.v](s[n.v]) : n.a ? (n.a in a ? (a[n.a] ? 'Aktif' : 'Nonaktif') : '—') : null;
      $('#diagInfo').innerHTML = `
        <span class="eyebrow">${n.io}</span>
        <h3 style="margin-top:8px">${n.t}</h3>
        <p class="lead-copy" style="font-size:13.5px;margin-top:8px">${n.d}</p>
        <div class="kv-list" style="margin-top:14px">
          <div class="kv-row"><span class="kv-k">Pin / Jalur</span><span class="kv-v">${n.p}</span></div>
          ${val !== null ? `<div class="kv-row"><span class="kv-k">Status / Nilai Aktual</span><span class="kv-v">${val}</span></div>` : ''}
        </div>
        ${n.page ? `<div class="btn-row" style="margin-top:16px"><button class="btn-solid" type="button" data-go="${n.page}">Buka Halaman Kontrol</button></div>` : ''}
      `;
      const prevWrap = $('#diagPreviewWrap');
      if (n.scene) {
        prevWrap.style.display = '';
        $('#diagPreviewLabel').textContent = `PRATINJAU 3D · ${n.t.toUpperCase()}`;
        SceneManager.mount($('#diagPreviewCanvas'), n.scene);
      } else {
        prevWrap.style.display = 'none';
        SceneManager.unmount();
      }
    });
  },

  init() {
    this.buildPages();
    this.buildDock();
    this.initDiagram();
    this.bindEvents();
    this.setupGestures();
    this.setSeg('rangeSeg', String(this.analyticsRange));
    this.applyPrefs();
    this.renderLogs();
    Store.sub(() => this.update());
    setInterval(() => {
      const prev = Track.prevOnline;
      Track.tick();
      if (Track.prevOnline !== prev) {
        Store.emit();
      } else {
        const age = Store.age();
        const sb = $('#badgeSync');
        if (sb) sb.textContent = age === null ? 'SYNC: —' : `SYNC: ${Math.max(0, Math.round(age))}s`;
        const hl = $('#hLast');
        if (hl) hl.textContent = age === null ? '—' : age < 90 ? `${Math.max(0, Math.round(age))} detik lalu` : `${Math.round(age / 60)} menit lalu`;
        const da = $('#dAge');
        if (da) da.textContent = age === null ? '—' : `${Math.round(age)} detik`;
      }
    }, 1000);
    const initial = location.hash.slice(1) || 'overview';
    this.go(initial, 0, false);
    Link.start();
    Store.emit();
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
