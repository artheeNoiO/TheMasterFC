import { useEffect, useRef } from "react";

const CROWD_MUTE_KEY = "siam_crowd_muted";

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function createNoiseBuffer(ctx, seconds = 3) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    d[i] = last * 3.2;
  }
  return buf;
}

export function isCrowdMuted() {
  try { return localStorage.getItem(CROWD_MUTE_KEY) === "1"; } catch { return false; }
}

export function setCrowdMuted(muted) {
  try { localStorage.setItem(CROWD_MUTE_KEY, muted ? "1" : "0"); } catch { /* ignore */ }
}

/** Procedural stadium crowd — ambient bed + reactive cheers (Web Audio API). */
export class StadiumCrowdAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambientGain = null;
    this.cheerBus = null;
    this.layers = [];
    this.started = false;
    this.paused = false;
    this.targetIntensity = 0.28;
    this.currentIntensity = 0.28;
    this.raf = null;
    this.baseVolume = 0.62;
  }

  async ensureContext() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.baseVolume;
      this.master.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0;
      this.ambientGain.connect(this.master);

      this.cheerBus = this.ctx.createGain();
      this.cheerBus.gain.value = 1;
      this.cheerBus.connect(this.master);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    return true;
  }

  setFanScale(fanBase = 2500) {
    this.baseVolume = clamp(0.48 + Math.log10(Math.max(fanBase, 500) / 1000) * 0.22, 0.42, 0.82);
    if (this.master) this.master.gain.setTargetAtTime(this.baseVolume, this.ctx.currentTime, 0.4);
  }

  _spawnAmbientLayer({ filterLo, filterHi, gain, pan = 0 }) {
    const src = this.ctx.createBufferSource();
    src.buffer = createNoiseBuffer(this.ctx, 4);
    src.loop = true;
    src.playbackRate.value = 0.92 + Math.random() * 0.12;

    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = (filterLo + filterHi) / 2;
    bp.Q.value = 0.65;

    const g = this.ctx.createGain();
    g.gain.value = gain;

    const p = this.ctx.createStereoPanner();
    p.pan.value = pan;

    src.connect(bp);
    bp.connect(g);
    g.connect(p);
    p.connect(this.ambientGain);
    src.start();
    this.layers.push({ src, g, bp });
  }

  _tickIntensity = () => {
    if (!this.ctx || !this.started) return;
    const diff = this.targetIntensity - this.currentIntensity;
    this.currentIntensity += diff * 0.06;
    const wave = 0.88 + Math.sin(performance.now() * 0.0018) * 0.1
      + Math.sin(performance.now() * 0.0041) * 0.05;
    const vol = this.paused ? 0 : this.currentIntensity * wave;
    this.ambientGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.14);
    this.raf = requestAnimationFrame(this._tickIntensity);
  };

  /** เสียงกองเชียเบา ๆ ตอนเปิดเสียง / ช่วงเล่น */
  ambientCheer({ peak = 0.38, duration = 1.6 } = {}) {
    if (!this.ctx || !this.started) return;
    this._noiseBurst({ duration, peak, filterHz: 780, attack: 0.12, decay: 0.85, pan: 0 });
    this._noiseBurst({ duration: duration * 0.85, peak: peak * 0.72, filterHz: 1180, attack: 0.08, decay: 0.65, pan: -0.2 });
    this._noiseBurst({ duration: duration * 0.85, peak: peak * 0.68, filterHz: 1180, attack: 0.08, decay: 0.65, pan: 0.2 });
  }

  async start(fanBase) {
    if (this.started) {
      if (this.ctx?.state === "suspended") await this.ctx.resume();
      return true;
    }
    const ok = await this.ensureContext();
    if (!ok) return false;
    this.setFanScale(fanBase);
    if (this.layers.length === 0) {
      this._spawnAmbientLayer({ filterLo: 180, filterHi: 520, gain: 0.62, pan: -0.3 });
      this._spawnAmbientLayer({ filterLo: 380, filterHi: 1100, gain: 0.58, pan: 0.28 });
      this._spawnAmbientLayer({ filterLo: 720, filterHi: 2400, gain: 0.42, pan: 0 });
      this._spawnAmbientLayer({ filterLo: 1200, filterHi: 3200, gain: 0.22, pan: -0.12 });
    }
    this.started = true;
    this.currentIntensity = 0.18;
    this.targetIntensity = 0.42;
    this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.ambientGain.gain.linearRampToValueAtTime(0.34, this.ctx.currentTime + 2.2);
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this._tickIntensity);
    return true;
  }

  setPaused(p) {
    this.paused = p;
  }

  setIntensity(level) {
    this.targetIntensity = clamp(0.28 + level * 0.48, 0.24, 0.78);
  }

  stop(ms = 900) {
    this.started = false;
    cancelAnimationFrame(this.raf);
    if (!this.ctx || !this.ambientGain) return;
    const t = this.ctx.currentTime;
    this.ambientGain.gain.cancelScheduledValues(t);
    this.ambientGain.gain.setTargetAtTime(0, t, ms / 3000);
    this.layers.forEach(({ src, g }) => {
      try {
        g.gain.setTargetAtTime(0, t, ms / 2500);
        src.stop(t + ms / 1000 + 0.05);
      } catch { /* already stopped */ }
    });
    setTimeout(() => {
      this.layers = [];
      if (this.ctx && this.ctx.state !== "closed") {
        this.ctx.close().catch(() => {});
      }
      this.ctx = null;
      this.master = null;
      this.ambientGain = null;
      this.cheerBus = null;
    }, ms + 120);
  }

  _noiseBurst({ duration, peak, filterHz, attack = 0.04, decay = 0.35, pan = 0 }) {
    if (!this.ctx || !this.cheerBus) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = createNoiseBuffer(this.ctx, Math.max(duration, 0.5));

    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = filterHz;
    bp.Q.value = 0.55;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.001), t + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t + attack + decay);

    const p = this.ctx.createStereoPanner();
    p.pan.value = pan;

    src.connect(bp);
    bp.connect(g);
    g.connect(p);
    p.connect(this.cheerBus);
    src.start(t);
    src.stop(t + duration + 0.05);
  }

  cheer(kind = "buildup", opts = {}) {
    if (!this.ctx || !this.started) return;
    const pan = opts.homeSide === false ? 0.35 : opts.homeSide === true ? -0.35 : 0;
    if (kind === "goal") {
      this._noiseBurst({ duration: 2.8, peak: 0.95, filterHz: 680, attack: 0.05, decay: 1.1, pan });
      this._noiseBurst({ duration: 2.4, peak: 0.72, filterHz: 1100, attack: 0.08, decay: 0.95, pan: -pan * 0.6 });
      this._noiseBurst({ duration: 3.2, peak: 0.55, filterHz: 420, attack: 0.12, decay: 1.6, pan: 0 });
      this.targetIntensity = 0.78;
      setTimeout(() => { this.targetIntensity = 0.38; }, 3200);
    } else if (kind === "save") {
      this._noiseBurst({ duration: 1.4, peak: 0.62, filterHz: 820, attack: 0.03, decay: 0.55, pan });
      this.targetIntensity = Math.min(this.targetIntensity + 0.18, 0.65);
    } else if (kind === "groan") {
      this._noiseBurst({ duration: 0.9, peak: 0.38, filterHz: 320, attack: 0.02, decay: 0.45, pan });
    } else if (kind === "shot") {
      this._noiseBurst({ duration: 1.9, peak: 0.82, filterHz: 920, attack: 0.02, decay: 0.75, pan });
      this._noiseBurst({ duration: 1.5, peak: 0.55, filterHz: 620, attack: 0.04, decay: 0.55, pan: -pan * 0.5 });
      this.targetIntensity = Math.min(this.targetIntensity + 0.32, 0.75);
    } else if (kind === "buildup") {
      this._noiseBurst({ duration: 0.75, peak: 0.32, filterHz: 760, attack: 0.06, decay: 0.35, pan });
    } else if (kind === "kickoff") {
      this.whistle("kickoff");
    } else if (kind === "card") {
      // เสียง "โห่/อื้ออึง" แบบสั้นแหลมกว่า groan ปกติ — ใช้ตอนได้ใบเหลือง/แดง
      this._noiseBurst({ duration: 1.1, peak: 0.5, filterHz: 1400, attack: 0.015, decay: 0.4, pan });
      this._noiseBurst({ duration: 1.3, peak: 0.34, filterHz: 480, attack: 0.05, decay: 0.7, pan: -pan * 0.4 });
    } else if (kind === "sub") {
      // เสียงปรบมือเบาๆ ระลอกเดียว — ใช้ตอนเปลี่ยนตัว
      this._noiseBurst({ duration: 1.2, peak: 0.24, filterHz: 2200, attack: 0.1, decay: 0.9, pan: 0 });
    }
  }

  _singleWhistleBlast(startTime, { peak = 0.11, duration = 0.2, freq = 920 } = {}) {
    if (!this.ctx || !this.cheerBus) return;
    const osc = this.ctx.createOscillator();
    const harmonic = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 380;

    osc.type = "sine";
    harmonic.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.38, startTime + duration * 0.32);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.92, startTime + duration);
    harmonic.frequency.setValueAtTime(freq * 2.06, startTime);

    g.gain.setValueAtTime(0.001, startTime);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.001), startTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(g);
    harmonic.connect(g);
    g.connect(hp);
    hp.connect(this.cheerBus);
    osc.start(startTime);
    harmonic.start(startTime);
    osc.stop(startTime + duration + 0.03);
    harmonic.stop(startTime + duration + 0.03);
  }

  /** kind: "short" = เป่าครั้งเดียว, "kickoff" = เป่า 2 ครั้ง (เริ่มเกม / ครึ่งหลัง), "fulltime" = เป่ายาว 3 ครั้ง (จบเกม) */
  whistle(kind = "short") {
    if (!this.ctx || !this.cheerBus) return;
    const t = this.ctx.currentTime;
    if (kind === "kickoff") {
      this._singleWhistleBlast(t, { peak: 0.13, duration: 0.19, freq: 940 });
      this._singleWhistleBlast(t + 0.26, { peak: 0.13, duration: 0.19, freq: 960 });
    } else if (kind === "fulltime") {
      this._singleWhistleBlast(t, { peak: 0.15, duration: 0.28, freq: 940 });
      this._singleWhistleBlast(t + 0.38, { peak: 0.15, duration: 0.28, freq: 940 });
      this._singleWhistleBlast(t + 0.76, { peak: 0.17, duration: 0.5, freq: 940 });
    } else {
      this._singleWhistleBlast(t, { peak: 0.1, duration: 0.22, freq: 900 });
    }
  }
}

