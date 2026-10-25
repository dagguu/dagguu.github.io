#!/usr/bin/env python3
"""국내숙소추천 매거진(2026-10-24 시온님 요청): 매일 숙소 1곳을 소개하는 글.
입력: scripts/stays/<slug>.json  (숙소는 쿠팡트래블에 있는 곳만, 사진·사실은 쿠팡트래블 상품 페이지에서)
링크: data.json links["stay-<slug>"] = {cpUrl: 쿠팡트래블 상품 주소} → push 하면 coupang.yml 이 u(파트너스 링크)를 채운다.
출력: m/<slug>.html, m/index.html, m/list.json  (gen_share.py 끝에서 매일 다시 만들고 sitemap.xml 에 m/ 주소를 더한다)
지킬 것: 맨 위 대가성 문구, 쿠팡트래블 원문에 없는 사실·평점·순위·'최고/1위/최저가/무료' 쓰지 않기, 사진 출처 표시.
"""
import json, os, re, glob, html, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://www.dagguu.com"
e = lambda s: html.escape(str(s or ""), quote=True)
GA = re.search(r"^GA = '(.*?)'  #", open(os.path.join(ROOT, "scripts", "gen_share.py"), encoding="utf-8").read(), re.M).group(1)
d = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))
TODAY = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%Y-%m-%d")
THEME = {"인기": "요즘 인기 숙소", "신기한": "신기한 숙소", "감성": "감성 숙소"}

