// 다꾸 최저가 확인: 쿠팡 파트너스 검색 API 중계 (Supabase Edge Function)
// 키는 Supabase 대시보드 > Edge Functions > Secrets 의 COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 에만 둔다.
// 같은 검색어는 12시간 동안 price_cache 테이블에 저장해 두고 다시 쓴다(쿠팡 호출 횟수 절약).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const AK = Deno.env.get("COUPANG_ACCESS_KEY") ?? "";
const SK = Deno.env.get("COUPANG_SECRET_KEY") ?? "";
const HOST = "https://api-gateway.coupang.com";
const PATH = "/v2/providers/affiliate_open_api/apis/openapi/products/search";
const CORS = {
  "Access-Control-Allow-Origin": "https://www.dagguu.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

async function sign(msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SK), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function signedDate() {
  const d = new Date(), p = (n: number) => String(n).padStart(2, "0");
  return `${String(d.getUTCFullYear()).slice(2)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let q = "";
  try { q = String((await req.json()).q ?? "").trim().replace(/\s+/g, " ").slice(0, 60); } catch { /* */ }
  if (q.length < 2) return json({ error: "검색어를 2글자 이상 넣어 주세요" }, 400);
  if (!AK || !SK) return json({ error: "쿠팡 키가 아직 설정되지 않았어요" }, 503);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const key = q.toLowerCase();
  const { data: hit } = await db.from("price_cache").select("data,updated_at").eq("q", key).maybeSingle();
  if (hit && Date.now() - Date.parse(hit.updated_at) < 12 * 3600 * 1000) return json({ q, cached: true, items: hit.data });

  const query = `keyword=${encodeURIComponent(q)}&limit=10&subId=dagguu_price`;
  const dt = signedDate();
  const sig = await sign(dt + "GET" + PATH + query);
  const r = await fetch(`${HOST}${PATH}?${query}`, { headers: { Authorization: `CEA algorithm=HmacSHA256, access-key=${AK}, signed-date=${dt}, signature=${sig}` } });
  if (!r.ok) {
    if (hit) return json({ q, cached: true, stale: true, items: hit.data });
    return json({ error: `쿠팡 응답 오류 (${r.status})` }, 502);
  }
  const out = await r.json();
  const items = ((out?.data?.productData) ?? []).map((i: Record<string, unknown>) => ({
    name: i.productName, price: i.productPrice, img: i.productImage, rocket: !!i.isRocket, free: !!i.isFreeShipping, url: i.productUrl,
  }));
  await db.from("price_cache").upsert({ q: key, data: items, updated_at: new Date().toISOString() });
  return json({ q, cached: false, items });
});
