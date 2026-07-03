// Cloudflare Pages Function — รับ heartbeat จากเกม (ไม่ระบุตัวตน) เก็บไว้ใน Cloudflare KV
// key = hb:<sessionId>, ตั้ง expirationTtl 180 วิ (3 นาที) — ถ้าไม่ heartbeat ซ้ำใน 3 นาที
// KV จะลบทิ้งอัตโนมัติ ทำให้ online-count.js นับได้แค่คนที่ "ยังเปิดเกมค้างอยู่จริง" เท่านั้น
// ต้องตั้งค่า KV Namespace binding ชื่อ ONLINE_KV ใน Cloudflare Pages dashboard ก่อนใช้งานได้จริง
export async function onRequestPost(context) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const sessionId = body?.sessionId;
    if (!sessionId || typeof sessionId !== "string" || sessionId.length > 64) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    if (!context.env.ONLINE_KV) {
      return new Response(JSON.stringify({ ok: false, error: "no_kv_binding" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    await context.env.ONLINE_KV.put(`hb:${sessionId}`, "1", { expirationTtl: 180 });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
}