CSS = """*{box-sizing:border-box}body{margin:0;background:#fff;color:#16151c;font-family:Pretendard Variable,Pretendard,-apple-system,BlinkMacSystemFont,sans-serif;-webkit-text-size-adjust:100%;touch-action:manipulation}
a{color:inherit;text-decoration:none}.w{max-width:640px;margin:0 auto;padding:0 16px 130px}
.disc{margin:0 -16px;padding:7px 16px;background:#f6f6f8;color:#77768a;font-size:11.5px;line-height:1.5;text-align:center}
header{display:flex;justify-content:space-between;align-items:center;height:56px}.logo{font-weight:800;font-size:19px;letter-spacing:-.03em}.logo i{font-style:normal;color:#6a3fc8}
header .hl{display:flex;align-items:center;gap:4px}.bk{width:34px;height:34px;margin-left:-8px;border:0;background:none;font-size:30px;line-height:1;color:#16151c;cursor:pointer;padding:0 0 4px}
header .app{font-size:13px;font-weight:700;color:#6a3fc8;border:1px solid #e3dbf7;border-radius:999px;padding:7px 12px}
.cov{position:relative;margin:0 -16px;aspect-ratio:4/5;max-height:78vh;overflow:hidden;background:#222}.cov img{width:100%;height:100%;object-fit:cover;display:block}
.rb{position:absolute;left:14px;top:14px;z-index:2;display:inline-flex;align-items:center;gap:6px;background:#ff2d55;color:#fff;font-weight:900;font-size:15px;letter-spacing:-.02em;border-radius:999px;padding:9px 14px;box-shadow:0 6px 18px rgba(255,45,85,.45);animation:rbp 1.4s ease-in-out infinite}.rb b{background:#fff;color:#ff2d55;border-radius:999px;padding:2px 8px;font-size:13.5px}
@keyframes rbp{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}@media (prefers-reduced-motion:reduce){.rb{animation:none}}
.lc .mvc{display:block;margin-top:4px;font-size:12px;font-style:normal;font-weight:700;color:#8a8994;background:none;padding:0}.lim{position:relative;flex:none;display:block}.rb.sm{white-space:nowrap;left:50%;transform:translateX(-50%);top:auto;bottom:4px;font-size:10px;padding:3px 6px;gap:3px;animation:none;box-shadow:none}.rb.sm b{font-size:9.5px;padding:1px 4px}
.cov:after{content:"";position:absolute;inset:auto 0 0 0;height:55%;background:linear-gradient(transparent,rgba(0,0,0,.62))}
.cov .tx{position:absolute;left:20px;right:20px;bottom:22px;z-index:1;color:#fff}.cov small{display:inline-block;font-size:12px;font-weight:800;background:rgba(255,255,255,.22);backdrop-filter:blur(6px);border-radius:999px;padding:5px 10px}
.cov h1{font-size:28px;line-height:1.3;letter-spacing:-.03em;margin:10px 0 6px;text-shadow:0 2px 10px rgba(0,0,0,.35)}.cov p{margin:0;font-size:13.5px;opacity:.92}
.lead{font-size:15.5px;line-height:1.8;color:#3d3c4a;margin:22px 0 0}
.pts{margin:22px 0 0;display:grid;gap:10px}.pts div{display:flex;gap:12px;padding:14px;border:1px solid #ececf2;border-radius:16px}.pts i{font-style:normal;font-size:22px;line-height:1.2}.pts b{display:block;font-size:15px;margin-bottom:3px}.pts span{font-size:13.5px;color:#5b5a6a;line-height:1.6}
.gal{margin:30px 0 0}.gal h2,.sec h2{font-size:20px;letter-spacing:-.02em;margin:0 0 12px}.gal figure{margin:0 0 14px}.gal img{width:100%;border-radius:16px;display:block;background:#f4f4f7}.gal figcaption{font-size:13px;color:#6b6a7a;margin-top:7px;line-height:1.5}
.src{font-size:11.5px;color:#9a99a6;margin:-4px 0 0}
.sec{margin-top:34px}.sec p{font-size:15px;line-height:1.8;color:#3d3c4a;margin:0 0 10px}
.inf{width:100%;border-collapse:collapse;font-size:14px}.inf th{width:92px;text-align:left;color:#8a8994;font-weight:600;padding:10px 0;vertical-align:top;border-bottom:1px solid #f1f1f4}.inf td{padding:10px 0;line-height:1.55;border-bottom:1px solid #f1f1f4}
.fit{display:flex;flex-wrap:wrap;gap:8px}.fit span{font-size:13.5px;font-weight:700;background:#f4f0ff;color:#5b2fc0;border-radius:999px;padding:8px 12px}
.tags{margin-top:18px;font-size:13px;color:#6a3fc8;line-height:1.8}
.camp{margin-top:36px;padding:20px 18px;border-radius:18px;background:#f4f0ff}.camp h2{font-size:18px;margin:0 0 4px}.camp>p{font-size:13.5px;color:#5b5a6a;margin:0 0 10px;line-height:1.6}
.camp ul{list-style:none;margin:0;padding:0}.camp li a{display:flex;gap:12px;align-items:center;padding:10px 0;border-top:1px solid #e6defa}
.camp li img{width:56px;height:56px;border-radius:10px;object-fit:cover;flex:none;background:#fff}.camp li b{display:block;font-size:14px;line-height:1.4}.camp li span{font-size:12.5px;color:#6b6a7a}
.camp .more{display:block;text-align:center;margin-top:12px;padding:12px;border-radius:12px;background:#6a3fc8;color:#fff;font-weight:800;font-size:14px}
.more2{margin-top:34px}.more2 h2{font-size:18px;margin:0 0 10px}.ml{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px}.ml a{flex:none;width:150px}.ml img{width:150px;height:150px;border-radius:14px;object-fit:cover;display:block;background:#f4f4f7}.ml b{display:block;font-size:13.5px;line-height:1.4;margin-top:7px}.ml small{font-size:12px;color:#8a8994}
.bar{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid #eee;padding:10px 16px max(22px,calc(12px + env(safe-area-inset-bottom)));z-index:40}.bar a{display:block;max-width:608px;margin:0 auto;text-align:center;padding:15px;border-radius:14px;background:#6a3fc8;color:#fff;font-weight:800;font-size:15.5px}.bar a::after{content:" ↗"}
.mine{margin-top:22px;padding:16px 16px 14px;border-radius:16px}.mine b{display:block;font-size:15.5px;margin-bottom:4px}.mine p{margin:0 0 12px;font-size:13.5px;line-height:1.6;color:#4d4c5a}.mine small{color:#8a8994}
.mine a{display:block;text-align:center;padding:13px;border-radius:12px;font-weight:800;font-size:14.5px}.mine.on{background:#f4f0ff}.mine.on a{background:#6a3fc8;color:#fff}.mine.off{background:#fff8d6}.mine.off a{background:#fee500;color:#191600}
.note{font-size:12px;color:#8a8994;line-height:1.6;margin:14px 0 0}
footer{margin-top:40px;font-size:12px;color:#8a8994;line-height:1.7;text-align:center}footer a{color:#6a3fc8;font-weight:700}
.lst{display:flex;flex-direction:column;gap:12px;margin-top:18px}.lc{display:flex;gap:12px;align-items:center;border:1px solid #ececf2;border-radius:16px;padding:10px}.lc img{width:84px;height:84px;border-radius:12px;object-fit:cover;flex:none;background:#f4f4f7}.lc b{display:block;font-size:15px;line-height:1.4;margin-bottom:4px}.lc small{font-size:12.5px;color:#6b6a7a;line-height:1.5}.lc em{display:inline-block;font-style:normal;font-size:11px;font-weight:800;color:#6a3fc8;background:#f4f0ff;border-radius:6px;padding:2px 6px;margin-bottom:5px}
.srch{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:8px;margin:14px -16px 0;padding:10px 16px;background:#fff}.srch span{position:absolute;left:30px;font-size:15px}.srch input{width:100%;height:48px;border:1.5px solid #6a3fc8;border-radius:999px;padding:0 16px 0 42px;font-size:16px;outline:none;background:#faf8ff}
.lc{position:relative}.lc[hidden]{display:none}.lc .no{position:absolute;left:4px;top:4px;z-index:1;min-width:26px;height:22px;padding:0 6px;border-radius:8px;background:#16151c;color:#fff;font-style:normal;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center}
.nores{text-align:center;color:#8a8994;font-size:14px;padding:30px 0}
h1.ix{font-size:26px;margin:18px 0 6px;letter-spacing:-.03em}
"""

