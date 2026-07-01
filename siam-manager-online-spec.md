# Siam Manager Online — สถาปัตยกรรมและสเปคทางเทคนิค

เอกสารนี้ออกแบบมาให้ส่งต่อให้นักพัฒนา หรือใช้เป็น prompt เริ่มต้นกับ Claude Code เพื่อสร้างเวอร์ชันออนไลน์จริงของเกม โดยต่อยอดจากโปรโตไทป์ผู้เล่นเดี่ยว (React single-file artifact) ที่มีอยู่แล้ว — ตรรกะเกม (การคำนวณแมตช์, ระบบฝึกซ้อม, อคาเดมี ฯลฯ) เขียนเป็นฟังก์ชัน JavaScript บริสุทธิ์อยู่แล้ว จึงย้ายไปรันฝั่งเซิร์ฟเวอร์ได้โดยแทบไม่ต้องเขียนใหม่

---

## 1. เป้าหมาย

- ผู้เล่นหลายคนใช้บัญชีจริง แข่งขันในลีกเดียวกัน ตลาดซื้อขายจริง แข่งกับผู้เล่นจริงไม่ใช่บอทเท่านั้น
- เกมต้อง "เดินต่อ" แม้ผู้เล่นไม่ได้เปิดแอป (server-authoritative, ไม่ใช่ client-side idle simulation แบบโปรโตไทป์)
- รองรับผู้เล่นจำนวนมากผ่านโครงสร้างลีกแบบ "ชาร์ด" (หลายลีกขนาดเท่ากันขนานกัน)

## 2. ภาพรวมสถาปัตยกรรม

```
[ผู้เล่น] --HTTPS/WSS--> [CDN/Frontend hosting] --API--> [Backend API server]
                                                              |
                                                    +---------+---------+
                                                    |                   |
                                              [PostgreSQL DB]     [Job queue / Redis]
                                                    |                   |
                                              [ข้อมูลถาวรทั้งหมด]   [Cron: day tick, ตลาดปิด/เปิด,
                                                                       ประมวลผลแมตช์, หมดสัญญา]
```

- **Frontend**: React (ต่อยอดจาก UI เดิมได้เกือบทั้งหมด) โฮสต์บน Vercel/Cloudflare Pages
- **Backend API**: Node.js + Express หรือ NestJS โฮสต์บน Railway/Render/Fly.io
- **Database**: PostgreSQL (Supabase หรือ Neon ก็ใช้ได้ ลดงาน DevOps)
- **Real-time**: Socket.io หรือ native WebSocket สำหรับถ่ายทอดสดแมตช์ + แจ้งเตือน
- **Job queue**: BullMQ + Redis สำหรับงานตามกำหนดเวลา (เปลี่ยนวัน, ปิดตลาด, หมดสัญญา, คำนวณ Champ Master)
- **Auth**: Supabase Auth / Firebase Auth / Auth0 — อย่าทำระบบรหัสผ่านเองถ้าไม่จำเป็น

**ทางลัดแนะนำสำหรับ MVP**: ใช้ Supabase ตัวเดียวคุม Auth + PostgreSQL + Realtime (แทน Socket.io ได้บางส่วน) จะลดงาน backend เองไปมาก เหมาะกับทีมเล็ก/พัฒนาคนเดียว

## 3. หลักการสำคัญ: Server-Authoritative

ทุกการกระทำที่มีผลต่อเกม (ซื้อขาย, ตั้งแทคติก, อัปเกรดศูนย์ฝึก ฯลฯ) ต้อง**ตรวจสอบและคำนวณฝั่งเซิร์ฟเวอร์เท่านั้น** ห้าม client ส่งผลลัพธ์มาให้เซิร์ฟเวอร์เชื่อตรงๆ (ต่างจากโปรโตไทป์ที่ client คำนวณเองทั้งหมด) — นี่คือการเปลี่ยนแปลงใหญ่ที่สุดตอนพอร์ต

## 4. Database Schema (ตารางหลัก)