/**
 * Hook for LiveMatchModal — ambient crowd + reactive cheers.
 */
export function useStadiumCrowd({
  active,
  paused,
  ended,
  half,
  pressure,
  ballPx,
  highlight,
  goalFlash,
  highlightSeq,
  fanBase,
  muted,
  onNeedsUnlock,
  unlockTick = 0,
  refereeCard,
  subTick = 0,
}) {
  const crowdRef = useRef(null);
  const lastBuildupRef = useRef(0);
  const lastHighlightRef = useRef(null);
  const prevHalfRef = useRef(half ?? 1);
  const prevHighlightStageRef = useRef(null);
  const kickoff1Ref = useRef(false);
  const prevUnlockTickRef = useRef(unlockTick);
  const prevEndedRef = useRef(ended);
  const lastCardKeyRef = useRef(null);
  const prevSubTickRef = useRef(subTick);

  useEffect(() => {
    if (!crowdRef.current) crowdRef.current = new StadiumCrowdAudio();
    const crowd = crowdRef.current;
    if (active && !ended && !muted) {
      const tappedUnlock = unlockTick > prevUnlockTickRef.current;
      prevUnlockTickRef.current = unlockTick;
      crowd.start(fanBase).then((ok) => {
        if (!ok) {
          onNeedsUnlock?.(true);
          return;
        }
        if (tappedUnlock) {
          crowd.ambientCheer({ peak: 0.48, duration: 2.1 });
          return;
        }
        if (half === 1 && !kickoff1Ref.current && !paused) {
          kickoff1Ref.current = true;
          crowd.whistle("kickoff");
        }
      }).catch(() => onNeedsUnlock?.(true));
    } else {
      crowd.stop();
      if (ended) kickoff1Ref.current = false;
    }
    return () => crowd.stop();
  }, [active, ended, muted, fanBase, onNeedsUnlock, half, paused, unlockTick]);

  useEffect(() => {
    if (half === 2 && prevHalfRef.current === 1 && !muted && !paused) {
      crowdRef.current?.whistle("kickoff");
      crowdRef.current?.ambientCheer({ peak: 0.35, duration: 1.4 });
    }
    prevHalfRef.current = half ?? 1;
  }, [half, muted, paused]);

  useEffect(() => {
    crowdRef.current?.setPaused(paused || muted);
  }, [paused, muted]);

  useEffect(() => {
    if (muted || paused || ended) return;
    const inAttThird = ballPx > 58 || ballPx < 42;
    const inBox = ballPx > 72 || ballPx < 28;
    const tension = clamp(Math.abs(pressure) * 0.5 + (inBox ? 0.42 : inAttThird ? 0.22 : 0), 0, 1);
    crowdRef.current?.setIntensity(tension);
    const now = Date.now();
    if (inBox && now - lastBuildupRef.current > 2800) {
      lastBuildupRef.current = now;
      crowdRef.current?.cheer("buildup");
    }
  }, [pressure, ballPx, muted, paused, ended]);

  useEffect(() => {
    if (!goalFlash || muted) return;
    crowdRef.current?.cheer("goal", { homeSide: goalFlash.team === "home" });
  }, [goalFlash, muted]);

  useEffect(() => {
    if (!highlight || muted) return;
    const key = `${highlight.kind}-${highlight.minute}-${highlight.team}`;
    if (lastHighlightRef.current === key) return;
    lastHighlightRef.current = key;
    if (highlight.kind === "save") crowdRef.current?.cheer("save", { homeSide: highlight.team === "home" });
    else if (highlight.kind === "miss") crowdRef.current?.cheer("groan", { homeSide: highlight.team === "home" });
  }, [highlight, muted]);

  useEffect(() => {
    if (!highlightSeq || muted) {
      prevHighlightStageRef.current = null;
      return;
    }
    const stage = highlightSeq.stage;
    if (stage === prevHighlightStageRef.current) return;
    prevHighlightStageRef.current = stage;
    const homeSide = highlightSeq.shotSide === "home";
    if (stage === "buildup") crowdRef.current?.cheer("buildup", { homeSide });
    if (stage === "shot") crowdRef.current?.cheer("shot", { homeSide });
  }, [highlightSeq, muted]);

  // นกหวีดยาว 3 ครั้งตอนจบเกม — เล่นก่อนเสียงกองเชียจะค่อยๆ เงียบลง (useEffect ตัวแรกจัดการ stop() ให้แล้ว)
  useEffect(() => {
    if (ended && !prevEndedRef.current && !muted) {
      crowdRef.current?.whistle("fulltime");
    }
    prevEndedRef.current = ended;
  }, [ended, muted]);

  // ใบเหลือง/แดง — เสียงโห่สั้นๆ
  useEffect(() => {
    if (!refereeCard || muted) return;
    const key = `${refereeCard.kind}-${refereeCard.minute}-${refereeCard.team}`;
    if (lastCardKeyRef.current === key) return;
    lastCardKeyRef.current = key;
    crowdRef.current?.cheer("card", { homeSide: refereeCard.team === "home" });
  }, [refereeCard, muted]);

  // เปลี่ยนตัว — เสียงปรบมือเบาๆ (subTick เพิ่มค่าทุกครั้งที่มีการเปลี่ยนตัวจริง)
  useEffect(() => {
    if (subTick > prevSubTickRef.current && !muted) {
      crowdRef.current?.cheer("sub");
    }
    prevSubTickRef.current = subTick;
  }, [subTick, muted]);

  return crowdRef;
}
