# Claude Patch — ใบแดง 10 คนจริง + ระบบแบนสะสม (เหมือนชีวิตจริง)

**สถานะ:** เตรียมไว้ ยังไม่ apply — รอคำสั่ง "อัพ claude patch"
**ไฟล์ที่แตะ:** `football-manager.jsx` (จุดเดียว ไม่ต้องแตะ `live-pitch-ambient.js`/`pass-simulator.js` สำหรับกติกาแบน — ส่วน "10 คนในแมตช์" อาจต้องแตะ ambient/pass-sim เพิ่มเติม แยกหัวข้อไว้ท้ายไฟล์)
**สโคป v1:** บังคับใช้กติกาแบนกับ **ทีมผู้ใช้เท่านั้น** (ไม่จำลองแบนให้ทีม AI คู่แข่งภายใน — ทำเพิ่มทีหลังได้ถ้าต้องการ ไม่กระทบผู้เล่นเพราะ AI แข่งกันเองไม่มีใครเห็นรายละเอียดระดับนี้)

## กติกา (ยืนยันกับ user แล้ว)
1. ใบเหลืองสะสมครบ 5 ใบ (รวมทั้งซีซั่น) → แบนนัดถัดไป 1 นัด แล้วรีเซ็ตตัวนับเป็น 0
2. ใบแดง (ไม่ว่าไล่ออกตรงๆ หรือ 2 เหลืองในนัดเดียว) → แบนนัดถัดไป 1 นัดทันที แยกจากระบบสะสมข้างบน ไม่กระทบตัวนับใบเหลือง
3. ระหว่างติดแบน ผู้เล่นถูกตัดออกจากตัวเลือก XI จนกว่าจะครบโทษ

---

## 1) Data model — เพิ่ม field ใหม่ในตัวผู้เล่น

`seasonYellows` (number, default 0), `suspendedMatches` (number, default 0)

**จุดที่ต้องเพิ่ม default:**
- `genPlayer(...)` — ฟังก์ชันสร้างผู้เล่นใหม่ (ค้นหาตำแหน่งจริงตอน apply ด้วย `grep -n "function genPlayer"`) เพิ่ม `seasonYellows: 0, suspendedMatches: 0,` เข้า object ที่ return
- `normalizeCareerSave(c)` — เซฟเก่าที่ยังไม่มี field นี้ ต้องเติมย้อนหลัง เพิ่มบรรทัดคล้าย pattern `ensureDetailedPos` ที่มีอยู่แล้ว:
  ```js
  (c.players || []).forEach((p) => {
    if (p.seasonYellows == null) p.seasonYellows = 0;
    if (p.suspendedMatches == null) p.suspendedMatches = 0;
  });
  ```
  แทรกใกล้บรรทัดที่มี `(c.players || []).forEach(ensureDetailedPos);` (โค้ดเดิมตอนเขียน patch นี้อยู่ที่ ~บรรทัด 1717 ของ `normalizeCareerSave` — เช็คเลขจริงตอน apply)

---

## 2) `LiveMatchModal` — ส่งข้อมูลใบเหลือง/แดงขึ้นไปตอนจบแมตช์

ตอนนี้ `cardsRef` (Map: playerId → จำนวนใบเหลืองสะสม**ในแมตช์นี้เท่านั้น**) อยู่ใน `LiveMatchModal` local scope ไม่เคยถูกส่งออกไปไหนเลย เมื่อ modal ปิด ข้อมูลหายหมด — ต้องส่งขึ้นไปให้ `finishLiveMatch` ประมวลผลสะสมข้ามซีซั่นจริง

**แนวทาง:** หา `onFinish` call ใน `LiveMatchModal` (ตอนจบแมตช์ ปัจจุบันเรียก `onFinish(homeGoals, awayGoals, finalHomeXI, finalAwayXI)` — ค้นด้วย `grep -n "onFinish("` ตอน apply) แล้วเพิ่มพารามิเตอร์ที่ 5 เป็น `cardEvents`:

