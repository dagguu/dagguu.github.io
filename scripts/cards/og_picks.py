"""추천 모음 페이지(p/<slug>.html) 링크 미리보기 이미지 만들기 (2026-10-23 시온님 "스레드 링크에 이미지도 같이 뜨게").
쿠팡 상품 이미지(ads-partners 주소)는 미리보기 로봇이 못 읽는 경우가 많아서, 사이트에 직접 올린 1200x630 그림을 쓴다.
python3 scripts/cards/og_picks.py  → images/og/<slug>.jpg (없는 것만, --all 이면 전부)
그림: 노션 페이지 느낌(2026-10-23 시온님) = 흰 바탕·연한 커버 띠·큰 이모지·굵은 제목·회색 부제·체크박스 할 일 목록(첫 칸 상품 3개·가격). 노션 로고 없음."""
import json, os, sys, glob, re, html as H
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import cp_banned
EMO = [("할로윈", "🎃"), ("출산", "🎁"), ("아기띠", "👶"), ("무드등", "🌙"), ("트리", "🎄"), ("매트", "🔥")]
CSS = """*{margin:0;padding:0;box-sizing:border-box}body{width:1200px;height:630px;font-family:"Noto Sans CJK KR",sans-serif;background:#fff;color:#37352f;overflow:hidden;word-break:keep-all}
.cv{height:160px;background:linear-gradient(90deg,#f1eefa,#f7f3ea)}.pg{padding:0 96px;position:relative}
.em{font-size:104px;line-height:1;margin-top:-62px}.t{font-size:56px;font-weight:800;letter-spacing:-1px;margin:22px 0 10px;line-height:1.2}
.s{font-size:26px;color:#787774;margin-bottom:22px}.hr{height:1px;background:#e9e9e7;margin-bottom:18px}
.h{font-size:24px;font-weight:700;color:#37352f;margin-bottom:8px}
li{list-style:none;display:flex;align-items:center;gap:16px;font-size:26px;padding:9px 0}
li i{width:26px;height:26px;border:2px solid #b4b4b0;border-radius:4px;flex:none;display:grid;place-items:center;font-style:normal;font-size:20px;color:#fff;font-weight:900}
li.on i{background:#2383e2;border-color:#2383e2}li.on span{color:#9b9a97;text-decoration:line-through}
em{font-style:normal;color:#9b9a97;font-size:22px;margin-left:10px;background:#f1f1ef;border-radius:4px;padding:1px 8px}
.u{position:absolute;right:96px;bottom:-4px;font-size:22px;color:#9b9a97}"""
def short(n):
    n = re.sub(r"\s*,.*$", "", n)  # 옵션(", 50개, 혼합") 떼기
    return n[:26] + ("…" if len(n) > 26 else "")
def page(P):
    e = H.escape
    emo = next((v for k, v in EMO if k in P["h1"][0] + P["slug"]), "✨")
    its = [x for s in P["sections"] for x in s["items"] if not cp_banned.is_banned(x.get("name", ""))][:3]
    lis = "".join(f'<li><i></i><span>{e(short(x["name"]))}<em>{x["price"]:,}원</em></span></li>' for i, x in enumerate(its))
    return (f'<!doctype html><meta charset=utf-8><style>{CSS}</style><div class=cv></div><div class=pg><div class=em>{emo}</div><div class=t>{e(P["h1"][0])}</div>'
            f'<div class=s>{e(P["h1"][1])}</div><div class=hr></div><div class=h>{e(P["sections"][0]["t"].split(" · ")[0])}</div><ul>{lis}</ul><div class=u>dagguu.com</div></div>')
if __name__ == "__main__":
    os.makedirs(os.path.join(ROOT, "images", "og"), exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1200, "height": 630})
        for f in sorted(glob.glob(os.path.join(ROOT, "scripts", "picks_*.json"))):
            P = json.load(open(f, encoding="utf-8"))
            out = os.path.join(ROOT, "images", "og", P["slug"] + ".jpg")
            if os.path.exists(out) and "--all" not in sys.argv: continue
            pg.set_content(page(P)); pg.wait_for_timeout(300)
            pg.screenshot(path=out, type="jpeg", quality=88); print("made", out)
        b.close()
