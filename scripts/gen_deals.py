#!/usr/bin/env python3
"""다꾸 숙박 특가 페이지 d/<key>.html + 단톡방 특가 글 (2026-11-06 시온님 "단톡방에 특가숙소 정보를 체험단이랑 같이,
다꾸 숙박 특가 링크로 연결되는 주소로").

  d/<key>.html  : 특가 숙소 한 곳 (사진·조건·가격·조회 시각·"특가 보러가기" 수익 링크·같은 지역 숙박 체험단). noindex.
                  key = m-xxxxxxxx(마이리얼트립 mrtDeals) · g-<쿠팡 상품번호>(골드박스 숙소 goldTravel) · t-xxxxxxxx(travelDeals)
                  지금 데이터에 없는 예전 페이지는 지우지 않고 "끝난 특가" 페이지로 바꾼다(단톡방에 보낸 링크가 깨지지 않게).
  d/index.html  : 오늘의 숙박 특가 모음.
  --chat [N]    : 단톡방 글(특가 N곳 = 숙소 N-1 + 입장권 1, 체험단은 넣지 않음 — 2026-11-06 시온님)을 chat/deal-YYYY-MM-DD.txt 에 쓰고 출력한다(커밋 안 함).

숫자는 data.json 그대로만 쓴다. 비교("다른 앱은 …")·과장어·클릭 요청은 쓰지 않는다.
"""
import json, os, re, sys, html, hashlib, datetime as dt

KST = dt.timezone(dt.timedelta(hours=9))
NOW = dt.datetime.now(KST)
TODAY = NOW.strftime("%Y-%m-%d")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://www.dagguu.com"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))
_gs = open(os.path.join(ROOT, "scripts", "gen_share.py"), encoding="utf-8").read()
GA = re.search(r"^GA = '(.*?)'  #", _gs, re.M).group(1)  # gen_share.py 와 같은 GA·Clarity 태그
e = lambda s: html.escape(str(s or ""), quote=True)
WD = "월화수목금토일"

def h8(s): return hashlib.sha1(str(s).encode()).hexdigest()[:8]
def won(n):
    try: return f"{int(float(n)):,}원"
    except Exception: return ""
def man(n):  # 56100 -> 5만원대
    try: n = int(float(n))
    except Exception: return ""
    return f"{n // 10000}만원대" if n >= 10000 else won(n)
def md(s):
    try:
        x = dt.date.fromisoformat(str(s)[:10]); return f"{x.month}/{x.day}({WD[x.weekday()]})"
    except Exception: return ""

REG = {"제주": "제주", "서귀포": "제주", "부산": "부산", "해운대": "부산", "강릉": "강원", "속초": "강원", "양양": "강원", "평창": "강원", "춘천": "강원", "홍천": "강원",
       "고성": "강원", "삼척": "강원", "동해": "강원", "가평": "경기", "양평": "경기", "포천": "경기", "파주": "경기", "서울": "서울", "인천": "인천", "강화": "인천",
       "경주": "경상", "포항": "경상", "거제": "경상", "통영": "경상", "남해": "경상", "여수": "전라", "전주": "전라", "목포": "전라", "순천": "전라",
       "태안": "충청", "보령": "충청", "단양": "충청", "제천": "충청", "대전": "충청"}
def reg_of(s):
    for k, v in REG.items():
        if k in str(s or ""): return v
    return ""

def deals():
    out = []
    mi = d.get("mrtInfo") or {}
    for x in d.get("mrtDeals") or []:
        if not x.get("dom") or not x.get("u") or not x.get("price"): continue
        out.append({"key": "m-" + h8(x["name"]), "kind": "숙소", "src": "마이리얼트립", "name": x["name"], "area": x.get("region", ""), "img": x.get("img", ""),
                    "price": x.get("price"), "orig": x.get("orig"), "rate": x.get("rate"),
                    "score": x.get("score"), "reviews": x.get("reviews"), "u": x["u"],
                    "cond": f"{md(mi.get('checkIn'))} 1박 · 성인 {mi.get('adults', 2)}명", "at": (mi.get("updated") or "")[:16],
                    "until": mi.get("checkOut") or ""})
    for x in d.get("goldTravel") or []:
        if x.get("kind") not in ("숙소", "레저 티켓") or not x.get("u") or (x.get("endAt") or "") < NOW.isoformat()[:19]: continue
        pid = (re.search(r"/products/(\d+)", x.get("cpUrl", "")) or [None, h8(x["name"])])[1]
        out.append({"key": "g-" + pid, "kind": "입장권" if x.get("kind") == "레저 티켓" else "숙소", "src": "쿠팡 골드박스", "name": x["name"], "area": x.get("area", ""), "img": x.get("img", ""),
                    "price": x.get("price"), "orig": x.get("orig"), "rate": x.get("rate"), "u": x["u"],
                    "cond": "골드박스 특가 (다음 날 오전 7시까지)", "at": (d.get("goldSoldAt") or "")[:16], "until": (x.get("endAt") or "")[:10]})
    for x in d.get("travelDeals") or []:
        if (x.get("until") or "9999") < TODAY or not x.get("u"): continue
        out.append({"key": "t-" + h8(x["u"]), "kind": "입장권" if re.search("입장|티켓|이용권|레저", str(x.get("kind", ""))) else "숙소", "src": x.get("src", ""), "name": x["name"], "area": x.get("area", ""), "img": x.get("img", ""),
                    "price": x.get("price"), "orig": x.get("orig"), "rate": (round((1 - x["price"] / x["orig"]) * 100) if x.get("orig") and x.get("price") else None),
                    "u": x["u"], "cond": x.get("cond", ""), "at": x.get("at", ""), "until": x.get("until", "")})
    return out

