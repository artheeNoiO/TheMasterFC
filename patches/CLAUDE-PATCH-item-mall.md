# Claude Patch — Item Mall เพิ่ม 4 ไอเทม

**สถานะ:** เตรียมไว้ ยังไม่ apply เข้า `football-manager.jsx` — รอคำสั่ง "อัพ claude patch"
**เตรียมเมื่อ:** ดูจากโค้ดจริง ณ ตอนเขียน patch นี้ (Cursor อาจแก้ไฟล์เพิ่มก่อน apply จริง — **ต้อง diff เช็คจุดที่แตะซ้ำกับ Cursor patch ก่อน apply เสมอ** ดูหัวข้อ "จุดเสี่ยงชนกับ Cursor" ท้ายไฟล์)

## สรุปฟีเจอร์ (4 ไอเทมใหม่ เข้า Item Mall เดิม)

ระบบเดิมที่มีอยู่แล้ว (ไม่แตะ): `SHOP_ITEMS`, `sockerCoins`, `COIN_PACKAGES`, `buyShopItemToBag`, `useItemFromBag`, `ShopView`, `SHOP_DAILY_BUY_LIMIT`

| ไอเทม | id | ประเภท | ผล |
|---|---|---|---|
| ตั๋วเปิดซองการ์ดสตาฟ | `staff_ticket` | ใช้ทันที (ไม่เข้ากระเป๋า) | `career.staffDrawTickets += 1` |
| บูสต์ขวัญกำลังใจ | `morale_boost` | เข้ากระเป๋า ใช้ทีหลัง (เหมือน injury_pack) | เลือกนักเตะ 1 คน → `morale += 15` (cap 100) |
| บัตรข้ามคูลดาวน์แคมป์ซ้อม | `camp_skip` | ใช้ทันที | `career.trainingCampCooldownDay = career.day` (พร้อมจัดแคมป์ทันที) |
| บัตรยกเว้นค่าปรับเลิกจ้างสตาฟ | `termination_waiver` | ใช้ทันที ตั้ง flag รอใช้ | `career.staffTerminationWaiver = true` (ใช้ครั้งเดียวตอนจ้างจากการ์ดครั้งถัดไป แล้วเคลียร์ flag) |

**กติกา:** ราคา coin แต่ละอันให้กำหนดตอน apply จริง (ตัวเลขคร่าวๆ: staff_ticket 15🪙, morale_boost 8🪙, camp_skip 20🪙, termination_waiver 25🪙 — ปรับได้)

---

## 1) `SHOP_ITEMS` — เพิ่ม 3 รายการใหม่ (นอกจาก injury_pack เดิม)

**ตำแหน่งเดิม (บรรทัด ~1120-1128 ตอนเขียน patch นี้):**
```js
const SHOP_ITEMS = [
  {
    id: "injury_pack",
    name: "ชุดปฐมพยาบาล",
    desc: "สุ่มลดอาการบาดเจ็บ 1–4 วัน (เก็บในกระเป๋า ใช้ที่แท็บทีม)",
    icon: "🩹",
    coinCost: 10,
  },
];
```

**เปลี่ยนเป็น:**
```js
const SHOP_ITEMS = [
  {
    id: "injury_pack",
    name: "ชุดปฐมพยาบาล",
    desc: "สุ่มลดอาการบาดเจ็บ 1–4 วัน (เก็บในกระเป๋า ใช้ที่แท็บทีม)",
    icon: "🩹",
    coinCost: 10,
  },
  {
    id: "morale_boost",
    name: "บูสต์ขวัญกำลังใจ",
    desc: "เพิ่มขวัญกำลังใจนักเตะ 1 คน +15 (เก็บในกระเป๋า ใช้ที่แท็บทีม)",
    icon: "😊",
    coinCost: 8,
    instant: false,
  },
  {
    id: "staff_ticket",
    name: "ตั๋วเปิดซองการ์ดสตาฟ",
    desc: "ได้ตั๋วเปิดการ์ดสตาฟทันที 1 ใบ",
    icon: "🎫",
    coinCost: 15,
    instant: true,
  },
  {
    id: "camp_skip",
    name: "บัตรข้ามคูลดาวน์แคมป์ซ้อม",
    desc: "รีเซ็ตคูลดาวน์แคมป์ซ้อมทันที จัดแคมป์ได้เลย",
    icon: "⏩",
    coinCost: 20,
    instant: true,
  },
  {
    id: "termination_waiver",
    name: "บัตรยกเว้นค่าปรับเลิกจ้างสตาฟ",
    desc: "ยกเว้นค่าปรับเลิกจ้างสตาฟตอนจ้างจากการ์ดครั้งถัดไป (ใช้ได้ 1 ครั้ง)",
    icon: "📜",
    coinCost: 25,
    instant: true,
  },
];
```