SEARCH = ('<form class="srch" onsubmit="return false" role="search"><span>🔍</span>'
          '<input id="q" type="search" inputmode="search" placeholder="번호 또는 숙소 이름·지역 검색 (예: 3, 가평)" autocomplete="off" enterkeyhint="search"></form>')
SEARCH_JS = r"""<script>(function(){var q=document.getElementById('q'),L=[].slice.call(document.querySelectorAll('#lst .lc')),N=document.getElementById('nores');
function run(){var v=q.value.trim().toLowerCase().replace(/[\[\]]/g,'').replace(/^no\.?\s*/,'').replace(/^#/,''),hit=0;L.forEach(function(a){var ok=!v||(/^\d+$/.test(v)?a.getAttribute('data-no')===String(+v):a.getAttribute('data-q').indexOf(v)>=0);a.hidden=!ok;if(ok)hit++;});N.hidden=!!hit||!v;
if(window.gtag&&v.length)clearTimeout(run.t),run.t=setTimeout(function(){gtag('event','search',{search_term:'stay_mag:'+v});},1200);}
q.addEventListener('input',run);var m=(location.hash.match(/^#(\d+)$/)||location.search.match(/[?&]n=(\d+)/));if(m){q.value=m[1];run();}})();</script>"""

def load_all():
    L = []
    for f in sorted(glob.glob(os.path.join(ROOT, "scripts", "stays", "*.json"))):
        try:
            P = json.load(open(f, encoding="utf-8"))
            if P.get("date", "9999") <= TODAY: L.append(P)   # 예약해 둔 날짜가 지난 글만 공개
        except Exception as ex:
            print("숙소 글 읽기 실패", f, ex)
    L.sort(key=lambda P: P["date"], reverse=True)
    return L

