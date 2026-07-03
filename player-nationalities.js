/**
 * Player nationalities + romanized name pools (Latin script).
 * Thai players: Thai names spelled in English e.g. Teetawat, Chanathip.
 */

export const NATIONALITIES = {
  TH: { id: "TH", flag: "🇹🇭", nameEn: "Thailand", nameTh: "ไทย" },
  EN: { id: "EN", flag: "🏴", nameEn: "England", nameTh: "อังกฤษ" },
  ES: { id: "ES", flag: "🇪🇸", nameEn: "Spain", nameTh: "สเปน" },
  FR: { id: "FR", flag: "🇫🇷", nameEn: "France", nameTh: "ฝรั่งเศส" },
  DE: { id: "DE", flag: "🇩🇪", nameEn: "Germany", nameTh: "เยอรมัน" },
  PT: { id: "PT", flag: "🇵🇹", nameEn: "Portugal", nameTh: "โปรตุเกส" },
  BR: { id: "BR", flag: "🇧🇷", nameEn: "Brazil", nameTh: "Brazil" },
  AR: { id: "AR", flag: "🇦🇷", nameEn: "Argentina", nameTh: "อาร์เจนตินา" },
  SA: { id: "SA", flag: "🇸🇦", nameEn: "Saudi Arabia", nameTh: "ซาอุดีอาระเบีย" },
  NG: { id: "NG", flag: "🇳🇬", nameEn: "Nigeria", nameTh: "ไนจีเรีย" },
  KR: { id: "KR", flag: "🇰🇷", nameEn: "South Korea", nameTh: "เกาหลีใต้" },
  JP: { id: "JP", flag: "🇯🇵", nameEn: "Japan", nameTh: "ญี่ปุ่น" },
  NL: { id: "NL", flag: "🇳🇱", nameEn: "Netherlands", nameTh: "เนเธอร์แลนด์" },
  IT: { id: "IT", flag: "🇮🇹", nameEn: "Italy", nameTh: "อิตาลี" },
  US: { id: "US", flag: "🇺🇸", nameEn: "United States", nameTh: "สหรัฐอเมริกา" },
  IE: { id: "IE", flag: "🇮🇪", nameEn: "Ireland", nameTh: "ไอร์แลนด์" },
  SC: { id: "SC", flag: "🏴", nameEn: "Scotland", nameTh: "Scotland" },
  MY: { id: "MY", flag: "🇲🇾", nameEn: "Malaysia", nameTh: "มาเลเซีย" },
  ID: { id: "ID", flag: "🇮🇩", nameEn: "Indonesia", nameTh: "อินโดนีเซีย" },
  VN: { id: "VN", flag: "🇻🇳", nameEn: "Vietnam", nameTh: "เวียดนาม" },
};

/** leagueId (legend-universe) → weighted nationality picks */
export const LEAGUE_NAT_WEIGHTS = {
  thailand: { TH: 72, MY: 4, ID: 4, VN: 3, JP: 3, KR: 3, BR: 5, EN: 3, NG: 2, SA: 1 },
  england: { EN: 42, IE: 6, SC: 6, FR: 8, ES: 6, BR: 10, NG: 8, PT: 5, DE: 4, NL: 5 },
  spain: { ES: 55, BR: 12, AR: 10, FR: 8, PT: 6, EN: 4, DE: 3, NG: 2 },
  france: { FR: 48, EN: 8, ES: 8, PT: 10, BR: 10, DE: 6, NG: 6, AR: 4 },
  germany: { DE: 50, EN: 8, FR: 8, ES: 6, BR: 8, PT: 6, NG: 6, NL: 4, IT: 4 },
  italy: { IT: 52, BR: 10, AR: 8, FR: 8, ES: 6, EN: 4, DE: 4, NG: 4, PT: 4 },
  portugal: { PT: 55, BR: 18, ES: 8, FR: 6, EN: 5, NG: 4, DE: 4 },
  saudi: { SA: 35, BR: 18, EN: 8, FR: 8, ES: 8, PT: 8, NG: 6, AR: 5, DE: 4 },
};