หมายเหตุ: เพิ่ม field `instant` (true/false) ให้แยกพฤติกรรมตอนซื้อ — `instant:true` ใช้ผลทันทีไม่เข้ากระเป๋า, ไม่ระบุ/false = เข้ากระเป๋าเหมือน injury_pack เดิม

---

## 2) `buyShopItemToBag` — แยกเส้นทาง instant vs bag item

**ของเดิม (บรรทัด ~3668-3693 ตอนเขียน patch นี้):**
```js
  function buyShopItemToBag(itemId) {
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) return;
    const today = new Date().toDateString();
    const boughtToday = shopBuyCountToday(profile);
    if (boughtToday >= SHOP_DAILY_BUY_LIMIT) {
      showToast(`ซื้อได้วันละ ${SHOP_DAILY_BUY_LIMIT} ครั้ง (ครบแล้ววันนี้)`);
      return;
    }
    const coins = profile?.sockerCoins || 0;
    if (coins < item.coinCost) {
      showToast(`Socker Coin ไม่พอ (ต้องการ ${item.coinCost} เหรียญ)`);
      return;
    }
    const next = {
      ...profile,
      inventory: { ...(profile?.inventory || {}) },
      sockerCoins: coins - item.coinCost,
      shopBuyDay: today,
      shopBuyCount: (profile?.shopBuyDay === today ? (profile?.shopBuyCount || 0) : 0) + 1,
    };
    next.inventory[itemId] = (next.inventory[itemId] || 0) + 1;
    saveProfile(next);
    const left = SHOP_DAILY_BUY_LIMIT - next.shopBuyCount;
    showToast(`${item.name} เข้ากระเป๋าแล้ว! (ซื้อได้อีก ${left} ครั้งวันนี้)`);
  }
```

**เปลี่ยนเป็น** (โครง credit-deduction เดิมเหมือนกัน แค่แตกสาขาตอนท้ายตาม `item.instant`):
```js
  function buyShopItemToBag(itemId) {
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) return;
    const today = new Date().toDateString();
    const boughtToday = shopBuyCountToday(profile);
    if (boughtToday >= SHOP_DAILY_BUY_LIMIT) {
      showToast(`ซื้อได้วันละ ${SHOP_DAILY_BUY_LIMIT} ครั้ง (ครบแล้ววันนี้)`);
      return;
    }
    const coins = profile?.sockerCoins || 0;
    if (coins < item.coinCost) {
      showToast(`Socker Coin ไม่พอ (ต้องการ ${item.coinCost} เหรียญ)`);
      return;
    }
    const nextProfile = {
      ...profile,
      inventory: { ...(profile?.inventory || {}) },
      sockerCoins: coins - item.coinCost,
      shopBuyDay: today,
      shopBuyCount: (profile?.shopBuyDay === today ? (profile?.shopBuyCount || 0) : 0) + 1,
    };
    const left = SHOP_DAILY_BUY_LIMIT - nextProfile.shopBuyCount;

    if (item.instant) {
      // ใช้ผลทันที ไม่เข้ากระเป๋า — แก้ career โดยตรงตาม itemId
      updateCareer((prev) => {
        const c = JSON.parse(JSON.stringify(prev));
        if (itemId === "staff_ticket") {
          ensureStaffCardFields(c);
          c.staffDrawTickets += 1;
          c.log = [`🎫 แลกตั๋วเปิดการ์ดสตาฟ 1 ใบ (ซื้อจากร้านค้า)`, ...c.log];
        } else if (itemId === "camp_skip") {
          c.trainingCampCooldownDay = c.day;
          c.log = [`⏩ ใช้บัตรข้ามคูลดาวน์แคมป์ซ้อม — จัดแคมป์ได้ทันที`, ...c.log];
        } else if (itemId === "termination_waiver") {
          c.staffTerminationWaiver = true;
          c.log = [`📜 ได้รับสิทธิ์ยกเว้นค่าปรับเลิกจ้างสตาฟครั้งถัดไป`, ...c.log];
        }
        return c;
      });
      saveProfile(nextProfile); // หัก sockerCoins/นับโควต้ารายวันเหมือนเดิม แต่ไม่แตะ inventory
      showToast(`ใช้ ${item.name} แล้ว! (ซื้อได้อีก ${left} ครั้งวันนี้)`);
      return;
    }

    nextProfile.inventory[itemId] = (nextProfile.inventory[itemId] || 0) + 1;
    saveProfile(nextProfile);
    showToast(`${item.name} เข้ากระเป๋าแล้ว! (ซื้อได้อีก ${left} ครั้งวันนี้)`);
  }
```