```js
// สร้างตอนจบแมตช์ จาก cardsRef.current ที่มีอยู่แล้ว:
const cardEvents = Array.from(cardsRef.current.entries()).map(([playerId, yellowCount]) => ({
  playerId,
  yellows: yellowCount,          // จำนวนใบเหลืองที่ได้ในแมตช์นี้ (1 หรือ 2)
  red: yellowCount >= 2,          // 2 เหลือง = แดง
}));
// เพิ่ม red ตรงจากไล่ออกทันที (ถ้ามี state แยกเก็บ straight-red อยู่แล้วให้รวมเข้ามาด้วย —
// ตอนเขียน patch นี้ isRed คำนวณจาก prevYellow>=1 || Math.random()<0.05 ในบล็อกฟาวล์
// ต้องเช็คโค้ดจริงว่า "red จาก 5% สุ่มตรง" (ไม่ใช่ 2 เหลือง) ถูกบันทึกแยกไว้หรือไม่ ถ้าไม่มี
// ต้องเพิ่ม ref ใหม่ เช่น straightRedIds = useRef(new Set()) เก็บตอน isRed===true แล้วรวมเข้า cardEvents)
onFinish(homeGoals, awayGoals, finalHomeXI, finalAwayXI, cardEvents);
```

**⚠️ ต้องอ่านโค้ดจริงบล็อกฟาวล์ตอน apply** (ตอนเขียน patch นี้อยู่ราวบรรทัด 9110-9123 แต่ไฟล์ขยับตลอดจาก Cursor) เพื่อแยกให้ถูกว่า red เกิดจาก 2-เหลือง หรือ straight-red แบบสุ่มตรง — สองเคสนี้กติกาการนับเหมือนกัน (แบน 1 นัดทันทีทั้งคู่ ไม่กระทบตัวนับสะสม) แต่ต้องแน่ใจว่า `cardEvents` จับได้ครบทั้ง 2 เคส

---

## 3) `finishLiveMatch` — ประมวลผลใบเหลือง/แดงสะสม

**แก้ signature:**
```js
function finishLiveMatch(homeGoals, awayGoals, finalHomeXI, finalAwayXI, cardEvents = []) {
```

**เพิ่มก่อน `c.liveMatch = null;` (โค้ดเดิมตอนเขียน patch นี้อยู่ที่ ~บรรทัด 4516):**
```js
      // ประมวลผลใบเหลือง/แดงสะสม — เฉพาะผู้เล่นทีมผู้ใช้ (v1 scope)
      cardEvents.forEach(({ playerId, red }) => {
        const p = c.players.find((pl) => pl.id === playerId && pl.teamId === c.userTeamId);
        if (!p) return;
        if (red) {
          p.suspendedMatches = Math.max(p.suspendedMatches || 0, 1);
          c.log = [`🟥 ${p.name} โดนแบน 1 นัดจากใบแดง`, ...c.log];
        } else {
          p.seasonYellows = (p.seasonYellows || 0) + 1;
          if (p.seasonYellows >= 5) {
            p.seasonYellows = 0;
            p.suspendedMatches = Math.max(p.suspendedMatches || 0, 1);
            c.log = [`🟨 ${p.name} ใบเหลืองครบ 5 ใบ — โดนแบน 1 นัด (รีเซ็ตตัวนับ)`, ...c.log];
          }
        }
      });
      // เดินโทษแบนของทุกคนในทีมผู้ใช้ที่ติดแบนอยู่ (แมตช์นี้ถือว่ารับโทษไปแล้ว 1 นัด)
      c.players.filter((p) => p.teamId === c.userTeamId && (p.suspendedMatches || 0) > 0)
        .forEach((p) => { p.suspendedMatches -= 1; });
```

**⚠️ ระวังลำดับ:** ต้องรัน "เดินโทษแบน" หลังจากใส่แบนใหม่ (จากบล็อกด้านบน) ไม่งั้นผู้เล่นที่เพิ่งโดนแดงนัดนี้จะถูกลดโทษเหลือ 0 ทันที (เท่ากับไม่โดนแบนจริง) — ตรวจสอบว่า logic นี้ทำให้ "โดนแดงนัดนี้ → แบนนัดหน้า 1 นัดพอดี" ไม่ใช่แบน 0 นัด (เพราะลบ 1 จาก 1 ทันทีในนัดเดียวกัน)

---

## 4) `kickoffUserMatch` — ตัดผู้เล่นที่ติดแบนออกจาก XI

**ของเดิม (2 จุดในฟังก์ชันเดียวกัน ตอนเขียน patch นี้):**
```js
    const uSquadAvail = squadOf(career.userTeamId, career).filter((p) => p.injuryDays <= 0);
```
และ
```js
      const uSquad = squadOf(c.userTeamId, c).filter((p) => p.injuryDays <= 0);
```