def _list_inf():
    try:
        sl = json.load(open(os.path.join(ROOT, "scripts", "stay_list.json"), encoding="utf-8"))
        arr = sl if isinstance(sl, list) else (sl.get("list") or sl.get("items") or [])
        return {str(e["pid"]): e["infUrl"] for e in arr if isinstance(e, dict) and e.get("pid") and e.get("infUrl")}
    except Exception:
        return {}
LIST_INF = _list_inf()

def link_of(P):
    # 인플루언서 링크(시온님이 준 것) → links infUrl → stay_list.json 같은 pid 의 infUrl → 파트너스 u
    x = (d.get("links") or {}).get("stay-" + P["slug"]) or {}
    return x.get("infUrl") or LIST_INF.get(str(P.get("pid") or "")) or x.get("u") or ""

def open_stays(region, n=5):
    def worth(it):
        m = re.search(r"(\d+)\s*만", str(it.get("worth") or "")); return int(m.group(1)) if m else 0
    L = [it for it in d.get("items", []) if it.get("cat") == "stay" and str(it.get("end") or "") >= TODAY and not it.get("closed")]
    same = [it for it in L if region and it.get("region") == region]
    rest = [it for it in L if it not in same]
    same.sort(key=lambda it: -worth(it)); rest.sort(key=lambda it: -worth(it))
    return (same + rest)[:n]

KAKAO = (d.get("kakao") or "http://pf.kakao.com/_xkqEFX/friend")
def camp_end(P):
    """이 숙소에 모집 중인 체험단이 있으면 가장 빠른 마감일(YYYY-MM-DD), 없으면 ""."""
    pid = str(P.get("pid") or "")
    L = [str(it.get("end") or "") for it in d.get("items", []) if it.get("cat") == "stay" and not it.get("closed") and str(it.get("end") or "") >= TODAY and ((pid and str(it.get("coupangPid") or "") == pid) or it.get("id") == P.get("camp"))]
    return min(L) if L else ""

def dday(end):
    n = (datetime.date.fromisoformat(end) - datetime.date.fromisoformat(TODAY)).days
    return "D-DAY" if n <= 0 else f"D-{n}"

def rbadge(end, cls="rb"):
    # 2026-10-25 시온님 "숙소추천 매거진 글 사진에 🚨체험단 모집중! D-1 한번 더 강조" — 날짜는 페이지 JS 가 오늘 기준으로 다시 계산(DDJS)
    if not end: return ""
    lab = "🚨모집중" if "sm" in cls else "🚨체험단 모집중!"
    return f'<span class="{cls}" data-end="{e(end)}">{lab} <b>{dday(end)}</b></span>'

DDJS = r"""<script>(function(){var t=new Date(Date.now()+9*36e5).toISOString().slice(0,10);document.querySelectorAll("[data-end]").forEach(function(x){var n=Math.round((Date.parse(x.getAttribute("data-end"))-Date.parse(t))/864e5);if(n<0){x.remove();return;}var b=x.querySelector("b");if(b)b.textContent=n===0?"D-DAY":"D-"+n;});})();</script>"""

def stay_camp(P):
    """이 숙소의 체험단(2026-10-25 시온님): 모집 중이면 신청 정보로, 끝났으면 카카오 채널 알림받기."""
    pid = str(P.get("pid") or "")
    L = [it for it in d.get("items", []) if it.get("cat") == "stay" and ((pid and str(it.get("coupangPid") or "") == pid) or it.get("id") == P.get("camp"))]
    if not L: return ""
    op = sorted([it for it in L if str(it.get("end") or "") >= TODAY and not it.get("closed")], key=lambda it: it["end"])
    if op:
        it = op[0]; m, dd = int(it["end"][5:7]), int(it["end"][8:10])
        return (f'<section class="mine on"><b>✨ 이 숙소 체험단 모집 중이에요</b><p>{e((it.get("benefit") or "")[:60])}<br><small>{m}월 {dd}일까지 · {e(it.get("source") or "")}</small></p>'
                f'<a href="/s/{e(it["id"])}.html" id="campgo">체험단 자세히 보기 ›</a></section>')
    return ('<section class="mine off"><b>이 숙소 체험단은 모집이 끝났어요</b><p>다꾸체험단 카카오톡 채널을 추가하면 새 숙박 체험단 소식을 받아 볼 수 있어요.</p>'
            f'<a href="{e(KAKAO)}" target="_blank" rel="noopener noreferrer" id="kakaogo">🔔 알림받기 (카카오톡 채널 추가)</a></section>')

