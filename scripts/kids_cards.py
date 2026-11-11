#!/usr/bin/env python3
"""다꾸키즈 인스타 카드뉴스 + 홈 슬라이드 배너 (2026-11-11 시온님 "슬라이딩 배너를 인스타 카드뉴스 같은 이미지로, 카드뉴스도 매일").

.github/workflows/kids-cards.yml 이 매일 아침 돌린다.
- 상품: 카페24 공개 상품 API(Client ID 는 공개값). 판매·진열 중인 것만.
- 배너 4장(1200x800): kids/banner/B1~B4.jpg → www.dagguu.com/kids/banner/B?.jpg (다꾸키즈 스킨 index.html 슬라이드가 이 주소를 씀, 매일 새 상품으로 바뀜)
- 카드뉴스(1080x1350): kids_out/<날짜>/1~6.jpg + caption.txt → insta 브랜치 kids/<날짜>/ + 메일(mail_kids.py)
- 같은 상품이 며칠 연속 나오지 않게 scripts/kids_cards_done.json 에 최근 쓴 상품 번호를 남긴다.
문구 원칙: 실제 판매가·상품명만, 할인·최저가·"품절임박" 같은 말 안 씀, 지어낸 후기 X.
"""
import os, sys, json, random, datetime, urllib.request, html

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
    q = f"{F}&limit={n}&sort=created_date&order=desc" + (f"&category={cat}" if cat else "")
    out = []
    for p in get(q):
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
    if avoid_socks:
        fresh = [p for p in fresh if "양말" not in p["name"]] + [p for p in fresh if "양말" in p["name"]]
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


# ── 배너 (1200x800, 카드뉴스 느낌: 파스텔 바탕 + 큰 제목 + 사진 3장 겹침 + 스티커) ──
BAN = [
    ("B1", 54, "#f6f0ff", "#6a3fc8", "new in 🧸", "오늘 들어온\n따끈한 신상 🛍️", "매일 아침 새 아이옷이 올라와요"),
    ("B2", 24, "#eef4ff", "#3a5fc8", "winter mood ☃️", "찬바람 불기 전\n포근한 아우터 🧥", "지금 입히기 좋은 겨울 아우터"),
    ("B3", 52, "#fff1f4", "#d2557a", "baby pick 🍼", "우리 아기\n첫 데일리룩 🌷", "0~2세 아기옷 모아보기"),
    ("B4", 47, "#f1f8f1", "#3f8f5a", "brand 🏷️", "엄마들이 찾는\n아오스타 💚", "아오스타 아동복 모음"),
]


def banner_html(theme, ps):
    key, cat, bg, pt, tag, title, sub = theme
    t = "<br>".join(e(x) for x in title.split("\n"))
    imgs = ps[:3]
    pos = [(610, 120, 300, 420, -4), (840, 70, 300, 420, 5), (720, 330, 300, 400, -1)]
    ph = "".join(
        f"<div style='position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{h}px;transform:rotate({r}deg);background:#fff;padding:12px 12px 46px;border-radius:24px;box-shadow:0 18px 40px rgba(0,0,0,.12)'>"
        f"<div class='ph' style='width:100%;height:100%;border-radius:16px;background-image:url(\"{p['img']}\")'></div>"
        f"<div style='position:absolute;left:16px;right:16px;bottom:12px;font-size:16px;font-weight:700;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>{e(p['name'])}</div></div>"
        for p, (x, y, w, h, r) in zip(imgs, pos))
    body = (f"<div style='position:relative;width:1200px;height:800px;background:{bg};overflow:hidden'>"
            f"<div style='position:absolute;right:-120px;top:-120px;width:420px;height:420px;border-radius:50%;background:#fff;opacity:.55'></div>"
            f"<div style='position:absolute;left:70px;top:150px'>"
            f"<span class='pill' style='padding:10px 22px;background:#fff;color:{pt};font-size:24px'>{e(tag)}</span>"
            f"<div style='margin-top:30px;font-size:68px;line-height:1.22;font-weight:900;color:#1d1530;letter-spacing:-1.5px'>{t}</div>"
            f"<div style='margin-top:22px;font-size:28px;font-weight:600;color:#6b6380'>{e(sub)}</div>"
            f"<span class='pill' style='margin-top:40px;padding:14px 28px;background:{pt};color:#fff;font-size:26px'>보러가기 ›</span></div>"
            f"<div class='handle' style='left:72px;bottom:56px;font-size:24px;color:{pt}'>@dagguukids</div>"
            f"{ph}</div>")
    return page(1200, 800, body)


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
            f"<div class='handle' style='left:70px;bottom:52px;font-size:30px'>@dagguukids</div>"
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
            f"<div class='handle' style='right:60px;bottom:50px;font-size:28px'>@dagguukids</div></div>")
    return page(1080, 1350, body)


def last_html():
    body = ("<div style='position:relative;width:1080px;height:1350px;background:#6a3fc8;color:#fff;padding:110px 80px'>"
            "<div style='font-size:120px'>🛍️</div>"
            "<div style='margin-top:30px;font-size:80px;font-weight:900;line-height:1.2;letter-spacing:-2px'>더 많은 신상은<br>다꾸키즈에서 💜</div>"
            "<div style='margin-top:50px;font-size:38px;line-height:1.7;font-weight:600'>🚚 2만원 이상 무료배송<br>🎁 신규가입 쿠폰 바로 지급<br>📦 평일 오후 3시 전 주문 당일 발주</div>"
            "<span class='pill' style='margin-top:70px;padding:22px 40px;background:#fff;color:#6a3fc8;font-size:40px'>프로필 링크 → dagguukids.com</span>"
            "<div class='handle' style='left:80px;bottom:60px;font-size:30px;color:#e7dcff'>@dagguukids</div></div>")
    return page(1080, 1350, body)


def caption(ps):
    lines = [f"오늘 다꾸키즈에 들어온 아이옷 {len(ps)}가지 🧸✨", ""]
    for i, p in enumerate(ps, 1):
        lines.append(f"{i}. {p['name']} · {won(p['price'])}")
    lines += ["", "🚚 2만원 이상 무료배송", "🎁 신규가입 쿠폰 바로 지급", "", "👉 프로필 링크(dagguukids.com)에서 바로 볼 수 있어요",
              "저장해두고 꺼내보세요 💜 @dagguukids", "",
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
    allp = products(None, 100)
    # 배너
    bp = {}
    for th in BAN:
        pool = products(th[1], 40) or allp
        ps = pick(pool, 3, used)
        if len(ps) < 3:
            ps = pick(allp, 3, used)
        bp[f"{th[0]}.jpg"] = (1200, 800, banner_html(th, ps))
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
