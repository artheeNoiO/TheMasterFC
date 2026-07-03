# Patch workflow — Cursor + Claude แยกกัน

ระบบหลัก (main / production) **ไม่แก้** จนกว่าผู้ใช้จะสั่ง merge patch

## โฟลเดอร์

| Path | ใครใช้ |
|------|--------|
| `patches/cursor/` | งานจาก Cursor |
| `patches/claude/` | งานจาก Claude Code |
| `patches/MERGE-CHECKLIST.md` | เช็คก่อน merge / deploy |

## ไฟล์ในแต่ละฝั่ง

- **ACTIVE.md** — งานกำลังทำ + ไฟล์ที่แตะ (ยังไม่ merge)
- **CHANGELOG.md** — งานที่ merge main แล้ว

## คำสั่ง merge (ต้องพูดชัด)

- **อัพ Cursor patch ได้**
- **อัพ Claude patch ได้**
- **รวม patch แล้ว deploy**

ก่อน merge ทุกครั้ง: เปิด `MERGE-CHECKLIST.md` และเทียบ ACTIVE ทั้งสองฝั่งว่าชนกันหรือไม่
