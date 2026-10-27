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

CATN = {"stay": "숙박", "baby": "육아", "beauty": "뷰티", "life": "생활", "elec": "가전/가구", "health": "건강식품", "pet": "반려동물", "fashion": "패션", "etc": "티켓"}
CATF = {"stay": "stay", "baby": "baby", "beauty": "beauty", "life": "life", "elec": "elec", "health": "food", "pet": "pet", "fashion": "fashion", "etc": "etc"}
CHN = {"blog": "블로그", "clip": "클립", "insta": "인스타그램", "reels": "릴스", "youtube": "유튜브", "tiktok": "틱톡", "cafe": "맘카페",
       "coupang": "쿠팡 리뷰", "musinsa": "무신사 후기", "nshop": "네이버 구매평", "ohou": "오늘의집 리뷰", "olive": "올리브영 리뷰"}
PLAT_CH = ["coupang", "musinsa", "nshop", "ohou", "olive"]
def plat_of(it):
    b = str(it.get("benefit") or "") + " " + str(it.get("name") or ""); o = []
    if it.get("source") == "무신사" or re.search(r"무신사\s*체험단|무신사\s*(후기|리뷰)", b): o.append("musinsa")
    if re.search(r"쿠팡\s*(구매평|리뷰|포토\s*리뷰|상품평)|쿠팡리뷰", b): o.append("coupang")
    if re.search(r"네이버\s*(구매평|쇼핑\s*리뷰|스토어\s*리뷰)|스마트\s*스토어\s*(구매평|리뷰)", b): o.append("nshop")
    if re.search(r"오늘의집\s*(구매평|리뷰)|오늘의집\+", b): o.append("ohou")
    if re.search(r"올리브영\s*(구매평|리뷰)", b): o.append("olive")
    for x in (it.get("ch") or []):
        if x in PLAT_CH and x not in o: o.append(x)
    return o
def ch_of(it):
    c = [x for x in (it.get("ch") or []) if x != "review" and x not in PLAT_CH]; pl = plat_of(it)
    return c + pl
BAD_SIGUN = {"중구", "동구", "서구", "남구", "북구", "부산진구"}