```sql
users(id, email, display_name, avatar, created_at)
clubs(id, user_id, name, short_code, logo_index, primary_color, secondary_color,
      shirt_color, shorts_color, division, league_shard_id, budget, tier, formation, chemistry)
players(id, club_id, name, position, age, attrs JSONB, rating, potential, value, wage,
        stamina, morale, injury_days_left, career_goals, career_apps, contract_ends_at, role)
staff(id, club_id, specialty, name, grade, boost, weekly_wage)
managers(id, club_id, name, stats JSONB, preferred_formation, level, xp, skill_points,
         contract_ends_at, wins, draws, losses)
league_shards(id, division, name, season_number)          -- แต่ละชาร์ดคือ "ลีก 16 ทีม" หนึ่งชุด
fixtures(id, league_shard_id, day_number, home_club_id, away_club_id, played,
         home_goals, away_goals, scheduled_at)
match_events(id, fixture_id, minute, event_type, team_side, player_id)   -- สำหรับ replay/ถ่ายทอดสด
transfer_listings(id, player_snapshot JSONB, source_club_id, ends_at, status)
bids(id, listing_id, bidder_club_id, wage_offer, fee_offer, created_at)
loans(id, player_id, from_club_id, to_club_id, days_left, performance_log JSONB)
academy_players(id, club_id, player_data JSONB, signed_at)
training_plans(id, club_id, slot_index, training_type)
facilities(id, club_id, facility_type, level)
season_goals(id, club_id, goal_id, chosen_at, resolved, success)
weekly_quests(id, club_id, quest_id, progress JSONB, rewarded)
champ_master_brackets(id, season_number, rounds JSONB, prize_pool)
notifications(id, user_id, message, read, created_at)
```

## 5. Server-side Game Loop (แทนที่ระบบ idle catch-up ของโปรโตไทป์)

- **Cron ทุก 1 ชั่วโมงจริง** (`day-tick` job): สำหรับทุกชาร์ดลีก — จำลองแมตช์ของวันนั้น (ใช้ตรรกะ `simulateInstant`/`buildMatchContext` ที่มีอยู่แล้วในโปรโตไทป์ พอร์ตมาเป็นฟังก์ชันฝั่งเซิร์ฟเวอร์ตรงๆ), อัปเดตตาราง, หักค่าเหนื่อย, ประมวลผลฝึกซ้อม, เช็คสัญญาหมดอายุ, รีเฟรชผู้สมัครโค้ช/ผจก., เติมตลาด
- **สำหรับแมตช์ที่ผู้เล่นกำลังดูสด**: ไม่ต้องรอ cron — เปิด WebSocket session แยก คำนวณเหตุการณ์แบบ real-time เหมือนที่ `LiveMatchModal` ทำในโปรโตไทป์ แต่รันฝั่งเซิร์ฟเวอร์แล้ว broadcast event ให้ client แสดงผลเท่านั้น (client ห้ามคำนวณผลเอง)
- **ตลาดซื้อขาย**: ใช้ Postgres row-level lock หรือ transaction ตอนวางบิด เพื่อป้องกัน race condition เวลาหลายคนบิดพร้อมกัน — ปิด/เปิดตลาดตามเวลาจริงเหมือนเดิม (12:00-14:00, 18:00-22:00) แต่เช็คฝั่งเซิร์ฟเวอร์

## 6. โครงสร้างลีกแบบหลายชาร์ด (สำคัญมากสำหรับสเกล)

ห้ามใส่ผู้เล่นทุกคนในลีกเดียว — ใช้ดีไซน์ที่วางไว้แล้ว (16 ทีม/ลีก) แต่ **เปิดชาร์ดใหม่เมื่อชาร์ดเดิมเต็ม**:

- ผู้เล่นใหม่ → สุ่มเข้า Challenger League shard ที่มีที่ว่าง (เติมบอทถ้ายังไม่ครบ 16)
- จบฤดูกาล: เลื่อน/ตกชั้นภายในชาร์ดตามเดิม (4 ขึ้น/4 ลง)
- Master League ควรมีชาร์ดเดียวตายตัว (หรือน้อยชาร์ดมาก) ให้มีความหมายของการ "ไปถึงจุดสูงสุด" จริง
- ทดแทนบอทด้วยผู้เล่นจริงเรื่อยๆ เมื่อฐานผู้เล่นโต (ตรงกับที่ออกแบบไว้ตั้งแต่ต้น — "บอทแค่ชั่วคราว")

## 7. API Endpoints (ตัวอย่างหลัก)

```
POST   /auth/signup, /auth/login
GET    /clubs/me
POST   /clubs                          -- สร้างสโมสร (ครั้งแรก)
GET    /leagues/:shardId/table
GET    /leagues/:shardId/fixtures
POST   /clubs/:id/tactics              -- ตั้งแผน/ตัวจริง/roles
POST   /clubs/:id/training-plan
POST   /market/listings/:id/bid
POST   /academy/prospects/:id/sign
POST   /academy/players/:id/loan
POST   /players/:id/renew-contract
POST   /staff/coach/:specialty/hire
POST   /managers/hire
WS     /live/:fixtureId                -- ถ่ายทอดสดแมตช์
```

