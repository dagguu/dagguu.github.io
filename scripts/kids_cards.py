#!/usr/bin/env python3
"""다꾸키즈 인스타 카드뉴스 + 홈 슬라이드 배너 (2026-11-11 시온님 "슬라이딩 배너를 인스타 카드뉴스 같은 이미지로, 카드뉴스도 매일").

.github/workflows/kids-cards.yml 이 매일 아침 돌린다.
- 상품: 카페24 공개 상품 API(Client ID 는 공개값). 판매·진열 중인 것만.
- 배너 4장: PC kids/banner/B1~B4.jpg(1600x900, 16:9) + 모바일 B1m~B4m.jpg(1200x750, 8:5) → www.dagguu.com/kids/banner/B?.jpg (다꾸키즈 스킨 index.html 슬라이드가 이 주소를 씀, 매일 새 상품으로 바뀜)
- 카드뉴스(1080x1350): kids_out/<날짜>/1~6.jpg + caption.txt → insta 브랜치 kids/<날짜>/ + 메일(mail_kids.py)
- 같은 상품이 며칠 연속 나오지 않게 scripts/kids_cards_done.json 에 최근 쓴 상품 번호를 남긴다.
문구 원칙: 실제 판매가·상품명만, 할인·최저가·"품절임박" 같은 말 안 씀, 지어낸 후기 X.
"""
import os, re, sys, json, random, datetime, urllib.request, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CID = "JzTmuiBPItGvZ6KG8g3aPC"
API = "https://dagguu.cafe24api.com/api/v2/products"
SHOP = "https://dagguukids.com"
KST = datetime.timezone(datetime.timedelta(hours=9))
TODAY = datetime.datetime.now(KST).strftime("%Y-%m-%d")
DONE_P = os.path.join(ROOT, "scripts", "kids_cards_done.json")


def get(q):
    req = urllib.request.Request(f"{API}?{q}", headers={"X-Cafe24-Client-Id": CID})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r).get("products", [])


F = "fields=product_no,product_name,price,detail_image,list_image,summary_description&display=T&selling=T"


def products(cat=None, n=60):
    raw = []
    for off in range(0, n, 100):  # 최근 상품이 양말뿐인 날도 있어서 넉넉히 읽음
        q = f"{F}&limit={min(100, n - off)}&offset={off}&sort=created_date&order=desc" + (f"&category={cat}" if cat else "")
        got = get(q)
        raw += got
        if len(got) < 100:
            break
    out = []
    for p in raw:
        img = p.get("detail_image") or p.get("list_image")
        if not img:
            continue
        name = p["product_name"].strip()
        out.append({"no": p["product_no"], "name": name, "brand": name.split()[0], "price": int(float(p.get("price") or 0)), "img": img,
                    "colors": (p.get("summary_description") or "").split("·")[-1].strip() if "·" in (p.get("summary_description") or "") else ""})
    return out


# 2026-11-13 시온님 "인기 브랜드 상품 사진으로(모델)": 대표 사진이 누끼·바닥컷인 상품이 많아서, 상품 상세 설명 사진 중
# 얼굴(OpenCV)이 보이는 모델 컷을 찾아 배너에 쓴다. 못 찾으면 대표 사진.
def model_img(p):
    try:
        import cv2, numpy as np
    except Exception:
        return None
    try:
        req = urllib.request.Request(f"{SHOP}/product/detail.html?product_no={p['no']}", headers={"User-Agent": "Mozilla/5.0"})
        h = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")
    except Exception:
        return None
    i = h.find('id="prdDetail"')
    h = h[i:] if i >= 0 else h
    urls = []
    for u in re.findall(r'ec-data-src="(https://ecimg\.cafe24img\.com/[^"]+/web/upload/NNEditor/[^"]+)"', h):
        if u not in urls:
            urls.append(u)
    try:
        casc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    except Exception as e:
        print("얼굴 찾기 못 씀:", e)
        return None
    best, bs = None, 0
    for u in urls[:16]:
        try:
            raw = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=30).read()
            im = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
        except Exception:
            continue
        if im is None:
            continue
        hh, ww = im.shape[:2]
        if ww < 600 or ww / hh > 1.1:  # 작거나 가로로 긴 것(사이즈표·글씨) 뺌
            continue
        g = cv2.cvtColor(cv2.resize(im, (480, int(480 * hh / ww))), cv2.COLOR_BGR2GRAY)
        fs = casc.detectMultiScale(g, 1.08, 4, minSize=(24, 24))
        if len(fs) == 0:
            continue
        sc = max(w * h for (x, y, w, h) in fs) + (2000 if hh >= ww else 0)
        if sc > bs:
            best, bs = u, sc
    return best


