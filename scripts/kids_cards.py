#!/usr/bin/env python3
"""다꾸키즈 인스타 카드뉴스 + 홈 슬라이드 배너 (2026-11-11 시온님 "슬라이딩 배너를 인스타 카드뉴스 같은 이미지로, 카드뉴스도 매일").

.github/workflows/kids-cards.yml 이 매일 아침 돌린다.
- 상품: 카페24 공개 상품 API(Client ID 는 공개값). 판매·진열 중인 것만.
- 배너 4장: PC kids/banner/B1~B4.jpg(1600x900, 16:9) + 모바일 B1m~B4m.jpg(1200x900, 4:3) → www.dagguu.com/kids/banner/B?.jpg (다꾸키즈 스킨 index.html 슬라이드가 이 주소를 씀, 매일 새 상품으로 바뀜)
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


def won(n):
    return f"{n:,}원"


def pick(pool, k, used, avoid_socks=True):
    """브랜드·종류가 겹치지 않게 k개. 최근 쓴 상품은 뒤로."""
    fresh = [p for p in pool if p["no"] not in used] + [p for p in pool if p["no"] in used]
    sock = lambda p: bool(re.search("양말|삭스|타이즈|레그워머|버선|레깅스", p["name"]))
    fresh = [p for p in fresh if "품절" not in p["name"]]
    if avoid_socks:
        ns = [p for p in fresh if not sock(p)]
        fresh = ns if len(ns) >= k else ns + [p for p in fresh if sock(p)]
    out, brands = [], {}
    for p in fresh:
        if brands.get(p["brand"], 0) >= 2:
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
BAN = [
    ("B1", 54, "A", dict(hl="오늘 신상", rest=" 도착", l2="먼저 구경해요", sub="매일 아침 새 아이옷이 올라와요 🧸")),
    ("B2", 24, "A", dict(hl="겨울 아우터", rest=" 준비", l2="입으면 포근포근", sub="찬바람 불기 전 미리 준비해요 ☃️")),
    ("B3", 52, "A", dict(hl="우리 아기", rest=" 첫 데일리룩", l2="이렇게 입혀봐요", sub="0~2세 아기옷 모아보기 🍼")),
    ("B4", 47, "A", dict(hl="아오스타", rest=" 코디", l2="포근한 감성 그대로", sub="아오스타 아동복 모아보기 💚")),
]
FONT_LINK = "<link href='https://fonts.googleapis.com/css2?family=Jua&display=block' rel='stylesheet'>"


def banner_html(theme, ps, W=1600, H=900):
    """2026-11-12 시온님: PC 16:9 가로(1600x900, 사진 3장 나란히) / 모바일 4:3(1200x900, 사진 2장, 14:16 시온님 정정)."""
    key, cat, kind, c = theme
    p = ps[0]
    wide = W > H
    k = 1.0 if wide else 0.86
    shade = ("<div style='position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 38%,rgba(0,0,0,.18) 58%,rgba(0,0,0,.62) 100%)'></div>")
    n = 3 if W / H >= 1.6 else 2
    if wide and len(ps) >= n:
        cw = W / n
        photo = "".join(f"<div style='position:absolute;top:0;bottom:0;left:{i * cw:.1f}px;width:{cw + 1:.1f}px;background:#eee url(\"{q['img']}\") center 22%/cover no-repeat'></div>" for i, q in enumerate(ps[:n]))
    else:
        photo = f"<div style='position:absolute;inset:0;background:#eee url(\"{p['img']}\") center 25%/cover no-repeat'></div>"
    tagname = f"<div style='position:absolute;right:34px;bottom:26px;font-size:20px;font-weight:700;color:rgba(255,255,255,.85)'>@dagguu.kids</div>"
    if kind == "A":
        txt = (f"<div style='position:absolute;left:0;right:0;bottom:{70 if wide else 90}px;text-align:center;color:#fff;font-weight:900;letter-spacing:-2px'>"
               f"<div style='font-size:{round(84*k)}px;line-height:1.2;text-shadow:0 3px 14px rgba(0,0,0,.35)'>"
               f"<span style='background:#ffe94d;color:#111;padding:0 16px;text-shadow:none'>{e(c['hl'])}</span>{e(c['rest'])}</div>"
               f"<div style='font-size:{round(84*k)}px;line-height:1.25;text-shadow:0 3px 14px rgba(0,0,0,.35)'>{e(c['l2'])}</div>"
               f"<div style='margin-top:18px;font-size:{round(30*k)}px;font-weight:600;letter-spacing:-.5px;opacity:.95'>{e(c['sub'])}</div></div>")
        extra = ""
    else:
        tiles = "".join(f"<span style='display:inline-block;width:54px;height:58px;line-height:58px;text-align:center;margin-right:6px;"
                        f"background:{'#d8eaa8' if i % 2 == 0 else '#fff'};color:#222;font-size:30px;font-weight:700'>{e(ch)}</span>"
                        for i, ch in enumerate(c['tiles']))
        t = "<br>".join(e(x) for x in c['t'].split("\n"))
        txt = (f"<div style='position:absolute;left:80px;bottom:76px'>"
               f"<div>{tiles}</div>"
               f"<div style='margin-top:20px;font-family:Jua,sans-serif;font-size:96px;line-height:1.12;color:#fff;letter-spacing:-1px;"
               f"text-shadow:0 0 2px rgba(0,0,0,.25),0 4px 16px rgba(0,0,0,.35)'>{t}</div></div>")
        extra = (f"<div style='position:absolute;right:70px;top:70px;padding:12px 22px;background:#d8eaa8;border:2px solid #333;"
                 f"font-size:26px;font-weight:700;color:#222'>{e(c['st'])}</div>")
    body = f"<div style='position:relative;width:{W}px;height:{H}px;overflow:hidden'>{photo}{shade}{extra}{txt}{tagname}</div>"
    return page(W, H, body).replace("<head>", "<head>" + FONT_LINK, 1)


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
            "<div style='margin-top:50px;font-size:38px;line-height:1.7;font-weight:600'>🚚 5만원 이상 무료배송<br>🎁 신규가입 쿠폰 바로 지급<br>📦 평일 오후 3시 전 주문 당일 발주</div>"
            "<span class='pill' style='margin-top:70px;padding:22px 40px;background:#fff;color:#6a3fc8;font-size:40px'>프로필 링크 → dagguukids.com</span>"
            "<div class='handle' style='left:80px;bottom:60px;font-size:30px;color:#e7dcff'>@dagguu.kids</div></div>")
    return page(1080, 1350, body)


def caption(ps):
    lines = [f"오늘 다꾸키즈에 들어온 아이옷 {len(ps)}가지 🧸✨", ""]
    for i, p in enumerate(ps, 1):
        lines.append(f"{i}. {p['name']} · {won(p['price'])}")
    lines += ["", "🚚 5만원 이상 무료배송", "🎁 신규가입 쿠폰 바로 지급", "", "👉 프로필 링크(dagguukids.com)에서 바로 볼 수 있어요",
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
    for th in BAN:
        pool = products(th[1], 200) or allp
        ps = pick(pool, 3, used)
        if len(ps) < 1:
            ps = pick(allp, 3, used)
        used |= {p["no"] for p in ps}  # 배너끼리 같은 사진 안 겹치게
        bp[f"{th[0]}.jpg"] = (1600, 900, banner_html(th, ps, 1600, 900))
        bp[f"{th[0]}m.jpg"] = (1200, 900, banner_html(th, ps, 1200, 900))
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
