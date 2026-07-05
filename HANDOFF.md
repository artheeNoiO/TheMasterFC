# HANDOFF — The Master Football Club (เดิม The Socker Manager / siam-manager-online)

**อัปเดตล่าสุด:** 2026-07-05 21:50 | โดย: Claude (เซสชันหลัก) | `master` @ `c298a3f` (push ขึ้น GitHub แล้ว)

## ⚠️ สถานะด่วนที่สุด (อ่านก่อนทำอะไรทั้งหมด)
1. **มี branch อื่นชื่อ `claude/progress-check-bgq007` อยู่บน GitHub** — เป็นงานจากอีกเซสชันที่ทำฟีเจอร์ซ้ำ (day-tick auto-kick + spectate) แต่ **สมบูรณ์น้อยกว่า `master` ตอนนี้มาก** (ไม่มีเปลี่ยนตัว/mentality/ตลาดปิดดีล/แบนเนอร์เตือน/ป้ายลอยสกอร์/กันสมัครใหม่ระหว่างแข่ง) — **ห้าม merge branch นั้นเข้า master** ให้ทิ้งไปหรือ `git reset --hard origin/master` แทน
2. **Production อยู่บน Render แล้ว** (ไม่ใช่เครื่อง PC บ้านอีกต่อไป) — `the-socker-manager-api` (Postgres + web service), DNS `api.themasterfc.com` ชี้ไป Render (CNAME, DNS-only) — เครื่อง PC บ้านปิดได้เลย ไม่กระทบเว็บ
3. **ใช้ `Start-Test-Server.bat`** (root) เวลาจะทดสอบ patch ใดๆ — เปิด client+API+SQLite แยกต่างหาก (ports 5174/3002, `server/prisma/test.db`) ไม่แตะ production เด็ดขาด

## โปรเจคนี้คืออะไร
เกมจัดการทีมฟุตบอลภาษาไทย `football-manager.jsx` (ไฟล์เดียว ~13,000+ บรรทัด) — เดิมเป็น single-player/sandbox ล้วน กำลังต่อเข้าระบบออนไลน์จริง (npm workspaces: `client/` Vite React, `server/` Express+Prisma+Postgres บน Render, `packages/game-engine/`) ให้ผู้เล่นจริงแข่งกันในลีคเดียวกัน (16 ทีม/ชาร์ด, บอทเติมที่ว่าง) แข่งอัตโนมัติตามเวลาจริงช่วง 9:00-20:00 น. ไทย

## สถานะปัจจุบัน — โหมดออนไลน์ใช้งานได้จริงครบวงจรแล้ว (2026-07-05)

**บั๊กใหญ่ที่แก้ไปวันนี้:** `createClubForUser` เดิมสร้างชาร์ดบอทส่วนตัวให้ทุกคน (ไม่มีใครแชร์ลีคกับใครเลย) + เลือก "ออนไลน์" ตอนสร้างทีมไม่เคยเรียกเซิร์ฟเวอร์สร้างสโมสรจริงเลย (แค่ตั้ง flag ในเซฟ) — **ทั้งสองจุดแก้แล้ว ทดสอบ end-to-end ผ่านจริงด้วย curl/Puppeteer**