const NAME_POOLS = {
  TH: {
    first: [
      "Teetawat", "Chanathip", "Supachai", "Teerasil", "Ekanit", "Tanawat", "Supachok", "Bordin",
      "Sarach", "Prach", "Kawin", "Suphanat", "Kittisak", "Nattawut", "Phiti", "Anan", "Thanawat",
      "Wichai", "Somchai", "Piti", "Natthaphon", "Kitti", "Surasak", "Ekachai", "Phum", "Teera",
      "Warut", "Chana", "Adisak", "Pakorn", "Sakda", "Peerapat", "Jakrapong", "Kraiwit", "Narong",
      "Boonrod", "Pannawit", "Veeraphat", "Sithichai", "Apisit", "Jetsada", "Taweesak", "Yotpon",
    ],
    last: [
      "Songkran", "Jaided", "Dangda", "Promsaka", "Hemviboon", "Saengthong", "Srisuk", "Boonmee",
      "Wongsa", "Thongdee", "Phongpanich", "Rungreung", "Chaimongkol", "Saichon", "Phetcharat",
      "Intharawong", "Thanakorn", "Chanpen", "Phaisan", "Sriwilai", "Mankong", "Ruangsi", "Suksawat",
      "Wattana", "Kongkiat", "Prasert", "Kaewmanee", "Pholboon", "Hankla", "Wattanasri",
    ],
  },
  EN: {
    first: ["James", "Oliver", "Harry", "George", "Jack", "Jacob", "Thomas", "Charlie", "Marcus", "Daniel", "Kyle", "Tyler", "Ryan", "Ben", "Luke"],
    last: ["Smith", "Jones", "Williams", "Brown", "Taylor", "Wilson", "Evans", "Thomas", "Roberts", "Walker", "Wright", "Thompson", "White", "Harris", "Martin"],
  },
  ES: {
    first: ["Carlos", "Diego", "Pablo", "Sergio", "Alvaro", "Marcos", "Iker", "Raul", "Jordi", "Pedro", "Miguel", "Adrian", "Hugo", "Ivan", "Javier"],
    last: ["Garcia", "Rodriguez", "Martinez", "Lopez", "Gonzalez", "Hernandez", "Sanchez", "Perez", "Ruiz", "Torres", "Ramirez", "Flores", "Castro", "Ortiz", "Silva"],
  },
  FR: {
    first: ["Lucas", "Hugo", "Louis", "Gabriel", "Arthur", "Jules", "Adam", "Raphael", "Paul", "Antoine", "Theo", "Nathan", "Enzo", "Maxime", "Kylian"],
    last: ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau", "Simon", "Laurent", "Lefevre", "Michel", "Garcia"],
  },
  DE: {
    first: ["Lukas", "Leon", "Finn", "Jonas", "Paul", "Felix", "Maximilian", "Tim", "Niklas", "Jan", "Florian", "Tobias", "Moritz", "Sebastian", "Joshua"],
    last: ["Muller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Koch", "Richter", "Klein", "Wolf", "Schroder"],
  },
  PT: {
    first: ["Joao", "Miguel", "Diogo", "Tiago", "Andre", "Pedro", "Ricardo", "Bruno", "Rafael", "Goncalo", "Francisco", "Duarte", "Nuno", "Filipe", "Bernardo"],
    last: ["Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues", "Martins", "Jesus", "Sousa", "Fernandes", "Goncalves", "Gomes", "Lopes", "Marques"],
  },
  BR: {
    first: ["Gabriel", "Lucas", "Matheus", "Pedro", "Rafael", "Bruno", "Felipe", "Gustavo", "Rodrigo", "Vinicius", "Leonardo", "Caio", "Thiago", "Diego", "Anderson"],
    last: ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Ferreira", "Alves", "Costa", "Rodrigues", "Gomes", "Martins", "Araujo", "Barbosa", "Ribeiro"],
  },
  AR: {
    first: ["Santiago", "Mateo", "Benjamin", "Lucas", "Juan", "Tomas", "Agustin", "Facundo", "Nicolas", "Lautaro", "Julian", "Emiliano", "Gonzalo", "Franco", "Leandro"],
    last: ["Gonzalez", "Rodriguez", "Fernandez", "Lopez", "Martinez", "Garcia", "Perez", "Sanchez", "Romero", "Diaz", "Torres", "Alvarez", "Ruiz", "Herrera", "Medina"],
  },
  SA: {
    first: ["Mohammed", "Abdullah", "Fahad", "Salem", "Khalid", "Omar", "Youssef", "Hassan", "Ali", "Ahmed", "Turki", "Nasser", "Bandar", "Faisal", "Majed"],
    last: ["Al-Otaibi", "Al-Dossari", "Al-Harbi", "Al-Ghamdi", "Al-Qahtani", "Al-Shahrani", "Al-Zahrani", "Al-Malki", "Al-Faraj", "Al-Bishi", "Al-Johani", "Al-Shehri"],
  },
  NG: {
    first: ["Victor", "Samuel", "Emmanuel", "Daniel", "Moses", "Joseph", "David", "Michael", "Paul", "Peter", "John", "Simon", "Kelechi", "Wilfred", "Alex"],
    last: ["Okafor", "Adeyemi", "Chukwu", "Okonkwo", "Eze", "Nwankwo", "Obi", "Akinwale", "Balogun", "Ogunleye", "Ibrahim", "Musa", "Abubakar", "Yusuf", "Aliyu"],
  },
  KR: {
    first: ["Min-jun", "Seo-jun", "Do-yun", "Si-woo", "Ha-jun", "Ji-ho", "Ye-jun", "Jun-seo", "Hyun-woo", "Sun-woo", "Jae-won", "Dong-hyun", "Sung-min", "Heung-min", "Son"],
    last: ["Kim", "Lee", "Park", "Choi", "Jung", "Kang", "Cho", "Yoon", "Jang", "Lim", "Han", "Shin", "Oh", "Seo", "Kwon"],
  },
  JP: {
    first: ["Haruto", "Yuto", "Sota", "Ren", "Kaito", "Hayato", "Yuki", "Daiki", "Shota", "Kenta", "Takumi", "Ryo", "Sho", "Koki", "Hiroto"],
    last: ["Sato", "Suzuki", "Takahashi", "Tanaka", "Watanabe", "Ito", "Yamamoto", "Nakamura", "Kobayashi", "Kato", "Yoshida", "Yamada", "Sasaki", "Matsui", "Inoue"],
  },
  NL: {
    first: ["Daan", "Sem", "Lucas", "Milan", "Levi", "Finn", "Luuk", "Jesse", "Noah", "Tim", "Thomas", "Max", "Ruben", "Stijn", "Bram"],
    last: ["De Jong", "Jansen", "De Vries", "Van den Berg", "Van Dijk", "Bakker", "Visser", "Smit", "Meijer", "De Boer", "Mulder", "De Groot", "Bos", "Vos", "Peters"],
  },
  IT: {
    first: ["Leonardo", "Francesco", "Alessandro", "Lorenzo", "Andrea", "Mattia", "Gabriele", "Tommaso", "Riccardo", "Edoardo", "Federico", "Antonio", "Marco", "Giuseppe", "Luca"],
    last: ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Gallo", "Conti", "De Luca", "Mancini"],
  },
  US: {
    first: ["James", "John", "Michael", "David", "Chris", "Matt", "Josh", "Andrew", "Brian", "Kevin", "Jason", "Tyler", "Brandon", "Justin", "Ryan"],
    last: ["Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin"],
  },
  IE: {
    first: ["Sean", "Conor", "Liam", "Cian", "Darragh", "Oisin", "Eoin", "Patrick", "Jack", "Ryan", "Niall", "Declan", "Brendan", "Finn", "Callum"],
    last: ["Murphy", "Kelly", "O'Brien", "Walsh", "Ryan", "O'Sullivan", "Doyle", "McCarthy", "Gallagher", "O'Connor", "Kennedy", "Lynch", "Dunne", "Brennan", "Burke"],
  },
  SC: {
    first: ["Callum", "Lewis", "Jack", "James", "Ryan", "Kyle", "Scott", "Andrew", "Ross", "Grant", "Stuart", "Gregor", "Ewan", "Fraser", "Angus"],
    last: ["MacDonald", "Campbell", "Stewart", "Robertson", "Thomson", "Anderson", "Wilson", "Reid", "Murray", "Taylor", "Scott", "Mitchell", "Walker", "Fraser", "Ross"],
  },
  MY: {
    first: ["Adam", "Haziq", "Irfan", "Syafiq", "Faiz", "Amir", "Hakim", "Danial", "Arif", "Luqman", "Aiman", "Hafiz", "Rizal", "Azman", "Farhan"],
    last: ["Abdullah", "Rahman", "Hassan", "Ismail", "Yusof", "Ahmad", "Ibrahim", "Osman", "Salleh", "Hamid", "Zainal", "Karim", "Latif", "Majid", "Nasir"],
  },
  ID: {
    first: ["Bambang", "Agus", "Eko", "Budi", "Hendra", "Dedi", "Rizky", "Fajar", "Dimas", "Bayu", "Adit", "Reza", "Yoga", "Arief", "Doni"],
    last: ["Santoso", "Wijaya", "Kusuma", "Pratama", "Nugroho", "Saputra", "Setiawan", "Hidayat", "Permana", "Susanto", "Utama", "Putra", "Mahendra", "Gunawan", "Surya"],
  },
  VN: {
    first: ["Minh", "Hoang", "Duc", "Tuan", "Khanh", "Hieu", "Phuc", "Quang", "Thanh", "Long", "Dat", "Khoa", "Hung", "Nam", "Son"],
    last: ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Phan", "Vu", "Vo", "Dang", "Bui", "Do", "Ngo", "Duong", "Ly", "Truong"],
  },
};