GA = '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}(function(){var me=0;try{var q=location.search;if(/[?&]me=1/.test(q))localStorage.setItem("dakku-me","1");if(/[?&]me=0/.test(q))localStorage.removeItem("dakku-me");me=localStorage.getItem("dakku-me")==="1";}catch(e){}window.DAKKU_ME=me;if(me){window["ga-disable-G-NK2TCS1QHH"]=true;return;}var s=document.createElement("script");s.async=1;s.src="https://www.googletagmanager.com/gtag/js?id=G-NK2TCS1QHH";document.head.appendChild(s);gtag("js",new Date());gtag("config","G-NK2TCS1QHH");(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","yzkdp7btul");})();</script>'  # 구글 애널리틱스·클래리티(2026-10-18), ?me=1 로 들어온 기기(시온님)는 안 셈
def has_pay(it, w): return w in (it.get("pay") or []) or {"payback": "페이백", "review": "구매평"}[w] in str(it.get("benefit") or "")
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
.disc{margin:0 0 6px;font-size:11px;color:#999;line-height:1.5}
footer{margin-top:40px;font-size:12px;color:#999;line-height:1.7;border-top:1px solid #eee;padding-top:14px}"""

FOOT = ('<footer>다꾸체험단은 여러 체험단 사이트의 모집 정보를 모아 보여 주는 서비스로, 각 체험단 사이트와 무관해요. 신청·선정·진행은 해당 사이트에서 이뤄져요.<br>이 사이트는 쿠팡 파트너스, 마이리얼트립, 여기어때 등 제휴 활동의 일환으로 일정액의 수수료를 제공받을 수 있습니다.<br>'
        '다꾸체험단 (www.dagguu.com) · 운영 플랜비 · 대표 김정은 · 사업자등록번호 381-53-01054 · <a href="/ad-notice.html">광고 및 콘텐츠 표시 안내</a></footer>')

def shell(title, desc, canon, body, img="", robots="index,follow", ld=None):
    img = img or SITE + "/images/og.png"
    lds = "".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in (ld or []))
    return f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8">{GA}
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
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
<p class="disc">이 사이트는 쿠팡 파트너스 등 제휴 활동의 일환으로 일정액의 수수료를 제공받을 수 있습니다.</p>
<header><a class="logo" href="/">다꾸<i>체험단</i></a><a class="app" href="/">앱으로 보기</a></header>
{body}
{FOOT}
</div></body></html>
'''

APPX = """.frame{--tab:0px;padding-bottom:110px}.view{padding:0 16px}
.sx h2{font-size:18px;margin:30px 0 10px;letter-spacing:-.02em}
.sx .list{list-style:none;margin:0;padding:0}.sx .list li{border-bottom:1px solid #f0f0f0}
.sx .list a{display:flex;gap:12px;padding:12px 0;text-decoration:none;align-items:center;color:inherit}
.sx .list img{width:72px;height:72px;border-radius:10px;object-fit:cover;background:#f4f4f6;flex:none}
.sx .list b{display:block;font-size:15px;font-weight:600;line-height:1.35}.sx .list small{display:block;color:#888;font-size:12.5px;margin-top:2px}
.sx .tags{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0}.sx .tags a{font-size:13px;text-decoration:none;border:1px solid #e5e5e8;border-radius:999px;padding:5px 11px;color:#444}
.sx .sbc{display:block;width:auto;height:auto;position:static;font-size:12px;color:#999;margin:10px 0;writing-mode:horizontal-tb;word-break:keep-all}.sx .sbc a{color:inherit;text-decoration:none}
.sfoot{font-size:12px;color:#999;line-height:1.7;border-top:1px solid #eee;padding:14px 0 0;margin:30px 0 0}"""

APPJS = """<script>(function(){function p(n){return(n<10?"0":"")+n}
function ms(e){return new Date(e+"T23:59:59+09:00").getTime()+1000-Date.now()}
function t(e){var m=Math.max(0,ms(e)),d=Math.floor(m/864e5);m-=d*864e5;return(d>0?d+"일 ":"")+p(Math.floor(m/36e5))+":"+p(Math.floor(m%36e5/6e4))+":"+p(Math.floor(m%6e4/1e3))}
function tick(){[].forEach.call(document.querySelectorAll("[data-dcd]"),function(b){b.textContent=t(b.getAttribute("data-dcd"))})}tick();setInterval(tick,1000);
var a=document.getElementById("dcd"),f=document.getElementById("dcdfix");if(a&&f&&"IntersectionObserver" in window)new IntersectionObserver(function(es){es.forEach(function(x){f.classList.toggle("on",!x.isIntersecting&&x.boundingClientRect.top<0)})}).observe(a);
var s=document.getElementById("shb");if(s)s.onclick=function(){var d={title:document.title,url:location.href};if(navigator.share)navigator.share(d).catch(function(){});else if(navigator.clipboard)navigator.clipboard.writeText(location.href).then(function(){alert("링크를 복사했어요")})};
["gesturestart","gesturechange"].forEach(function(n){document.addEventListener(n,function(e){e.preventDefault()},{passive:false})});})();</script>"""

def shell_app(title, desc, canon, body, img="", robots="index,follow", ld=None, h=""):
    img = img or SITE + "/images/og.png"
    lds = "".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in (ld or []))
    BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'
    SRCH = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-3.5-3.5"/></svg>'
    return f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8">{GA}
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
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
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="/icons/icon-192.png">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/simple.css">
<style>{APPX}</style>{lds}
</head><body>
<div class="disclose">이 사이트는 쿠팡 파트너스, 토스쇼핑 쉐어링크, 여기어때, 마이리얼트립, 트립닷컴 등 제휴 활동의 일환으로 일정액의 수수료를 제공받을 수 있습니다.</div>
<div class="frame">
<header class="appbar"><span class="abl"><a class="backbtn" href="/" aria-label="홈으로">{BACK}</a><a class="logo" href="/"><img src="/icons/icon-192.png" alt="" width="30" height="30" style="border-radius:8px"><b class="wm">다꾸체험단</b></a></span><span class="hbtns"><a class="iconbtn" href="/#/list" aria-label="체험단 검색">{SRCH}</a></span></header>
<main class="view">{body}
<p class="sfoot">다꾸체험단은 여러 체험단 사이트의 모집 정보를 모아 보여 주는 서비스로, 각 체험단 사이트와 무관해요. 신청·선정·진행은 해당 사이트에서 이뤄져요.<br>다꾸체험단 (www.dagguu.com) · 운영 플랜비 · 대표 김정은 · 사업자등록번호 381-53-01054 · <a href="/ad-notice.html">광고 및 콘텐츠 표시 안내</a></p></main>
</div>{APPJS}</body></html>
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
    view = url(it.get("infUrl")) or url(it.get("viewUrl")); apply_ = url(it.get("refUrl")) or url(it.get("applyUrl"))
    ch = [CHN[c] for c in ch_of(it) if c in CHN]
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
    if cat == "stay" and isinstance(it.get("fee"), dict):
        for k, lab in (("p", "인원 추가"), ("b", "바베큐"), ("f", "불멍"), ("w", "온수·수영장"), ("j", "자쿠지·스파"), ("d", "반려동물")):
            if it["fee"].get(k): rows.append((lab, it["fee"][k] + " (모집 글 기준, 예약 때 숙소에 확인)"))
    if it.get("end"): rows.append(("모집 마감", f"{mmdd(it['end'])} ({it['end']})"))
    if ch: rows.append(("활동 매체", " · ".join(ch)))
    if it.get("source"): rows.append(("신청 사이트", it["source"]))
    # 2026-10-19 시온님 요청: 공유 페이지(s/)를 앱 상세 화면과 같은 모양으로 (앱 style.css·simple.css 를 그대로 씀)
    CHL = {"blog": "블로그", "insta": "인스타", "clip": "클립", "reels": "릴스", "youtube": "유튜브", "tiktok": "틱톡", "cafe": "맘카페",
           "coupang": "쿠팡 리뷰", "musinsa": "무신사 후기", "nshop": "네이버 구매평", "ohou": "오늘의집 리뷰", "olive": "올리브영 리뷰",
           "payback": "페이백", "review": "구매평", "premier": "프리미어 전용", "ret": "회수형"}
    pay = list(it.get("pay") or []); bn = str(it.get("benefit") or "")
    if "회수형" in bn and "ret" not in pay: pay.append("ret")
    if re.search("페이백|선결제", bn) and "payback" not in pay: pay.append("payback")
    if "구매평" in bn and "review" not in pay: pay.append("review")
    pl = plat_of(it)
    if pl: pay = [x for x in pay if x != "review"]
    chs = [c for c in (it.get("ch") or []) if c != "review" and c not in PLAT_CH]
    chs = (chs + pl) if chs else (pl or ([] if (it.get("ch") or pay) else ["blog"]))
    badges = [x for x in pay if x in ("premier", "ret")] + [x for x in pay if x not in ("premier", "ret")] + chs
    badge_html = ('<div class="chbs">' + "".join(f'<span class="chb chb-{e(c)}">{e(CHL.get(c, c))}</span>' for c in badges) + '</div>') if badges else ""
    endd = it.get("end") or ""
    dleft = None
    if endd:
        try: dleft = (datetime.strptime(endd, "%Y-%m-%d") - datetime.strptime(TODAY, "%Y-%m-%d")).days
        except Exception: pass
    dday = "마감" if not op else ("오늘 마감" if dleft == 0 else (f"D-{dleft}" if dleft is not None else ""))
    rows2 = f'<dt>제공 내역</dt><dd>{e(it.get("benefit") or "")}' + (f'<br><b>{e(it["worth"])} 상당</b>' if it.get("worth") else "") + '</dd>'
    rows2 += ('<dt>' + ('' if not op else '<i class="blink" aria-hidden="true"></i>') + '모집 기간</dt><dd>' + (e(mmdd(it.get("start"))) + ' ' if it.get("start") else '') +
              '~ ' + e(mmdd(endd)) + f' <span class="dd2{" hot" if (dleft is not None and dleft <= 3 and op) else ""}">{e(dday)}</span></dd>')
    ap = it.get("ap")
    if op and isinstance(ap, list) and len(ap) >= 2 and (ap[1] or 0) > 0:
        a0, a1 = int(ap[0] or 0), int(ap[1]); r = a0 / a1
        rows2 += '<dt>경쟁률</dt><dd>' + (f'모집 {a1:,} · <b>아직 지원자 없음</b>' if not a0 else f'지원 {a0:,} · 모집 {a1:,} <b>{(f"{r:.1f}" if r < 10 else round(r))}:1</b>') + '</dd>'
    rows2 += f'<dt>모집 사이트</dt><dd>{e(it.get("source") or "체험단 사이트")}</dd>'
    if it.get("region"): rows2 += f'<dt>지역</dt><dd>{e(it["region"])}</dd>'
    fee = ""
    if cat == "stay" and isinstance(it.get("fee"), dict):
        fr = [(k, em, lab) for k, em, lab in (("p", "👥", "인원 추가"), ("b", "🍖", "바베큐"), ("f", "🔥", "불멍"), ("w", "♨️", "온수·수영장"), ("j", "🛁", "자쿠지·스파"), ("d", "🐶", "반려동물")) if it["fee"].get(k)]
        if fr: fee = '<div class="feebox"><b class="fbt">추가 요금 안내</b><dl>' + "".join(f'<dt>{em} {lab}</dt><dd>{e(it["fee"][k])}</dd>' for k, em, lab in fr) + '</dl><small>모집 글에 적힌 내용이에요. 요금은 바뀔 수 있으니 예약할 때 숙소에 꼭 확인하세요.</small></div>'
    ai = (f'<div class="aisum"><span class="aisl">✦ AI 요약</span><p>{e(it["sum"])}</p><small>숙소·제품 소개 자료를 바탕으로 AI가 정리했어요. 정확한 정보는 판매 페이지에서 확인해 주세요.</small></div>') if (it.get("sum") or "").strip() else ""
    plab = "숙소 사진 보기" if cat == "stay" else ("입장권 가격 보기" if cat == "etc" else "제품 상세 보기")
    src = it.get("source") or "체험단 사이트"
    HEART = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>'
    SEND = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 3 10.2 13.8M21 3l-6.6 18-4.2-7.2L3 9.6Z"/></svg>'
    body = '<div class="pg dpg">'
    body += '<div class="dthimg">' + (f'<span class="dcd" id="dcd"><b data-dcd="{e(endd)}"></b> 남음</span>' if op and endd else '') + (f'<img src="{e(img)}" alt="{e(name)}" referrerpolicy="no-referrer" onerror="this.remove()">' if img else '') + '</div>'
    body += f'<div class="dhd">{badge_html}<h1>{e(name)}</h1><div class="dico"><span class="shtip">친구에게도 공유하기</span><button class="shb" id="shb" aria-label="공유하기">{SEND}</button></div></div>'
    if op and endd: body += f'<span class="dcd dcdfix" id="dcdfix" aria-hidden="true"><b data-dcd="{e(endd)}"></b> 남음</span>'
    body += f'<dl class="dtl">{rows2}</dl>' + fee + ai
    if op: body += f'<p class="dnote">신청은 {e(src)}에서 진행돼요. 리뷰 조건·체험 가능일을 꼭 확인해 주세요.</p>'
    else: body += f'<div class="dclosed"><b>모집이 끝난 체험단이에요</b><span>같은 {"숙소" if cat == "stay" else "제품"}가 다시 모집하면 다꾸 앱에서 알림으로 알려드려요.</span></div>'
    body += f'<div class="dbar"><a class="fv dbfav" href="/#/item?id={e(iid)}" aria-label="다꾸 앱에서 찜하기">{HEART}</a>'
    if view: body += f'<a class="dbl" href="{e(view)}" target="_blank" rel="sponsored nofollow noopener">{plab}</a>'
    if op and apply_: body += f'<a class="b pri dbp" href="{e(apply_)}" target="_blank" rel="nofollow noopener">신청하기</a>'
    elif not op: body += f'<a class="b pri dbp" href="/#/item?id={e(iid)}">🔔 재모집 알림받기</a>'
    body += '</div>'
    sim = [x for x in open_items if x["id"] != iid and (x.get("cat") or "stay") == cat and (cat != "stay" or (sg and sigun(x) == sg) or x.get("region") == it.get("region"))]
    if len(sim) < 6: sim += [x for x in open_items if x["id"] != iid and (x.get("cat") or "stay") == cat and x not in sim]
    sim = sort_open(sim)[:8]
    body += '<div class="sx">'
    if sim: body += f"<h2>지금 모집 중인 비슷한 체험단</h2><ul class='list'>" + "".join(li(x) for x in sim) + "</ul>"
    tags = [(f"{cn} 체험단 전체", f"/c/{CATF.get(cat,'stay')}.html")]
    if cat == "stay":
        for k in (sg, it.get("region")):
            if k and k in REG and (f"{k} 숙박 체험단", rslug(k)) not in tags: tags.append((f"{k} 숙박 체험단", rslug(k)))
    tags.append(("분야·지역별 모아보기", "/c/"))
    body += '<div class="tags">' + "".join(f'<a href="{e(p)}">{e(n)}</a>' for n, p in tags) + "</div>" + bc.replace('class="bc"', 'class="sbc"') + "</div>"
    body += '</div>'
    open(os.path.join(sdir, iid + ".html"), "w", encoding="utf-8").write(
        shell_app(title, desc, f"{SITE}/s/{iid}.html", body, img, "index,follow" if op else "noindex,follow", [bld], name))
    n_s += 1
    continue
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
    # 검색어에 맞게 그 지역에 실제 있는 숙소 유형을 제목에 (2026-10-18: 가평키즈풀빌라 1.4만·가평펜션 3.3만 등)
    _txt = " ".join((it.get("name", "") + " " + it.get("benefit", "")) for it in L)
    _ty = [t for t in ["키즈풀빌라", "키즈펜션", "애견동반펜션", "풀빌라", "독채펜션", "펜션", "글램핑", "카라반", "한옥", "호텔", "리조트"] if t.replace("애견동반", "애견") in _txt or t in _txt]
    _ty = _ty[:3]
    _tt = "·".join(_ty) if _ty else "숙박"
    hub(p, f"{k} {_tt} 체험단 모음", f"{k} {_tt} 숙박 체험단 중 지금 모집 중인 곳을 마감 빠른 순으로 모았어요.", L,
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
# 최신 글이 맨 위(2026-10-21 시온님): 날짜 내림차순, 같은 날이면 나중에 추가한 글 먼저
GUIDES = [g for _, g in sorted(enumerate(GUIDES), key=lambda x: (x[1]["date"], x[0]), reverse=True)]
gdot = lambda d: d.replace("-", ".")
gdir = reset("g"); ghubs = []
blog_open = sort_open([it for it in open_items if "blog" in (it.get("ch") or [])])
GCSS = "<style>.art p,.art li{font-size:16px;line-height:1.8;word-break:keep-all}.art h2{margin-top:34px}.art ol,.art ul{padding-left:22px}.art li{margin:8px 0}.meta{color:#999;font-size:12.5px}.art p.go{margin:4px 0 14px}.art a.go,.art p.go a{display:inline-block;margin:4px 12px 0 0;font-size:15px;font-weight:700;color:#5b3fd6;text-decoration:none}.art a.go:hover,.art p.go a:hover{text-decoration:underline}.gnav{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:6px 0 4px}.gnav a{display:inline-flex;align-items:center;gap:4px;font-size:14px;font-weight:600;color:#444;text-decoration:none;border:1px solid #e5e5e8;border-radius:999px;padding:7px 14px;background:#fff}.gnav a:hover{border-color:#5b3fd6;color:#5b3fd6}.gnav.bot{margin:26px 0 8px}</style>"
GBACK = "if(document.referrer.indexOf(location.origin)===0&&history.length>1){history.back();return false}"
for g in GUIDES:
    p = f"/g/{g['slug']}.html"
    bc, bld = crumbs([("홈", "/"), ("체험단 가이드", "/g/"), (g["title"], None)])
    art = {"@context": "https://schema.org", "@type": "Article", "headline": g["title"], "description": g["desc"], "datePublished": g["date"], "dateModified": g["date"],
           "author": {"@type": "Organization", "name": "다꾸체험단"}, "publisher": {"@type": "Organization", "name": "다꾸체험단"}, "mainEntityOfPage": SITE + p}
    gnav = lambda c: f'<nav class="gnav{c}"><a href="/g/" onclick="{GBACK}">‹ 뒤로가기</a><a href="/g/">☰ 목록보기</a></nav>'
    body = GCSS + bc + gnav("") + f"<h1>{e(g['title'])}</h1><p class='meta'>다꾸체험단 · {e(gdot(g['date']))} 업로드</p><div class='art'>{g['body']}</div>" + gnav(" bot")
    body += f"<h2>지금 모집 중인 블로그 체험단 ({len(blog_open)}곳)</h2><ul class='list'>" + "".join(li(x) for x in blog_open[:6]) + "</ul>"
    body += f'<div class="btns"><a class="btn pri" href="/c/blog.html">블로그 체험단 전체 보기</a><a class="btn ghost" href="/">다꾸 앱에서 오늘 오픈 체험단 알림 받기</a></div>'
    body += '<div class="tags">' + "".join(f'<a href="{e(u)}">{e(n)}</a>' for n, u in g.get("related", [])) + "</div>"
    open(os.path.join(gdir, g["slug"] + ".html"), "w", encoding="utf-8").write(shell(g["title"] + " | 다꾸체험단", g["desc"], SITE + p, body, "", "index,follow", [bld, art]))
    ghubs.append((g["title"], p, 0))
json.dump([{"slug": g["slug"], "t": g["title"], "d": g["desc"], "date": g["date"]} for g in GUIDES], open(os.path.join(gdir, "list.json"), "w", encoding="utf-8"), ensure_ascii=False)  # 앱 안 "체험단 가이드" 목록용
bc, bld = crumbs([("홈", "/"), ("체험단 가이드", None)])
gi = bc + "<h1>체험단 가이드</h1><p class='sub'>블로그 협찬·체험단을 처음 시작하는 분을 위한 글을 모았어요.</p><ul class='list'>" + "".join(
    f'<li><a href="{e(p)}"><span><b>{e(g["title"])}</b><small>{e(g["desc"])}</small><small class="gdate">{e(gdot(g["date"]))} 업로드</small></span></a></li>' for g, (_, p, _) in zip(GUIDES, ghubs)) + "</ul>"
open(os.path.join(gdir, "index.html"), "w", encoding="utf-8").write(shell("체험단 가이드 · 블로그 협찬 받는 법 | 다꾸체험단", "블로그 협찬 받는 법, 블로그 지수, 블로그 수익 내는 법 등 체험단을 시작하는 분을 위한 가이드.", SITE + "/g/", gi, "", "index,follow", [bld]))
idx += "<h2>체험단 가이드</h2><div class='tags'>" + "".join(f'<a href="{e(p)}">{e(n)}</a>' for n, p, _ in ghubs) + "</div>"
open(os.path.join(cdir, "index.html"), "w", encoding="utf-8").write(
    shell("체험단 모음 사이트 · 분야별·지역별 체험단 모아보기 | 다꾸체험단", "블로그·인스타·릴스 체험단, 숙박·육아·뷰티·생활·가전·식품·반려동물 체험단과 지역별 숙박 체험단을 한곳에 모았어요. 매일 업데이트.", SITE + "/c/", idx, "", "index,follow", [crumbs([("홈", "/"), ("모아보기", None)])[1]]))

# ---------- sitemap ----------
urls = [(SITE + "/", "daily"), (SITE + "/c/", "daily"), (SITE + "/refund.html", "monthly"), (SITE + "/ad-notice.html", "monthly"), (SITE + "/edu.html", "weekly")] + [(SITE + p, "daily") for _, p, _ in hubs + chhubs] + [(SITE + "/g/", "weekly"), (SITE + "/p/", "weekly")] + [(SITE + p, "weekly") for _, p, _ in ghubs] + [(f"{SITE}/s/{it['id']}.html", "weekly") for it in open_items] + [(f"{SITE}/p/{os.path.basename(f)[6:-5].replace('_', '-')}.html", "weekly") for f in __import__("glob").glob(os.path.join(ROOT, "scripts", "picks_*.json"))]
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(
    f"<url><loc>{e(u)}</loc><lastmod>{TODAY}</lastmod><changefreq>{f}</changefreq></url>\n" for u, f in urls) + "</urlset>\n"
open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write(sm)

# ---------- t/ 하루특가 공유 (앱으로 이동, 검색 제외) ----------
def redirect_page(title, desc, img, target):
    return f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8">{GA}
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
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

# 수익화 교육 정적 페이지(edu.html)도 모집 중 체험단 목록과 함께 새로 만든다
try:
    import subprocess, sys as _s
    subprocess.run([_s.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "gen_edu.py")], check=False)
    subprocess.run([_s.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "gen_picks.py")], check=False)  # 추천 모음 p/ (2026-10-20)
    subprocess.run([_s.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "gen_rank.py")], check=False)
    subprocess.run([_s.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "gen_stays.py")], check=False)
    subprocess.run([_s.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "split_data.py")], check=False)  # 첫 화면용 data-live.json / 예전 마감 data-past.json (2026-10-27)
    subprocess.run([_s.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "add_mv.py")], check=False)  # 매거진 조회수 (2026-10-25)  # 국내숙소추천 매거진 m/ (2026-10-24)  # 공구 탭 테마 랭킹 rank.json (2026-10-23)
except Exception as _e:
    print("gen_edu 실패", _e)