**เปลี่ยนทั้ง 2 จุดเป็น:**
```js
    const uSquadAvail = squadOf(career.userTeamId, career).filter((p) => p.injuryDays <= 0 && (p.suspendedMatches || 0) <= 0);
```
```js
      const uSquad = squadOf(c.userTeamId, c).filter((p) => p.injuryDays <= 0 && (p.suspendedMatches || 0) <= 0);
```

**อัปเดตข้อความ toast แจ้งเหตุผลลงสนามไม่ได้ด้วย** (ของเดิม `บาดเจ็บ ${injured} คน` — เพิ่มจำนวนติดแบน):
```js
      const injured = squadOf(career.userTeamId, career).filter((p) => p.injuryDays > 0).length;
      const suspended = squadOf(career.userTeamId, career).filter((p) => (p.suspendedMatches || 0) > 0).length;
      showToast(`ลงสนามไม่ได้ — พร้อมเล่น ${filled.length}/11 คน (บาดเจ็บ ${injured} คน · ติดแบน ${suspended} คน)`);
```

---

## 5) UI แจ้งเตือน (แนะนำ ไม่บังคับ v1)

จุดที่ควรโชว์ "ติดแบนนัดหน้า" ให้ผู้ใช้เห็นชัด:
- หน้าจัด XI ก่อนแมตช์ — เหมือน pattern ที่มีอยู่แล้วสำหรับผู้บาดเจ็บ (`injuryDays > 0` มักโชว์ป้าย/สีแดงในรายชื่อ) ทำแบบเดียวกันกับ `suspendedMatches > 0`
- หา component ที่ render รายชื่อผู้เล่นแบบมีป้ายบาดเจ็บอยู่แล้ว (`PlayerRow` บรรทัด ~7231 ตอนเขียน patch นี้) เพิ่มป้าย "🚫 ติดแบน" ข้างๆ ป้ายบาดเจ็บเดิม

---

## 6) "10 คนในแมตช์" — ส่วนที่ยังไม่ได้ออกแบบละเอียด (ทำต่อแยกรอบ)

การเดินเรื่อง 10 คนจริงระหว่างแมตช์ (ambient AI ข้ามช่องที่โดนไล่ออก + performance penalty) ต้องแตะ `live-pitch-ambient.js`/`pass-simulator.js` เพิ่ม ซึ่งซับซ้อนกว่านี้ (ต้องเช็ค `homeSlots`/`awaySlots` array shape ให้ละเอียดก่อน) — **แนะนำทำเป็น patch แยกต่างหากรอบถัดไป** หลัง apply ระบบแบนสะสมนี้เสร็จและเทสผ่านก่อน เพื่อลดความเสี่ยงพังพร้อมกันหลายจุด

---

## เช็คหลัง apply
1. `grep -n "seasonYellows\|suspendedMatches"` ต้องเจอครบทุกจุด (genPlayer, normalizeCareerSave, finishLiveMatch, kickoffUserMatch)
2. ทดสอบ: บังคับให้ผู้เล่น 1 คนมี `seasonYellows: 4` แล้วเล่นแมตช์ให้โดนเหลืองอีก 1 ใบ → เช็คว่า `suspendedMatches` เป็น 1 และ `seasonYellows` รีเซ็ตเป็น 0
3. ทดสอบ: ผู้เล่นติดแบน 1 นัด → เช็คว่าไม่โผล่ในตัวเลือก XI นัดถัดไป แล้วหลังจบนัดนั้น `suspendedMatches` กลับเป็น 0

## จุดเสี่ยงชนกับ Cursor patch
- **`finishLiveMatch`** — ฟังก์ชันหลักของ flow จบแมตช์ มีโอกาสสูงที่ Cursor แตะด้วยถ้าทำ UI สรุปผลหลังจบเกม ต้องเช็ค diff ก่อน apply เสมอ
- **`kickoffUserMatch`** — เช่นกัน ถ้า Cursor ทำ UI หน้าจัด XI/ก่อนแข่ง ต้องเช็คก่อน
- **บล็อกฟาวล์ใน LiveMatchModal** — เคยเจอ Cursor ไม่ค่อยแตะช่วง live match engine แต่ยังต้อง grep ยืนยันก่อนทุกครั้ง (ห้าม apply blind)
