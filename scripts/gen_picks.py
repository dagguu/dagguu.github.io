#!/usr/bin/env python3
"""검색광고(파워링크) 도착용 추천 모음 페이지(2026-10-20 시온님 요청).
입력: scripts/picks_<slug>.json (상품은 쿠팡 공식 검색 API 결과 scripts/match_results.json 에서 고른 것, url 은 API 가 준 파트너스 링크)
출력: p/<slug>.html — 고르는 기준 + 예산별 상품 + 모집 중 육아 체험단. gen_share.py 끝에서 매일 다시 만든다(체험단 목록 갱신).
지킬 것: 상품마다 '좋다/1위' 같은 근거 없는 말 쓰지 않기, 가격은 조회한 날짜 기준이라고 밝히기, 맨 위 대가성 문구.
"""
import json, os, re, glob, html, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://www.dagguu.com"
e = lambda s: html.escape(str(s or ""), quote=True)
GA = re.search(r"^GA = '(.*?)'  #", open(os.path.join(ROOT, "scripts", "gen_share.py"), encoding="utf-8").read(), re.M).group(1)
d = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))
TODAY = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%Y-%m-%d")

CSS = """.feat{margin:18px 0 26px}.feat small{display:block;font-size:13px;font-weight:800;color:#6a3fc8;margin:0 0 8px}.fc{display:block;border:2px solid #6a3fc8;border-radius:18px;padding:14px;text-decoration:none;color:inherit}.fc .im{position:relative;display:block;aspect-ratio:1;border-radius:12px;overflow:hidden;background:#f4f2f8}.fc .im img{width:100%;height:100%;object-fit:contain}.fc .n{display:block;font-size:16px;font-weight:700;line-height:1.4;margin:12px 0 6px}.fc .pr{display:block;font-size:20px;font-weight:900}.fc .go{display:block;margin-top:12px;background:#6a3fc8;color:#fff;text-align:center;border-radius:12px;padding:13px;font-weight:800}*{box-sizing:border-box}body{margin:0;background:#fff;color:#16151c;font-family:Pretendard Variable,Pretendard,-apple-system,sans-serif;-webkit-text-size-adjust:100%;touch-action:manipulation}
a{color:inherit;text-decoration:none}.w{max-width:640px;margin:0 auto;padding:0 16px 60px}
.disc{margin:0 -16px;padding:7px 16px;background:#f6f6f8;color:#77768a;font-size:11.5px;line-height:1.5;text-align:center}
header{display:flex;justify-content:space-between;align-items:center;height:56px}.logo{font-weight:800;font-size:19px;letter-spacing:-.03em}.logo i{font-style:normal;color:#6a3fc8}
header .hl{display:flex;align-items:center;gap:4px}.bk{width:34px;height:34px;margin-left:-8px;border:0;background:none;font-size:30px;line-height:1;color:#16151c;cursor:pointer;padding:0 0 4px}
#totop{position:fixed;right:16px;bottom:22px;width:52px;height:52px;border-radius:50%;border:0;background:#6a3fc8;color:#fff;font-size:13px;font-weight:900;box-shadow:0 6px 18px rgba(106,63,200,.45);opacity:0;pointer-events:none;transition:opacity .2s;z-index:50;cursor:pointer}#totop.on{opacity:1;pointer-events:auto}
header .app{font-size:13px;font-weight:700;color:#6a3fc8;border:1px solid #e3dbf7;border-radius:999px;padding:7px 12px}
.hero{padding:22px 0 8px}.hero small{display:inline-block;font-size:12px;font-weight:700;color:#6a3fc8;background:#f4f0ff;border-radius:999px;padding:5px 10px}
h1{font-size:26px;line-height:1.3;letter-spacing:-.03em;margin:12px 0 8px}.lead{font-size:15px;line-height:1.7;color:#4a4958;margin:0}
.tips{margin:22px 0 6px;padding:18px;border:1px solid #ececf2;border-radius:16px;background:#fafafa}.tips h2{font-size:16px;margin:0 0 10px}
.tips ul{margin:0;padding:0;list-style:none}.tips li{font-size:14px;line-height:1.65;color:#3d3c4a;padding:5px 0}.tips li b{color:#16151c}
.toc{display:flex;gap:8px;overflow-x:auto;margin:18px 0 0;padding-bottom:4px}.toc a{flex:none;font-size:13px;font-weight:700;border:1px solid #e6e6ee;border-radius:999px;padding:8px 12px}
.sec{margin-top:34px}.sec h2{font-size:20px;letter-spacing:-.02em;margin:0 0 6px}.sec>p{font-size:14px;color:#5b5a6a;line-height:1.6;margin:0 0 14px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.pc{display:flex;flex-direction:column;border:1px solid #ececf2;border-radius:16px;overflow:hidden;background:#fff}
.pc .im{position:relative;aspect-ratio:1;background:#f4f4f7}.pc img{width:100%;height:100%;object-fit:cover;display:block}
.pc .rk{position:absolute;left:8px;top:8px;background:#fff;color:#1e6fff;font-size:11px;font-weight:800;border-radius:6px;padding:3px 6px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.pc .k{font-size:11.5px;color:#8a8994;margin:10px 10px 2px}.pc .n{font-size:13.5px;line-height:1.45;margin:0 10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:39px}
.pc .pr{font-size:16px;font-weight:800;margin:6px 10px 0}.pc .go{margin:10px;padding:10px 0;text-align:center;font-size:13px;font-weight:800;border-radius:10px;background:#f4f0ff;color:#5b2fc0}
.pc .go::after{content:" ↗"}
.note{font-size:12px;color:#8a8994;line-height:1.6;margin:12px 0 0}
.camp{margin-top:40px;padding:20px 18px;border-radius:18px;background:#f4f0ff}.camp h2{font-size:18px;margin:0 0 4px}.camp>p{font-size:13.5px;color:#5b5a6a;margin:0 0 12px;line-height:1.6}
.camp ul{list-style:none;margin:0;padding:0}.camp li a{display:flex;gap:12px;align-items:center;padding:10px 0;border-top:1px solid #e6defa}
.camp li img{width:56px;height:56px;border-radius:10px;object-fit:cover;flex:none;background:#fff}.camp li b{display:block;font-size:14px;line-height:1.4}.camp li span{font-size:12.5px;color:#6b6a7a}
.camp .more{display:block;text-align:center;margin-top:12px;padding:12px;border-radius:12px;background:#6a3fc8;color:#fff;font-weight:800;font-size:14px}
.gd p{font-size:14.5px;line-height:1.75;color:#3d3c4a;margin:0 0 8px}.faq .toc{margin:4px 0 0}
.faq{margin-top:36px}.faq h2{font-size:18px;margin:0 0 8px}.faq details{border-bottom:1px solid #eee;padding:12px 0}.faq summary{font-weight:700;font-size:14.5px;cursor:pointer}.faq p{font-size:14px;color:#4a4958;line-height:1.65;margin:8px 0 0}
footer{margin-top:40px;font-size:12px;color:#8a8994;line-height:1.7;text-align:center}footer a{color:#6a3fc8;font-weight:700}
"""

