# DIRECTOR-INBOX — Claude Code (Director)

Claude Code อ่านไฟล์นี้เมื่อ user สั่งตรวจงาน — **ห้ามเขียนโค้ดยาว** แค่ตัดสิน

## โหมดประหยัดเครดิต

1. อ่าน `TASK-QUEUE.md` (ส่วน "รอ Director ตรวจ")
2. อ่าน `git diff` ของงานนั้นเท่านั้น
3. ยืนยัน build ผ่าน (executor แนบผลมา)
4. ตอบรูปแบบด้านล่าง

## รูปแบบตอบ

```
VERDICT: PASS | FAIL
Task: TASK-XXX
Reviewer: Claude Code (Director)

## ต้องแก้ (ถ้า FAIL — สูงสุด 5 ข้อ)
1. ...

## เกณฑ์ PASS ครั้งหน้า
- build ผ่าน
- ...
```

## คิวรอตรวจ














_(ว่าง — executor อัป status เป็น ready_for_review แล้วใส่ task id ที่นี่)_

**Hub Phase 3:** Claude เขียน `DIRECTOR-VERDICT.md` → รัน `Hub-Sync-Verdicts.bat` (หรือ scan อัตโนมัติ)