def stays_near(area, n=3, cat="stay"):
    rg = reg_of(area)
    L = [i for i in d.get("items", []) if i.get("cat") == cat and not i.get("closed") and (i.get("end") or "") >= TODAY]
    L.sort(key=lambda i: (i.get("region") != rg, -(i.get("createdAt") or 0)))
    return L[:n]

CSS = """*{box-sizing:border-box}body{margin:0;background:#fff;color:#111;font-family:"Pretendard Variable",Pretendard,-apple-system,"Apple SD Gothic Neo",sans-serif;line-height:1.6}
a{color:inherit}.w{max-width:640px;margin:0 auto;padding:0 16px 48px}.disc{margin:8px 0 0;font-size:11px;color:#999}
header{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #eee;margin-bottom:14px}
.logo{font-weight:900;font-size:19px;text-decoration:none;letter-spacing:-.04em}.logo i{font-style:normal;color:#5b3fd6}
.app{font-size:13px;font-weight:700;text-decoration:none;background:#111;color:#fff;padding:7px 12px;border-radius:999px}
.k{display:inline-block;font-size:12px;font-weight:800;color:#5b3fd6;background:#f1edff;border-radius:999px;padding:3px 10px}
h1{font-size:23px;line-height:1.35;margin:8px 0 4px;letter-spacing:-.03em;word-break:keep-all}.sub{color:#666;font-size:14px;margin:0 0 12px}
.hero{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px;background:#f4f4f6;display:block}
.pr{margin:16px 0 4px;font-size:15px}.pr s{color:#aaa;margin-right:6px}.pr b{font-size:26px;letter-spacing:-.02em}.pr em{font-style:normal;color:#e4322b;font-weight:900;font-size:20px;margin-right:6px}
dl{display:grid;grid-template-columns:76px 1fr;gap:6px 10px;margin:14px 0;font-size:14.5px}dt{color:#888}dd{margin:0;word-break:keep-all}
.chk{background:#f7f7f9;border-radius:12px;padding:12px 14px;font-size:13.5px;color:#444;margin:14px 0}.chk p{margin:2px 0}
.btn{display:block;text-align:center;padding:15px;border-radius:12px;font-weight:800;text-decoration:none;font-size:16px;margin:10px 0}
.pri{background:#5b3fd6;color:#fff}.sec{background:#f2f2f4;color:#222}
h2{font-size:18px;margin:28px 0 8px}.list{list-style:none;margin:0;padding:0}.list li{border-bottom:1px solid #f0f0f0}
.list a{display:flex;gap:12px;padding:12px 0;text-decoration:none;align-items:center}.list img{width:72px;height:72px;border-radius:10px;object-fit:cover;background:#f4f4f6;flex:none}
.list b{display:block;font-size:15px;font-weight:600;line-height:1.35}.list small{display:block;color:#888;font-size:12.5px}
.end{background:#f4f4f6;border-radius:12px;padding:16px;margin:16px 0;color:#555}
footer{margin-top:36px;font-size:12px;color:#999;line-height:1.7;border-top:1px solid #eee;padding-top:14px}"""