# 노션 페이지 느낌(2026-10-23 시온님 "노션 느낌", picks json 에 "style":"notion" 인 페이지만) — 흰 바탕·연한 커버·큰 이모지 아이콘·회색 태그·콜아웃·토글. 노션 로고는 쓰지 않는다.
NOTION_CSS = """body{color:#37352f;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Pretendard Variable,Pretendard,sans-serif}
.w{max-width:720px;padding:0 22px 70px}.disc{margin:0 -22px;background:#f7f6f3;color:#787774}
header{height:50px;font-size:14px}.logo{font-size:15px;font-weight:600}.logo i{color:#37352f}header .app{border:0;color:#787774;font-weight:500;padding:6px 8px;border-radius:4px}header .app:hover{background:#efefed}
.ncv{height:150px;margin:0 -22px;background:linear-gradient(120deg,#f3eefb 0,#f7f3ea 55%,#eef4f8 100%)}.nic{font-size:74px;line-height:1;margin:-40px 0 0 2px}
.hero{padding:14px 0 4px}.hero small{color:#787774;background:#f1f1ef;border-radius:4px;font-weight:500;padding:3px 8px}
h1{font-size:34px;font-weight:700;letter-spacing:-.02em;line-height:1.25;margin:12px 0 10px}.lead{font-size:16px;line-height:1.75;color:#37352f}
.toc{flex-direction:column;gap:0;margin:16px 0 0;overflow:visible}.toc a{border:0;border-radius:4px;padding:5px 6px;font-weight:400;font-size:14.5px;color:#787774;text-decoration:underline;text-decoration-color:#d3d1cb;text-underline-offset:3px}.toc a::before{content:"• ";color:#37352f;text-decoration:none}
.feat small{color:#787774;font-weight:600;font-size:13px}.fc{border:1px solid #e9e9e7;border-radius:6px;padding:0;overflow:hidden;box-shadow:0 1px 2px rgba(15,15,15,.06)}.fc .im{border-radius:0;background:#f7f6f3}.fc .n,.fc .pr{margin-left:14px;margin-right:14px}.fc .pr{font-size:18px;font-weight:700}.fc .go{margin:12px 14px 14px;background:#2383e2;border-radius:4px;font-weight:600}
.sec{margin-top:38px}.sec h2{font-size:23px;font-weight:700;padding-bottom:6px;border-bottom:1px solid #e9e9e7;margin-bottom:10px}.sec>p{color:#37352f;font-size:15px}
.grid{gap:14px}.pc{border:1px solid #e9e9e7;border-radius:6px;box-shadow:0 1px 2px rgba(15,15,15,.05)}.pc .im{background:#f7f6f3}
.pc .k{display:inline-block;align-self:flex-start;background:#f1f1ef;color:#787774;border-radius:3px;padding:1px 6px;font-size:11.5px;margin:10px 10px 4px}.pc .n{font-weight:500}.pc .pr{font-weight:600;font-size:15px}
.pc .go{background:none;color:#787774;border-top:1px solid #f1f1ef;border-radius:0;margin:10px 0 0;font-weight:500;text-align:left;padding:9px 10px}
.pc .rk{box-shadow:none;border:1px solid #e9e9e7;color:#2383e2;border-radius:3px}
.tips{background:#f7f6f3;border:0;border-radius:4px;padding:16px 18px 16px 52px;position:relative}.tips::before{content:"💡";position:absolute;left:18px;top:15px;font-size:20px}.tips h2{font-size:16px;font-weight:700}.tips li{color:#37352f}
.tips.gd{background:none;padding:0;margin-top:34px}.tips.gd::before{content:none}.tips.gd h2{font-size:21px;border-bottom:1px solid #e9e9e7;padding-bottom:6px;margin-bottom:10px}.gd p{color:#37352f;font-size:15px}.note{color:#9b9a97}
.camp{background:none;border:1px solid #e9e9e7;border-radius:6px}.camp li a{border-top-color:#f1f1ef}.camp .more{background:#37352f;border-radius:4px;font-weight:600}
.faq details{border:0;padding:4px 0}.faq summary{list-style:none;font-weight:500;padding:4px 0}.faq summary::-webkit-details-marker{display:none}.faq summary::before{content:"▸";display:inline-block;width:20px;color:#37352f;transition:transform .15s}.faq details[open] summary::before{transform:rotate(90deg)}.faq p{padding-left:20px;color:#37352f}
.faq h2{font-size:20px;font-weight:700;border-bottom:1px solid #e9e9e7;padding-bottom:6px}.faq .toc{flex-direction:row;flex-wrap:wrap;gap:6px}.faq .toc a{background:#f1f1ef;text-decoration:none;color:#37352f;font-size:13px}.faq .toc a::before{content:""}
footer a{color:#37352f}#totop{background:#37352f;box-shadow:0 4px 12px rgba(15,15,15,.2)}
"""