def won(n):
    return f"{n:,}원"


def pick(pool, k, used, avoid_socks=True, maxb=2):
    """브랜드·종류가 겹치지 않게 k개. 최근 쓴 상품은 뒤로."""
    fresh = [p for p in pool if p["no"] not in used] + [p for p in pool if p["no"] in used]
    sock = lambda p: bool(re.search("양말|삭스|타이즈|레그워머|버선|레깅스", p["name"]))
    fresh = [p for p in fresh if "품절" not in p["name"]]
    if avoid_socks:
        ns = [p for p in fresh if not sock(p)]
        fresh = ns if len(ns) >= k else ns + [p for p in fresh if sock(p)]
    out, brands = [], {}
    for p in fresh:
        if brands.get(p["brand"], 0) >= maxb:
            continue
        out.append(p); brands[p["brand"]] = brands.get(p["brand"], 0) + 1
        if len(out) >= k:
            break
    return out


CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Pretendard','Noto Sans CJK KR','Noto Sans KR',sans-serif;-webkit-font-smoothing:antialiased}
.handle{position:absolute;font-weight:700;color:#6a3fc8;letter-spacing:.2px}
.pill{display:inline-block;border-radius:999px;font-weight:800}
.ph{background-size:cover;background-position:center 20%;border-radius:28px}
"""


def page(w, h, body):
    return f"<!doctype html><html><head><meta charset='utf-8'><style>{CSS} html,body{{width:{w}px;height:{h}px;overflow:hidden}}</style></head><body>{body}</body></html>"


def e(s):
    return html.escape(s or "")


# ── 배너 (1200x800) ──
# 2026-11-11 시온님이 보여준 인스타 카드뉴스 두 장 느낌: 상품 사진 한 장 꽉 채움 + 아래 그늘
#  A형 = 큰 흰 글씨 2줄, 첫 줄 앞 낱말만 노란 상자 강조 + 작은 설명
#  (B형은 2026-11-11 23:39 시온님 요청으로 안 씀) B형 = 연두/흰 글자 칸 꼬리표 + 둥근 흰 손글씨 느낌 큰 글씨 + 오른쪽 위 작은 연두 스티커
# 2026-11-13 시온님이 바잇미 홈 슬라이드 배너 보여주며 "이런 느낌으로, 인기 브랜드 상품 사진으로":
#  인기 브랜드 모델 사진 꽉 채움(PC 3장·모바일 2장 나란히) + 가운데 큰 흰 글씨 2줄(그림자) + 작은 설명 + 둥근 스티커 2개(위 왼쪽·글씨 오른쪽 위).
#  그림·문구는 다꾸키즈 것(바잇미 그림·글 안 씀). 스티커는 사실만(NEW = 최근 등록순 상품, 무료배송 = 4만원 이상).
# (키, 분류, 스티커1, 스티커2, 윗줄, 아랫줄, 설명)
BAN = [
    ("B1", 55, "BEST", "4만원↑ 무료배송", "콘 · 보니토 · 피피", "인기 브랜드 모아보기", "다꾸키즈 인기상품 BEST"),
    ("B2", 44, "BABY", "NEW", "피피 겨울 신상", "우리 아기 데일리룩", "피피 아기옷 모아보기"),
    ("B3", 49, "4만원↑ 무료배송", "NEW", "제니베이직 겨울 신상", "포근한 패딩 데일리룩", "제니베이직 아동복 모아보기"),
    ("B4", 47, "무료배송", "NEW", "아오스타 겨울 신상", "포근한 니트 코디 모음", "아오스타 아동복 모아보기"),
]
# 2026-11-13 시온님 "모델 사진으로": 자동 얼굴 찾기는 사이즈표·어른 셀카를 잡아서, 사진은 Claude 가 상세 사진을 직접 보고 고른
# scripts/kids_banner_pick.json {B1:[{no,img}]} 을 먼저 쓴다(상품이 판매 중일 때만). 없거나 상품이 내려가면 아래 자동 찾기.
PICK_P = os.path.join(ROOT, "scripts", "kids_banner_pick.json")
FONT_LINK = ""
# 2026-11-22 시온님 "슬라이드 이미지 크리스마스 분위기로": 12/25까지 눈송이·빨강/초록 스티커·MERRY CHRISTMAS 띠.
#  크리스마스 상품은 11/27까지만 팔아서(쇼핑몰 seasonoff) 크리스마스룩 배너(XMAS_BAN, 사진 kids_banner_xmas.json)는 11/27까지,
#  11/28~12/25 는 원래 BAN 에 장식만. 링크는 kids/kidfit.js BM_BAN 이 같은 날짜로 바꿈.
XMAS_DECOR_END = "2026-12-25"
XMAS_SHOP_END = "2026-11-27"
XMAS_BAN = [
    ("B1", "q:크리스마스", "🎄 11/27까지 주문", "4만원↑ 무료배송", "우리 아이", "크리스마스룩 준비해요", "산타·루돌프·트리 코디 모아보기"),
    ("B2", "q:크리스마스", "BABY", "🎅 첫 크리스마스", "우리 아기", "첫 크리스마스 코디", "아기 크리스마스룩 모아보기"),
    ("B3", 66, "🎁 선물하기", "4만원↑ 무료배송", "연말 선물 고민 끝", "크리스마스 선물하기", "3만원대 · 4만원대 · 5만원대 아이옷"),
    ("B4", 55, "BEST", "NEW", "콘 · 보니토 · 피피", "포근한 연말 데일리룩", "다꾸키즈 인기상품 BEST"),
]
XMAS_P = os.path.join(ROOT, "scripts", "kids_banner_xmas.json")


def xmas_decor(W, H):
    """눈송이(흰 점) + 위 가운데 빨간 리본 띠 'MERRY CHRISTMAS'. 그림은 직접 그린 도형만."""
    random.seed(W)
    dots = "".join(f"<div style='position:absolute;left:{random.random()*W:.0f}px;top:{random.random()*H:.0f}px;width:{s}px;height:{s}px;border-radius:50%;background:#fff;opacity:{random.uniform(.55,.95):.2f};box-shadow:0 0 {s}px rgba(255,255,255,.7)'></div>"
                   for s in [random.choice([4, 5, 6, 8, 10, 12]) * W // 1600 + 3 for _ in range(70)])
    k = W / 1600
    rib = (f"<div style='position:absolute;left:50%;top:{round(H*.07)}px;transform:translateX(-50%);padding:{round(12*k)}px {round(38*k)}px;"
           f"background:#c8102e;color:#fff;border-radius:999px;font-size:{round(30*k)}px;font-weight:900;letter-spacing:{round(5*k)}px;"
           f"box-shadow:0 6px 20px rgba(0,0,0,.25);border:{max(2,round(3*k))}px solid #fff;white-space:nowrap'>❄ MERRY CHRISTMAS ❄</div>")
    tint = "<div style='position:absolute;inset:0;background:linear-gradient(180deg,rgba(150,0,20,.22) 0%,rgba(0,0,0,0) 28%)'></div>"
    return tint + dots + rib


def banner_html(theme, ps, W=1600, H=900):
    """PC 1600x900(사진 3장) / 모바일 1200x750(사진 2장, 8:5)."""
    key, cat, s1, s2, l1, l2, sub = theme
    n = 3 if W / H >= 1.7 else 2
    n = min(n, max(1, len(ps)))
    cw = W / n
    photo = "".join(f"<div style='position:absolute;top:0;bottom:0;left:{i * cw:.1f}px;width:{cw + 1:.1f}px;background:#eee url(\"{q['img']}\") center 18%/cover no-repeat'></div>" for i, q in enumerate(ps[:n]))
    shade = ("<div style='position:absolute;inset:0;background:radial-gradient(ellipse 70% 55% at 50% 66%,rgba(0,0,0,.42),rgba(0,0,0,0) 72%),"
             "linear-gradient(180deg,rgba(0,0,0,.08) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,.10) 55%,rgba(0,0,0,.40) 100%)'></div>")
    k = W / 1600 if n == 3 else W / 1100
    fs = round(78 * k); pill = round(34 * k)
    def st(t, bg, fg, css):
        return (f"<div style='position:absolute;{css};padding:{round(pill*.32)}px {round(pill*.7)}px;border-radius:999px;background:{bg};color:{fg};"
                f"font-size:{pill}px;font-weight:900;letter-spacing:-.5px;box-shadow:0 6px 18px rgba(0,0,0,.18)'>{e(t)}</div>")
    xm = TODAY <= XMAS_DECOR_END
    c1 = ("#c8102e", "#fff") if xm else ("#6a3fc8", "#fff")
    c2 = ("#1f7a4d", "#fff") if xm else ("#ffe94d", "#2a1b55")
    stick = st(s1, c1[0], c1[1], f"left:{round(W*.17)}px;top:{round(H*.47)}px") + st(s2, c2[0], c2[1], f"right:{round(W*.17)}px;top:{round(H*.46)}px")
    if xm:
        shade += xmas_decor(W, H)
    sh = "0 2px 4px rgba(0,0,0,.35),0 6px 24px rgba(0,0,0,.45)"
    txt = (f"<div style='position:absolute;left:0;right:0;top:{round(H*.60)}px;text-align:center;color:#fff;font-weight:900;letter-spacing:-2px;text-shadow:{sh}'>"
           f"<div style='font-size:{fs}px;line-height:1.18'>{e(l1)}</div>"
           f"<div style='font-size:{fs}px;line-height:1.18'>{e(l2)}</div>"
           f"<div style='margin-top:{round(14*k)}px;font-size:{round(30*k)}px;font-weight:700;letter-spacing:-.5px;opacity:.92'>{e(sub)}</div></div>")
    body = f"<div style='position:relative;width:{W}px;height:{H}px;overflow:hidden'>{photo}{shade}{txt}{stick}</div>"
    return page(W, H, body)


# ── 카드뉴스 (1080x1350) ──
def cover_html(ps, day):
    d = datetime.date.fromisoformat(day)
    wk = "월화수목금토일"[d.weekday()]
    grid = "".join(f"<div class='ph' style='background-image:url(\"{p['img']}\");border-radius:24px'></div>" for p in ps[:4])
    body = (f"<div style='position:relative;width:1080px;height:1350px;background:#f6f0ff;padding:70px'>"
            f"<span class='pill' style='padding:12px 26px;background:#6a3fc8;color:#fff;font-size:28px'>{d.month}/{d.day} ({wk}) 오늘의 신상 🧸</span>"
            f"<div style='margin-top:34px;font-size:84px;line-height:1.18;font-weight:900;color:#1d1530;letter-spacing:-2px'>오늘 들어온<br>다꾸키즈 아이옷 🛒</div>"
            f"<div style='margin-top:20px;font-size:32px;color:#6b6380;font-weight:600'>다꾸키즈 오늘의 아이옷 {len(ps)}가지 ✨ 넘겨보세요 →</div>"
            f"<div style='position:absolute;left:70px;right:70px;bottom:120px;height:640px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:18px'>{grid}</div>"
            f"<div class='handle' style='left:70px;bottom:52px;font-size:30px'>@dagguu.kids</div>"
            f"<div style='position:absolute;right:70px;bottom:50px;font-size:28px;color:#9a8fc0;font-weight:700'>dagguukids.com</div></div>")
    return page(1080, 1350, body)


EMO = ["💜", "🌷", "🧸", "🍓", "☁️", "🎀"]


def item_html(p, i, n):
    col = f"<div style='margin-top:14px;font-size:28px;color:#6b6380'>🎨 {e(p['colors'])}</div>" if p["colors"] else ""
    body = (f"<div style='position:relative;width:1080px;height:1350px;background:#fff'>"
            f"<div class='ph' style='position:absolute;left:0;top:0;width:1080px;height:960px;border-radius:0;background-image:url(\"{p['img']}\")'></div>"
            f"<span class='pill' style='position:absolute;left:50px;top:50px;padding:12px 24px;background:rgba(255,255,255,.92);color:#6a3fc8;font-size:28px'>{i:02d} / {n:02d} {EMO[i % len(EMO)]}</span>"
            f"<div style='position:absolute;left:60px;right:60px;top:1000px'>"
            f"<div style='font-size:30px;font-weight:800;color:#6a3fc8'>#{e(p['brand'])}</div>"
            f"<div style='margin-top:10px;font-size:54px;font-weight:900;color:#1d1530;letter-spacing:-1px;line-height:1.2'>{e(' '.join(p['name'].split()[1:]) or p['name'])}</div>"
            f"{col}"
            f"<div style='margin-top:18px;font-size:44px;font-weight:900;color:#1d1530'>{won(p['price'])}</div></div>"
            f"<div class='handle' style='right:60px;bottom:50px;font-size:28px'>@dagguu.kids</div></div>")
    return page(1080, 1350, body)


def last_html():
    body = ("<div style='position:relative;width:1080px;height:1350px;background:#6a3fc8;color:#fff;padding:110px 80px'>"
            "<div style='font-size:120px'>🛍️</div>"
            "<div style='margin-top:30px;font-size:80px;font-weight:900;line-height:1.2;letter-spacing:-2px'>더 많은 신상은<br>다꾸키즈에서 💜</div>"
            "<div style='margin-top:50px;font-size:38px;line-height:1.7;font-weight:600'>🚚 4만원 이상 무료배송<br>🎁 신규가입 쿠폰 바로 지급<br>📦 평일 오후 3시 전 주문 당일 발주</div>"
            "<span class='pill' style='margin-top:70px;padding:22px 40px;background:#fff;color:#6a3fc8;font-size:40px'>프로필 링크 → dagguukids.com</span>"
            "<div class='handle' style='left:80px;bottom:60px;font-size:30px;color:#e7dcff'>@dagguu.kids</div></div>")
    return page(1080, 1350, body)


def caption(ps):
    lines = [f"오늘 다꾸키즈에 들어온 아이옷 {len(ps)}가지 🧸✨", ""]
    for i, p in enumerate(ps, 1):
        lines.append(f"{i}. {p['name']} · {won(p['price'])}")
    lines += ["", "🚚 4만원 이상 무료배송", "🎁 신규가입 쿠폰 바로 지급", "", "👉 프로필 링크(dagguukids.com)에서 바로 볼 수 있어요",
              "저장해두고 꺼내보세요 💜 @dagguu.kids", "",
              "#아동복 #유아복 #아기옷 #남대문아동복 #키즈룩 #" + " #".join(sorted({p['brand'] for p in ps}))[:200]]
    return "\n".join(lines)


def shoot(pages, outdir):
    from playwright.sync_api import sync_playwright
    os.makedirs(outdir, exist_ok=True)
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        for name, (w, h, src) in pages.items():
            pg = b.new_page(viewport={"width": w, "height": h})
            pg.set_content(src, wait_until="networkidle")
            pg.wait_for_timeout(600)
            pg.screenshot(path=os.path.join(outdir, name), type="jpeg", quality=90)
            pg.close()
        b.close()


def main():
    done = json.load(open(DONE_P)) if os.path.exists(DONE_P) else {}
    used = set(n for v in list(done.values())[-5:] for n in v)
    banner_used = set(used)
    allp = products(None, 400)
    # 배너
    bp = {}
    xshop = TODAY <= XMAS_SHOP_END
    for th in (XMAS_BAN if xshop else BAN):
        pool = (products(th[1], 200) if isinstance(th[1], int) else []) or allp
        fixed = (json.load(open(XMAS_P if xshop else PICK_P)) if os.path.exists(XMAS_P if xshop else PICK_P) else {}).get(th[0]) or []
        if xshop and th[0] == "B4":
            fixed = (json.load(open(PICK_P)) if os.path.exists(PICK_P) else {}).get("B1") or []
        alive = {q["no"]: q for q in allp + pool}
        miss = [str(f["no"]) for f in fixed if f["no"] not in alive]
        if miss:  # 오래된 상품(최근 400개 밖)도 판매 중인지 번호로 확인
            try:
                for p in get(f"{F}&product_no={','.join(miss)}&limit=100"):
                    nm = p["product_name"].strip()
                    alive[p["product_no"]] = {"no": p["product_no"], "name": nm, "brand": nm.split()[0], "price": int(float(p.get("price") or 0)), "img": p.get("detail_image") or "", "colors": ""}
            except Exception as ex:
                print("배너 상품 확인 실패:", ex)
        fx = [dict(alive[f["no"]], img=f["img"]) for f in fixed if f["no"] in alive]
        if len(fx) >= 2:
            ps = fx
            bp[f"{th[0]}.jpg"] = (1600, 900, banner_html(th, ps, 1600, 900))
            bp[f"{th[0]}m.jpg"] = (1200, 750, banner_html(th, ps, 1200, 750))
            continue
        cand = pick(pool, 30, used, maxb=4 if th[1] == 55 else 30)
        ps = []
        for q in cand:
            m = model_img(q)
            if m:
                ps.append(dict(q, img=m))
            if len(ps) >= 3:
                break
        if len(ps) < 3:
            ps += [q for q in cand if q["no"] not in {x["no"] for x in ps}][:3 - len(ps)]
        if len(ps) < 1:
            ps = pick(allp, 3, used)
        used |= {p["no"] for p in ps}  # 배너끼리 같은 사진 안 겹치게
        bp[f"{th[0]}.jpg"] = (1600, 900, banner_html(th, ps, 1600, 900))
        bp[f"{th[0]}m.jpg"] = (1200, 750, banner_html(th, ps, 1200, 750))
    shoot(bp, os.path.join(ROOT, "kids", "banner"))
    # 카드뉴스
    ps = pick(allp, 4, used)
    pages = {"1.jpg": (1080, 1350, cover_html(ps, TODAY))}
    for i, p in enumerate(ps, 1):
        pages[f"{i + 1}.jpg"] = (1080, 1350, item_html(p, i, len(ps)))
    pages[f"{len(ps) + 2}.jpg"] = (1080, 1350, last_html())
    out = os.path.join(ROOT, "kids_out", TODAY)
    shoot(pages, out)
    open(os.path.join(out, "caption.txt"), "w", encoding="utf-8").write(caption(ps))
    done[TODAY] = [p["no"] for p in ps]
    done = dict(list(done.items())[-14:])
    json.dump(done, open(DONE_P, "w"), ensure_ascii=False, indent=1)
    print("배너", list(bp), "카드", len(pages), [p["name"] for p in ps])


if __name__ == "__main__":
    main()
