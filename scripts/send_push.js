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
const CATN = { stay: '숙박', baby: '육아', life: '생활', beauty: '뷰티', elec: '가전/가구', health: '건강식품', pet: '반려동물', fashion: '패션', etc: '티켓' };
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
const line = i => `[${CATN[i.cat || 'stay'] || '기타'}] ${nm(i)}${won(val(i)) ? ` (${won(val(i))})` : ''}`;
// 특가 본문: 역대급 앱처럼 "상품명, 1개 (990원)" — 이름에 수량이 없을 때만 ", 1개"
const QTY = /\d+\s*(개|매|입|팩|p|P|세트|박스|병|캔|롤|봉|포|정|ea|EA|구|장)(?![가-힣])/;
const deal = t => `${String(t.name).slice(0, 44)}${QTY.test(t.name) ? '' : ', 1개'}${t.price ? ` (${t.price})` : ''}`;
const best = L => L.slice().sort((a, b) => val(b) - val(a));
const UNSUB = ''; // 2026-10-17 시온님 요청으로 알림 본문의 수신거부 문구는 뺌(끄기는 마이 다꾸에서)
// 특가 알림: 할인율 제일 높은 것. 같은 날 앞 시간에 보낸 상품은 빼고 그다음 1위(같은 알림이 하루에 여러 번 가지 않게)
const DLIVE = x => x && x.u && !(x.endAt && Date.parse(x.endAt) <= Date.now()), DPCT = x => parseInt(String(x.rate || '0'), 10) || 0;
const DG = (d.goldbox || []).filter(DLIVE), DT = (d.toss || []).filter(x => DLIVE(x) && !x.soldOut), DB = (d.babyDeals || []).filter(DLIVE);
// 12시 특가는 식품·생필품 먼저 (2026-10-19 쿠팡 리포트: 로켓프레시·식품·생활용품을 가장 많이 삼)
const GROC = /두부|우유|계란|달걀|쌀|라면|김치|과일|사과|귤|바나나|채소|야채|고기|돼지|한우|닭|생수|커피|과자|햄|참치|스팸|즉석|간편|밀키트|휴지|화장지|물티슈|세제|섬유유연제|샴푸|바디워시|치약|칫솔|키친타올|비누|생리대|기저귀/;
const NOONG = DG.concat(DT).filter(x => GROC.test(x.name || ''));
const POOL = { mdeal: DG.concat(DT, DB), hotdeal: DB, noon: NOONG.length ? NOONG : DG.concat(DT, DB), match: DG.concat(DB) };
function pickDeal(sl) { const used = new Set(); let pick = null;
  for (const k of ['mdeal', 'hotdeal', 'noon', 'match']) { const c = POOL[k].filter(x => !used.has(x.u)).sort((a, b) => DPCT(b) - DPCT(a))[0]; if (c) used.add(c.u); if (k === sl) { pick = c; break; } }
  return pick; }
