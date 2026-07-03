# Master League Roster Database

ข้อมูลนักเตะอิงโลกจริง (ฤดูกาล 2024-25) สำหรับ **8 ลีก legend**:

| ลีก | ทีม | คน/ทีม | รวม |
|-----|-----|--------|-----|
| อังกฤษ · สเปน · อิตาลี · เยอรมัน · ฝรั่งเศส | 16×5 | ~23 | 1,840 |
| โปรตุเกส · ซาอุ · ไทย | 16×3 | ~23 | 1,104 |
| **รวม** | **128** | | **~2,944** |

**~252 ซูเปอร์สตาร์** คว้าได้ในตลาด legend

## โครงสร้าง

```
roster-database/
  raw-squads/       ← england, spain, italy, germany, france, portugal, saudi, thailand
  parody.js
  rosters.generated.js  ← AUTO
  index.js
```

## อัปเดต

```bash
npm run roster:generate
```

## ชื่อในเกม

แสดงเป็น **parody** — ลดความเสี่ยงลิขสิทธิ์