def head(title, desc, canon, img):
    return f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8">{GA}
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>{e(title)}</title><meta name="description" content="{e(desc)}"><meta name="robots" content="index,follow"><link rel="canonical" href="{e(canon)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="다꾸체험단"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:url" content="{e(canon)}"><meta property="og:image" content="{e(img)}"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icons/icon-192.png"><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>{CSS}</style>'''

TOP = ('<p class="disc">이 페이지는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>'
       '<header><span class="hl"><button class="bk" type="button" aria-label="뒤로 가기" onclick="if(history.length>1&&document.referrer)history.back();else location.href=\'/\'">‹</button>'
       '<a class="logo" href="/">다꾸<i>체험단</i></a></span><a class="app" href="/m/">감성숙소 추천 더 보기 ›</a></header>')

def build(P, allP):
    slug = P["slug"]; canon = f"{SITE}/m/{slug}.html"
    ph = P["photos"]; cov = ph[0]
    title = P.get("title") or f'No.{P.get("no","")} {P["name"]} · {P["area"]} {P.get("type","숙소")} | 다꾸 감성숙소 추천'
    desc = P.get("desc") or P["lead"][:110]
    u = link_of(P)
    mm, dd = int(P["date"][5:7]), int(P["date"][8:10])
    pts = "".join(f'<div><i>{e(a)}</i><span><b>{e(b)}</b>{e(c)}</span></div>' for a, b, c in P.get("points", []))
    gal = "".join(f'<figure><img src="{e(x["src"])}" alt="{e(P["name"])} {e(x.get("cap",""))}" loading="lazy" referrerpolicy="no-referrer"><figcaption>{e(x.get("cap",""))}</figcaption></figure>' for x in ph[1:])
    inf = "".join(f'<tr><th>{e(a)}</th><td>{e(b)}</td></tr>' for a, b in P.get("info", []))
    fit = "".join(f'<span>{e(x)}</span>' for x in P.get("fit", []))
    guide = "".join(f'<section class="sec"><h2>{e(g["h"])}</h2>' + "".join(f"<p>{e(t)}</p>" for t in g["p"]) + "</section>" for g in P.get("guide", []))
    tags = " ".join("#" + e(t) for t in P.get("tags", []))
    S = open_stays(P.get("region", ""))
    camp = ""
    if S:
        lis = "".join(f'<li><a href="/s/{e(it["id"])}.html"><img src="{e(it.get("image") or "")}" alt="" loading="lazy" referrerpolicy="no-referrer"><span><b>{e(it["name"])}</b><span>{e((it.get("benefit") or "")[:40])}</span></span></a></li>' for it in S)
        camp = (f'<section class="camp"><h2>{e(P.get("region") or "전국")} 숙박 체험단도 있어요</h2><p>숙박을 제공받고 후기를 남기는 조건의 체험단이에요. 지금 모집 중인 곳을 모았어요.</p><ul>{lis}</ul>'
                f'<a class="more" href="/#/list?cat=stay">숙박 체험단 더 보기</a></section>')
    others = [Q for Q in allP if Q["slug"] != slug][:8]
    more = ""
    if others:
        more = '<section class="more2"><h2>다른 감성숙소 추천</h2><div class="ml">' + "".join(
            f'<a href="/m/{e(Q["slug"])}.html"><img src="{e(Q["photos"][0]["src"])}" alt="" loading="lazy" referrerpolicy="no-referrer"><b>{e(Q["name"])}</b><small>{e(Q["area"])}</small></a>' for Q in others) + '</div></section>'
    ld = {"@context": "https://schema.org", "@type": "Article", "headline": " ".join(P["h1"]), "datePublished": P["date"], "image": [x["src"] for x in ph[:3]],
          "about": {"@type": "LodgingBusiness", "name": P["name"], "address": next((b for a, b in P.get("info", []) if a == "주소"), P["area"])},
          "publisher": {"@type": "Organization", "name": "다꾸체험단", "url": SITE}}
    bar = f'<div class="bar"><a href="{e(u)}" target="_blank" rel="noopener noreferrer sponsored" id="go">객실·가격 보기</a></div>' if u else ""
    out = head(title, desc, canon, (SITE + "/images/og/m-" + slug + ".jpg" if os.path.exists("images/og/m-" + slug + ".jpg") else cov["src"])) + f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script></head><body><div class="w">{TOP}' + f'''