let msg = null, NEW = [];
if (slot === 'morning') {
  const L = items.filter(i => (i.end || '9999') >= today && (i.start === today || (i.createdAt && kday(i.createdAt) === today)));
  NEW = L;
  if (L.length) msg = { title: `✨ 오늘 오픈 체험단 ${L.length}곳`, body: `${line(best(L)[0])}`, url: SITE + '#/list?s=todayOpen', tag: 'morning' };
} else if (slot === 'noon' || slot === 'mdeal') {
  const t = pickDeal(slot);
  if (t) msg = { title: '🔥 오늘만 특가', body: `(광고) ${deal(t)}`, url: SITE + '#/deals', tag: slot, image: t.img || '' };
} else if (slot === 'test') {
  msg = { title: '🔔 다꾸체험단 알림 테스트', body: '알림이 잘 와요! 아침·점심·저녁에 체험단 소식을 보내드릴게요.', url: SITE, tag: 'test' };
} else if (slot === 'match' || slot === 'night') {
  // 등록 뒤 새로 올라온 것: 관심 지역·단어에 맞으면 맞춤 알림, 아니면 30만원 이상 고가 체험단 알림
  // match(오후 3:07) = 오늘 8:37~지금, night(저녁 7:37) = 오후 3:07~지금 (아침 알림·앞 알림과 겹치지 않게)
  const since = Date.parse(today + (slot === 'match' ? 'T08:37:00+09:00' : 'T15:07:00+09:00'));
  NEW = items.filter(i => (i.end || '9999') >= today && i.createdAt && i.createdAt >= since);
  if (slot === 'match') { // 오후 3시는 모두에게 쿠팡 골드박스 "오늘이 제일 싸요!" (할인율 1위) + 관심 키워드 알림은 따로
    const t = pickDeal('match'), pct = DPCT;
    if (t) msg = { title: '⏰ 오늘이 제일 싸요!', body: `(광고) ${deal(t)}`, url: SITE + '#/deals', tag: 'gold', image: t.img || '' };
  }
  if (!msg && NEW.length) msg = { title: '', body: '', url: SITE, tag: slot, personalOnly: true };
} else if (slot === 'hotdeal') {
  const t = pickDeal('hotdeal');
  if (t) msg = { title: '👶 오늘의 아기용품 핫딜', body: `(광고) ${deal(t)}`, url: SITE + '#/deals', tag: 'hotdeal', image: (t.img || '').replace('230x230ex', '492x492ex') };
} else if (slot === 'toss') {
  // 저녁 8:07 토스 하루특가 마감 4시간 전 (오늘 갱신된 것만)
  const T = String(d.tossUpdated || '').slice(0, 10) === today ? (d.toss || []).filter(x => x.u && !x.soldOut && !(x.endAt && Date.parse(x.endAt) <= Date.now())) : [];
  const pct = x => parseInt(String(x.rate || '0'), 10) || 0, t = T.slice().sort((a, b) => pct(b) - pct(a))[0];
  if (t) msg = { title: '⏳ 하루특가 마감 4시간 전', body: `(광고) ${deal(t)}`, url: SITE + '#/deals', tag: 'toss', image: t.img || '' };
} else if (slot === 'evening' || slot === 'evening2') {
  const L = items.filter(i => i.end === today);
  if (L.length) msg = { title: slot === 'evening2' ? `⏰ 오늘 밤 12시 마감 ${L.length}곳` : `⏰ 오늘 마감 체험단 ${L.length}곳`, body: `${line(best(L)[0])}`, url: SITE + '#/list?s=todayClose', tag: 'evening' };
}
if (!msg && (slot === 'noon' || slot === 'evening')) msg = { title: '', body: '', url: SITE, tag: slot, personalOnly: true }; // 찜 마감 알림만 있을 수 있음
if (!msg) { console.log(`${slot}: 보낼 내용이 없어서 건너뜀`); process.exit(0); }
{ const h = now.getUTCHours(); if (slot !== 'test' && (h >= 21 || h < 8)) { console.log(`::notice::${slot}: 밤 9시~아침 8시라 광고 알림을 보내지 않음(예약 실행이 늦어짐)`); process.exit(0); } }
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
// 찜한 체험단 마감 알림(2026-10-17 시온님 요청): 점심 12:07 = 찜한 것 중 내일 마감, 저녁 6:07 = 오늘 마감 — 기본 알림과 따로 한 번 더
const tomorrow = new Date(now.getTime() + 864e5).toISOString().slice(0, 10);
const FAVDAY = { noon: tomorrow, evening: today };
function favMsg(s) {
  const day = FAVDAY[slot], ids = s.favs || [];
  if (!day || !ids.length) return null;
  const F = items.filter(i => ids.includes(i.id) && i.end === day);
  if (!F.length) return null;
  return { title: `❤️ 찜한 체험단 ${day === today ? '오늘' : '내일'} 마감 ${F.length}곳`, body: line(best(F)[0]) + (F.length > 1 ? ` 외 ${F.length - 1}곳` : ''),
    url: F.length === 1 ? SITE + '#/item?id=' + encodeURIComponent(F[0].id) : SITE + '#/fav', tag: 'fav' };
}
// 찜한 숙소·제품의 체험단이 다시 열림(2026-10-18 시온님 요청): 찜 열쇠("k:…")와 같은 숙소·제품의 새 체험단(NEW)이 찜 안 된 새 id 로 올라오면
const favKey = i => { const m = String(i.cpUrl || '').match(/products\/(\d+)/); return i.coupangPid ? String(i.coupangPid) : (m ? m[1] : String(i.name || '').replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+/g, '')); };
function favOpenMsg(s) {
  if (!['morning', 'match', 'night'].includes(slot)) return null;
  const f = s.favs || [], ks = new Set(f.filter(x => x.startsWith('k:')).map(x => x.slice(2)));
  if (!ks.size || !NEW.length) return null;
  const O = NEW.filter(i => !f.includes(i.id) && ks.has(favKey(i)));
  if (!O.length) return null;
  return { title: `❤️ 찜한 ${O.length === 1 && (O[0].cat || 'stay') === 'stay' ? '숙소' : '곳'}의 체험단이 새로 열렸어요`, body: line(best(O)[0]) + (O.length > 1 ? ` 외 ${O.length - 1}곳` : ''),
    url: O.length === 1 ? SITE + '#/item?id=' + encodeURIComponent(O[0].id) : SITE + '#/list?s=todayOpen', tag: 'favopen' };
}
function personal(s) { // 사람마다 보낼 알림 목록: 기본 알림 + 관심 키워드 알림 + 찜 마감 알림(맞을 때 따로 한 번 더)
  const out = [];
  if (msg && !msg.personalOnly) out.push(msg);
  const fm = favMsg(s); if (fm) out.push(fm);
  const fo = favOpenMsg(s); if (fo) out.push(fo);
  const M = ['morning', 'match', 'night'].includes(slot) ? matchOf(s) : [];
  if (M.length) {
    const why = whyOf(s, M);
    out.push({ title: slot === 'morning' ? `✨ 오늘 오픈 ${why || '관심'} 체험단 ${M.length}곳` : `🔍 새로 올라온 ${why || '관심'} 체험단 ${M.length}곳`, body: `${line(best(M)[0])}`,
      url: M.length === 1 ? SITE + '#/item?id=' + encodeURIComponent(M[0].id) : SITE + '#/list?s=todayOpen', tag: 'kw' });
  }
  return out;
}
// 새 형식 키(sb_secret_…)는 apikey 헤더만, 예전 JWT(service_role)는 Authorization 도 같이
const K2 = KEY.trim(), H = K2.startsWith('sb_') ? { apikey: K2 } : { apikey: K2, Authorization: 'Bearer ' + K2 };
if (!K2.startsWith('sb_secret_') && !K2.startsWith('eyJ')) console.log('::warning::SUPABASE_SERVICE_KEY 모양이 sb_secret_ 나 eyJ 로 시작하지 않아요(공개 키를 넣었을 수 있음)');
(async () => {
  let r = await fetch(URL0 + '/rest/v1/push_subs?select=endpoint,p256dh,auth,regions,words,favs', { headers: H });
  if (r.status === 400) r = await fetch(URL0 + '/rest/v1/push_subs?select=endpoint,p256dh,auth,regions,words', { headers: H }); // 찜 칸 SQL 전
  if (r.status === 400) r = await fetch(URL0 + '/rest/v1/push_subs?select=endpoint,p256dh,auth', { headers: H }); // 관심 칸 SQL 전
  if (!r.ok) fail('구독 목록을 못 읽음 ' + r.status + ' ' + (await r.text()).slice(0, 150));
  const subs = await r.json(); let ok = 0, gone = 0, nfail = 0;
  let skip = 0;
  for (const s of subs) {
    const ms = personal(s);
    if (!ms.length) { skip++; continue; }
    for (const m0 of ms) { const m = { ...m0 };
    // 모든 알림 본문 앞에 (광고), 끝에 수신거부 안내 (2026-10-17 시온님 요청)
  if (slot !== 'test') m.body = (m.body.startsWith('(광고)') ? m.body : '(광고) ' + m.body) + (m.body.includes('수신거부') ? '' : UNSUB);
  const payload = JSON.stringify({ ...m, tag: (m.tag || slot) + '-' + Date.now(), icon: SITE + 'icons/icon-192.png' });
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 3600, urgency: 'normal' }); ok++; }
    catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410 || /VapidPkHashMismatch/.test(String(e.body || ''))) { gone++; await fetch(URL0 + '/rest/v1/push_subs?endpoint=eq.' + encodeURIComponent(s.endpoint), { method: 'DELETE', headers: H }); }
      else { nfail++; console.log('::warning::보내기 실패', e.statusCode || '', String(e.body || e.message).slice(0, 120)); }
      break;
    }
    }
  }
  console.log(`::notice::${slot}: "${(msg && msg.title) || "관심·찜 알림"}" 구독 ${subs.length}명 중 성공 ${ok}, 해지 정리 ${gone}, 실패 ${nfail}, 맞는 게 없어 건너뜀 ${skip}`);
})().catch(e => fail('보내기 중 오류: ' + e.message));
