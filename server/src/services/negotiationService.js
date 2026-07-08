/**
 * เสนอซื้อนักเตะตรงจากทีมอื่น (สไตล์ Top Eleven "Negotiations") — คนละระบบกับ TransferListing/Bid
 * (ประมูลของที่ประกาศขาย) เพราะอันนี้เสนอได้แม้เจ้าของไม่ได้ประกาศขายนักเตะคนนั้นเลย
 *
 * เปิดเจรจา/เสนอ/ต่อรอง/ตกลงได้ตลอดทั้งวัน (8:00-20:00 เล่นแมทอยู่ก็ทำได้) — แต่การย้ายทีมจริง
 * (โอนเงิน+เปลี่ยนสังกัด) จะ "ค้าง" ไว้เป็นสถานะ accepted_pending แล้วรันพร้อมกันทีเดียวตอนวันปิด
 * (เรียกจาก startNewSeason ใน gameService.js ซึ่งทำงานตอนจบรอบสุดท้ายของวัน ~20:00 พอดี)
 * กันดีลย้ายทีมไปกวนสควอด/XI ระหว่างที่ระบบแมทอัตโนมัติกำลังล็อกทีมแข่งอยู่
 */
import { prisma } from "../db.js";

const OFFER_TTL_MS = 8 * 60 * 60 * 1000; // 8 ชม. — พอสำหรับเจรจาข้ามช่วงกลางวันไปถึงตอนตลาดปิดดีล

async function getClubOrThrow(userId) {
  const club = await prisma.club.findFirst({ where: { userId } });
  if (!club) throw new Error("ไม่พบสโมสร");
  return club;
}

function serializeOffer(offer, playersById, clubsById) {
  const player = playersById[offer.playerId];
  return {
    id: offer.id,
    status: offer.status,
    round: offer.round,
    feeOffer: offer.feeOffer,
    wageOffer: offer.wageOffer,
    counterFee: offer.counterFee,
    counterWage: offer.counterWage,
    expiresAt: offer.expiresAt,
    createdAt: offer.createdAt,
    player: player ? { id: player.id, name: player.name, position: player.position, rating: player.rating, age: player.age } : null,
    fromClub: clubsById[offer.fromClubId] ? { id: offer.fromClubId, name: clubsById[offer.fromClubId].name, shortCode: clubsById[offer.fromClubId].shortCode } : null,
    toClub: clubsById[offer.toClubId] ? { id: offer.toClubId, name: clubsById[offer.toClubId].name, shortCode: clubsById[offer.toClubId].shortCode } : null,
  };
}

/** เสนอซื้อนักเตะของทีมอื่น — เสนอได้ตลอดวัน ยังไม่หักเงินตอนนี้ (หักตอนย้ายทีมจริงตอนปิดวัน) */
export async function sendPlayerOffer(userId, { playerId, feeOffer, wageOffer }) {
  if (!(feeOffer > 0) || !(wageOffer > 0)) throw new Error("ต้องระบุค่าตัวและค่าเหนื่อยที่เสนอ");

  const fromClub = await getClubOrThrow(userId);
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new Error("ไม่พบนักเตะ");
  if (player.isLegend) throw new Error("นักเตะ Legend เสนอซื้อไม่ได้");
  if (player.clubId === fromClub.id) throw new Error("นี่คือนักเตะทีมคุณเองอยู่แล้ว");

  const toClub = await prisma.club.findUnique({ where: { id: player.clubId } });
  if (!toClub || toClub.shardId !== fromClub.shardId) throw new Error("นักเตะอยู่คนละชาร์ด เสนอซื้อไม่ได้");

  // กันงบไม่พอ "ตอนกดรับ" ล่วงหน้า — ต้องมีงบพอ ณ ตอนเสนอ (ราคาอาจเปลี่ยนได้ถ้าโดนต่อรอง แต่เช็คซ้ำอีกทีตอนรับ)
  if (fromClub.budget < feeOffer) throw new Error("งบไม่พอสำหรับราคาที่เสนอ");

  // ห้ามมี offer pending ซ้ำจากทีมเดียวกันไปยังนักเตะคนเดียวกัน
  const existing = await prisma.playerOffer.findFirst({
    where: { playerId, fromClubId: fromClub.id, status: { in: ["pending", "countered"] } },
  });
  if (existing) throw new Error("มีข้อเสนอค้างอยู่กับนักเตะคนนี้แล้ว รอทีมเจ้าของตอบก่อน");

  const offer = await prisma.playerOffer.create({
    data: {
      shardId: fromClub.shardId,
      playerId,
      fromClubId: fromClub.id,
      toClubId: toClub.id,
      feeOffer,
      wageOffer,
      expiresAt: new Date(Date.now() + OFFER_TTL_MS),
    },
  });
  return { offer };
}

