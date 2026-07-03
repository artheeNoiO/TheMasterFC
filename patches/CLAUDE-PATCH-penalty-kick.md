# Claude Patch — จุดโทษ (Penalty Kick)

**สถานะ:** เตรียมไว้ ยังไม่ apply — รอคำสั่ง "อัพ claude patch"
**ไฟล์ที่แตะ:** `live-pitch-ambient.js`, `football-manager.jsx`
**อ้างอิงจาก:** โค้ดจริง ณ ตอนเขียน patch นี้ (ดู "จุดเสี่ยงชนกับ Cursor" ท้ายไฟล์ก่อน apply เสมอ)

## สรุปฟีเจอร์
ฟาวล์ในกรอบเขตโทษ (`bs.px > 74 || bs.px < 26`) → เรียกฉากจุดโทษแทนฟรีคิก ไม่มีกำแพง จุดยิงห่างประตู 11 หน่วย
โอกาส: เข้า 76% / เซฟ 16% / ชนเสา 8%

---

## 1) `live-pitch-ambient.js` — เพิ่ม `startPenaltyScene` + `advancePenalty`

**ตำแหน่งที่แทรก:** ต่อท้าย `advanceFreekick` เดิม (บรรทัด ~521-545 ตอนเขียน patch นี้) ก่อนคอมเมนต์ `/* ============================ main advance ============================ */`

**เพิ่มโค้ดนี้ (ไม่ลบของเดิม):**
```js
/* ============================ จุดโทษ ============================ */

/** จุดโทษ: ไม่มีกำแพง วางบอล 11 หน่วยหน้าประตู → ยิง (สโลว์โม+เส้นปะ) → ทุกคนกลับตำแหน่ง */
export function startPenaltyScene(state, attackSide) {
  const s = state;
  if (!s || s.shotSeq || s.setPiece || s.celebration || s.restart) return s;
  const fwd = attackSide === "home" ? 1 : -1;
  const goalPx = attackSide === "home" ? 100 : 0;
  const defSide = attackSide === "home" ? "away" : "home";
  const slots = attackSide === "home" ? s.homeSlots : s.awaySlots;

  const spot = { px: goalPx - fwd * 11, py: 50 };

  let takerIdx = slots.findIndex((sl) => sl.pos === "FW");
  if (takerIdx < 0) takerIdx = slots.findIndex((sl) => sl.pos === "MF");
  if (takerIdx < 0) takerIdx = 5;

  s.possSide = attackSide;
  s.pendingPass = null;
  s.ball.phase = "dribble";
  s.ball.t = 1;
  s.setPiece = {
    type: "penalty", phase: "setup", t: 0,
    attackSide, defSide, fwd, goalPx, spot, takerIdx,
  };
  return s;
}

function advancePenalty(s, dt) {
  const sp = s.setPiece;
  const b = s.ball;
  sp.t += dt;
  if (sp.phase === "setup") {
    // บอลถูกวางที่จุดโทษ นักเตะเดินมายืนเตรียมยิง (ไม่มีกำแพง)
    rollBallToward(b, sp.spot.px, sp.spot.py, dt, 6);
    b.fromPx = b.toPx = b.px;
    b.fromPy = b.toPy = b.py;
    b.airHeight = 0;
    if (sp.t >= 2.2) {
      sp.phase = "shot";
      setCarrier(s, sp.takerIdx);
      const roll = Math.random();
      const outcome = roll < 0.76 ? "goal" : roll < 0.92 ? "save" : "post";
      const keepSp = sp;
      s.setPiece = null;
      beginAmbientShot(s, { shotSide: sp.attackSide, outcome, counted: false, aimTime: 0.4 });
      s.setPiece = keepSp; // นักเตะยืนค้างจนช็อตจบ (resolveShotSeq เคลียร์ setPiece ให้)
    }
  }
  // phase "shot": shotSeq เดินเรื่องแทน
}
```

**⚠️ บั๊กเดิมที่เคยเจอตอน Codey ลองทำ (ต้องระวังตอน apply มือ):** เคยมีรอบหนึ่งที่ `old_text` จับผิดตำแหน่งจนเกิด `export function startFreekickScene` ประกาศซ้ำ 2 ครั้งในไฟล์เดียว (syntax error ทำให้ไฟล์พังทั้งไฟล์) — apply patch นี้ **ต้องอ่านโค้ดจริงรอบตำแหน่งแทรกก่อนเสมอ** และหลัง apply ต้อง `grep -n "export function startFreekickScene"` เช็คว่าเจอแค่ครั้งเดียว

## 2) `live-pitch-ambient.js` — ต่อ dispatcher ใน `advanceAmbientPitch`

