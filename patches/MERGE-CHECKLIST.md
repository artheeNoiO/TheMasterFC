# Merge Checklist — ก่อนอนุญาต merge / deploy

ใช้เมื่อผู้ใช้สั่งชัดเจนเท่านั้น เช่น **「อัพ Cursor patch ได้」** หรือ **「อัพ Claude patch ได้」** หรือ **「รวมทั้งสองแล้ว deploy」**

---

## 1. ขอบเขตที่ merge

- [ ] รู้ว่ากำลัง merge **Cursor** / **Claude** / **ทั้งคู่**
- [ ] ไม่แตะ **main / production** โดยไม่ได้รับคำสั่ง
- [ ] **Live match loop** (`LiveMatchModal`, `tracker-pitch.jsx`, `live-pitch-ambient.js`) — ไม่ merge ถ้า patch แตะ (ยกเว้นผู้ใช้อนุมัติชัด)

---

## 2. ชนกันระหว่าง Cursor ↔ Claude

เปิด `patches/cursor/ACTIVE.md` และ `patches/claude/ACTIVE.md` แล้วเทียบ:

| ตรวจ | Cursor | Claude | ชน? |
|------|--------|--------|-----|
| ไฟล์เดียวกัน | | | |
| ฟีเจอร์เดียวกัน | | | |
| SAVE_VERSION / migration | | | |
| UI แท็บเดียวกัน | | | |

- [ ] **ไม่ชน** — merge ตามลำดับที่เลือกได้
- [ ] **ชน** — reconcile ก่อน (merge ทีละฝั่ง / ให้คนดูแลตัดสินใจ)

---

## 3. ก่อน merge เข้า main

- [ ] `npm run build` ผ่าน (client)
- [ ] Save migration ไม่ทับกัน (ถ้าทั้งสองฝั่ง bump `SAVE_VERSION` ต้องรวมเป็นเลขเดียว)
- [ ] ไม่มี secret / `.env` ใน diff
- [ ] ทด local: `http://localhost:5173/play`
- [ ] อัปเดต `game-version.js` / `CHANGELOG.md` (ถ้าเป็น release)

---

## 4. หลัง merge

- [ ] ย้ายรายการจาก `ACTIVE.md` → `CHANGELOG.md` (ฝั่งที่ merge แล้ว)
- [ ] ล้าง `ACTIVE.md` ของงานที่ merge แล้ว
- [ ] Deploy เฉพาะเมื่อผู้ใช้สั่ง

---

## คำสั่งที่ถือว่าอนุญาต merge

| คำสั่ง | ความหมาย |
|--------|----------|
| อัพ Cursor patch ได้ | merge เฉพาะงานใน `patches/cursor/` |
| อัพ Claude patch ได้ | merge เฉพาะงานใน `patches/claude/` |
| รวม patch แล้ว deploy | merge ทั้งสอง (หลัง checklist ชนกัน) + deploy |

**ไม่มีคำสั่ง = ไม่ merge main / ไม่ deploy**
