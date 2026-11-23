const clock = (t) => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const validNum = (v, min) => typeof v === 'number' && Number.isFinite(v) && v > min;

export const SERIES_META = [
  ['temperature', 'Suhu (°C)', '--amb'],
  ['humidity', 'Kelembapan Udara (%)', '--stone'],
  ['soilMoisture', 'Kelembapan Tanah (%)', '--acc'],
  ['light', 'Intensitas Cahaya (%)', '--soil'],
  ['waterLevel', 'Tinggi Air (%)', '--hydro'],
];

const cssVar = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

export function drawLineChart(canvas, tipEl, points, activeKeys, hoverIdx, progress = 1) {
  if (!canvas || !canvas.clientWidth) return { pts: [], X: () => 0 };
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const mut = cssVar('--mut');
  const line = cssVar('--line');
  const pad = { l: 44, r: 16, t: 18, b: 30 };

  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = mut;
  ctx.strokeStyle = line;

  if (!points || points.length < 2) {
    ctx.textAlign = 'center';
    ctx.fillText('Menunggu minimal 2 sampel data aktual dari ESP32-C3', W / 2, H / 2 - 6);
    ctx.font = '10.5px "Space Grotesk", sans-serif';
    ctx.fillText('Grafik tergambar otomatis saat Firebase mengirim pembaruan sensor', W / 2, H / 2 + 14);
    if (tipEl) tipEl.style.opacity = 0;
    return { pts: [], X: () => 0 };
  }

  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const spanT = Math.max(1, t1 - t0);
  const X = (t) => pad.l + ((t - t0) / spanT) * (W - pad.l - pad.r);

  const vals = points.flatMap((p) => activeKeys.map((k) => p[k]).filter((v) => v !== null && v !== undefined));
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (!Number.isFinite(lo)) return { pts: [], X: () => 0 };
  if (hi - lo < 4) {
    lo -= 2;
    hi += 2;
  } else {
    const m = (hi - lo) * 0.1;
    lo -= m;
    hi += m;
  }

  const Y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);

  ctx.textAlign = 'right';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const v = lo + ((hi - lo) * i) / 4;
    const y = Y(v);
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
    ctx.stroke();
    ctx.fillText(v.toFixed(0), pad.l - 8, y + 3.5);
  }

  ctx.textAlign = 'center';
  [t0, (t0 + t1) / 2, t1].forEach((t) => {
    const tx = Math.min(W - 36, Math.max(40, X(t)));
    ctx.fillText(clock(t), tx, H - 8);
  });

  const maxIdx = Math.max(1, Math.floor((points.length - 1) * progress));

  activeKeys.forEach((k) => {
    const meta = SERIES_META.find((s) => s[0] === k);
    if (!meta) return;
    const col = cssVar(meta[2]);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    let pen = false;
    let firstX = null;
    let lastX = null;
    for (let i = 0; i <= maxIdx; i++) {
      const p = points[i];
      if (p[k] === null || p[k] === undefined) {
        pen = false;
        continue;
      }
      const x = X(p.t);
      const y = Y(p[k]);
      if (firstX === null) firstX = x;
      lastX = x;
      if (pen) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
      pen = true;
    }
    ctx.stroke();

    if (activeKeys.length === 1 && firstX !== null && lastX !== null) {
      ctx.lineTo(lastX, H - pad.b);
      ctx.lineTo(firstX, H - pad.b);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
      grad.addColorStop(0, col + '33');
      grad.addColorStop(1, col + '00');
      ctx.fillStyle = grad;
      ctx.fill();
    }
  });

  if (hoverIdx !== null && points[hoverIdx]) {
    const p = points[hoverIdx];
    const x = X(p.t);
    ctx.strokeStyle = mut;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, pad.t);
    ctx.lineTo(x, H - pad.b);
    ctx.stroke();
    ctx.setLineDash([]);

    activeKeys.forEach((k) => {
      if (p[k] === null || p[k] === undefined) return;
      const meta = SERIES_META.find((s) => s[0] === k);
      ctx.fillStyle = cssVar(meta[2]);
      ctx.beginPath();
      ctx.arc(x, Y(p[k]), 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    if (tipEl) {
      tipEl.innerHTML =
        `<strong>${clock(p.t)}</strong><br>` +
        activeKeys
          .map((k) => {
            const meta = SERIES_META.find((s) => s[0] === k);
            return `${meta[1]}: ${p[k] === null || p[k] === undefined ? '—' : p[k]}`;
          })
          .join('<br>');
      tipEl.style.opacity = 1;
      tipEl.style.left = Math.min(W - tipEl.offsetWidth - 10, Math.max(12, x - tipEl.offsetWidth / 2)) + 'px';
      tipEl.style.top = '18px';
    }
  } else if (tipEl) {
    tipEl.style.opacity = 0;
  }

  return { pts: points, X };
}

export function drawDeviceActivityChart(canvas, logItems) {
  if (!canvas || !canvas.clientWidth) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const mut = cssVar('--mut');
  const line = cssVar('--line');
  const acc = cssVar('--acc');
  const amb = cssVar('--amb');
  const hydro = cssVar('--hydro');
  const soil = cssVar('--soil');

  const actLogs = (logItems || []).filter((l) => l.kind === 'act' || l.kind === 'cmd').slice(0, 40).reverse();
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = mut;

  if (!actLogs.length) {
    ctx.textAlign = 'center';
    ctx.fillText('Belum ada riwayat perubahan aktuator tercatat', W / 2, H / 2);
    return;
  }

  const rows = [
    { key: 'Pompa', col: hydro },
    { key: 'Kipas', col: acc },
    { key: 'Lampu', col: amb },
    { key: 'Ventilasi', col: soil },
  ];

  const padL = 82, padR = 16, padT = 20, padB = 22;
  const rowH = (H - padT - padB) / rows.length;

  rows.forEach((r, idx) => {
    const y = padT + idx * rowH + rowH / 2;
    ctx.textAlign = 'left';
    ctx.fillStyle = mut;
    ctx.fillText(r.key, 8, y + 4);
    ctx.strokeStyle = line;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();

    const matching = actLogs.filter((l) => l.text.includes(r.key));
    matching.forEach((ev, i) => {
      const frac = matching.length === 1 ? 0.5 : i / (matching.length - 1);
      const x = padL + frac * (W - padL - padR);
      const isOn = ev.text.includes('menyala') || ev.text.includes('ON') || ev.text.includes('dibuka') || ev.text.includes('buka');
      ctx.fillStyle = isOn ? r.col : mut;
      ctx.beginPath();
      ctx.arc(x, y, isOn ? 5.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

export const DIAGRAM_NODES = [
  { id: 'soil', x: 24, y: 28, w: 186, h: 58, t: 'Soil Moisture', p: 'GPIO0 · ADC · 3,3 V', io: 'INPUT ANALOG', d: 'Mengukur kelembapan media tanam (ON < 35%, OFF ≥ 55%).', v: 'soilMoisture', page: 'soil', scene: 'soil' },
  { id: 'dht', x: 24, y: 112, w: 186, h: 58, t: 'DHT22', p: 'GPIO3 · 1-Wire · 3,3 V', io: 'INPUT DIGITAL', d: 'Membaca suhu dan kelembapan udara (Kipas/Servo > 30°C / < 27°C).', v: 'temperature', page: 'temperature', scene: 'temperature' },
  { id: 'ldr', x: 24, y: 196, w: 186, h: 58, t: 'Modul LDR', p: 'GPIO1 · ADC · 3,3 V', io: 'INPUT ANALOG', d: 'Mendeteksi intensitas cahaya (Lampu ON < 30%, OFF > 45%).', v: 'light', page: 'lighting', scene: 'lighting' },
  { id: 'us', x: 24, y: 280, w: 186, h: 58, t: 'HC-SR04 Ultrasonik', p: 'GPIO4 TRIG · GPIO5 ECHO', io: 'INPUT PULSA', d: 'Mengukur tinggi air wadah. Echo 5 V diturunkan ke 3,3 V (1k/2k).', v: 'waterLevel', page: 'water', scene: 'water' },
  { id: 'esp', x: 344, y: 100, w: 192, h: 204, t: 'ESP32-C3 SuperMini', p: 'RISC-V · Wi-Fi · 3,3 V', io: 'KONTROLER UTAMA', d: 'Membaca sensor tiap 1 dtk, menjalankan hysteresis AUTO/MANUAL, sinkron Firebase TLS tiap 5 dtk.', core: true, page: 'overview', scene: 'greenhouse' },
  { id: 'rly', x: 616, y: 24, w: 122, h: 210, t: 'Modul Relay', p: 'GPIO6 · 7 · 10 (LOW)', io: 'SAKLAR BEBAN', d: 'Menyaklarkan beban pompa DC, kipas DC, dan lampu AC 220 V (jalur AC terpisah).' },
  { id: 'pump', x: 794, y: 24, w: 146, h: 58, t: 'Pompa Air DC', p: 'GPIO6 · via Relay', io: 'AKTUATOR', d: 'Menyiram media tanam otomatis saat tanah kering atau mode MANUAL.', a: 'pump', page: 'water', scene: 'water' },
  { id: 'fan', x: 794, y: 104, w: 146, h: 58, t: 'Kipas DC', p: 'GPIO7 · via Relay', io: 'AKTUATOR', d: 'Sirkulasi udara dan pendinginan greenhouse saat suhu > 30 °C.', a: 'fan', page: 'fan', scene: 'fan' },
  { id: 'lamp', x: 794, y: 184, w: 146, h: 58, t: 'Lampu AC 220 V', p: 'GPIO10 · AC Terpisah', io: 'AKTUATOR AC', d: 'Pencahayaan greenhouse. Catu AC 220 V terpisah total dari rel baterai DC.', a: 'lamp', page: 'lighting', scene: 'lighting' },
  { id: 'srv', x: 794, y: 280, w: 146, h: 58, t: 'Servo SG90', p: 'GPIO21 · PWM · 5 V', io: 'AKTUATOR PWM', d: 'Membuka ventilasi 90° saat panas dan menutup 0° saat normal.', a: 'servo', page: 'servo', scene: 'servo' },
  { id: 'wifi', x: 344, y: 400, w: 192, h: 58, t: 'Wi-Fi 802.11 b/g/n', p: 'TLS 1.2 · GTS Root CA', io: 'KOMUNIKASI', d: 'Jalur komunikasi terenkripsi ESP32-C3 ke cloud Firebase.' },
  { id: 'fb', x: 604, y: 400, w: 164, h: 58, t: 'Firebase RTDB', p: 'greenhouse/*', io: 'CLOUD DB', d: 'Menyimpan sensors, actuators (terkonfirmasi), commands, dan mode.' },
  { id: 'web', x: 816, y: 400, w: 124, h: 58, t: 'Website OS', p: 'SSE Realtime', io: 'ANTARMUKA', d: 'Dashboard monitoring 3D, analitik, log, dan kendali jarak jauh.', page: 'overview', scene: 'greenhouse' },
];

export const DIAGRAM_EDGES = [
  ['soil', 'esp', 'M210 57H276V142H344', 'sens'],
  ['dht', 'esp', 'M210 141H344', 'sens'],
  ['ldr', 'esp', 'M210 225H276V225H344', 'sens'],
  ['us', 'esp', 'M210 309H276V270H344', 'sens'],
  ['esp', 'rly', 'M536 128H616', 'rly'],
  ['rly', 'pump', 'M738 53H794', 'pump'],
  ['rly', 'fan', 'M738 133H794', 'fan'],
  ['rly', 'lamp', 'M738 213H794', 'lamp'],
  ['esp', 'srv', 'M536 284H674V309H794', 'servo'],
  ['esp', 'wifi', 'M440 304V400', 'net'],
  ['wifi', 'fb', 'M536 429H604', 'net'],
  ['fb', 'web', 'M768 429H816', 'net'],
];

export class DiagramController {
  constructor(svgEl, infoEl, onPick) {
    this.svg = svgEl;
    this.info = infoEl;
    this.onPick = onPick;
    this.sel = null;
    this.vb = { x: 0, y: 0, w: 964, h: 486 };
    this.build();
  }

  build() {
    this.svg.setAttribute('viewBox', '0 0 964 486');
    this.svg.innerHTML =
      DIAGRAM_EDGES.map((e, i) => `<path class="d-edge" id="de${i}" d="${e[2]}"/>`).join('') +
      DIAGRAM_NODES.map(
        (n) =>
          `<g class="d-node${n.core ? ' core' : ''}" data-n="${n.id}" tabindex="0" role="button" aria-label="${n.t}">` +
          `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="12"/>` +
          `<text x="${n.x + 14}" y="${n.y + 25}" font-weight="600">${n.t}</text>` +
          `<text class="d-pin" x="${n.x + 14}" y="${n.y + 44}">${n.p}</text>` +
          `</g>`
      ).join('');

    this.svg.addEventListener('click', (e) => {
      const g = e.target.closest('.d-node');
      if (g) this.pick(g.dataset.n, true);
    });
    this.svg.addEventListener('keydown', (e) => {
      const g = e.target.closest('.d-node');
      if (g && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        this.pick(g.dataset.n, true);
      }
    });

    let drag = null;
    this.svg.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.d-node')) return;
      drag = { x: e.clientX, y: e.clientY, vb: { ...this.vb } };
      this.svg.setPointerCapture(e.pointerId);
    });
    this.svg.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const k = this.vb.w / Math.max(1, this.svg.clientWidth);
      this.vb.x = drag.vb.x - (e.clientX - drag.x) * k;
      this.vb.y = drag.vb.y - (e.clientY - drag.y) * k;
      this.apply();
    });
    this.svg.addEventListener('pointerup', () => {
      drag = null;
    });
    this.svg.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.zoom(e.deltaY < 0 ? 1 : -1);
      },
      { passive: false }
    );
  }

  apply() {
    this.svg.setAttribute('viewBox', `${this.vb.x.toFixed(1)} ${this.vb.y.toFixed(1)} ${this.vb.w.toFixed(1)} ${this.vb.h.toFixed(1)}`);
  }

  animateViewBox(target) {
    if (window.gsap && document.documentElement.dataset.motion !== 'off') {
      window.gsap.to(this.vb, { ...target, duration: 0.65, ease: 'power3.out', onUpdate: () => this.apply() });
    } else {
      Object.assign(this.vb, target);
      this.apply();
    }
  }

  zoom(dir) {
    if (dir === 0) return this.animateViewBox({ x: 0, y: 0, w: 964, h: 486 });
    const f = dir > 0 ? 0.78 : 1.28;
    const w = Math.min(964, Math.max(300, this.vb.w * f));
    const h = (w * 486) / 964;
    const x = Math.max(-40, Math.min(964 - w + 40, this.vb.x + (this.vb.w - w) / 2));
    const y = Math.max(-40, Math.min(486 - h + 40, this.vb.y + (this.vb.h - h) / 2));
    this.animateViewBox({ x, y, w, h });
  }

  fit() {
    this.animateViewBox({ x: 0, y: 0, w: 964, h: 486 });
  }

  focusNode(n) {
    const w = 520;
    const h = (w * 486) / 964;
    const cx = n.x + n.w / 2;
    const cy = n.y + n.h / 2;
    this.animateViewBox({
      x: Math.max(0, Math.min(964 - w, cx - w / 2)),
      y: Math.max(0, Math.min(486 - h, cy - h / 2)),
      w,
      h,
    });
  }

  pick(id, focusCam = false) {
    const n = DIAGRAM_NODES.find((x) => x.id === id);
    if (!n) return;
    this.sel = id;
    this.svg.querySelectorAll('.d-node').forEach((g) => g.classList.toggle('sel', g.dataset.n === id));
    if (focusCam) this.focusNode(n);
    if (this.onPick) this.onPick(n);
  }

  updateState(sensors, actuators, online) {
    const flags = {
      sens: online,
      rly: online && (actuators.pump || actuators.fan || actuators.lamp),
      pump: online && actuators.pump,
      fan: online && actuators.fan,
      lamp: online && actuators.lamp,
      servo: online && actuators.servo,
      net: online,
    };
    DIAGRAM_EDGES.forEach((e, i) => {
      const el = this.svg.querySelector(`#de${i}`);
      if (el) el.classList.toggle('on', !!flags[e[3]]);
    });
    DIAGRAM_NODES.forEach((n) => {
      const g = this.svg.querySelector(`[data-n="${n.id}"]`);
      if (!g) return;
      const active = n.a
        ? !!(online && actuators[n.a])
        : n.v
        ? online && (n.v === 'temperature' ? validNum(sensors.temperature, -90) : validNum(sensors[n.v], -1))
        : ['fb', 'wifi', 'web'].includes(n.id)
        ? online
        : false;
      g.classList.toggle('act', active && !n.core);
    });
  }
}
