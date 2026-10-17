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
let msg = null, NEW = [];
if (slot === 'morning') {
  const L = items.filter(i => (i.end || '9999') >= today && (i.start === today || (i.createdAt && kday(i.createdAt) === today)));
  NEW = L;
  if (L.length) msg = { title: `✨ 오늘 오픈 체험단 ${L.length}곳`, body: `${count(L)}\n지금 바로 신청해 보세요!`, url: SITE + '#/list?s=todayOpen', tag: 'morning' };
} else if (slot === 'noon') {
  const live = x => x && x.u && !(x.endAt && Date.parse(x.endAt) <= Date.now());
  const G = (d.goldbox || []).filter(live), T = (d.toss || []).filter(x => live(x) && !x.soldOut), B = (d.babyDeals || []).filter(x => live(x));
  const all = G.concat(T, B); const pct = x => parseInt(String(x.rate || '0'), 10) || 0;
  const top = all.slice().sort((a, b) => pct(b) - pct(a))[0];
  if (all.length) msg = { title: '🔥 오늘의 특가', body: top && pct(top) ? `${top.name.slice(0, 28)} ${pct(top)}% 할인 외 ${all.length - 1}개\n오늘만 이 가격이에요!` : `오늘만 열리는 특가 ${all.length}개가 모였어요!`, url: SITE + '#/deals', tag: 'noon' };
} else if (slot === 'match') {
  // 오후 등록 뒤: 오늘 9시 이후 새로 올라온 것 중 관심 지역·단어에 맞는 것만 사람별로
  const since = Date.parse(today + 'T09:00:00+09:00');
  NEW = items.filter(i => (i.end || '9999') >= today && i.createdAt && i.createdAt >= since);
  if (NEW.length) msg = { title: '', body: '', url: SITE, tag: 'match', personalOnly: true };
} else if (slot === 'evening') {
  const L = items.filter(i => i.end === today);
  if (L.length) msg = { title: `⏰ 오늘 마감!! ${L.length}곳`, body: `${count(L)}\n오늘 밤 12시 전에 신청하세요!`, url: SITE + '#/list?s=todayClose', tag: 'evening' };
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
function personal(s) {
  const M = matchOf(s);
  if (msg.personalOnly) {
    if (!M.length) return null;
    return { title: `🔍 관심 체험단이 새로 올라왔어요 ${M.length}곳`, body: `${short(M)}\n마감 전에 확인해 보세요!`,
      url: M.length === 1 ? SITE + '#/item?id=' + encodeURIComponent(M[0].id) : SITE + '#/list?s=todayOpen', tag: 'match' };
  }
  if (slot === 'morning' && M.length) return { ...msg, body: `🔍 관심 ${M.length}곳: ${short(M)}\n${count(NEW)}` };
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
    const m = personal(s);
    if (!m) { skip++; continue; }
    const payload = JSON.stringify({ ...m, icon: SITE + 'icons/icon-192.png' });
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 3600, urgency: 'normal' }); ok++; }
    catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410 || /VapidPkHashMismatch/.test(String(e.body || ''))) { gone++; await fetch(URL0 + '/rest/v1/push_subs?endpoint=eq.' + encodeURIComponent(s.endpoint), { method: 'DELETE', headers: H }); }
      else { nfail++; console.log('::warning::보내기 실패', e.statusCode || '', String(e.body || e.message).slice(0, 120)); }
    }
  }
  console.log(`::notice::${slot}: "${msg.title || "관심 알림"}" 구독 ${subs.length}명 중 성공 ${ok}, 해지 정리 ${gone}, 실패 ${nfail}, 맞는 게 없어 건너뜀 ${skip}`);
})().catch(e => fail('보내기 중 오류: ' + e.message));
