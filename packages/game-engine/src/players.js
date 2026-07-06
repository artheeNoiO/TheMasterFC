import { FIRST_NAMES, LAST_NAMES, SQUAD_TEMPLATE, ATK_ATTRS, DEF_ATTRS, ALL_ATTRS, ATTR_GROUPS } from "./constants.js";
import { starWageMultiplier } from "../../../player-stars.js";

export const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const uid = (p = "p") => `${p}_${Math.random().toString(36).slice(2, 10)}`;
export const genName = () => `${choice(FIRST_NAMES)} ${choice(LAST_NAMES)}`;

export function computeRating(position, attack, defense) {
  const raw =
    position === "GK" ? defense * 0.85 + attack * 0.15 :
    position === "DF" ? defense * 0.65 + attack * 0.35 :
    position === "MF" ? defense * 0.5 + attack * 0.5 :
    defense * 0.2 + attack * 0.8;
  return Math.round(clamp(raw, 20, 99));
}

export function recomputeDerived(p) {
  const avg = (keys) => keys.reduce((s, k) => s + p.attrs[k], 0) / keys.length;
  p.attack = clamp(Math.round(avg(ATK_ATTRS) * 5), 5, 99);
  p.defense = clamp(Math.round(avg(DEF_ATTRS) * 5), 5, 99);
  p.rating = computeRating(p.position, p.attack, p.defense);
}

export function bumpAttrs(p, amount) {
  ALL_ATTRS.forEach((k) => { p.attrs[k] = clamp(p.attrs[k] + amount, 1, 20); });
  recomputeDerived(p);
}

export function genPlayer(position, tier, clubId, forcedAge, startDay) {
  const age = forcedAge != null ? forcedAge : rand(17, 33);
  const peak = age <= 27 ? 1 : clamp(1 - (age - 27) * 0.025, 0.55, 1);
  const base = 10 + tier * 0.35;
  const attrs = {};
  ALL_ATTRS.forEach((k) => {
    let biasHigh;
    if (position === "GK") biasHigh = DEF_ATTRS.includes(k) || k === "composure" || k === "decisions";
    else if (position === "DF") biasHigh = DEF_ATTRS.includes(k) || ATTR_GROUPS.physical.includes(k);
    else if (position === "MF") biasHigh = ATTR_GROUPS.mental.includes(k) || k === "passing";
    else biasHigh = ATK_ATTRS.includes(k) || ATTR_GROUPS.physical.includes(k);
    const spread = biasHigh ? rand(1, 5) : rand(-4, 2);
    attrs[k] = clamp(Math.round((base + spread) * peak), 1, 20);
  });
  const p = {
    id: uid("pl"), name: genName(), position, age, attrs,
    morale: rand(62, 92), clubId, stamina: 100, injuryDays: 0,
    careerGoals: 0, careerApps: 0, role: "balanced",
  };
  recomputeDerived(p);
  const ageMult = age <= 23 ? 1.35 : age <= 28 ? 1.05 : age <= 31 ? 0.65 : 0.35;
  p.value = Math.round((p.rating * p.rating * 380 * ageMult) / 1000) * 1000;
  p.wage = Math.max(100, Math.round(((p.rating * p.rating * 2) / 100) * starWageMultiplier(p.rating) / 10) * 10);
  p.potential = age <= 21 ? clamp(p.rating + rand(6, 34), p.rating, 99) : age <= 25 ? clamp(p.rating + rand(0, 10), p.rating, 99) : p.rating;
  p.contractEndsDay = (startDay || 1) + rand(150, 400);
  return p;
}

export const genSquad = (clubId, tier) => SQUAD_TEMPLATE.map((pos) => genPlayer(pos, tier, clubId));

export function genManager() {
  const stats = { development: rand(30, 60), tactics: rand(30, 60), manManagement: rand(30, 60), negotiation: rand(30, 60), scouting: rand(30, 60), reputation: rand(30, 60) };
  const keys = Object.keys(stats);
  const strong = [...keys].sort(() => Math.random() - 0.5).slice(0, 2);
  strong.forEach((k) => { stats[k] = rand(75, 97); });
  return {
    id: uid("mg"), name: `ผจก.${choice(FIRST_NAMES)}`, stats,
    preferredFormation: choice(["4-4-2", "4-3-3", "3-5-2", "5-3-2"]),
    wins: 0, draws: 0, losses: 0, xp: 0, level: 1,
  };
}

export function formatMoney(n) {
  const sign = n < 0 ? "-" : "";
  n = Math.abs(n);
  if (n >= 1000000) return `${sign}${(n / 1000000).toFixed(2)}M฿`;
  if (n >= 1000) return `${sign}${(n / 1000).toFixed(0)}K฿`;
  return `${sign}${n}฿`;
}