---

## 3) `useItemFromBag` — เพิ่มเคส `morale_boost`

**ของเดิม (บรรทัด ~3695-3716 ตอนเขียน patch นี้):**
```js
  function useItemFromBag(itemId, playerId) {
    if (itemId !== "injury_pack") return;
    const count = inventoryCount(profile, itemId);
    if (count <= 0) { showToast("ไม่มีไอเทมในกระเป๋า"); return; }
    const target = career.players.find((p) => p.id === playerId && p.teamId === career.userTeamId);
    if (!target || target.injuryDays <= 0) { showToast("นักเตะคนนี้ไม่ได้บาดเจ็บ"); return; }
    const reduced = rand(1, 4);
    const before = target.injuryDays;
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const p = c.players.find((pl) => pl.id === playerId);
      if (!p || p.injuryDays <= 0) return c;
      p.injuryDays = Math.max(0, p.injuryDays - reduced);
      c.log = [`🩹 ใช้ชุดปฐมพยาบาลกับ ${p.name} — ลดอาการบาดเจ็บ ${reduced} วัน (เหลือ ${p.injuryDays} วัน)`, ...c.log];
      return c;
    });
    const inv = { ...(profile?.inventory || {}) };
    inv[itemId] = count - 1;
    saveProfile({ ...profile, inventory: inv });
    const after = Math.max(0, before - reduced);
    showToast(after === 0 ? `${target.name} หายบาดเจ็บแล้ว!` : `ลดอาการบาดเจ็บ ${reduced} วัน — เหลือ ${after} วัน`);
  }
```

**เปลี่ยนเป็น** (เพิ่มบล็อก `morale_boost` แยกก่อน early-return เดิม):
```js
  function useItemFromBag(itemId, playerId) {
    if (itemId === "morale_boost") {
      const count = inventoryCount(profile, itemId);
      if (count <= 0) { showToast("ไม่มีไอเทมในกระเป๋า"); return; }
      const target = career.players.find((p) => p.id === playerId && p.teamId === career.userTeamId);
      if (!target) { showToast("ไม่พบนักเตะ"); return; }
      updateCareer((prev) => {
        const c = JSON.parse(JSON.stringify(prev));
        const p = c.players.find((pl) => pl.id === playerId);
        if (!p) return c;
        p.morale = Math.min(100, (p.morale || 0) + 15);
        c.log = [`😊 ใช้บูสต์ขวัญกำลังใจกับ ${p.name} — ขวัญกำลังใจ ${p.morale}`, ...c.log];
        return c;
      });
      const inv = { ...(profile?.inventory || {}) };
      inv[itemId] = count - 1;
      saveProfile({ ...profile, inventory: inv });
      showToast(`เพิ่มขวัญกำลังใจ ${target.name} แล้ว!`);
      return;
    }
    if (itemId !== "injury_pack") return;
    const count = inventoryCount(profile, itemId);
    if (count <= 0) { showToast("ไม่มีไอเทมในกระเป๋า"); return; }
    const target = career.players.find((p) => p.id === playerId && p.teamId === career.userTeamId);
    if (!target || target.injuryDays <= 0) { showToast("นักเตะคนนี้ไม่ได้บาดเจ็บ"); return; }
    const reduced = rand(1, 4);
    const before = target.injuryDays;
    updateCareer((prev) => {
      const c = JSON.parse(JSON.stringify(prev));
      const p = c.players.find((pl) => pl.id === playerId);
      if (!p || p.injuryDays <= 0) return c;
      p.injuryDays = Math.max(0, p.injuryDays - reduced);
      c.log = [`🩹 ใช้ชุดปฐมพยาบาลกับ ${p.name} — ลดอาการบาดเจ็บ ${reduced} วัน (เหลือ ${p.injuryDays} วัน)`, ...c.log];
      return c;
    });
    const inv = { ...(profile?.inventory || {}) };
    inv[itemId] = count - 1;
    saveProfile({ ...profile, inventory: inv });
    const after = Math.max(0, before - reduced);
    showToast(after === 0 ? `${target.name} หายบาดเจ็บแล้ว!` : `ลดอาการบาดเจ็บ ${reduced} วัน — เหลือ ${after} วัน`);
  }
```

---

## 4) `hireFromStaffCard` — เช็ค `staffTerminationWaiver` ก่อนคิดค่าปรับ (3 จุด)