/** รายการข้อเสนอทั้งหมดที่เกี่ยวกับทีมของฉัน (ส่งเอง + ได้รับ) */
export async function getMyOffers(userId) {
  const club = await getClubOrThrow(userId);
  await expireStaleOffers(club.shardId);

  const offers = await prisma.playerOffer.findMany({
    where: {
      shardId: club.shardId,
      OR: [{ fromClubId: club.id }, { toClubId: club.id }],
      // ไม่โชว์ของที่จบเรื่องแล้ว (accepted/rejected/expired/cancelled) — เหลือแค่ที่ยังต้องทำอะไรต่อ
      // หรือรอปิดดีลตอน 20:00 (accepted_pending)
      status: { in: ["pending", "countered", "accepted_pending"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  if (!offers.length) return { sent: [], received: [] };

  const playerIds = [...new Set(offers.map((o) => o.playerId))];
  const clubIds = [...new Set(offers.flatMap((o) => [o.fromClubId, o.toClubId]))];
  const [players, clubs] = await Promise.all([
    prisma.player.findMany({ where: { id: { in: playerIds } } }),
    prisma.club.findMany({ where: { id: { in: clubIds } } }),
  ]);
  const playersById = Object.fromEntries(players.map((p) => [p.id, p]));
  const clubsById = Object.fromEntries(clubs.map((c) => [c.id, c]));

  const serialized = offers.map((o) => serializeOffer(o, playersById, clubsById));
  return {
    sent: serialized.filter((o) => o.fromClub?.id === club.id),
    received: serialized.filter((o) => o.toClub?.id === club.id),
  };
}

/** ตอบรับ/ปฏิเสธ/ต่อรองข้อเสนอ — เฉพาะทีมที่ถูกเสนอ (toClub) เท่านั้นที่ตอบได้ */
export async function respondToOffer(userId, offerId, { action, counterFee, counterWage } = {}) {
  const club = await getClubOrThrow(userId);
  const offer = await prisma.playerOffer.findUnique({ where: { id: offerId } });
  if (!offer || offer.shardId !== club.shardId) throw new Error("ไม่พบข้อเสนอ");
  if (offer.toClubId !== club.id) throw new Error("ไม่ใช่ข้อเสนอที่ส่งถึงทีมคุณ");
  if (offer.status !== "pending" && offer.status !== "countered") throw new Error("ข้อเสนอนี้ตอบสนองไปแล้วหรือหมดอายุแล้ว");
  if (offer.expiresAt < new Date()) {
    await prisma.playerOffer.update({ where: { id: offer.id }, data: { status: "expired" } });
    throw new Error("ข้อเสนอหมดอายุแล้ว");
  }

  if (action === "reject") {
    await prisma.playerOffer.update({ where: { id: offer.id }, data: { status: "rejected", respondedAt: new Date() } });
    return { status: "rejected" };
  }

  if (action === "counter") {
    if (!(counterFee > 0) || !(counterWage > 0)) throw new Error("ต้องระบุค่าตัวและค่าเหนื่อยที่ต่อรอง");
    await prisma.playerOffer.update({
      where: { id: offer.id },
      data: {
        status: "countered", counterFee, counterWage, round: offer.round + 1,
        respondedAt: new Date(), expiresAt: new Date(Date.now() + OFFER_TTL_MS),
      },
    });
    return { status: "countered" };
  }

  if (action === "accept") {
    // ตกลงดีลได้ทันทีไม่ว่ากี่โมง แต่ "ย้ายทีมจริง" (โอนเงิน+เปลี่ยนสังกัด) รอไปทำพร้อมกันตอนปิดวัน
    // (executeAcceptedTransfers เรียกจาก startNewSeason) — กันย้ายทีมกลางที่ระบบแมทอัตโนมัติล็อก XI อยู่
    const finalFee = offer.status === "countered" ? offer.counterFee : offer.feeOffer;
    const finalWage = offer.status === "countered" ? offer.counterWage : offer.wageOffer;

    const [fromClub, player] = await Promise.all([
      prisma.club.findUnique({ where: { id: offer.fromClubId } }),
      prisma.player.findUnique({ where: { id: offer.playerId } }),
    ]);
    if (!fromClub) throw new Error("ทีมผู้เสนอไม่พบแล้ว");
    if (!player || player.clubId !== club.id) throw new Error("นักเตะไม่ได้อยู่กับทีมคุณแล้ว");
    if (fromClub.budget < finalFee) {
      await prisma.playerOffer.update({ where: { id: offer.id }, data: { status: "rejected", respondedAt: new Date() } });
      throw new Error("ทีมผู้เสนอมีงบไม่พอแล้ว ณ ตอนนี้ — ข้อเสนอถูกยกเลิกอัตโนมัติ");
    }

    await prisma.$transaction([
      prisma.playerOffer.update({ where: { id: offer.id }, data: { status: "accepted_pending", respondedAt: new Date() } }),
      // ข้อเสนออื่นที่ค้างอยู่กับนักเตะคนนี้ (จากทีมอื่น) ต้องยกเลิกไปด้วย เพราะตกลงย้ายแล้ว
      prisma.playerOffer.updateMany({
        where: { playerId: player.id, status: { in: ["pending", "countered"] }, id: { not: offer.id } },
        data: { status: "expired" },
      }),
    ]);
    return { status: "accepted_pending", fee: finalFee, wage: finalWage };
  }

  throw new Error("action ต้องเป็น accept, reject หรือ counter");
}

/** ปิดดีลที่ตกลงกันไว้ระหว่างวันจริง (โอนเงิน+เปลี่ยนสังกัด) — เรียกครั้งเดียวตอนวันปิด ~20:00
 * (เช็คงบ/ความเป็นเจ้าของซ้ำตอนนี้อีกที เผื่อเปลี่ยนไปแล้วระหว่างวันจากดีลอื่น) */
export async function executeAcceptedTransfers(shardId) {
  const offers = await prisma.playerOffer.findMany({ where: { shardId, status: "accepted_pending" } });
  let executed = 0;
  for (const offer of offers) {
    const finalFee = offer.counterFee ?? offer.feeOffer;
    const finalWage = offer.counterWage ?? offer.wageOffer;
    const [fromClub, player] = await Promise.all([
      prisma.club.findUnique({ where: { id: offer.fromClubId } }),
      prisma.player.findUnique({ where: { id: offer.playerId } }),
    ]);
    if (!fromClub || !player || player.clubId !== offer.toClubId || fromClub.budget < finalFee) {
      await prisma.playerOffer.update({ where: { id: offer.id }, data: { status: "expired" } });
      continue;
    }
    await prisma.$transaction([
      prisma.club.update({ where: { id: fromClub.id }, data: { budget: { decrement: finalFee } } }),
      prisma.club.update({ where: { id: offer.toClubId }, data: { budget: { increment: finalFee } } }),
      prisma.player.update({ where: { id: player.id }, data: { clubId: fromClub.id, wage: finalWage } }),
      prisma.playerOffer.update({ where: { id: offer.id }, data: { status: "accepted" } }),
    ]);
    executed += 1;
  }
  return { executed };
}

/** ยกเลิกข้อเสนอที่ทีมตัวเองส่งไป (ยังไม่มีใครตอบ) */
export async function cancelOffer(userId, offerId) {
  const club = await getClubOrThrow(userId);
  const offer = await prisma.playerOffer.findUnique({ where: { id: offerId } });
  if (!offer || offer.shardId !== club.shardId) throw new Error("ไม่พบข้อเสนอ");
  if (offer.fromClubId !== club.id) throw new Error("ไม่ใช่ข้อเสนอของทีมคุณ");
  if (offer.status !== "pending" && offer.status !== "countered") throw new Error("ยกเลิกไม่ได้แล้ว");
  await prisma.playerOffer.update({ where: { id: offer.id }, data: { status: "cancelled", respondedAt: new Date() } });
  return { status: "cancelled" };
}

export async function expireStaleOffers(shardId) {
  await prisma.playerOffer.updateMany({
    where: { shardId, status: { in: ["pending", "countered"] }, expiresAt: { lt: new Date() } },
    data: { status: "expired" },
  });
}