def shell(title, desc, img, body):
    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8">{GA}
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>{e(title)}</title><meta name="description" content="{e(desc)}"><meta name="robots" content="noindex,follow">
<meta property="og:type" content="website"><meta property="og:site_name" content="다꾸체험단"><meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}"><meta property="og:image" content="{e(img or SITE + '/images/og.png')}"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icons/icon-192.png"><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>{CSS}</style></head><body><div class="w">
<p class="disc">이 페이지는 쿠팡 파트너스·마이리얼트립 등 제휴 활동의 일환으로 일정액의 수수료를 제공받을 수 있습니다.</p>
<header><a class="logo" href="/">다꾸<i>체험단</i></a><a class="app" href="/#/mag?t=d">여행 특가 더 보기</a></header>
{body}
<footer>가격·할인율은 조회 시점 기준이라 예약할 때 다를 수 있어요. 예약·결제·취소는 각 판매 사이트에서 이뤄져요.<br>
다꾸체험단 (www.dagguu.com) · 운영 플랜비 · <a href="/ad-notice.html">광고 및 콘텐츠 표시 안내</a></footer>
</div><script>document.querySelectorAll("[data-ga]").forEach(function(a){{a.addEventListener("click",function(){{try{{gtag("event",a.dataset.ga,{{place:"deal_page",item:a.dataset.k}})}}catch(x){{}}}})}})</script></body></html>
"""

def stay_list(L, tk=False):
    if not L: return ""
    li = "".join(f'<li><a href="/s/{e(i["id"])}.html"><img src="{e(i.get("image"))}" alt="" loading="lazy"><span><b>{e(i["name"])}</b>'
                 f'<small>{e(i.get("benefit", ""))[:40]} · {md(i.get("end"))} 마감</small></span></a></li>' for i in L)
    return (f'<h2>근처 {"입장권" if tk else "숙박"} 체험단</h2><ul class="list">{li}</ul><a class="btn sec" href="/#/list?cat={"etc" if tk else "stay"}">'
            f'{"입장권" if tk else "숙박"} 체험단 전체 보기 ›</a>')

def page(x):
    rate = f'<em>{x["rate"]}%</em>' if x.get("rate") else ""
    orig = f'<s>{won(x["orig"])}</s>' if x.get("orig") and x.get("rate") else ""
    sc = f'<dt>평점</dt><dd>⭐ {e(x["score"])} (리뷰 {e(x["reviews"])}개, {e(x["src"])} 기준)</dd>' if x.get("score") and x.get("reviews") else ""
    tk = x.get("kind") == "입장권"
    body = (f'<span class="k">다꾸 {"입장권" if tk else "숙박"} 특가</span><h1>{e(x["name"])}</h1><p class="sub">📍 {e(x["area"])} · {e(x["src"])}</p>'
            f'<img class="hero" src="{e(x["img"])}" alt="">'
            f'<p class="pr">{orig}<br>{rate}<b>{won(x["price"])}</b>부터</p>'
            f'<dl><dt>조건</dt><dd>{e(x["cond"])}</dd>{sc}<dt>판매처</dt><dd>{e(x["src"])}</dd></dl>'
            f'<div class="chk"><p>✓ {e(x["at"] or TODAY)} 에 확인한 가격이에요. 예약 전에 다시 확인해 주세요.</p>'
            f'<p>✓ 날짜·객실·인원에 따라 가격이 달라요. 링크에서 원하는 날짜로 바꿔 보세요.</p>'
            f'<p>✓ 안내 가격과 다르면 특가가 끝났거나 방이 마감된 거예요.</p></div>'
            f'<a class="btn pri" href="{e(x["u"])}" rel="sponsored nofollow" target="_blank" data-ga="deal_go" data-k="{e(x["key"])}">특가 보러가기 ↗</a>'
            + stay_list(stays_near(x["area"], 3, "etc" if tk else "stay"), tk))
    desc = f'{x["area"]} · {x["cond"]} · {won(x["price"])}부터' + (f' ({x["rate"]}%)' if x.get("rate") else "")
    return shell(f'{x["name"]} 특가 | 다꾸 여행 특가', desc, x["img"], body)

def ended(name):
    body = (f'<span class="k">다꾸 숙박 특가</span><h1>{e(name)}</h1><div class="end">이 특가는 끝났어요. 오늘의 다른 여행 특가를 확인해 보세요.</div>'
            f'<a class="btn pri" href="/d/">오늘의 여행 특가 보기 ›</a>' + stay_list(stays_near(name, 4)))
    return shell(f"{name} | 끝난 특가", "이 특가는 끝났어요 | 다꾸 숙박 특가", "", body)

def build():
    ddir = os.path.join(ROOT, "d"); os.makedirs(ddir, exist_ok=True)
    L = deals(); keys = set()
    for x in L:
        open(os.path.join(ddir, x["key"] + ".html"), "w", encoding="utf-8").write(page(x)); keys.add(x["key"])
    seen_p = os.path.join(ROOT, "scripts", "deal_seen.json")
    try: seen = json.load(open(seen_p, encoding="utf-8"))
    except Exception: seen = {}
    for x in L: seen[x["key"]] = x["name"]
    for k, nm in seen.items():
        if k not in keys: open(os.path.join(ddir, k + ".html"), "w", encoding="utf-8").write(ended(nm))
    json.dump(seen, open(seen_p, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    L2 = sorted(L, key=lambda x: -(x.get("rate") or 0))
    li = "".join(f'<li><a href="/d/{x["key"]}.html"><img src="{e(x["img"])}" alt="" loading="lazy"><span><b>{e(x["name"])}</b>'
                 f'<small>{e(x["area"])} · {e(x["cond"])} · {(str(x["rate"]) + "% · ") if x.get("rate") else ""}{won(x["price"])}부터</small></span></a></li>' for x in L2)
    open(os.path.join(ddir, "index.html"), "w", encoding="utf-8").write(
        shell("오늘의 여행 특가 | 다꾸체험단", "오늘 확인한 국내 숙소·입장권 할인 특가 모음", "", f'<span class="k">다꾸 여행 특가</span><h1>오늘의 숙소·입장권 특가</h1><p class="sub">{TODAY} 기준 · 할인율 높은 순</p><ul class="list">{li}</ul>'))
    return L

def pick(L, n):
    """단톡방에 보낼 특가: 할인 15%↑, 평점 있으면 리뷰 5개↑, 지역 겹치지 않게, 할인율 순. 어제·그제 보낸 숙소는 뺀다."""
    sent_p = os.path.join(ROOT, "scripts", "deal_chat_sent.json")
    try: sent = json.load(open(sent_p, encoding="utf-8"))
    except Exception: sent = {}
    recent = {k for day, ks in sent.items() if day != TODAY and day >= (NOW - dt.timedelta(days=3)).strftime("%Y-%m-%d") for k in ks}
    C = [x for x in L if (x.get("rate") or 0) >= 15 and x["key"] not in recent and (not x.get("reviews") or x["reviews"] >= 5) and (not x.get("score") or float(x["score"]) >= 4.0)]
    C.sort(key=lambda x: (-(x.get("rate") or 0)))
    # 숙소 n-1곳 + 입장권 1곳 (입장권이 없으면 숙소로 채움). 같은 지역 숙소는 하나만.
    tix = [x for x in C if x.get("kind") == "입장권"][:1]
    out, regs = [], set()
    for x in C:
        if x.get("kind") == "입장권": continue
        r = reg_of(x["area"]) or x["area"]
        if r in regs: continue
        out.append(x); regs.add(r)
        if len(out) >= n - len(tix): break
    out += tix
    sent[TODAY] = [x["key"] for x in out]
    sent = {k: v for k, v in sent.items() if k >= (NOW - dt.timedelta(days=14)).strftime("%Y-%m-%d")}
    json.dump(sent, open(sent_p, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    return out

def chat(n):
    L = deals(); P = pick(L, n)
    T = []
    for x in P:
        head = f'(특가) {"" if x["area"] in x["name"] else x["area"] + " "}{x["name"]}, {man(x["price"])}' + (f' · {x["rate"]}% 할인' if x.get("rate") else "")
        tk = x.get("kind") == "입장권"
        t = [head, "", f'📍 {x["area"]}', f'{"🎟️" if tk else "🏨"} {x["name"]}']
        if x.get("score") and x.get("reviews"): t.append(f'⭐ {x["score"]} (리뷰 {x["reviews"]}개, {x["src"]} 기준)')
        t += ["", f'📅 {x["cond"]}', f'💰 {won(x["price"])}부터' + (f' ({x["src"]} 표시 정가 {won(x["orig"])} 대비 {x["rate"]}%)' if x.get("orig") and x.get("rate") else "")]
        t += ["", "💡 브리핑", "✅ 링크를 열고 원하는 날짜로 바꿔서 보세요", ("⚠️ 날짜·옵션마다 가격이 달라요" if tk else "⚠️ 날짜·객실마다 가격이 달라요"),
              "────────────", f'✓ {md(x["at"][:10]) or md(TODAY)} 확인한 가격이에요 (예약 전에 다시 확인)', "✓ 안내 가격과 다르면 마감된 특가예요",
              f'{SITE}/d/{x["key"]}.html']
        T.append("\n".join(t))
    if not T: return ""
    txt = "\n\n".join(T) + "\n\n📢 오늘의 숙소·입장권 특가 더 보기\nhttps://www.dagguu.com/d/\n\n(이 글의 링크를 통해 예약하면 쿠팡 파트너스·마이리얼트립 활동으로 수수료를 받을 수 있어요)"
    os.makedirs(os.path.join(ROOT, "chat"), exist_ok=True)
    open(os.path.join(ROOT, "chat", f"deal-{TODAY}.txt"), "w", encoding="utf-8").write(txt)
    return txt

if __name__ == "__main__":
    build()
    if "--chat" in sys.argv:
        i = sys.argv.index("--chat"); n = int(sys.argv[i + 1]) if len(sys.argv) > i + 1 and sys.argv[i + 1].isdigit() else 3
        print(chat(n))