**ของเดิม (บรรทัด ~556-568 ตอนเขียน patch นี้):**
```js
  if (s.shotSeq) {
    advanceShotSeq(s, dt);
  } else if (s.setPiece?.type === "corner") {
    advanceCorner(s, dt);
  } else if (s.setPiece?.type === "freekick") {
    advanceFreekick(s, dt);
  } else if (s.celebration) {
```

**เปลี่ยนเป็น** (แทรกบรรทัด `penalty` ต่อจาก `freekick` — ห้ามลบเงื่อนไขเดิม):
```js
  if (s.shotSeq) {
    advanceShotSeq(s, dt);
  } else if (s.setPiece?.type === "corner") {
    advanceCorner(s, dt);
  } else if (s.setPiece?.type === "freekick") {
    advanceFreekick(s, dt);
  } else if (s.setPiece?.type === "penalty") {
    advancePenalty(s, dt);
  } else if (s.celebration) {
```

---

## 3) `football-manager.jsx` — import + เรียกจุดโทษเมื่ออยู่ในกรอบ

**หา import list ที่มี `startFreekickScene` อยู่แล้ว** (ต้นไฟล์ ~บรรทัด 13-16 ตอนเขียน patch นี้ — เช็คเลขบรรทัดจริงก่อน apply):
```js
import {
  ..., beginAmbientShot, startCornerScene, startFreekickScene,
  slotToPitchAmbient,
} from "./live-pitch-ambient.js";
```
เพิ่ม `startPenaltyScene` เข้า list เดียวกัน:
```js
import {
  ..., beginAmbientShot, startCornerScene, startFreekickScene, startPenaltyScene,
  slotToPitchAmbient,
} from "./live-pitch-ambient.js";
```

**หาบล็อกฟาวล์** (ตอนเขียน patch นี้อยู่ในลูปจำลองแมตช์สด ราวบรรทัด 8737-8741 — ค้นด้วย `bs.px > 74` หรือ `startFreekickScene(amb, fkSide)` เพื่อยืนยันตำแหน่งจริงก่อน):
```js
        // ฟาวล์บางลูก (ในระยะยิงได้) = ฟรีคิก — นักเตะเดินมาตั้งกำแพง ยิงเสร็จกลับตำแหน่ง
        const fkSide = awayFouled ? "home" : "away";
        const amb = ambientRef.current;
        if (amb && !amb.shotSeq && !amb.setPiece && !amb.celebration && !amb.restart && Math.random() < 0.4) {
          startFreekickScene(amb, fkSide);
        }
```

**เปลี่ยนเป็น** (แยกเคสในกรอบเขตโทษ — `bs` ต้องมีอยู่แล้วในสโคปนี้จากโค้ดช็อตด้านบน ถ้าไม่มีต้องประกาศ `const bs = ballSimRef.current;` ก่อน):
```js
        // ฟาวล์ในกรอบเขตโทษ = จุดโทษ, นอกกรอบ = ฟรีคิกเหมือนเดิม
        const fkSide = awayFouled ? "home" : "away";
        const amb = ambientRef.current;
        const foulInBox = bs.px > 74 || bs.px < 26;
        if (amb && !amb.shotSeq && !amb.setPiece && !amb.celebration && !amb.restart) {
          if (foulInBox) {
            startPenaltyScene(amb, fkSide);
          } else if (Math.random() < 0.4) {
            startFreekickScene(amb, fkSide);
          }
        }
```

หมายเหตุ: จุดโทษไม่สุ่ม `Math.random() < 0.4` เหมือนฟรีคิก — ฟาวล์ในกรอบทุกครั้งควรได้จุดโทษเลย (สมจริงกว่า ของจริงกรรมการไม่ "อาจจะ" เป่าจุดโทษ)

---

## เช็คหลัง apply
1. `grep -n "export function startFreekickScene"` ในทั้ง `live-pitch-ambient.js` — ต้องเจอ **แค่ 1 ครั้ง**
2. `grep -n "startPenaltyScene\|advancePenalty"` ต้องเจอครบทั้ง 2 ไฟล์ (import + definition + dispatcher + call site)
3. รัน `npx esbuild football-manager.jsx --outfile=...` เช็ค syntax ผ่านก่อนเสมอ

## จุดเสี่ยงชนกับ Cursor patch
- **บล็อกฟาวล์ + import list ใน football-manager.jsx** — เป็นจุดที่เกี่ยวกับ live match ซึ่ง Cursor เคยไม่ค่อยแตะ (เน้น branding/UI) แต่ต้อง grep ยืนยันเลขบรรทัด/เนื้อหาจริงก่อน apply เสมอ ห้าม apply แบบ blind ตาม patch นี้ตรงๆ
- **`live-pitch-ambient.js`** — ไฟล์นี้ Cursor แทบไม่เคยแตะเลยตลอดเซสชัน ความเสี่ยงชนต่ำสุดในบรรดา patch ทั้งหมด
