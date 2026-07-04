import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";
import {
  sendPlayerOffer,
  getMyOffers,
  respondToOffer,
  cancelOffer,
} from "../services/negotiationService.js";

const router = Router();

const offerLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "ส่งคำขอถี่เกินไป กรุณาลองใหม่ภายหลัง" },
});

/* ข้อเสนอทั้งหมดที่เกี่ยวกับทีมฉัน (ส่งเอง + ได้รับ) */
router.get("/", requireAuth, async (req, res) => {
  try {
    res.json(await getMyOffers(req.user.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* เสนอซื้อนักเตะทีมอื่นตรงๆ: { playerId, feeOffer, wageOffer } */
router.post("/", requireAuth, offerLimiter, async (req, res) => {
  try {
    res.json(await sendPlayerOffer(req.user.id, req.body || {}));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ตอบรับ/ปฏิเสธ/ต่อรอง: { action: "accept"|"reject"|"counter", counterFee?, counterWage? } */
router.post("/:offerId/respond", requireAuth, offerLimiter, async (req, res) => {
  try {
    res.json(await respondToOffer(req.user.id, req.params.offerId, req.body || {}));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ยกเลิกข้อเสนอที่ส่งไปเอง */
router.post("/:offerId/cancel", requireAuth, offerLimiter, async (req, res) => {
  try {
    res.json(await cancelOffer(req.user.id, req.params.offerId));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
