/** คีย์เซฟ localStorage แยกตาม Game ID — logout แล้ว login กลับมาเล่นต่อได้ */

export function normalizeUsername(username) {
  return String(username ?? "").trim().toLowerCase();
}

export function profileSaveKey(username) {
  const u = normalizeUsername(username);
  return u ? `profile_v1__${u}` : "profile_v1";
}

export function careerSaveKey(username) {
  const u = normalizeUsername(username);
  return u ? `career_v3__${u}` : "career_v3";
}

export function introSeenKey(username) {
  const u = normalizeUsername(username);
  return u ? `tmfc_intro_seen__${u}` : "tmfc_intro_seen";
}

const LAST_USER_KEY = "tmfc_last_username";

export function rememberLastUsername(username) {
  try {
    const u = normalizeUsername(username);
    if (u) localStorage.setItem(LAST_USER_KEY, u);
  } catch { /* ignore */ }
}

export function getLastUsername() {
  try {
    return localStorage.getItem(LAST_USER_KEY) || "";
  } catch {
    return "";
  }
}

export function hasSaveForUsername(username) {
  try {
    const u = normalizeUsername(username);
    if (!u) return false;
    return Boolean(
      localStorage.getItem(careerSaveKey(u))
      || localStorage.getItem(profileSaveKey(u)),
    );
  } catch {
    return false;
  }
}

/** ย้ายเซฟเก่า (ก่อนผูกบัญชี) ไปคีย์ตาม username ครั้งแรก */
export function migrateLegacySavesToUser(username) {
  const u = normalizeUsername(username);
  if (!u) return;
  try {
    const ck = careerSaveKey(u);
    const pk = profileSaveKey(u);
    if (!localStorage.getItem(ck) && localStorage.getItem("career_v3")) {
      localStorage.setItem(ck, localStorage.getItem("career_v3"));
    }
    if (!localStorage.getItem(pk) && localStorage.getItem("profile_v1")) {
      localStorage.setItem(pk, localStorage.getItem("profile_v1"));
    }
  } catch { /* ignore */ }
}
