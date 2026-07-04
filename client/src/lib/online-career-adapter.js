/** แปลงข้อมูลจาก game API → รูป career ที่ LiveMatchModal ใช้ได้ */
export function buildOnlineCareer({ userClubId, homeClub, awayClub, liveMatch, day }) {
  const toTeam = (c) => ({
    id: c.id,
    name: c.name,
    short: c.shortCode || c.short,
    color: c.primaryColor || c.color,
    primaryColor: c.primaryColor || c.color,
    secondaryColor: c.secondaryColor || "#f2f0e6",
    shirtColor: c.shirtColor || c.primaryColor,
    shortsColor: c.shortsColor || "#0b2318",
    formation: c.formation || "4-4-2",
    autoMode: c.autoMode !== false,
    manager: c.manager || null,
    chemistry: c.chemistry ?? 50,
  });

  return {
    userTeamId: userClubId,
    day: day ?? liveMatch?.day ?? 1,
    teams: [toTeam(homeClub), toTeam(awayClub)],
    players: [...(homeClub.players || []), ...(awayClub.players || [])],
    lineups: {
      [homeClub.id]: liveMatch.homeXI,
      [awayClub.id]: liveMatch.awayXI,
    },
    matchPrep: {
      mentality: "balanced",
      instructions: [],
      defLine: "normal",
      pressing: "medium",
      markPlayerId: null,
      teamTalk: null,
    },
  };
}
