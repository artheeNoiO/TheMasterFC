import { api, getToken, setToken } from "./api.js";

/** ลงทะเบียน dev + ปลดล็อกออนไลน์ + สร้างสโมสรบนเซิร์ฟเวอร์จาก career โลกจำลอง */
export async function migrateCareerToServer(career, email) {
  if (!email?.trim()) throw new Error("กรุณาใส่อีเมล");

  const team = career.teams.find((t) => t.id === career.userTeamId);
  if (!team) throw new Error("ไม่พบสโมสรของคุณ");

  const teamValue = computeTeamValueFromCareer(career);
  if (teamValue < 50_000_000) throw new Error("มูลค่าสโมสรรวมยังไม่ถึง 50M");
  if (teamValue < 0) throw new Error("มูลค่าสโมสรรวมติดลบ");

  if (!getToken()) {
    const data = await api("/api/auth/dev-register", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), displayName: team.name }),
    });
    setToken(data.token);
  }

  await api("/api/auth/unlock-online", {
    method: "POST",
    body: JSON.stringify({ teamValue }),
  });

  const me = await api("/api/clubs/me");
  if (!me.club) {
    await api("/api/clubs", {
      method: "POST",
      body: JSON.stringify({
        name: team.name,
        short: team.short,
        primaryColor: team.color,
        secondaryColor: team.secondaryColor || "#f2f0e6",
        shirtColor: team.shirtColor || team.color,
        shortsColor: team.shortsColor || "#0b2318",
        logoIndex: team.logoIndex ?? 0,
      }),
    });
  }

  localStorage.setItem("siam_play_mode", "online");
  return { teamValue, teamName: team.name };
}

/** สรุปมูลค่าแบบเดียวกับเกมหลัก (ย่อ) — server ตรวจซ้ำที่ unlock-online */
function computeTeamValueFromCareer(c) {
  const userId = c.userTeamId;
  const squad = c.players.filter((p) => p.teamId === userId);
  const squadValue = squad.reduce((s, p) => s + (p.value || 0), 0);
  const academyValue = (c.academyPlayers || []).reduce((s, p) => s + (p.value || 0), 0);
  const prospectValue = (c.youthProspects || []).reduce((s, p) => s + (p.value || 0), 0);
  const budget = c.budget || 0;
  // ศูนย์ฝึก + สตาฟ — ประมาณจากเกมหลัก
  const fac = c.facilities || {};
  const facilitiesValue = ["fitness", "training", "techLab", "medical"]
    .reduce((s, k) => s + ((fac[k] || 1) * 650000), 0);
  const staff = c.staff?.[userId] || {};
  const staffValue = Object.values(staff).reduce((s, person) => s + (person?.value || person?.signingCost || 0) * 0.35, 0);
  return squadValue + academyValue + prospectValue + budget + facilitiesValue + staffValue;
}