def open_cat(cat="baby", q="", n=6):
    def worth(it):
        m = re.search(r"(\d+)\s*만", str(it.get("worth") or "")); return int(m.group(1)) * 10000 if m else int(it.get("cpPrice") or 0)
    L = [it for it in d.get("items", []) if it.get("cat") == cat and str(it.get("end") or "") >= TODAY]
    if q:
        hit = [it for it in L if re.search(q, (it.get("name") or "") + (it.get("benefit") or ""))]
        L = hit + [it for it in L if it not in hit]
    L.sort(key=lambda it: -worth(it))
    return L[:n]

def card(x):
    img = x["img"]
    return (f'<a class="pc" href="{e(x["url"])}" target="_blank" rel="noopener noreferrer sponsored" data-k="{e(x["kind"])}" data-p="{e(str(x.get("pid") or ""))}">'
            f'<span class="im"><img src="{e(img)}" alt="{e(x["name"])}" loading="lazy" referrerpolicy="no-referrer">{"<i class=rk>로켓배송</i>" if x.get("rocket") else ""}</span>'
            f'<span class="k">{e(x["kind"])}</span><span class="n">{e(x["name"])}</span><span class="pr">{x["price"]:,}원</span><span class="go">상품 보러가기</span></a>')

def build(path):
    P = json.load(open(path, encoding="utf-8"))
    slug, date = P["slug"], P["date"]
    mm, dd = int(date[5:7]), int(date[8:10])
    title, desc = P["title"], P["desc"]
    canon = f"{SITE}/p/{slug}.html"
    secs = P["sections"]
    import sys as _s; _s.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import cp_banned
    for s_ in secs: s_["items"] = [x for x in s_["items"] if not cp_banned.is_banned(x.get("name", ""))]  # 파트너스 제한 브랜드 빼기
    secs = [s_ for s_ in secs if s_["items"]]
    toc = "".join(f'<a href="#s{i}">{e(s["t"].split(" · ")[0])}</a>' for i, s in enumerate(secs))
    body = "".join(f'<section class="sec" id="s{i}"><h2>{e(s["t"])}</h2><p>{e(s["d"])}</p>{('<figure style="margin:0 0 14px"><img src="'+e(s["howto"]["img"])+'" alt="'+e(s["howto"]["alt"])+'" loading="lazy" style="width:100%;border-radius:14px;display:block"><figcaption style="font-size:12px;color:#8a8999;margin-top:6px">'+e(s["howto"]["cap"])+'</figcaption></figure>') if s.get("howto") else ""}<div class="grid">{"".join(card(x) for x in s["items"])}</div></section>' for i, s in enumerate(secs))
    C = P.get("camp") or {}
    B = open_cat(C.get("cat", "baby"), C.get("q", ""))
    camp = ""
    if B:
        lis = "".join(f'<li><a href="/s/{e(it["id"])}.html"><img src="{e(it.get("image") or "")}" alt="" loading="lazy" referrerpolicy="no-referrer"><span><b>{e(it["name"])}</b><span>{e(it.get("benefit") or "")[:40]}</span></span></a></li>' for it in B)
        camp = (f'<section class="camp"><h2>{e(C.get("h", "체험단으로 먼저 써 보기"))}</h2><p>{e(C.get("p", "후기를 남기는 조건으로 제품을 받아 보는 체험단도 있어요. 지금 모집 중인 곳이에요."))}</p><ul>{lis}</ul>'
                f'<a class="more" href="/#/list?cat={e(C.get("cat", "baby"))}">{e(C.get("more", "체험단 더 보기"))}</a></section>')
    faq = [tuple(x) for x in P.get("faq", [])] + [("가격은 정확한가요?", f"이 페이지의 가격은 {mm}월 {dd}일 쿠팡 검색 기준이에요. 할인·품절에 따라 바뀌니 구매 전에 쿠팡 화면에서 꼭 확인해 주세요.")]
    faqh = '<section class="faq"><h2>자주 묻는 질문</h2>' + "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in faq) + "</section>"
    ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}
    tips = "".join(f'<li>{e(a)} <b>{e(b)}</b> · {e(c)}</li>' for a, b, c in P.get("tips", []))
    guide = "".join(f'<section class="tips gd"><h2>{e(g["h"])}</h2>' + "".join(f"<p>{e(t)}</p>" for t in g["p"]) + "</section>" for g in P.get("guide", []))
    # 맨 위 대표 상품(스레드 글에 나온 그 제품) — 2026-10-22 시온님 "글보다 상품이 먼저"
    feat = ""
    fp = str(P.get("feat") or "")
    fx = next((x for s_ in secs for x in s_["items"] if str(x.get("pid")) == fp), None) if fp else None
    if fx:
        feat = (f'<section class="feat"><small>오늘 소개한 제품</small><a class="fc" href="{e(fx["url"])}" target="_blank" rel="noopener noreferrer sponsored" data-k="{e(fx["kind"])}">'
                f'<span class="im"><img src="{e(fx["img"])}" alt="{e(fx["name"])}" referrerpolicy="no-referrer">{"<i class=rk>로켓배송</i>" if fx.get("rocket") else ""}</span>'
                f'<span class="n">{e(fx["name"])}</span><span class="pr">{fx["price"]:,}원</span><span class="go">상품 보러가기</span></a></section>')
    # 링크 미리보기 그림: 사이트에 올린 images/og/<slug>.jpg (scripts/cards/og_picks.py) — 쿠팡 이미지 주소는 미리보기 로봇이 못 읽어서(2026-10-23)
    ogf = os.path.join(ROOT, "images", "og", slug + ".jpg")
    ogimg = f"{SITE}/images/og/{slug}.jpg" if os.path.exists(ogf) else secs[0]["items"][0]["img"]
    ogwh = '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' if os.path.exists(ogf) else ""
    NOTION = P.get("style") == "notion"
    NHEAD = f'<div class="ncv"></div><div class="nic">{e(P.get("icon", "📄"))}</div>' if NOTION else ""
    bz = d.get("biz") or {}
    bizl = " · ".join(x for x in [bz.get("name") and f"상호 {bz['name']}", bz.get("ceo") and f"대표 {bz['ceo']}", bz.get("regNo") and f"사업자등록번호 {bz['regNo']}", bz.get("mailOrder") and f"통신판매업 {bz['mailOrder']}"] if x)
    out = f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8">{GA}
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>{e(title)}</title><meta name="description" content="{e(desc)}"><meta name="robots" content="index,follow"><link rel="canonical" href="{e(canon)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="다꾸체험단"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:url" content="{e(canon)}"><meta property="og:image" content="{e(ogimg)}">{ogwh}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{e(ogimg)}">
<link rel="icon" href="/icons/icon-192.png"><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>{CSS}{NOTION_CSS if NOTION else ""}</style><script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head><body><div class="w">
<p class="disc">이 페이지는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>
<header><span class="hl"><button class="bk" type="button" aria-label="뒤로 가기" onclick="if(history.length>1&&document.referrer)history.back();else location.href='/'">‹</button><a class="logo" href="/">다꾸<i>체험단</i></a></span><a class="app" href="/">체험단 보러가기 ›</a></header>
{NHEAD}<section class="hero"><small>{mm}월 업데이트</small><h1>{e(P["h1"][0])}<br>{e(P["h1"][1])}</h1>
<p class="lead">{e(P["lead"])}</p>
<div class="toc">{toc}</div></section>
{feat}
{body}
<section class="tips"><h2>{e(P.get("tipsTitle", "고르기 전에 확인할 것"))}</h2><ul>{tips}</ul></section>
{guide}
<p class="note">상품은 {mm}월 {dd}일 쿠팡 검색 결과에서 분류별로 골랐어요. 순위나 품질 평가가 아니며, 가격·배송은 쿠팡 화면을 기준으로 해 주세요.</p>
{camp}
{faqh}
{more_links(slug)}
<footer>다꾸체험단 · 전국 체험단을 한눈에<br><a href="/">www.dagguu.com</a><br>{e(bizl)}</footer>
</div>
<script>(function(){{var m=location.hash.match(/f=(\\d+)/),f=document.querySelector(".fc");if(!m||!f)return;var c=document.querySelector('.pc[data-p="'+m[1]+'"]');if(!c)return;f.href=c.href;f.dataset.k=c.dataset.k;f.querySelector(".im").innerHTML=c.querySelector(".im").innerHTML;f.querySelector(".n").textContent=c.querySelector(".n").textContent;f.querySelector(".pr").textContent=c.querySelector(".pr").textContent;scrollTo(0,0);}})();</script>
<script>document.addEventListener("click",function(ev){{var a=ev.target.closest(".pc,.fc");if(a&&window.gtag)gtag("event","coupang_click",{{place:"picks_{slug}",item_name:a.dataset.k||""}});}});</script>
<button id="totop" type="button" aria-label="맨 위로" onclick="scrollTo({{top:0,behavior:'smooth'}})">TOP</button><script>addEventListener("scroll",function(){{document.getElementById("totop").classList.toggle("on",scrollY>300)}},{{passive:true}});</script>
</body></html>
'''
    os.makedirs(os.path.join(ROOT, "p"), exist_ok=True)
    open(os.path.join(ROOT, "p", slug + ".html"), "w", encoding="utf-8").write(out)
    return {"slug": slug, "t": P["h1"][0], "h": " ".join(P["h1"]), "d": desc, "date": date, "img": secs[0]["items"][0]["img"], "title": title}

def more_links(slug):
    L = []
    for f in sorted(glob.glob(os.path.join(ROOT, "scripts", "picks_*.json"))):
        P = json.load(open(f, encoding="utf-8"))
        if P["slug"] != slug: L.append(f'<a href="/p/{e(P["slug"])}.html">{e(P["h1"][0])}</a>')
    return f'<section class="faq"><h2>다른 추천 모음</h2><div class="toc">{"".join(L)}</div></section>' if L else ""

if __name__ == "__main__":
    done = [build(f) for f in sorted(glob.glob(os.path.join(ROOT, "scripts", "picks_*.json")))]
    done.sort(key=lambda x: x["date"], reverse=True)
    json.dump(done, open(os.path.join(ROOT, "p", "list.json"), "w", encoding="utf-8"), ensure_ascii=False)
    lis = "".join(f'<a class="pc" href="/p/{e(x["slug"])}.html" style="flex-direction:row;align-items:center;gap:12px;padding:10px"><img src="{e(x["img"])}" alt="" loading="lazy" referrerpolicy="no-referrer" style="width:72px;height:72px;border-radius:12px;object-fit:cover"><span><b style="display:block;font-size:15px;margin-bottom:4px">{e(x["h"])}</b><span style="font-size:13px;color:#6b6a7a;line-height:1.5">{e(x["d"])}</span><span style="display:block;font-size:11.5px;color:#9a99a8;margin-top:3px">{e(x["date"].replace("-", "."))} 업로드</span></span></a>' for x in done)
    idx = f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8">{GA}
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>다꾸 추천 모음 · 선물·육아템·생활템 고르는 법 | 다꾸체험단</title><meta name="description" content="출산선물처럼 고민되는 쇼핑을 주제별로 정리한 다꾸체험단 추천 모음이에요. 고르는 기준과 예산별 상품을 함께 볼 수 있어요."><link rel="canonical" href="{SITE}/p/">
<link rel="icon" href="/icons/icon-192.png"><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>{CSS}.lst{{display:flex;flex-direction:column;gap:10px;margin-top:18px}}</style></head><body><div class="w">
<p class="disc">이 페이지는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>
<header><span class="hl"><button class="bk" type="button" aria-label="뒤로 가기" onclick="if(history.length>1&&document.referrer)history.back();else location.href='/'">‹</button><a class="logo" href="/">다꾸<i>체험단</i></a></span><a class="app" href="/#/mag">다꾸 매거진 ›</a></header>
<section class="hero"><h1>다꾸 추천 모음</h1><p class="lead">고민되는 쇼핑을 주제별로 정리했어요. 고르는 기준을 먼저 보고 상품을 둘러보세요.</p></section>
<div class="lst">{lis}</div>
<footer><a href="/g/">체험단 가이드 보기</a> · <a href="/">다꾸체험단 홈</a></footer>
</div><button id="totop" type="button" aria-label="맨 위로" onclick="scrollTo({{top:0,behavior:'smooth'}})">TOP</button><script>addEventListener("scroll",function(){{document.getElementById("totop").classList.toggle("on",scrollY>300)}},{{passive:true}});</script></body></html>
'''
    open(os.path.join(ROOT, "p", "index.html"), "w", encoding="utf-8").write(idx)
    print("추천 모음 페이지:", ", ".join(x["slug"] for x in done))
