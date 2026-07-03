# Claude Patch — อนิเมชันเปิดซอง (React component จริง)

**สถานะ:** เตรียมไว้ ยังไม่ apply — รอคำสั่ง "อัพ claude patch"
**ไฟล์ที่แตะ:** `football-manager.jsx` เท่านั้น
**อ้างอิงจาก:** demo ที่ยืนยันกับ user แล้ว (https://claude.ai/code/artifact/2948f189-442f-4936-982a-47984599f6b0 — ซองสั่น/เรืองแสง → ระเบิดแสง → การ์ดพลิกทีละใบ 10 ใบ → สรุปผล)

## แนวคิดหลัก
โค้ดเกมทั้งไฟล์ใช้ inline `style={{}}` ล้วน ไม่เคยมี CSS `@keyframes`/`<style>` เลยสักที่ — อนิเมชันนี้จำเป็นต้องมี keyframes จริง (สั่น, ระเบิดแสง, พลิกการ์ด) เพราะทำด้วย inline style อย่างเดียวไม่ได้ (inline style ไม่รองรับ `@keyframes`) **แนวทาง:** ฝัง `<style>` tag เดียว (keyframes เท่านั้น ไม่ใช่ทั้งระบบ CSS) ไว้ในคอมโพเนนต์ใหม่นี้จุดเดียว — เป็น pattern ที่ React รองรับปกติ ไม่กระทบโครง inline-style ของไฟล์อื่นๆ

**ใช้การ์ดจริงซ้ำ** — ไม่เขียน markup การ์ดใหม่ ห่อ `<StaffPackCardFace card={card} />` (ที่มีอยู่แล้ว มีภาพจริง/ดาว/สถิติครบ) ด้วย wrapper ที่ใส่อนิเมชันพลิกเข้า

---

## 1) เพิ่มคอมโพเนนต์ใหม่ `StaffPackOpenSequence`

**ตำแหน่งที่แทรก:** ก่อนหน้า `function StaffCardsView(...)` (หรือหลัง `StaffCardStack` — จุดไหนก็ได้ในโซน `/* ============================== STAFF CARDS (GACHA) ============================== */`)

```jsx
/** keyframes สำหรับอนิเมชันเปิดซอง — ฝังครั้งเดียว (ไฟล์นี้ไม่เคยมี <style> เลย จำเป็นเพราะ
 * inline style ทำ @keyframes ไม่ได้) ไม่กระทบส่วนอื่นของเกมที่ยังใช้ inline style ล้วนตามเดิม */
function PackOpenKeyframes() {
  return (
    <style>{`
      @keyframes pkShake {
        10%, 90% { transform: translateX(-2px) rotate(-1deg); }
        20%, 80% { transform: translateX(3px) rotate(1deg); }
        30%, 50%, 70% { transform: translateX(-5px) rotate(-2deg); }
        40%, 60% { transform: translateX(5px) rotate(2deg); }
      }
      @keyframes pkBurstOut {
        0% { transform: scale(1); opacity: 1; filter: brightness(1); }
        60% { transform: scale(1.15); opacity: 1; filter: brightness(2.4); }
        100% { transform: scale(0.2); opacity: 0; filter: brightness(3); }
      }
      @keyframes pkFlash {
        0% { opacity: 0; transform: scale(.2); }
        35% { opacity: 1; transform: scale(1.3); }
        100% { opacity: 0; transform: scale(2.2); }
      }
      @keyframes pkFlipIn {
        0% { opacity: 0; transform: rotateY(-100deg) translateY(14px) scale(.92); }
        55% { opacity: 1; }
        100% { opacity: 1; transform: rotateY(0deg) translateY(0) scale(1); }
      }
      @keyframes pkRingPop {
        0% { opacity: 0; transform: scale(.6); }
        45% { opacity: .9; transform: scale(1.15); }
        100% { opacity: 0; transform: scale(1.5); }
      }
      @media (prefers-reduced-motion: reduce) {
        .pk-shake, .pk-burst, .pk-flash, .pk-flip, .pk-ring { animation: none !important; }
      }
    `}</style>
  );
}

/** ซีเควนซ์เปิดซอง: สั่น/เรืองแสง (900ms) → ระเบิดแสง (450ms) → การ์ดพลิกทีละใบ (180ms/ใบ) → onDone
 * tierDef = STAFF_PACK_TIERS[key] (เอาสี/label), cards = ผลที่สุ่มมาแล้วจริงจาก onPull */
function StaffPackOpenSequence({ tierDef, cards, onDone }) {
  const [phase, setPhase] = useState("charging"); // charging -> bursting -> revealing -> done
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("bursting"), 900);
    const t2 = setTimeout(() => setPhase("revealing"), 1350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (phase !== "revealing") return;
    if (revealedCount >= cards.length) {
      const t = setTimeout(() => setPhase("done"), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRevealedCount((n) => n + 1), 180);
    return () => clearTimeout(t);
  }, [phase, revealedCount, cards.length]);

  const charging = phase === "charging";
  const bursting = phase === "bursting";
  const showCards = phase === "revealing" || phase === "done";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <PackOpenKeyframes />
      {!showCards && (
        <div style={{ position: "relative", width: 240, height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {bursting && (
            <div className="pk-flash" style={{
              position: "absolute", inset: -60, borderRadius: "50%",
              background: `radial-gradient(circle, ${tierDef.color}f0 0%, ${tierDef.color}80 35%, transparent 70%)`,
              animation: "pkFlash .5s ease-out forwards",
            }} />
          )}
          <div className={charging ? "pk-shake" : bursting ? "pk-burst" : ""} style={{
            width: 168, height: 244,
            background: `linear-gradient(155deg, ${tierDef.color}, ${C.panel2} 130%)`,
            clipPath: "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)",
            boxShadow: charging
              ? `0 20px 44px -14px rgba(0,0,0,.75), 0 0 40px 6px ${tierDef.color}aa`
              : "0 20px 44px -14px rgba(0,0,0,.75)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
            animation: charging ? "pkShake .55s cubic-bezier(.36,.07,.19,.97) infinite"
              : bursting ? "pkBurstOut .38s ease-in forwards" : "none",
          }}>
            <div style={{
              width: 74, height: 74, borderRadius: "50%",
              background: `radial-gradient(circle at 34% 28%, ${C.steelLight}, ${C.panel} 70%)`,
              border: `3px solid ${C.pitchDark}`, boxShadow: `0 0 0 3px ${tierDef.color}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30,
            }}>🎴</div>
            <div style={{ fontFamily: "'Arial Black','Segoe UI Black',sans-serif", fontStyle: "italic", fontSize: 15, letterSpacing: 1.5, color: C.pitchDark }}>
              {tierDef.label.toUpperCase()}
            </div>
          </div>
        </div>
      )}

      {showCards && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", perspective: 1000 }}>
            {cards.map((card, i) => (
              <div key={card.cardId} style={{
                opacity: i < revealedCount ? 1 : 0,
                transform: i < revealedCount ? "none" : "rotateY(-100deg) translateY(14px) scale(.92)",
                animation: i < revealedCount ? "pkFlipIn .55s cubic-bezier(.2,.8,.3,1)" : "none",
                position: "relative",
              }}>
                {i < revealedCount && (
                  <div style={{
                    position: "absolute", inset: -10, borderRadius: "50%", filter: "blur(16px)",
                    background: `radial-gradient(circle, ${starColor(card.stars)}aa 0%, transparent 70%)`,
                    animation: "pkRingPop .7s ease-out .3s forwards", opacity: 0,
                  }} />
                )}
                <StaffPackCardFace card={card} />
              </div>
            ))}
          </div>
          {phase === "done" && (
            <button type="button" onClick={onDone} style={{ ...btnStyle(C.amber, "#0b2318"), width: "auto", padding: "10px 24px" }}>
              ปิด
            </button>
          )}
        </>
      )}
    </div>
  );
}
```

**หมายเหตุ:** ใช้ `useEffect` — ต้องเช็คว่าไฟล์ import `useEffect` จาก React อยู่แล้วหรือยัง (`grep -n "useEffect"` ตอน apply — ถ้าไฟล์ใช้ `React.useEffect` หรือ destructure จาก `"react"` แบบไหนต้องให้ตรงกับ convention เดิม)

---

## 2) ผูกเข้า `StaffCardsView` — เล่นอนิเมชันก่อนโชว์ผลจริง

**ของเดิม** ปุ่มเปิดซองเรียก `onPull(tier.key)` ตรงๆ แล้วโชว์ `lastPull` ทันที (ไม่มีอนิเมชัน)

**แนวทางแก้:** เพิ่ม local state ใน `StaffCardsView`:
```js
const [openingTier, setOpeningTier] = useState(null); // STAFF_PACK_TIERS object ตอนกำลังเล่นอนิเมชัน
```

เปลี่ยนปุ่มจาก `onClick={() => onPull(tier.key)}` เป็น:
```js
onClick={() => { onPull(tier.key); setOpeningTier(tier); }}
```

**ก่อน render โซน "draw" ปกติ** ให้เช็คก่อนว่ากำลังเล่นอนิเมชันอยู่ไหม (ถ้าใช่ render `StaffPackOpenSequence` แทนโซนปกติทั้งหมดชั่วคราว):
```jsx
{openingTier ? (
  <Panel>
    <StaffPackOpenSequence
      tierDef={openingTier}
      cards={lastPull}
      onDone={() => setOpeningTier(null)}
    />
  </Panel>
) : (
  /* ...โซน draw ปกติเดิมทั้งหมด (ปุ่มเลือกซอง 3 ระดับ + ผลการเปิดล่าสุด)... */
)}
```

**⚠️ จุดที่ต้องระวัง:** `onPull(tier.key)` เป็น async ผ่าน `updateCareer` (React state update ไม่ synchronous ทันที) — ตอนที่ `setOpeningTier(tier)` ทำงาน `career.lastStaffPull` (ที่ map เป็น `lastPull` ในคอมโพเนนต์นี้) **อาจยังเป็นค่าเก่า** ในตอน render รอบแรกหลังกดปุ่ม (เพราะ state ยังไม่ update) ต้องทดสอบจริงว่า `lastPull` ที่ส่งเข้า `StaffPackOpenSequence` เป็นชุดใหม่จริงหรือค้างอันเก่า — ถ้าค้าง ให้แก้เป็น: capture ผลลัพธ์จาก `onPull` ตรงๆ (ถ้าฟังก์ชันคืนค่าได้) แทนอ่านจาก `career.lastStaffPull` ผ่าน props อ้อม, หรือใช้ `useEffect` เฝ้าดู `lastPull` เปลี่ยนแล้วค่อย `setOpeningTier`

---

## เช็คหลัง apply
1. ทดสอบกดเปิดซองจริงในเบราว์เซอร์ (ไม่ใช่แค่ compile ผ่าน) — อนิเมชัน CSS ต้องดูด้วยตาเพราะ esbuild ไม่เช็ค animation ให้
2. เช็ค `prefers-reduced-motion` จริงด้วย (เปิด Windows Settings → Ease of Access → ปิด animation แล้วลองดูว่าซองไม่สั่น/การ์ดโผล่ตรงๆ ไม่พลิก)
3. เช็คว่าเปิดซอง 2 ครั้งติดกันไม่ค้าง state เก่า (`openingTier` ต้องรีเซ็ตถูกทุกครั้ง)

## จุดเสี่ยงชนกับ Cursor patch
- **`StaffCardsView`** — เป็น component เดียวกับที่ patch อื่น (item mall ไม่เกี่ยว แต่ pack tier UI ที่ทำไปก่อนหน้าอยู่ตรงนี้) อาจโดน Cursor แก้ UI ทับถ้าเขาไปทำ theme/สไตล์ห้องสตาฟ ต้องเช็ค diff ก่อน apply
- **`StaffPackCardFace`** — ถ้า Cursor แก้ component นี้ด้วย (เช่น ปรับสไตล์การ์ด) patch นี้อ้างอิง `<StaffPackCardFace card={card} />` ตรงๆ ไม่ได้แก้ตัว component เอง เสี่ยงชนต่ำ แต่ยัง grep เช็ค signature (`{ card }` prop) ให้ตรงก่อน apply เสมอ
