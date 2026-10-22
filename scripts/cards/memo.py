"""스레드 메모장 사진 만들기 (2026-10-22 시온님 '내가 직접 메모한 것처럼').
python3 scripts/cards/memo.py scripts/cards/memo_specs.json  → images/threads/<id>.jpg (없는 것만, --all 이면 전부)
spec: {id, title, sub, sections:[[소제목, [[이름, 가격, 체크(0/1)], ...]], ...], end(선택)}
상품·가격은 추천 모음 json(쿠팡 공식 API) 그대로 쓴다. 브랜드 로고 없음."""
import json, os, sys, html as H
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CSS = """*{margin:0;padding:0;box-sizing:border-box}body{width:1080px;background:#fff;font-family:"Noto Sans CJK KR",sans-serif;color:#2b2b2b;padding-bottom:70px}
.bar{height:170px;display:flex;align-items:center;justify-content:space-between;padding:40px 44px 0}
.btn{width:108px;height:108px;border-radius:54px;background:#f6f6f6;display:grid;place-items:center;font-size:52px;color:#222;box-shadow:0 6px 20px rgba(0,0,0,.06)}
.r{display:flex;gap:22px}.pill{height:108px;border-radius:54px;background:#f6f6f6;display:flex;align-items:center;gap:44px;padding:0 40px;font-size:46px;box-shadow:0 6px 20px rgba(0,0,0,.06)}
.doc{padding:46px 70px 0}h1{font-size:66px;font-weight:900;color:#3a3a3a;letter-spacing:-1px}
.date{font-size:30px;color:#9a9a9a;margin:14px 0 30px}h3{font-size:38px;font-weight:800;margin:32px 0 10px;color:#333}
li{list-style:none;display:flex;align-items:center;gap:22px;font-size:38px;padding:9px 0;color:#3a3a3a}
li i{width:46px;height:46px;border-radius:50%;border:3px solid #c8c8c8;flex:none;display:grid;place-items:center;font-style:normal;font-size:28px;color:#fff;font-weight:900}
li.on i{background:#f5b800;border-color:#f5b800}li.on span{color:#a0a0a0;text-decoration:line-through}
em{font-style:normal;color:#8a8a8a;font-size:33px;margin-left:6px}li.on em{color:#b5b5b5}
.end{font-size:36px;margin-top:44px;color:#3a3a3a;line-height:1.6}.end b{color:#d97a00}.end small{display:block;font-size:26px;color:#aaa}"""
def page(s):
    e = H.escape
    body = "".join(f'<h3>{e(h)}</h3><ul>' + "".join(f'<li class="{"on" if c else ""}"><i>{"✓" if c else ""}</i><span>{e(n)} <em>{p:,}</em></span></li>' for n, p, c in L) + "</ul>" for h, L in s["sections"])
    end = s.get("end", "나머지 다 모아둔 곳 👉 <b>dagguu.com</b>")
    return f'<!doctype html><meta charset=utf-8><style>{CSS}</style><div class=bar><div class=btn>‹</div><div class=r><div class=btn>↶</div><div class=pill><span>⇪</span><span>⋯</span></div></div></div><div class=doc><h1>{e(s["title"])}</h1><p class=date>{e(s.get("sub",""))}</p>{body}<p class=end>{end}<small>(가격은 {e(s.get("asof","10/22"))} 쿠팡 기준)</small></p></div>'
specs = json.load(open(sys.argv[1], encoding="utf-8"))
os.makedirs(os.path.join(ROOT, "images", "threads"), exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1080, "height": 800})
    for s in specs:
        out = os.path.join(ROOT, "images", "threads", s["id"] + ".jpg")
        if os.path.exists(out) and "--all" not in sys.argv: continue
        pg.set_content(page(s)); pg.wait_for_timeout(300)
        pg.screenshot(path=out, type="jpeg", quality=90, full_page=True); print("made", out)
    b.close()
