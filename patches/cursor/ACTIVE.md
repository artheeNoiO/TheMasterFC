# Cursor Patch — ACTIVE (ยังไม่ merge main)

อัปเดตล่าสุด: 2026-07-03

> **รอ Claude patch ก่อน merge** — อย่าอัพจนกว่า reconcile กับ `patches/claude/ACTIVE.md`

---

## สถานะ

| รายการ | สถานะ |
|--------|--------|
| Scrollbar ซ่อน + DragScroll | ✅ |
| แยกคู่มือสตาฟ / แก้ภาพการ์ด | ✅ |
| Analyst ฝึกซ้อม + รายงาน + SAVE v10 | ✅ |
| **Roster DB 8 ลีก (~2,944 คน)** | ✅ |
| SAVE v11 — migrate roster เซฟเก่า | ✅ |
| UI ดู squad Master (ตารางลีก) | ✅ |
| League pick modal — full roster label | ✅ |
| Scout ก่อนเกม — ดาวเด่น 5 คน | ✅ |
| Roster โปรตุเกส / ซาอุ / ไทย | ✅ |
| Deploy production | ✅ v0.9.6 — Stadium Progression visuals (Club UI + assets) |

---

## Stadium Progression (v0.9.6 MVP — system only, no art yet)

- 5 ระดับสนาม · อัปเกรดด้วยเงิน · ความจุ / แฟน / รายได้เหย้า
- UI แท็บสโมสร: stat cards + progress bar + รายการทุก level
- รูปสนาม — **ยังไม่ใส่** รอ asset จากผู้ใช้ → wire ใน `stadium-progression.js` ทีหลัง

---

## Roster Database

| ลีก | ทีม | นักเตะ |
|-----|-----|--------|
| อังกฤษ · สเปน · อิตาลี · เยอรมัน · ฝรั่งเศส | 16×5 | 368×5 |
| โปรตุเกส · ซาอุ · ไทย | 16×3 | 368×3 |
| **รวม** | **128 ทีม** | **2,944 คน · ~252 legends** |

Regenerate: `npm run roster:generate`

---

## ไฟล์ที่ Cursor แตะ

### ใหม่
- `roster-database/**` (raw-squads ×8, generator, parody)
- `scripts/generate-master-rosters.mjs`
- `training-system.js`, `staff-guide.js`, `coach-system.js`
- `patches/**`

### แก้
- `football-manager.jsx` — roster squad, TableView, scout, migration v11
- `legend-universe.js` — Serie A, import roster DB
- `packages/game-engine/src/legend-squad.js`
- `game-version.js` — SAVE v11
- `player-nationalities.js` — italy weights
- `fc-ui-theme.css`, `club-systems.js`, `client/vite.config.js`

### ไม่แตะ
- Live match loop, `tracker-pitch.jsx`, `live-pitch-ambient.js`

---

## ชนกับ Claude patch?

เช็ค `patches/claude/ACTIVE.md` — ไฟล์เสี่ยงชน: `football-manager.jsx`, `game-version.js`, `legend-universe.js`
