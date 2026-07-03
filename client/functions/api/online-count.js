// Cloudflare Pages Function — นับจำนวนคนออนไลน์ตอนนี้ จาก key hb:* ใน Cloudflare KV
// (เขียนเข้ามาโดย heartbeat.js ทุก 45 วิ, หมดอายุอัตโนมัติใน 180 วิถ้าไม่ heartbeat ซ้ำ)
// ไม่พึ่ง API ภายนอกที่เสียเงิน (เดิมเคยลองใช้ Umami API แต่เป็นฟีเจอร์เสียตังค์) — ฟรี 100%
export async function onRequestGet(context) {
  if (!context.env.ONLINE_KV) {
    return new Response(JSON.stringify({ online: null, error: "no_kv_binding" }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
  try {
    let count = 0;
    let cursor;
    do {
      const res = await context.env.ONLINE_KV.list({ prefix: "hb:", cursor });
      count += res.keys.length;
      cursor = res.list_complete ? undefined : res.cursor;
    } while (cursor);
    return new Response(JSON.stringify({ online: count }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ online: null, error: "kv_failed" }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
}