ทุก endpoint ที่เปลี่ยนสถานะเกม ต้อง validate สิทธิ์ (เป็นเจ้าของสโมสรจริงไหม), เช็คงบ/เงื่อนไขซ้ำฝั่งเซิร์ฟเวอร์เสมอ แม้ client จะเช็คมาก่อนแล้วก็ตาม

## 8. แผนการพอร์ตจากโปรโตไทป์ (ลดงานซ้ำ)

ฟังก์ชันเหล่านี้ในไฟล์ React เดิม **เป็น pure function อยู่แล้ว** ย้ายไป backend ได้เกือบตรงๆ:
`genPlayer`, `computeRating`, `recomputeDerived`, `buildMatchContext`, `expectedGoalsFull`,
`simulateInstant`, `teamAttackDefense`, `teamPerformanceMult`, `matchupMultiplier`,
`applyTrainingToPlayer`, `rolloverSeason`, `runChampMaster`, `genYouthProspect`

ส่วนที่ต้องเขียนใหม่ทั้งหมด: authentication, ชั้น database, ระบบคิว/cron, WebSocket broadcasting, การป้องกัน race condition ของตลาดประมูล

## 9. ความปลอดภัยที่ต้องมี

- Rate limiting ทุก endpoint (ป้องกันสแปมประมูล/รีสุ่ม)
- Validate ทุกอย่างฝั่งเซิร์ฟเวอร์ (ราคาบิด, งบ, deadline)
- ป้องกัน SQL injection (ใช้ ORM เช่น Prisma/Drizzle)
- เก็บ log การกระทำสำคัญ (audit trail) สำหรับกรณีพิพาท/โกง

## 10. Roadmap แนะนำ

1. **Phase 1 (MVP)**: Auth + สร้างสโมสร + ลีกชาร์ดเดียว (บอทเติมที่ว่าง) + day-tick cron + ตารางคะแนน — ยังไม่ต้องมีตลาดประมูลแบบเรียลไทม์
2. **Phase 2**: ตลาดประมูลจริงระหว่างผู้เล่น + WebSocket ถ่ายทอดสด
3. **Phase 3**: อคาเดมี + ฝึกซ้อม + ศูนย์ฝึก + สัญญา (พอร์ตจากโปรโตไทป์)
4. **Phase 4**: หลายชาร์ด + เลื่อน/ตกชั้นข้ามชาร์ด + Champ Master ข้ามชาร์ดจริง (ไม่ต้องจำลองทีมสมมติอีกต่อไป)
5. **Phase 5**: ระบบรายได้ (Manager Pass ตามที่ออกแบบไว้), ระบบคู่แค้น/ดิสไลค์จากผู้เล่นจริง

## 11. ค่าใช้จ่ายโดยประมาณ (เริ่มต้น)

- Hosting backend + DB (Supabase/Railway ระดับเริ่มต้น): ~$25-50/เดือน
- Frontend hosting: ฟรี-ต่ำมาก (Vercel/Cloudflare Pages)
- Redis (ถ้าใช้ queue): ~$10-15/เดือน
- โดเมน: ~$10-15/ปี
- ต้นทุนจะขยับตามจำนวนผู้เล่น/ชาร์ดที่เปิดเพิ่ม

## 12. Prompt เริ่มต้นสำหรับ Claude Code

```
สร้างเว็บแอป football manager แบบ multiplayer จาก spec นี้:
- Backend: Node.js + Express + PostgreSQL (ใช้ Prisma ORM)
- Auth: Supabase Auth
- Frontend: React (พอร์ต UI จากไฟล์ football-manager.jsx ที่แนบมา)
- ต้องมี cron job รายชั่วโมงจำลองผลแข่งขันทุกลีกชาร์ด
- ตลาดซื้อขายต้องป้องกัน race condition ด้วย DB transaction
- เริ่มจาก Phase 1 ใน roadmap ก่อน (auth + สร้างสโมสร + ลีกชาร์ดเดียว + day-tick)
[แนบไฟล์ football-manager.jsx และเอกสารสเปคนี้]
```

---

**หมายเหตุ**: เอกสารนี้เป็นสเปคระดับสถาปัตยกรรม ไม่ใช่โค้ดที่รันได้ทันที นักพัฒนา (หรือ Claude Code) ยังต้องตัดสินใจรายละเอียดปลีกย่อยเพิ่มเติมระหว่างพัฒนาจริง