<section class="cov"><img src="{e(cov["src"])}" alt="{e(P["name"])}" referrerpolicy="no-referrer">{rbadge(camp_end(P))}<div class="tx"><small>No.{e(P.get("no",""))} · {e(THEME.get(P.get("theme"), "감성숙소 추천"))} · {e(P["area"])}</small><h1>{e(P["h1"][0])}<br>{e(P["h1"][1])}</h1><p>{e(P["name"])}</p></div></section>
<p class="lead">{e(P["lead"])}</p>
{stay_camp(P)}
<div class="pts">{pts}</div>
<section class="gal"><h2>공간 둘러보기</h2>{gal}<p class="src">사진: 쿠팡트래블 숙소 정보</p></section>
<section class="sec"><h2>기본 정보</h2><table class="inf">{inf}</table></section>
{('<section class="sec"><h2>이런 여행에 어울려요</h2><div class="fit">'+fit+'</div></section>') if fit else ""}
{guide}
<p class="tags">{tags}</p>
<p class="note">숙소 정보는 {mm}월 {dd}일 쿠팡트래블 상품 페이지를 기준으로 정리했어요. 객실·요금·운영 시설은 바뀔 수 있으니 예약 전에 꼭 확인해 주세요.</p>
{camp}
{more}
<footer>다꾸체험단 · 국내 감성숙소 추천 매거진<br><a href="/m/">감성숙소 추천 전체 보기</a> · <a href="/">www.dagguu.com</a></footer>
</div>{bar}
<script>document.addEventListener("click",function(ev){{if(!window.gtag)return;var nm={json.dumps(P["name"], ensure_ascii=False)};if(ev.target.closest("#go"))gtag("event","coupang_click",{{place:"stay_mag",item_name:nm}});if(ev.target.closest("#kakaogo"))gtag("event","kakao_add",{{place:"stay_mag",item_name:nm}});if(ev.target.closest("#campgo"))gtag("event","camp_click",{{place:"stay_mag",item_name:nm}});}});</script>{DDJS}
</body></html>
'''
    open(os.path.join(ROOT, "m", slug + ".html"), "w", encoding="utf-8").write(out)
    return {"no": P.get("no", 0), "slug": slug, "name": P["name"], "area": P["area"], "theme": P.get("theme", ""), "t": " ".join(P["h1"]), "tl": P["h1"], "d": P["lead"][:80], "date": P["date"], "img": cov["src"], "campEnd": camp_end(P)}

if __name__ == "__main__":
    os.makedirs(os.path.join(ROOT, "m"), exist_ok=True)
    allP = load_all()
    done = [build(P, allP) for P in allP]
    json.dump(done, open(os.path.join(ROOT, "m", "list.json"), "w", encoding="utf-8"), ensure_ascii=False)
    lis = "".join(f'<a class="lc" href="/m/{e(x["slug"])}.html" data-no="{e(x["no"])}" data-q="{e((x["name"]+" "+x["area"]+" "+x["t"]).lower())}"><i class="no">{e(x["no"])}</i><span class="lim"><img src="{e(x["img"])}" alt="" loading="lazy" referrerpolicy="no-referrer">{rbadge(x.get("campEnd",""), "rb sm")}</span><span><em>{e(THEME.get(x["theme"], "감성숙소 추천"))} · {e(x["area"])}</em><b>{e(x["t"])}</b><small>{e(x["name"])}</small><em class="mvc" data-mv="m:{e(x["slug"])}" hidden></em></span></a>' for x in done)
    idx = head("국내 감성숙소 추천 · 매일 한 곳씩 | 다꾸체험단", "요즘 인기 있는 숙소, 신기한 숙소, 감성 숙소를 매일 한 곳씩 사진과 함께 소개해요.", SITE + "/m/", done[0]["img"] if done else SITE + "/images/og.png") + \
        f'</head><body><div class="w">{TOP.replace("감성숙소 추천 더 보기 ›", "다꾸 매거진 ›").replace("/m/", "/#/mag?t=s", 1)}<h1 class="ix">국내 감성숙소 추천</h1><p class="lead" style="margin-top:6px">요즘 인기 숙소, 신기한 숙소, 감성 숙소를 매일 한 곳씩 소개해요. 번호나 숙소 이름·지역으로 찾아보세요.</p>{SEARCH}<div class="lst" id="lst">{lis or "<p>곧 첫 글이 올라와요</p>"}</div><p class="nores" id="nores" hidden>찾는 숙소가 없어요. 번호를 다시 확인해 주세요.</p><footer><a href="/">다꾸체험단 홈</a></footer></div>{SEARCH_JS}{DDJS}</body></html>'
    open(os.path.join(ROOT, "m", "index.html"), "w", encoding="utf-8").write(idx)
    # 사이트맵에 m/ 주소 더하기 (gen_share.py 가 먼저 sitemap.xml 을 새로 쓴 뒤 불림)
    sm = os.path.join(ROOT, "sitemap.xml")
    if os.path.exists(sm):
        s = open(sm, encoding="utf-8").read()
        add = "".join(f"<url><loc>{SITE}/m/{x['slug']}.html</loc><lastmod>{x['date']}</lastmod></url>" for x in done if f"/m/{x['slug']}.html" not in s)
        if done and f"{SITE}/m/<" not in s: add = f"<url><loc>{SITE}/m/</loc></url>" + add
        if add: open(sm, "w", encoding="utf-8").write(s.replace("</urlset>", add + "</urlset>"))
    # 홈 인트로 사진 + 오늘의 감성숙소(슬라이드·띠 배너·팝업용)를 index.html 에 직접 넣는다(2026-10-25 시온님: 인트로 글씨는 그대로, 사진만 감성숙소로)
    ix = os.path.join(ROOT, "index.html")
    if done and os.path.exists(ix):
        T = done[0]
        h = open(ix, encoding="utf-8").read()
        h2 = re.sub(r'<img class="ftbg[^>]*>', '<img class="ftbg ph" src="' + e(T["img"]) + '" referrerpolicy="no-referrer" onerror="this.className=\'ftbg\';this.src=\'images/free-trip.svg\'" alt="">', h, count=1)
        tj = json.dumps({k: T[k] for k in ("no", "slug", "name", "area", "t", "tl", "img", "date") if k in T}, ensure_ascii=False).replace("</", "<\\/")
        tag = '<script id="staytoday">window.STAY_TODAY=' + tj + ';</script>'
        h2 = re.sub(r'<script id="staytoday">.*?</script>', tag, h2, count=1) if 'id="staytoday"' in h2 else h2.replace('<div id="app"></div>', tag + '\n<div id="app"></div>', 1)
        if h2 != h: open(ix, "w", encoding="utf-8").write(h2)
    print("숙소 추천 글:", ", ".join(x["slug"] for x in done) or "없음")
