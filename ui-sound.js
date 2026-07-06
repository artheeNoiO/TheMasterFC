/** ระบบเสียง UI ทั่วเกม — สังเคราะห์ด้วย Web Audio API ล้วนๆ (ไม่มีไฟล์เสียง) ใช้คู่กับเสียงกองเชียในสนาม (stadium-crowd.js) */

const SFX_MUTE_KEY = "siam_sfx_muted";
const SFX_VOLUME_KEY = "siam_sfx_volume";

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function isSfxMuted() {
  try { return localStorage.getItem(SFX_MUTE_KEY) === "1"; } catch { return false; }
}
export function setSfxMuted(muted) {
  try { localStorage.setItem(SFX_MUTE_KEY, muted ? "1" : "0"); } catch { /* ignore */ }
}
export function getSfxVolume() {
  try {
    const v = parseInt(localStorage.getItem(SFX_VOLUME_KEY), 10);
    return Number.isFinite(v) ? clamp(v, 0, 100) : 70;
  } catch { return 70; }
}
export function setSfxVolume(v) {
  try { localStorage.setItem(SFX_VOLUME_KEY, String(clamp(Math.round(v), 0, 100))); } catch { /* ignore */ }
}

class UiSoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
  }

  ensureContext() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      this._applyVolume();
      return this.ctx;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this._applyVolume();
    return this.ctx;
  }

  _applyVolume() {
    if (this.master) this.master.gain.value = getSfxVolume() / 100;
  }

  /** โน้ตเดี่ยว — ปรับ freq/waveform/envelope ได้อิสระ ใช้ประกอบเสียงต่างๆ ด้านล่าง */
  _tone({ freq, duration = 0.14, type = "sine", peak = 0.22, delay = 0, sweepTo = null, pan = 0 }) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (sweepTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(sweepTo, 1), t + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.001), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) { p.pan.value = pan; osc.connect(g); g.connect(p); p.connect(this.master); }
    else { osc.connect(g); g.connect(this.master); }
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  click() { this._tone({ freq: 1400, duration: 0.045, type: "square", peak: 0.07 }); }
  tabSwitch() { this._tone({ freq: 720, duration: 0.06, type: "sine", peak: 0.06 }); }
  confirm() {
    this._tone({ freq: 660, duration: 0.09, type: "sine", peak: 0.14 });
    this._tone({ freq: 990, duration: 0.14, type: "sine", peak: 0.13, delay: 0.07 });
  }
  error() { this._tone({ freq: 220, duration: 0.22, type: "sawtooth", peak: 0.12, sweepTo: 140 }); }
  cash() {
    this._tone({ freq: 880, duration: 0.09, type: "triangle", peak: 0.14 });
    this._tone({ freq: 1175, duration: 0.09, type: "triangle", peak: 0.14, delay: 0.06 });
    this._tone({ freq: 1568, duration: 0.16, type: "triangle", peak: 0.15, delay: 0.12 });
  }
  notify() {
    this._tone({ freq: 1046, duration: 0.1, type: "sine", peak: 0.11 });
    this._tone({ freq: 1318, duration: 0.12, type: "sine", peak: 0.1, delay: 0.09 });
  }
  modalOpen() { this._tone({ freq: 500, duration: 0.1, type: "sine", peak: 0.09, sweepTo: 780 }); }
  modalClose() { this._tone({ freq: 780, duration: 0.09, type: "sine", peak: 0.08, sweepTo: 460 }); }
}

export const uiSound = new UiSoundEngine();

/** เรียกใช้จากทุกที่ในเกม — เงียบอัตโนมัติถ้าผู้ใช้ปิดเสียงไว้ หรือเบราว์เซอร์ยังไม่ปลดล็อก audio */
export function playUiSound(kind) {
  if (isSfxMuted()) return;
  try {
    const ctx = uiSound.ensureContext();
    if (!ctx) return;
    uiSound[kind]?.();
  } catch { /* เสียงพลาดไม่ควรทำแอปพัง */ }
}

/** เดา sound kind จากข้อความ toast — ใช้กับ showToast() ที่เรียกจากทั่วเกมอยู่แล้ว ไม่ต้องแก้จุดเรียกทีละที่ */
export function inferToastSound(msg = "") {
  if (/⚠️|ไม่สำเร็จ|ไม่พอ|ผิดพลาด|ล้มเหลว|ไม่ได้/.test(msg)) return "error";
  if (/[+💰🏆💵]|ได้รับ|รางวัล|สำเร็จ/.test(msg)) return "cash";
  return "confirm";
}