**ฟีเจอร์ที่เสร็จสมบูรณ์วันนี้ (ทดสอบ end-to-end ทุกอย่าง ไม่ใช่แค่ทฤษฎี):**
1. Shared-shard fix — ผู้เล่นจริงแทนที่บอททีละคนในชาร์ดเดียวกัน (`server/src/services/gameService.js: createClubForUser`)
2. ระบบแมทเตะอัตโนมัติตามเวลาจริง — คิกอฟ/จบเองไม่ต้องกด (`server/src/services/liveMatchService.js`: `kickOffRoundMatches`/`finalizeFinishedMatches`/`computeLiveState`, ต่อเข้า `runDayTickForShard`) — poll ทุก 30 วิ (`server/src/index.js`, ต้องถี่กว่า `MS_PER_GAME_DAY` เดิมมาก เพราะแมทจบใน ~6 นาทีจริงไม่ใช่ทันที)
3. Route เปลี่ยนตัวระหว่างแมทสด + ดูแมทคนอื่น (สเปคเทต) — `server/src/routes/matches.js` (`/shard-today`, `/live/:matchId`, `/:matchId/substitute`, `/:matchId/mentality`)
4. Client หน้า "แข่งขันสด" — `OnlineMatchCenterView`/`OnlineLiveMatchPanel` ใน `football-manager.jsx` (เมนู More) + `client/src/lib/online-match.js`
5. ป้ายลอยสกอร์สด (`OnlineFloatingScoreWidget`) — ดูสกอร์ได้ทุกแท็บ แก้โจทย์ "ย่อ/ขยาย" ด้วยสถาปัตยกรรมแท็บแทนโมดัล
6. แบนเนอร์นับถอยหลังก่อนแมทบน Dashboard (`OnlineNextKickoffBanner`, ใช้ `getShardNextKickoffEtaMs`)
7. สั่งอารมณ์ทีมกลางแมท (บุก/สมดุล/รับ) — `setMatchMentality` คูณ xG ส่วนที่เหลือของแมท
8. ตลาด: เจรจา/ตกลงได้ทั้งวัน แต่ย้ายทีมจริงพร้อมกันตอน 20:00 (`negotiationService.js`: `accepted_pending` → `executeAcceptedTransfers` เรียกจาก `startNewSeason`)
9. กันสมัครออนไลน์ใหม่ระหว่างแข่งขัน (`isMarketWindowOpen()` gate ใน `createClubForUser`) — เปิดรับเฉพาะ 20:00-09:00 ให้ทุกคนเริ่มจากตาราง 0-0-0-0 สดๆ

**ย้ายเซิร์ฟเวอร์ไป Render แล้ว** (`render.yaml` root) — Postgres + web service, DNS `api.themasterfc.com` ชี้ Render โดยตรง เครื่อง PC บ้านไม่ต้องเปิดค้างอีกต่อไป

## ทำต่อ (คุยออกแบบไว้แล้วแต่ยังไม่เริ่มโค้ด — ใหญ่ทั้งหมด)

1. **ระบบดิวิชั่น 5-6 ชั้น + เลื่อนชั้น/ตกชั้นข้ามชาร์ด** — user ยืนยันอยากได้ 5-6 ชั้น (Claude เสนอ 3 ไปก่อน แต่ user เลือก 5-6) แผน: ออกแบบโครงสร้างรองรับ 6 ชั้นได้ แต่เปิดใช้จริงแค่ 2-3 ชั้นล่างก่อน (ผู้เล่นยังน้อย, Test Beta) ค่อยเปิดชั้นบนเพิ่มตามจำนวนผู้เล่นจริง — ต้องพอร์ตลอจิกเลื่อนชั้น/ตกชั้นจาก sandbox (`PROMOTION_BONUS`/`RELEGATION_PARACHUTE` ใน `football-manager.jsx`) มาทำเวอร์ชันเซิร์ฟเวอร์ที่ย้ายทีมข้ามชาร์ดได้
2. **FM-style Tactics overhaul** — แยกฟอร์เมชันมี/ไม่มีบอล (in/out-of-possession), Tactical Advisor เตือนจุดอ่อน, role/duty ต่อตำแหน่งแบบ FM26 (คุยไว้หลังอ่านข่าว FM26 มา) — ยังไม่ได้เริ่มเลย
3. **ระบบรีเซ็ตรายเดือน + Battle Pass** — user ขอไว้ "กลัวลืม" (2026-07-05) ยังไม่ได้คุยรายละเอียด: รีเซ็ตอะไรบ้าง (ตารางดิวิชั่น? Battle Pass?), Battle Pass มี reward อะไร/XP มาจากไหน/ขายจริงไหม — แนะนำคุย 3 เรื่องนี้ (ดิวิชั่น+รีเซ็ตเดือน+Battle Pass) รวมกันในคราวเดียวเพราะน่าจะใช้รอบ "ฤดูกาล" เดียวกัน กรอบเวลาที่คุยไว้: **1 เดือนจริง** เหมาะสุดสำหรับ Battle Pass (ไม่ใช่สั้น/ยาวกว่านั้น)
4. **[BACKLOG รอคุยสโคปเพิ่ม]** ระบบความสัมพันธ์นักเตะ (ยังไม่ชัดว่าหมายถึงเคมีทีม/เครือข่ายโซเชียลแบบ FM) + กราฟสถิติเชิงลึกแบบ FBref (heatmap ฯลฯ — เกมยังไม่เก็บข้อมูลตำแหน่ง/แรงกดดันรายนาที ต้องออกแบบ data layer ใหม่ทั้งชุดก่อนถึงจะทำได้จริง)
5. Player Detail Modal + Radar Chart จริง — **เสร็จแล้ว** (คลิกไอคอน 📊 ข้างชื่อนักเตะใน Squad/Tactics)

