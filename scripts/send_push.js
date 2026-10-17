// 다꾸체험단 웹 푸시 보내기 (GitHub Actions push.yml 에서 실행)
// node scripts/send_push.js morning|noon|evening
// 필요한 Secrets: SUPABASE_SERVICE_KEY(service_role), VAPID_PRIVATE_KEY. 공개 키·Supabase 주소는 data.json(push.vapid, auth.url).
const fs = require('fs'), path = require('path'), webpush = require('web-push');
const slot = process.argv[2] || 'morning';
const d = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data.json'), 'utf8'));
const SITE = 'https://www.dagguu.com/';
const KEY = process.env.SUPABASE_SERVICE_KEY, PRIV = process.env.VAPID_PRIVATE_KEY;
const PUB = (d.push || {}).vapid, URL0 = (d.auth || {}).url;
if (!KEY || !PRIV || !PUB || !URL0) { console.log('알림 키·주소가 아직 없어서 건너뜀'); process.exit(0); }
const now = new Date(Date.now() + 9 * 3600e3), today = now.toISOString().slice(0, 10);
const kday = ms => new Date(ms + 9 * 3600e3).toISOString().slice(0, 10);
const items = (d.items || []).filter(i => !i.closed && (i.viewUrl || i.applyUrl));
const CATN = { stay: '숙박', baby: '육아', life: '생활', beauty: '뷰티', elec: '가전/가구', health: '식품', pet: '반려동물' };
function count(list) { const c = {}; list.forEach(i => { const k = CATN[i.cat || 'stay'] || '기타'; c[k] = (c[k] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · '); }
// 알림 문구(2026-10-17 시온님이 보여준 참고 알림: 구체적인 상품 1개 + [분류] + 금액, 쇼핑 특가는 (광고) 표시)
function val(i) { // 금액(원) 추정: worth "N만원" → cpPrice → 제공내역 속 N원/N만원
  const w = String(i.worth || '').replace(/,/g, ''); let m = w.match(/(\d+(?:\.\d+)?)/);
  if (m) return parseFloat(m[1]) * (/만/.test(w) ? 10000 : 1);
  if (i.cpPrice) return +i.cpPrice;
  let v = 0; for (const x of String(i.benefit || '').matchAll(/(\d{1,3}(?:,\d{3})+|\d+)\s*(만\s*)?원/g)) v = Math.max(v, parseInt(x[1].replace(/,/g, ''), 10) * (x[2] ? 10000 : 1));
  return v;
}
const won = v => v >= 10000 ? `${Math.round(v / 1000) / 10}만원 상당`.replace('.0만', '만') : v ? `${v.toLocaleString()}원 상당` : '';
const nm = i => (i.name || '').replace(/\s*\(([^)]*)\)$/, (a, b) => ` (${b})`).slice(0, 34);
const line = i => `[${CATN[i.cat || 'stay'] || '기타'}] ${nm(i)}${won(val(i)) ? ' · ' + won(val(i)) : ''}`;
const best = L => L.slice().sort((a, b) => val(b) - val(a));
const UNSUB = ''; // 2026-10-17 시온님 요청으로 알림 본문의 수신거부 문구는 뺌(끄기는 마이 다꾸에서)
let msg = null, NEW = [];
if (slot === 'morning') {
  const L = items.filter(i => (i.end || '9999') >= today && (i.start === today || (i.createdAt && kday(i.createdAt) === today)));
  NEW = L;
  if (L.length) msg = { title: `✨ 오늘 오픈 체험단 ${L.length}곳`, body: `${line(best(L)[0])}`, url: SITE + '#/list?s=todayOpen', tag: 'morning' };
} else if (slot === 'noon') {
  const live = x => x && x.u && !(x.endAt && Date.parse(x.endAt) <= Date.now());
  const G = (d.goldbox || []).filter(live), T = (d.toss || []).filter(x => live(x) && !x.soldOut), B = (d.babyDeals || []).filter(x => live(x));
  const all = G.concat(T, B); const pct = x => parseInt(String(x.rate || '0'), 10) || 0;
  const top = all.slice().sort((a, b) => pct(b) - pct(a))[0];
  if (all.length) { const t = top && pct(top) ? top : all.slice().sort((a, b) => (parseInt(String(a.price).replace(/\D/g, '')) || 1e9) - (parseInt(String(b.price).replace(/\D/g, '')) || 1e9))[0];
    msg = { title: pct(t) ? `🔥 오늘만 ${pct(t)}% 특가` : '🔥 오늘만 특가', body: `(광고) ${String(t.name).slice(0, 40)}${t.price ? ` (${t.price})` : ''}`, url: SITE + '#/deals', tag: 'noon', image: t.img || '' }; }
} else if (slot === 'test') {
  msg = { title: '🔔 다꾸체험단 알림 테스트', body: '알림이 잘 와요! 아침·점심·저녁에 체험단 소식을 보내드릴게요.', url: SITE, tag: 'test' };
} else if (slot === 'match' || slot === 'night') {
  // 등록 뒤 새로 올라온 것: 관심 지역·단어에 맞으면 맞춤 알림, 아니면 30만원 이상 고가 체험단 알림
  // match(오후 3:07) = 오늘 8:37~지금, night(저녁 7:37) = 오후 3:07~지금 (아침 알림·앞 알림과 겹치지 않게)
  const since = Date.parse(today + (slot === 'match' ? 'T08:37:00+09:00' : 'T15:07:00+09:00'));
  NEW = items.filter(i => (i.end || '9999') >= today && i.createdAt && i.createdAt >= since);
  if (NEW.length) msg = { title: '', body: '', url: SITE, tag: slot, personalOnly: true };
} else if (slot === 'hotdeal') {
  // 오전 9:37 오늘의 아기용품 핫딜(쿠팡 골드박스, 07:23 갱신) — 할인율 가장 큰 것
  const live = x => x && x.u && !(x.endAt && Date.parse(x.endAt) <= Date.now());
  const B = (d.babyDeals || []).filter(live), pct = x => parseInt(String(x.rate || '0'), 10) || 0;
  const t = B.slice().sort((a, b) => pct(b) - pct(a))[0];
  if (t) msg = { title: `👶 오늘의 아기용품 핫딜${pct(t) ? ` ${pct(t)}%` : ''}`, body: `(광고) ${String(t.name).slice(0, 40)}${t.price ? ` (${t.price})` : ''}${B.length > 1 ? ` 외 ${B.length - 1}개` : ''}`, url: SITE + '#/deals', tag: 'hotdeal', image: (t.img || '').replace('230x230ex', '492x492ex') };
} else if (slot === 'toss') {
  // 저녁 8:07 토스 하루특가 마감 4시간 전 (오늘 갱신된 것만)
  const T = String(d.tossUpdated || '').slice(0, 10) === today ? (d.toss || []).filter(x => x.u && !x.soldOut && !(x.endAt && Date.parse(x.endAt) <= Date.now())) : [];
  const pct = x => parseInt(String(x.rate || '0'), 10) || 0, t = T.slice().sort((a, b) => pct(b) - pct(a))[0];
  if (t) msg = { title: `⏳ 하루특가 마감 4시간 전${pct(t) ? ` · ${pct(t)}%` : ''}`, body: `(광고) ${String(t.name).slice(0, 40)}${t.price ? ` (${t.price})` : ''}`, url: SITE + '#/deals', tag: 'toss', image: t.img || '' };
} else if (slot === 'evening') {
  const L = items.filter(i => i.end === today);
  if (L.length) msg = { title: `⏰ 오늘 마감 체험단 ${L.length}곳`, body: `${line(best(L)[0])}`, url: SITE + '#/list?s=todayClose', tag: 'evening' };
}
if (!msg) { console.log(`${slot}: 보낼 내용이 없어서 건너뜀`); process.exit(0); }
const fail = m => { console.log('::error::' + m); process.exit(1); };
try { webpush.setVapidDetails('mailto:eun901002@gmail.com', PUB, PRIV.trim()); } catch (e) { fail('VAPID 키 오류(비밀 키를 다시 확인): ' + e.message); }
// 사람별 관심 지역·단어에 맞는 새 체험단
function matchOf(s) {
  const regs = s.regions || [], words = (s.words || []).map(w => w.toLowerCase());
  if (!regs.length && !words.length) return [];
  return NEW.filter(i => (i.region && regs.includes(i.region)) || words.some(w => ((i.name || '') + ' ' + (i.benefit || '')).toLowerCase().includes(w)));
}
const short = M => M.slice(0, 2).map(i => i.name.replace(/\s*\(.*\)$/, '')).join(', ') + (M.length > 2 ? ` 외 ${M.length - 2}곳` : '');
function whyOf(s, M) { return [...new Set(M.map(i => (s.regions || []).includes(i.region) ? i.region : (s.words || []).find(w => ((i.name || '') + ' ' + (i.benefit || '')).toLowerCase().includes(w.toLowerCase()))).filter(Boolean))].slice(0, 2).join('·'); }
function personal(s) {
  const M = matchOf(s);
  if (msg.personalOnly) {
    if (!M.length) { // 관심 맞는 게 없으면 고가(30만원 이상) 새 체험단 1곳
      const H = best(NEW).filter(i => val(i) >= 300000);
      if (!H.length) return null;
      return { title: `💎 새로 올라온 고가 체험단${H.length > 1 ? ` ${H.length}곳` : ''}`, body: line(H[0]), url: SITE + '#/item?id=' + encodeURIComponent(H[0].id), tag: slot };
    }
    const why = whyOf(s, M);
    return { title: `🔍 새로 올라온 ${why ? why + ' ' : '관심 '}체험단 ${M.length}곳`, body: `${line(best(M)[0])}`,
      url: M.length === 1 ? SITE + '#/item?id=' + encodeURIComponent(M[0].id) : SITE + '#/list?s=todayOpen', tag: 'match' };
  }
  if (slot === 'morning' && M.length) return { ...msg, title: `✨ 오늘 오픈 ${whyOf(s, M) || '관심'} 체험단 ${M.length}곳`, url: M.length === 1 ? SITE + '#/item?id=' + encodeURIComponent(M[0].id) : msg.url, body: `${line(best(M)[0])}` };
  return msg;
}
// 새 형식 키(sb_secret_…)는 apikey 헤더만, 예전 JWT(service_role)는 Authorization 도 같이
const K2 = KEY.trim(), H = K2.startsWith('sb_') ? { apikey: K2 } : { apikey: K2, Authorization: 'Bearer ' + K2 };
if (!K2.startsWith('sb_secret_') && !K2.startsWith('eyJ')) console.log('::warning::SUPABASE_SERVICE_KEY 모양이 sb_secret_ 나 eyJ 로 시작하지 않아요(공개 키를 넣었을 수 있음)');
(async () => {
  let r = await fetch(URL0 + '/rest/v1/push_subs?select=endpoint,p256dh,auth,regions,words', { headers: H });
  if (r.status === 400) r = await fetch(URL0 + '/rest/v1/push_subs?select=endpoint,p256dh,auth', { headers: H }); // 관심 칸 SQL 전
  if (!r.ok) fail('구독 목록을 못 읽음 ' + r.status + ' ' + (await r.text()).slice(0, 150));
  const subs = await r.json(); let ok = 0, gone = 0, nfail = 0;
  let skip = 0;
  for (const s of subs) {
    const m = { ...personal(s) };
    if (!m.title) { skip++; continue; }
    // 모든 알림 본문 앞에 (광고), 끝에 수신거부 안내 (2026-10-17 시온님 요청)
  if (slot !== 'test') m.body = (m.body.startsWith('(광고)') ? m.body : '(광고) ' + m.body) + (m.body.includes('수신거부') ? '' : UNSUB);
  const payload = JSON.stringify({ ...m, tag: (m.tag || slot) + '-' + Date.now(), icon: SITE + 'icons/icon-192.png' });
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 3600, urgency: 'normal' }); ok++; }
    catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410 || /VapidPkHashMismatch/.test(String(e.body || ''))) { gone++; await fetch(URL0 + '/rest/v1/push_subs?endpoint=eq.' + encodeURIComponent(s.endpoint), { method: 'DELETE', headers: H }); }
      else { nfail++; console.log('::warning::보내기 실패', e.statusCode || '', String(e.body || e.message).slice(0, 120)); }
    }
  }
  console.log(`::notice::${slot}: "${msg.title || "관심 알림"}" 구독 ${subs.length}명 중 성공 ${ok}, 해지 정리 ${gone}, 실패 ${nfail}, 맞는 게 없어 건너뜀 ${skip}`);
})().catch(e => fail('보내기 중 오류: ' + e.message));