**หลักการ:** ในแต่ละสาขา (MANAGER / COACH-DOCTOR-EXTRA / SCOUT) หลังคำนวณ `terminationFee`/`fee` ดิบแล้ว ให้แทรกเช็ค:
```js
const waived = !!c.staffTerminationWaiver;
const actualFee = waived ? 0 : terminationFee; // ใช้ actualFee แทน terminationFee ในเช็คงบ/หักงบที่เหลือของบล็อกนั้น
if (waived && terminationFee > 0) {
  c.staffTerminationWaiver = false;
  c.log = [`📜 ใช้สิทธิ์ยกเว้นค่าปรับเลิกจ้าง (ประหยัดไป ${formatMoney(terminationFee)})`, ...c.log];
}
```
**ต้องแทรกจุดนี้ 3 จุดในฟังก์ชัน `hireFromStaffCard`:**
- บล็อก `card.type === "MANAGER"` (ตัวแปรเดิมชื่อ `terminationFee`)
- บล็อก `card.type === "COACH" || card.type === "DOCTOR" || EXTRA_STAFF_TYPES.includes(card.type)` (ตัวแปรเดิมชื่อ `terminationFee`)
- บล็อก `card.type === "SCOUT"` — มี fee 2 จุดย่อย (แทนที่ marketScout / แทนที่ youthScout) ต้องเช็คทั้ง 2 จุดย่อย (ตัวแปรเดิมชื่อ `fee`)

**⚠️ ต้องอ่านโค้ดจริงตอน apply อีกครั้ง** เพราะชื่อตัวแปร/บรรทัดอาจขยับจาก Cursor patch — หลักการเช็ค `staffTerminationWaiver` เหมือนกันทั้ง 3 จุด แค่ตัวแปร fee คนละชื่อ

---

## 5) `ShopView` — แก้จาก hardcode `SHOP_ITEMS[0]` เป็น map ทุกไอเทม

**ของเดิม (บรรทัด ~10852-10921 ตอนเขียน patch นี้)** ใช้ `const injuryItem = SHOP_ITEMS[0];` แล้วเรนเดอร์ Panel เดียวตายตัว

**แนวทางแก้:** เปลี่ยนเป็น `SHOP_ITEMS.map((item) => ...)` render Panel ต่อไอเทม 1 ใบ โดยใช้ `inventory?.[item.id] || 0` แทน `packInBag` ตายตัว, ปุ่มข้อความ:
- ถ้า `item.instant` → ปุ่มบอก `ใช้ทันที 🪙${coinCost}` แทน `เข้ากระเป๋า`
- ถ้าไม่ instant → ข้อความเดิม (`ซื้อเข้ากระเป๋า`) + บรรทัดบอกจำนวนในกระเป๋าเหมือนเดิม

โครง JSX คงเดิมทุกอย่าง (Panel accent, layout, ปุ่ม disabled logic) แค่เปลี่ยนจาก single-item เป็น `.map()` — **ต้องดูโค้ดจริงตอน apply เพื่อคง style/props ให้ตรงเป๊ะ ไม่ใช่เขียนใหม่จากศูนย์**

---

## จุดเสี่ยงชนกับ Cursor patch (เช็คก่อน apply เสมอ)

1. **`hireFromStaffCard`** — ถ้า Cursor patch แตะฟังก์ชันนี้ด้วย (เช่น แก้ logic จ้างสตาฟ/ปรับ UI hire) ต้อง merge มือ ไม่ apply ทับตรงๆ
2. **`ShopView`** — ถ้า Cursor patch แก้ UI ร้านค้า/ไอเทมด้วย ต้องเช็คว่าโครง `SHOP_ITEMS[0]` ยังเหมือนตอนเขียน patch นี้ไหม
3. **`SHOP_ITEMS`, `buyShopItemToBag`, `useItemFromBag`** — ยังไม่เห็น Cursor แตะช่วงที่ผ่านมา (เน้น branding/UI ทั่วไปเป็นหลัก) แต่ต้อง grep ซ้ำก่อน apply จริงทุกครั้ง
4. ก่อน apply ทั้งไฟล์นี้: รัน `git diff --stat -- football-manager.jsx` เทียบ baseline ตอนนี้ ถ้าเห็นว่า Cursor แก้เพิ่มในช่วงบรรทัดที่ patch นี้แตะ (1120, 3660-3720, 10850-10920) ให้หยุดแล้วอ่านโค้ดจริงใหม่ก่อน merge ด้วยมือ ห้ามใช้ old_string ที่เขียนไว้ในไฟล์นี้แบบ blind
