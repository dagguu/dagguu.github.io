#!/usr/bin/env python3
"""공유·검색용 정적 페이지 만들기 (data.json 을 바꿀 때마다 실행).

  s/<체험단 id>.html : 체험단 한 곳의 내용 페이지. 카톡 미리보기 사진 + 네이버·구글 검색용 본문
                       (2026-10-18 검색 유입용으로 바꿈: 예전엔 noindex + 바로 앱으로 이동이었음)
                       모집이 끝난 곳은 noindex,follow (검색에서 빠지게)
  c/<분야>.html       : 분야별 모집 중 체험단 모아보기 (숙박·육아·뷰티…)
  r/<지역>.html       : 지역별 숙박 체험단 모아보기 (권역 + 숙소 이름 괄호 속 시·군)
  c/index.html        : 모아보기 전체 목록
  sitemap.xml         : 홈 + 모아보기 + 모집 중 체험단
  t/<토스 코드>.html  : 하루특가 공유 미리보기 (앱 #/deals?t=… 로 이동, noindex)
"""
import json, html, os, re, shutil, collections, urllib.parse
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://www.dagguu.com"
KST = timezone(timedelta(hours=9))
NOW = datetime.now(KST)
TODAY = NOW.strftime("%Y-%m-%d")
d = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))
e = lambda s: html.escape(str(s or ""), quote=True)

CATN = {"stay": "숙박", "baby": "육아", "beauty": "뷰티", "life": "생활", "elec": "가전/가구", "health": "식품", "pet": "반려동물"}
CATF = {"stay": "stay", "baby": "baby", "beauty": "beauty", "life": "life", "elec": "elec", "health": "food", "pet": "pet"}
CHN = {"blog": "블로그", "clip": "클립", "insta": "인스타그램", "reels": "릴스", "youtube": "유튜브", "tiktok": "틱톡"}
BAD_SIGUN = {"중구", "동구", "서구", "남구", "북구", "부산진구"}

def reset(name):
    p = os.path.join(ROOT, name)
    shutil.rmtree(p, ignore_errors=True)
    os.makedirs(p)
    return p

def mmdd(s):
    try: return datetime.fromisoformat(str(s)[:10]).strftime("%-m월 %-d일")
    except Exception: return ""

def url(u):
    u = str(u or "").strip()
    return u if re.match(r"^https?://", u) else ""

def img_of(it):
    img = it.get("image") or ""
    if img and not img.startswith("http"): img = SITE + "/" + img.lstrip("/")
    return img

def is_open(it):
    return not it.get("closed") and (it.get("end") or "9999") >= TODAY

def sigun(it):
    m = re.search(r"\(([^)]*)\)\s*$", it.get("name") or "")
    return m.group(1).strip() if m and m.group(1).strip() not in BAD_SIGUN else ""

def bare(it):
    return re.sub(r"\s*\([^)]*\)\s*$", "", it.get("name") or "").strip()

