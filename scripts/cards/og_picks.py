"""추천 모음 페이지(p/<slug>.html) 링크 미리보기 이미지 만들기 (2026-10-23 시온님 "스레드 링크에 이미지도 같이 뜨게").
쿠팡 상품 이미지(ads-partners 주소)는 미리보기 로봇이 못 읽는 경우가 많아서, 사이트에 직접 올린 1200x630 그림을 쓴다.
python3 scripts/cards/og_picks.py  → images/og/<slug>.jpg (없는 것만, --all 이면 전부)
그림: 보라 바탕 + 페이지 제목(h1 두 줄) + 메모장 모양 상품 3개(첫 칸 상품 이름·가격). 브랜드 로고 없음."""
import json, os, sys, glob, re, html as H
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import cp_banned
EMO = [("할로윈", "🎃"), ("출산", "🎁"), ("아기띠", "👶"), ("무드등", "🌙"), ("트리", "🎄"), ("매트", "🔥")]
CSS = """*{margin:0;padding:0;box-sizing:border-box}body{width:1200px;height:630px;font-family:"Noto Sans CJK KR",sans-serif;
background:radial-gradient(circle at 15% 10%,#8a4fe0 0,#5a24b8 45%,#2e0f6e 100%);color:#fff;display:flex;align-items:center;gap:48px;padding:0 64px;overflow:hidden}
.l{flex:1;word-break:keep-all}.em{font-size:84px;line-height:1}.t{font-size:66px;font-weight:900;line-height:1.18;letter-spacing:-1.5px;margin:22px 0 16px}
.s{font-size:32px;font-weight:600;color:#e6dbff;line-height:1.35}.u{display:inline-block;margin-top:34px;background:#fff;color:#4a1ca8;font-weight:900;font-size:28px;padding:12px 26px;border-radius:40px}
.m{width:430px;background:#fff;color:#333;border-radius:34px;padding:34px 34px 26px;box-shadow:0 24px 60px rgba(0,0,0,.35);transform:rotate(2deg)}
.m h3{font-size:30px;font-weight:900;color:#3a3a3a;margin-bottom:14px}.m li{list-style:none;display:flex;gap:16px;align-items:flex-start;font-size:26px;padding:10px 0;border-top:1px dashed #e2e2e2;line-height:1.3}
.m li:first-of-type{border-top:0}.m i{width:34px;height:34px;border-radius:50%;border:3px solid #c8c8c8;flex:none;margin-top:1px}.m li.on i{background:#f5b800;border-color:#f5b800}
.m em{display:block;font-style:normal;color:#8a8a8a;font-size:22px;margin-top:2px}"""
def short(n):
    n = re.sub(r"\s*,.*$", "", n)  # 옵션(", 50개, 혼합") 떼기
    return n[:22] + ("…" if len(n) > 22 else "")
def page(P):
    e = H.escape
    emo = next((v for k, v in EMO if k in P["h1"][0] + P["slug"]), "✨")
    its = [x for s in P["sections"] for x in s["items"] if not cp_banned.is_banned(x.get("name", ""))][:3]
    lis = "".join(f'<li class="{"on" if i == 0 else ""}"><i></i><span>{e(short(x["name"]))}<em>{x["price"]:,}원</em></span></li>' for i, x in enumerate(its))
    return (f'<!doctype html><meta charset=utf-8><style>{CSS}</style><div class=l><div class=em>{emo}</div><div class=t style="font-size:{66 if len(P['h1'][0]) <= 8 else 58}px">{e(P["h1"][0])}</div>'
            f'<div class=s>{e(P["h1"][1])}</div><div class=u>dagguu.com</div></div><div class=m><h3>{e(P["sections"][0]["t"].split(" · ")[0])}</h3><ul>{lis}</ul></div>')
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