const THAI_SCRIPT = /[\u0E00-\u0E7F]/;

const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function getNationality(id) {
  return NATIONALITIES[id] || null;
}

export function formatNationality(id, lang = "th") {
  const n = getNationality(id);
  if (!n) return id || "—";
  return lang === "en" ? n.nameEn : n.nameTh;
}

export function pickNationality(leagueId = "thailand") {
  const weights = LEAGUE_NAT_WEIGHTS[leagueId] || LEAGUE_NAT_WEIGHTS.thailand;
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [nat, w] of entries) {
    r -= w;
    if (r <= 0) return nat;
  }
  return entries[0][0];
}

/** Legend-club squads use master league nationality mix; provincial clubs → Thailand-weighted */
export function pickNationalityForTeam(teamId, teams, legendLeagueId = "thailand") {
  const team = teams?.find((t) => t.id === teamId);
  if (team?.legendTeamKey) return pickNationality(legendLeagueId);
  if (teamId === "scout_find" || teamId === "prospect") return pickNationality(legendLeagueId);
  return pickNationality("thailand");
}

export function genPlayerName(nationalityId) {
  const pool = NAME_POOLS[nationalityId] || NAME_POOLS.EN;
  return `${choice(pool.first)} ${choice(pool.last)}`;
}

export function hasThaiScript(text) {
  return THAI_SCRIPT.test(text || "");
}

/** Assign nationality + Latin name if missing or still Thai script */
export function ensurePlayerNationality(p, context = {}) {
  const { teams, leagueId = "thailand", legendDef } = context;
  if (!p) return p;
  if (!p.nationality) {
    if (legendDef?.nationality) p.nationality = legendDef.nationality;
    else if (p.legendLeagueId) p.nationality = pickNationality(p.legendLeagueId);
    else p.nationality = pickNationalityForTeam(p.teamId, teams, leagueId);
  }
  if (!p.name || hasThaiScript(p.name)) {
    if (legendDef?.name) p.name = legendDef.name;
    else if (p.isLegend && p.legendId && context.getLegendName) {
      const legName = context.getLegendName(p.legendId);
      if (legName) p.name = legName;
      else p.name = genPlayerName(p.nationality);
    } else {
      p.name = genPlayerName(p.nationality);
    }
  }
  return p;
}

/** Display-time fallback when save predates nationality field */
export function resolvePlayerNationality(p, teams, leagueId = "thailand") {
  if (p?.nationality && getNationality(p.nationality)) return p.nationality;
  return pickNationalityForTeam(p?.teamId, teams, leagueId);
}
