/**
 * ดาวนักเตะ 1–7★ จากเรตจริง (แบบ FM Mobile)
 * ปัจจุบัน = rating, ศักยภาพ = potential
 */

export const STAR_MAX = 7;

export const STAR_LABEL_TH = {
  1: "สมัครเล่น",
  2: "ลีกรอง",
  3: "ลีกหลัก",
  4: "ดี",
  5: "ดาว",
  6: "ซูเปอร์สตาร์",
  7: "ตำนาน",
};

/** แปลงเรต 20–99 → ดาว 1–7 */
export function starsFromRating(stat) {
  const v = Number(stat) || 0;
  if (v >= 92) return 7;
  if (v >= 86) return 6;
  if (v >= 80) return 5;
  if (v >= 74) return 4;
  if (v >= 68) return 3;
  if (v >= 60) return 2;
  return 1;
}

export function getPlayerStarProfile(p) {
  if (!p) return { current: 1, potential: 1, isWonderkid: false };
  const rating = p.rating ?? 50;
  const potential = p.potential ?? rating;
  const age = p.age ?? 25;
  const current = starsFromRating(rating);
  const potStars = starsFromRating(potential);
  const isWonderkid = age <= 23 && (potential - rating) >= 10 && potStars >= 5;
  return { current, potential: potStars, isWonderkid, rating, potential };
}