## ติดอยู่/บล็อก
- ไม่มี (production ทำงานปกติบน Render)

## ไฟล์/คำสั่งสำคัญ
- **ทดสอบ patch:** `Start-Test-Server.bat` (root) — client:5174, API:3002, DB แยก `server/prisma/test.db` ไม่แตะ production
- **Dev ปกติ (คนละ DB จาก test):** `Start-Game-Server.bat` — client:5173, API:3001, `server/prisma/dev.db`
- **Production:** Render (`the-socker-manager-api` + Postgres), deploy อัตโนมัติจาก push ขึ้น `master` (buildCommand รัน `prisma generate && prisma db push` ให้เองทุกครั้ง) — เว็บ client อยู่ Cloudflare Pages, deploy ด้วย `npx wrangler pages deploy dist --project-name=themasterfc --commit-dirty=true --branch=master` ที่ `client/`
- **ระบบแมทเรียลไทม์:** `server/src/services/liveMatchService.js` (event script generator + `computeLiveState` คำนวณจาก `kickoffAt`+`eventsJson` เท่านั้น ไม่มีโพรเซสรันค้าง ปลอดภัยต่อ restart) — `GAME_MINUTE_REAL_SECONDS=4` ใน `game-version.js` (90 นาทีเกม = 6 นาทีจริง), `MS_PER_GAME_DAY` ~44 นาที/รอบ (15 รอบ/วัน = 1 ฤดูกาล)
- **Client online libs:** `client/src/lib/online-match.js` (แมทสด/เปลี่ยนตัว/mentality), `online-negotiations.js` (ตลาด), `online-session.js` (`createOnlineClubDirect` = จุดสำคัญที่สร้างสโมสรจริงตอนเลือกโหมดออนไลน์ครั้งแรก)
- **ระบบภาพแมตช์สด (sandbox, ไม่เกี่ยวกับออนไลน์):** `live-pitch-ambient.js` = สมองทั้งหมด (shotSeq/setPiece/celebration/restart/GK/ปีก/timeScale) · `pass-simulator.js` = ฟิสิกส์บอล+AI จ่าย · `tracker-pitch.jsx` = วาดสนาม
- **เทสต์ด้วยบอท:** `puppeteer-core` + Edge headless (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`) — เขียนสคริปต์ทดสอบไว้ที่ scratchpad เวลามีบั๊ก/ฟีเจอร์ใหม่ที่ต้องยืนยันจริง

## บันทึกย่อรายเซสชัน (ใหม่สุดบนสุด)

- **[2026-07-05 เซสชันยาวมาก]** ทำระบบออนไลน์เต็มรูปแบบตั้งแต่ต้นจนจบในเซสชันเดียว: (1) ย้าย production จากเครื่อง PC บ้าน → Render (ทั้งคู่มือ Render dashboard + Cloudflare DNS switch, เจอปัญหา Prisma engine ล็อกไฟล์เพราะ server เก่ายังรันอยู่ระหว่างพยายาม regenerate client ต้องรอ user ปิดเครื่องบ้านก่อนถึงจะปลดล็อกได้) (2) เจอ+แก้บั๊กใหญ่ที่สุดของเซสชัน: `createClubForUser` สร้างชาร์ดส่วนตัวให้ทุกคน ไม่มีใครแชร์ลีคจริง — แก้ให้หาชาร์ด `isFull=false` แล้วแทนที่บอท (3) สร้างระบบแมทอัตโนมัติทั้งชุดตั้งแต่ 0 (`liveMatchService.js` ใหม่ทั้งไฟล์) ทดสอบผ่าน server จริงที่รันอัตโนมัติจริง ไม่ใช่เรียกฟังก์ชันมือ (4) เจอบั๊กที่สองรองลงมา: เลือกโหมดออนไลน์ตอนสร้างทีมไม่เคยสร้างสโมสรจริงบนเซิร์ฟเวอร์เลย (แค่ตั้ง flag ในเซฟ) แก้ด้วย `createOnlineClubDirect` (5) เพิ่มฟีเจอร์ครบชุดที่คุยไว้แต่แรก: เปลี่ยนตัว/ดูแมทคนอื่น/ป้ายลอยสกอร์/แบนเนอร์เตือน/สั่งอารมณ์ทีมกลางแมท/ตลาดปิดดีลตอน 20:00/กันสมัครใหม่ระหว่างแข่ง — ทุกอย่างทดสอบ end-to-end จริงด้วย curl+Puppeteer ไม่ใช่แค่อ่านโค้ด (6) ระหว่างทางคุยดีไซน์เรื่องดิวิชั่น (5-6 ชั้น), รีเซ็ตรายเดือน, Battle Pass — ยังไม่เริ่มโค้ด รอคุยรายละเอียดเพิ่ม (7) เจอ **branch คู่ขนาน `claude/progress-check-bgq007`** จากอีกเซสชัน (user สั่งงานจากมือถือแยกไป) ทำฟีเจอร์ซ้ำแต่สมบูรณ์น้อยกว่า — บอก user ให้สั่งเซสชันนั้น sync กับ `master` แทนการ merge (8) push งานทั้งหมดขึ้น `master` แล้ว (`c298a3f`) — สร้าง radar chart จริง + Player Detail Modal (คลิกชื่อนักเตะ) ระหว่างทางด้วย
- [2026-07-04 เซสชันยาวมาก] แก้ security ใหญ่: auth token ปลอมได้ (`game:userId` ไม่เซ็น) → เซ็น HMAC จริง, `/matches/:id/finish` เชื่อ score จาก client ตรงๆ → ย้ายมาล็อกตอน kickoff, บั๊ก `ensureStaffCardFields`↔`resetDailyStaffDraws` recursion ทำเซฟถูกลบอัตโนมัติ → แก้แล้ว คุยดีไซน์ระบบออนไลน์ยาวมาก (Cursor เคยเข้าใจผิดสร้างเกมแยกใหม่แทนต่อเกมจริง) สรุปกติกาทั้งหมด (16 ทีม/1วัน=1ฤดูกาล/9-20น./ห้ามข้ามแมตช์/ดูสดได้เปรียบ) เริ่มระบบเสนอซื้อนักเตะตรง (Negotiations) เขียน server เสร็จ client ยังไม่เชื่อม (ทำต่อในเซสชัน 07-05)
- [2026-07-03 รอบ 3-6] รีแฟคเตอร์ใหญ่ระบบภาพแมตช์สด — ถอดระบบรีเพลย์แยกฉากทิ้งทั้งหมด แทนด้วย ambient sim ต่อเนื่อง (shotSeq สโลว์โม, ฉลองประตู, เตะมุม/ฟรีคิกเต็มรูปแบบ, ฉากก่อนเกม/เปลี่ยนตัวเต็มรูปแบบ) — ยังมี React duplicate-key warning ที่ไม่กระทบเกมจริงค้างอยู่ (หาต้นตอไม่เจอ, ไม่ใช่ list นักเตะ)
- [2026-07-02] สร้าง HANDOFF.md ครั้งแรก