CSS = """*{box-sizing:border-box}body{margin:0;background:#fff;color:#111;font-family:"Pretendard Variable",Pretendard,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit}.w{max-width:640px;margin:0 auto;padding:0 16px 48px}
header{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #eee;margin-bottom:16px}
header a.logo{font-weight:900;font-size:19px;text-decoration:none;letter-spacing:-.04em}header a.logo i{font-style:normal;color:#5b3fd6}
header a.app{font-size:13px;font-weight:700;text-decoration:none;background:#111;color:#fff;padding:7px 12px;border-radius:999px}
.bc{font-size:12.5px;color:#888;margin:0 0 10px}.bc a{text-decoration:none}
h1{font-size:24px;line-height:1.35;margin:4px 0 6px;letter-spacing:-.03em;word-break:keep-all}
.sub{color:#666;font-size:14px;margin:0 0 14px}
.hero{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px;background:#f4f4f6;display:block}
dl{display:grid;grid-template-columns:88px 1fr;gap:8px 10px;margin:16px 0;font-size:14.5px}dt{color:#888}dd{margin:0;word-break:keep-all}
.btns{display:flex;flex-direction:column;gap:8px;margin:18px 0}
.btn{display:block;text-align:center;padding:14px;border-radius:12px;font-weight:800;text-decoration:none;font-size:15.5px}
.pri{background:#5b3fd6;color:#fff}.sec{background:#f2f2f4;color:#222}.ghost{border:1px solid #ddd;color:#333}
.note{font-size:12px;color:#999;margin:6px 0 0}
h2{font-size:18px;margin:30px 0 10px;letter-spacing:-.02em}
.list{list-style:none;margin:0;padding:0}.list li{border-bottom:1px solid #f0f0f0}
.list a{display:flex;gap:12px;padding:12px 0;text-decoration:none;align-items:center}
.list img{width:72px;height:72px;border-radius:10px;object-fit:cover;background:#f4f4f6;flex:none}
.list b{display:block;font-size:15px;font-weight:600;line-height:1.35}.list small{display:block;color:#888;font-size:12.5px;margin-top:2px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.tags a{font-size:13px;text-decoration:none;border:1px solid #e5e5e8;border-radius:999px;padding:5px 11px;color:#444}
.closed{background:#fff3f3;color:#c22;padding:10px 12px;border-radius:10px;font-size:14px;margin:10px 0}
footer{margin-top:40px;font-size:12px;color:#999;line-height:1.7;border-top:1px solid #eee;padding-top:14px}"""

FOOT = ('<footer>이 사이트는 쿠팡 파트너스, 마이리얼트립, 여기어때 등 제휴 활동의 일환으로 일정액의 수수료를 제공받을 수 있습니다.<br>'
        '다꾸체험단 (www.dagguu.com) · 운영 플랜비 · 대표 김정은 · 사업자등록번호 381-53-01054</footer>')

