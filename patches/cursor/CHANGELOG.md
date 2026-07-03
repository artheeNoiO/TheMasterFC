# Cursor Patch — CHANGELOG (รอ merge)

รายการที่จะ merge เมื่อผู้ใช้สั่ง **「อัพ Cursor patch ได้」** (หลัง reconcile Claude)

---

## รอ merge — Cursor patch 2026-07-03

### UX / UI
- Scrollbar ซ่อน + DragScroll (ลาก/ลูกกลิ้ง)
- คู่มือสตาฟย้ายไป More menu
- แก้ภาพการ์ดสตาฟ (`<img>` + encode URL)

### ระบบเกม
- Analyst ฝึกซ้อม + รายงาน + แนะนำ drill
- ผูก `markMult` + `scoutInsightBonus`
- Coach system, Staff guide
- SAVE v10 (training reports), SAVE v11 (full rosters)

### Roster Database (ใหญ่)
- **2,944 นักเตะ** · **128 ทีม** · **8 ลีก legend**
- ~23 คน/ทีม อิงโลกจริง (parody names)
- Serie A เพิ่มใหม่
- Generator: `npm run roster:generate`

### Roster UX
- ตารางลีก → คลิกทีม Master ดู squad ครบ
- League pick แสดง full roster
- Scout ก่อนเกม → ดาวเด่น 5 คนในทีมคู่แข่ง
- เซฟเก่า migrate อัตโนมัติ (v11)