def shell(title, desc, canon, body, img="", robots="index,follow", ld=None):
    img = img or SITE + "/images/og.png"
    lds = "".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in (ld or []))
    return f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{e(canon)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="다꾸체험단">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{e(canon)}">
<meta property="og:image" content="{e(img)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icons/icon-192.png">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>{CSS}</style>{lds}
</head><body><div class="w">
<header><a class="logo" href="/">다꾸<i>체험단</i></a><a class="app" href="/">앱으로 보기</a></header>
{body}
{FOOT}
</div></body></html>
'''

def crumbs(parts):
    """parts: [(이름, 경로 or None)]"""
    h = '<p class="bc">' + " › ".join(f'<a href="{e(p)}">{e(n)}</a>' if p else e(n) for n, p in parts) + "</p>"
    ld = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, **({"item": SITE + p} if p else {})} for i, (n, p) in enumerate(parts)]}
    return h, ld

def li(it):
    meta = [CATN.get(it.get("cat") or "stay", "")]
    if it.get("worth"): meta.append(f"{it['worth']} 상당")
    if it.get("end"): meta.append(f"{mmdd(it['end'])}까지")
    im = img_of(it)
    return (f'<li><a href="/s/{e(it["id"])}.html">' + (f'<img src="{e(im)}" alt="" loading="lazy" referrerpolicy="no-referrer">' if im else '<img alt="">') +
            f'<span><b>{e(it.get("name"))}</b><small>{e(" · ".join(x for x in meta if x))}</small></span></a></li>')

def sort_open(L):
    return sorted(L, key=lambda x: (x.get("end") or "9999", x.get("id")))

items = [it for it in d.get("items", []) if re.fullmatch(r"[A-Za-z0-9_-]+", str(it.get("id", "")))]
open_items = [it for it in items if is_open(it)]

# 지역 모음: 숙박만, 권역(item.region) + 시·군(이름 괄호)
REG = collections.defaultdict(list)
for it in open_items:
    if (it.get("cat") or "stay") != "stay": continue
    for k in {it.get("region") or "", sigun(it)}:
        if k: REG[k].append(it)
def rslug(k): return "/r/" + urllib.parse.quote(k) + ".html"

# ---------- s/ 체험단 페이지 ----------
sdir = reset("s")
n_s = 0
for it in items:
    iid = it["id"]; cat = it.get("cat") or "stay"; cn = CATN.get(cat, "체험단"); op = is_open(it)
    name = it.get("name") or ""; sg = sigun(it); img = img_of(it)
    view = url(it.get("infUrl")) or url(it.get("viewUrl")); apply_ = url(it.get("applyUrl"))
    ch = [CHN[c] for c in (it.get("ch") or []) if c in CHN]
    title = f"{name} {cn} 체험단" + (f" · {mmdd(it['end'])}까지 모집" if it.get("end") and op else (" (모집 마감)" if not op else "")) + " | 다꾸체험단"
    bits = []
    if it.get("benefit"): bits.append(str(it["benefit"])[:70])
    if it.get("worth"): bits.append(f"{it['worth']} 상당")
    if it.get("end"): bits.append(f"{mmdd(it['end'])}까지 모집")
    if it.get("source"): bits.append(f"{it['source']}에서 신청")
    desc = f"{name} {cn} 체험단 정보 — " + " · ".join(bits)
    parts = [("홈", "/"), (f"{cn} 체험단", f"/c/{CATF.get(cat,'stay')}.html")]
    if cat == "stay" and sg and sg in REG: parts.append((f"{sg} 숙박 체험단", rslug(sg)))
    parts.append((bare({"name": name}) or name, None))
    bc, bld = crumbs(parts)
    rows = [("분야", f"{cn} 체험단")]
    if cat == "stay": rows.append(("지역", " · ".join(x for x in (it.get("region"), sg) if x)))
    if it.get("benefit"): rows.append(("제공 내역", it["benefit"]))
    if it.get("worth"): rows.append(("금액", f"{it['worth']} 상당"))
    if it.get("end"): rows.append(("모집 마감", f"{mmdd(it['end'])} ({it['end']})"))
    if ch: rows.append(("활동 매체", " · ".join(ch)))
    if it.get("source"): rows.append(("신청 사이트", it["source"]))
    body = bc + f"<h1>{e(name)} {e(cn)} 체험단</h1>"
    body += f'<p class="sub">{e(it.get("source") or "")}{" 모집 · " if it.get("source") else ""}{e(mmdd(it.get("end")) + "까지") if it.get("end") else "상시 모집"}</p>'
    if not op: body += '<p class="closed">이 체험단은 모집이 끝났어요. 아래에서 지금 모집 중인 비슷한 체험단을 확인해 보세요.</p>'
    if img: body += f'<img class="hero" src="{e(img)}" alt="{e(name)}" referrerpolicy="no-referrer">'
    body += "<dl>" + "".join(f"<dt>{e(a)}</dt><dd>{e(b)}</dd>" for a, b in rows if b) + "</dl>"
    body += '<div class="btns">'
    if op and apply_: body += f'<a class="btn pri" href="{e(apply_)}" target="_blank" rel="nofollow noopener">{e(it.get("source") or "신청 사이트")}에서 신청하기</a>'
    if view: body += f'<a class="btn sec" href="{e(view)}" target="_blank" rel="sponsored nofollow noopener">{"숙소" if cat=="stay" else "상품"} 먼저 보기 (광고)</a>'
    body += f'<a class="btn ghost" href="/#/item?id={e(iid)}">다꾸 앱에서 찜하고 마감 알림 받기</a></div>'
    if view: body += '<p class="note">"먼저 보기" 링크로 구매·예약하면 다꾸가 일정액의 수수료를 받을 수 있어요.</p>'
    sim = [x for x in open_items if x["id"] != iid and (x.get("cat") or "stay") == cat and (cat != "stay" or (sg and sigun(x) == sg) or x.get("region") == it.get("region"))]
    if len(sim) < 6: sim += [x for x in open_items if x["id"] != iid and (x.get("cat") or "stay") == cat and x not in sim]
    sim = sort_open(sim)[:8]
    if sim:
        body += f"<h2>지금 모집 중인 비슷한 체험단</h2><ul class='list'>" + "".join(li(x) for x in sim) + "</ul>"
    tags = [(f"{cn} 체험단 전체", f"/c/{CATF.get(cat,'stay')}.html")]
    if cat == "stay":
        for k in (sg, it.get("region")):
            if k and k in REG and (f"{k} 숙박 체험단", rslug(k)) not in tags: tags.append((f"{k} 숙박 체험단", rslug(k)))
    tags.append(("분야·지역별 모아보기", "/c/"))
    body += '<div class="tags">' + "".join(f'<a href="{e(p)}">{e(n)}</a>' for n, p in tags) + "</div>"
    open(os.path.join(sdir, iid + ".html"), "w", encoding="utf-8").write(
        shell(title, desc, f"{SITE}/s/{iid}.html", body, img, "index,follow" if op else "noindex,follow", [bld]))
    n_s += 1

# ---------- c/ 분야, r/ 지역 모아보기 ----------
cdir = reset("c"); rdir = reset("r")
def hub(path, h1, sub, L, parts, extra=""):
    bc, bld = crumbs(parts)
    body = bc + f"<h1>{e(h1)}</h1><p class='sub'>{e(sub)}</p>" + extra
    body += "<ul class='list'>" + "".join(li(x) for x in L) + "</ul>" if L else "<p>지금 모집 중인 체험단이 없어요. 다꾸 앱에서 알림을 켜 두면 새로 올라올 때 알려드려요.</p>"
    body += '<div class="btns"><a class="btn pri" href="/">다꾸체험단 앱에서 전체 보기</a></div>'
    desc = f"{sub} {', '.join(bare(x) for x in L[:5])} 등"
    open(os.path.join(ROOT, urllib.parse.unquote(path).lstrip("/")), "w", encoding="utf-8").write(
        shell(f"{h1} ({len(L)}곳 모집 중) | 다꾸체험단", desc[:150], SITE + path, body, img_of(L[0]) if L else "", "index,follow", [bld]))

hubs = []
by_cat = collections.defaultdict(list)
for it in open_items: by_cat[it.get("cat") or "stay"].append(it)
for cat, cn in CATN.items():
    L = sort_open(by_cat.get(cat, []))
    extra = ""
    if cat == "stay":
        top = sorted(REG.items(), key=lambda kv: -len(kv[1]))
        extra = '<div class="tags">' + "".join(f'<a href="{e(rslug(k))}">{e(k)} {len(v)}</a>' for k, v in top) + "</div>"
    p = f"/c/{CATF[cat]}.html"
    alt = {"stay": "숙박·숙소 체험단 모음", "baby": "육아·육아용품 체험단 모음", "beauty": "뷰티·화장품 체험단 모음", "pet": "반려동물·강아지·고양이 체험단 모음"}.get(cat, f"{cn} 체험단 모음")
    hub(p, alt, f"지금 모집 중인 {cn} 체험단을 마감 빠른 순으로 모았어요. 매일 업데이트해요.", L, [("홈", "/"), (f"{cn} 체험단", None)], extra)
    hubs.append((f"{cn} 체험단", p, len(L)))
# 매체·조건별 (2026-10-18 검색광고 키워드도구: 블로그 체험단 월 2만·인스타 540·구매평 540·릴스 230)
def has_pay(it, w): return w in (it.get("pay") or []) or {"payback": "페이백", "review": "구매평"}[w] in str(it.get("benefit") or "")
CHHUB = [("blog", "블로그 체험단 모음", "블로그 리뷰로 참여하는", lambda it: "blog" in (it.get("ch") or [])),
         ("insta", "인스타 체험단 모음", "인스타그램 피드로 참여하는", lambda it: "insta" in (it.get("ch") or [])),
         ("reels", "릴스·숏폼 체험단 모음", "릴스·클립·쇼츠로 참여하는", lambda it: bool({"reels", "clip", "youtube", "tiktok"} & set(it.get("ch") or []))),
         ("review", "구매평·페이백 체험단 모음", "먼저 구매하고 구매평을 남기면 금액을 돌려받는", lambda it: has_pay(it, "payback") or has_pay(it, "review"))]
chhubs = []
for slug, h1, how, f in CHHUB:
    L = sort_open([it for it in open_items if f(it)]); p = f"/c/{slug}.html"
    hub(p, h1, f"{how} 체험단 중 지금 모집 중인 곳을 마감 빠른 순으로 모았어요. 숙박·육아·뷰티·생활·식품 전 분야.", L, [("홈", "/"), (h1.replace(" 모음", ""), None)])
    chhubs.append((h1.replace(" 모음", ""), p, len(L)))
for k, L in REG.items():
    L = sort_open(L); p = rslug(k)
    hub(p, f"{k} 숙박 체험단 모음", f"{k} 호텔·펜션·풀빌라 숙박 체험단 중 지금 모집 중인 곳을 마감 빠른 순으로 모았어요.", L,
        [("홈", "/"), ("숙박 체험단", "/c/stay.html"), (f"{k} 숙박 체험단", None)])
    hubs.append((f"{k} 숙박 체험단", p, len(L)))
bc, bld = crumbs([("홈", "/"), ("모아보기", None)])
idx = bc + "<h1>체험단 모아보기</h1><p class='sub'>분야별·지역별로 지금 모집 중인 체험단을 모았어요.</p>"
idx += "<h2>분야별</h2><div class='tags'>" + "".join(f'<a href="{e(p)}">{e(n)} {c}</a>' for n, p, c in hubs[:len(CATN)]) + "</div>"
idx += "<h2>참여 방법별</h2><div class='tags'>" + "".join(f'<a href="{e(p)}">{e(n)} {c}</a>' for n, p, c in chhubs) + "</div>"
idx += "<h2>지역별 숙박</h2><div class='tags'>" + "".join(f'<a href="{e(p)}">{e(n)} {c}</a>' for n, p, c in sorted(hubs[len(CATN):], key=lambda x: -x[2])) + "</div>"
open(os.path.join(cdir, "index.html"), "w", encoding="utf-8").write(
    shell("체험단 모음 사이트 · 분야별·지역별 체험단 모아보기 | 다꾸체험단", "블로그·인스타·릴스 체험단, 숙박·육아·뷰티·생활·가전·식품·반려동물 체험단과 지역별 숙박 체험단을 한곳에 모았어요. 매일 업데이트.", SITE + "/c/", idx, "", "index,follow", [bld]))

# ---------- g/ 가이드 글 (scripts/guides.py) ----------
import sys; sys.path.insert(0, os.path.join(ROOT, "scripts"))
from guides import GUIDES
gdir = reset("g"); ghubs = []
blog_open = sort_open([it for it in open_items if "blog" in (it.get("ch") or [])])
GCSS = "<style>.art p,.art li{font-size:16px;line-height:1.8;word-break:keep-all}.art h2{margin-top:34px}.art ol,.art ul{padding-left:22px}.art li{margin:8px 0}.meta{color:#999;font-size:12.5px}.art p.go{margin:4px 0 14px}.art a.go,.art p.go a{display:inline-block;margin:4px 12px 0 0;font-size:15px;font-weight:700;color:#5b3fd6;text-decoration:none}.art a.go:hover,.art p.go a:hover{text-decoration:underline}</style>"
for g in GUIDES:
    p = f"/g/{g['slug']}.html"
    bc, bld = crumbs([("홈", "/"), ("체험단 가이드", "/g/"), (g["title"], None)])
    art = {"@context": "https://schema.org", "@type": "Article", "headline": g["title"], "description": g["desc"], "datePublished": g["date"], "dateModified": g["date"],
           "author": {"@type": "Organization", "name": "다꾸체험단"}, "publisher": {"@type": "Organization", "name": "다꾸체험단"}, "mainEntityOfPage": SITE + p}
    body = GCSS + bc + f"<h1>{e(g['title'])}</h1><p class='meta'>다꾸체험단 · {e(g['date'])}</p><div class='art'>{g['body']}</div>"
    body += f"<h2>지금 모집 중인 블로그 체험단 ({len(blog_open)}곳)</h2><ul class='list'>" + "".join(li(x) for x in blog_open[:6]) + "</ul>"
    body += f'<div class="btns"><a class="btn pri" href="/c/blog.html">블로그 체험단 전체 보기</a><a class="btn ghost" href="/">다꾸 앱에서 오늘 오픈 체험단 알림 받기</a></div>'
    body += '<div class="tags">' + "".join(f'<a href="{e(u)}">{e(n)}</a>' for n, u in g.get("related", [])) + "</div>"
    open(os.path.join(gdir, g["slug"] + ".html"), "w", encoding="utf-8").write(shell(g["title"] + " | 다꾸체험단", g["desc"], SITE + p, body, "", "index,follow", [bld, art]))
    ghubs.append((g["title"], p, 0))
json.dump([{"slug": g["slug"], "t": g["title"], "d": g["desc"]} for g in GUIDES], open(os.path.join(gdir, "list.json"), "w", encoding="utf-8"), ensure_ascii=False)  # 앱 안 "체험단 가이드" 목록용
bc, bld = crumbs([("홈", "/"), ("체험단 가이드", None)])
gi = bc + "<h1>체험단 가이드</h1><p class='sub'>블로그 협찬·체험단을 처음 시작하는 분을 위한 글을 모았어요.</p><ul class='list'>" + "".join(
    f'<li><a href="{e(p)}"><span><b>{e(g["title"])}</b><small>{e(g["desc"])}</small></span></a></li>' for g, (_, p, _) in zip(GUIDES, ghubs)) + "</ul>"
open(os.path.join(gdir, "index.html"), "w", encoding="utf-8").write(shell("체험단 가이드 · 블로그 협찬 받는 법 | 다꾸체험단", "블로그 협찬 받는 법, 블로그 지수, 블로그 수익 내는 법 등 체험단을 시작하는 분을 위한 가이드.", SITE + "/g/", gi, "", "index,follow", [bld]))
idx += "<h2>체험단 가이드</h2><div class='tags'>" + "".join(f'<a href="{e(p)}">{e(n)}</a>' for n, p, _ in ghubs) + "</div>"
open(os.path.join(cdir, "index.html"), "w", encoding="utf-8").write(
    shell("체험단 모음 사이트 · 분야별·지역별 체험단 모아보기 | 다꾸체험단", "블로그·인스타·릴스 체험단, 숙박·육아·뷰티·생활·가전·식품·반려동물 체험단과 지역별 숙박 체험단을 한곳에 모았어요. 매일 업데이트.", SITE + "/c/", idx, "", "index,follow", [crumbs([("홈", "/"), ("모아보기", None)])[1]]))

# ---------- sitemap ----------
urls = [(SITE + "/", "daily"), (SITE + "/c/", "daily")] + [(SITE + p, "daily") for _, p, _ in hubs + chhubs] + [(SITE + "/g/", "weekly")] + [(SITE + p, "weekly") for _, p, _ in ghubs] + [(f"{SITE}/s/{it['id']}.html", "weekly") for it in open_items]
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(
    f"<url><loc>{e(u)}</loc><lastmod>{TODAY}</lastmod><changefreq>{f}</changefreq></url>\n" for u, f in urls) + "</urlset>\n"
open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write(sm)

# ---------- t/ 하루특가 공유 (앱으로 이동, 검색 제외) ----------
def redirect_page(title, desc, img, target):
    return f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)}</title>
<meta name="robots" content="noindex">
<meta name="description" content="{e(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="다꾸체험단">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{e(img)}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url={e(target)}">
<script>location.replace({json.dumps(target)});</script>
</head><body style="font-family:sans-serif;text-align:center;padding:40px 16px">
<p><a href="{e(target)}">다꾸체험단에서 보기 ›</a></p>
</body></html>
'''
tdir = reset("t")
n_t = 0
for x in d.get("toss", []):
    m = re.search(r"/_m/([A-Za-z0-9_-]+)", str(x.get("u", "")))
    if not m: continue
    code = m.group(1)
    price = " ".join(p for p in (x.get("rate"), x.get("price")) if p)
    open(os.path.join(tdir, code + ".html"), "w", encoding="utf-8").write(redirect_page(
        f"🛒 {x.get('name','')}", (f"🔥 {price} · " if price else "") + "오늘의 하루특가 | 다꾸체험단",
        x.get("img") or SITE + "/images/og.png", "/#/deals?t=" + code))
    n_t += 1

print(f"체험단 페이지 {n_s}개(모집 중 {len(open_items)}), 모아보기 {len(hubs)+1}개, 사이트맵 {len(urls)}개 주소, 하루특가 {n_t}개")
