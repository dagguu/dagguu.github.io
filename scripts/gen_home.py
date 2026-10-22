#!/usr/bin/env python3
"""@dagguu.home 감성 카드(1080x1350) — 육아 체험단 제품 소개용 (2026-10-22 시온님 "인스타는 이미지가 감성적이어야").

scripts/home_queue.json 의 각 항목 → insta_out/home/<id>/1~3.jpg (이미 insta 브랜치에 있는 id 는 --all 없으면 건너뜀)
항목: {"id": 글 id, "item": data.json item id, "date": "YYYY-MM-DD", "at": "21:07",
       "photos": [{"src": 쿠팡 상품 대표·갤러리 사진 주소, "box": [x0,y0,x1,y1] 0~1 비율로 쓸 부분}, … 3개],
       "l1": 표지 첫 줄, "l2": 표지 둘째 줄(장밋빛), "tags": 표지 작은 해시태그, "caption": 본문}
- 사진은 쿠팡 상품 페이지의 대표·갤러리 사진만(상세페이지 이미지 X, 남의 SNS 사진 X).
- 사람 얼굴이 보이지 않게 box 로 잘라 쓴다. 색상 견본 동그라미·글씨가 들어간 부분도 box 밖으로.
- 디자인(2026-10-22 시온님 참고 카드뉴스): 사진 꽉 채움 + 어둡게 + 왼쪽 아래 굵은 흰 글씨 h(2~3줄) + 작은 설명 sub, 오른쪽 위 @dagguu.home. 2~3장은 사진 + @dagguu.home 만.
"""
import json, os, sys, io, base64, html, urllib.request
from playwright.sync_api import sync_playwright
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Q = json.load(open(os.path.join(ROOT, 'scripts', 'home_queue.json'), encoding='utf-8'))
OUT = os.path.join(ROOT, 'insta_out', 'home')
HAVE = set(sys.argv[sys.argv.index('--have') + 1].split(',')) if '--have' in sys.argv else set()
e = html.escape
PW = 940  # 사진 액자 폭

def fetch(src):
    req = urllib.request.Request(src, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.coupang.com/'})
    return urllib.request.urlopen(req, timeout=30).read()

def photo(p):
    """box 부분만 잘라 1080x1350 을 꽉 채우게(가운데 맞춤) → data URI"""
    im = Image.open(io.BytesIO(fetch(p['src']))).convert('RGB')
    w, h = im.size
    x0, y0, x1, y1 = p.get('box', [0, 0, 1, 1])
    im = im.crop((int(w * x0), int(h * y0), int(w * x1), int(h * y1)))
    cw, ch = im.size
    tr = W / H
    if cw / ch > tr:
        nw = int(ch * tr); im = im.crop(((cw - nw) // 2, 0, (cw - nw) // 2 + nw, ch))
    else:
        nh = int(cw / tr); im = im.crop((0, (ch - nh) // 2, cw, (ch - nh) // 2 + nh))
    im = im.resize((W, H), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.4, percent=60, threshold=2))
    b = io.BytesIO(); im.save(b, 'JPEG', quality=94)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()

W, H = 1080, 1350
# 2026-10-22 시온님이 보여준 카드뉴스처럼: 사진 꽉 채움 + 어둡게 + 왼쪽 아래 굵은 흰 글씨 2~3줄 + 작은 설명 + 오른쪽 위 작은 계정
CSS = """*{margin:0;box-sizing:border-box}
body{width:1080px;height:1350px;overflow:hidden;background:#111}
.c{position:relative;width:1080px;height:1350px;background-size:cover;background-position:center;color:#fff;font-family:'Noto Sans CJK KR','Noto Sans KR',sans-serif;letter-spacing:-.04em}
.dk{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.38) 0%,rgba(0,0,0,.42) 45%,rgba(0,0,0,.66) 100%)}
.lt{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.18) 0%,rgba(0,0,0,0) 22%)}
.wm{position:absolute;top:42px;right:52px;font-size:25px;font-weight:500;opacity:.9;letter-spacing:0;text-shadow:0 1px 6px rgba(0,0,0,.35)}
.tx{position:absolute;left:84px;right:60px;bottom:150px}
.t{font-size:98px;font-weight:900;line-height:1.2}
.ln{white-space:nowrap}
.sub{margin-top:30px;font-size:36px;font-weight:500;opacity:.95}
"""
def page(inner): return f"<html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{inner}</body></html>"

def build(q):
    s = []
    lines = q.get('h') or [q.get('l1', ''), q.get('l2', '')]
    s.append(page(f"""<div class='c' style="background-image:url({photo(q['photos'][0])})"><div class='dk'></div>
<div class='wm'>@dagguu.home</div><div class='tx'><div class='t'>{''.join(f"<div class='ln'>{e(x)}</div>" for x in lines if x)}</div>
{f"<div class='sub'>{e(q['sub'])}</div>" if q.get('sub') else ''}</div></div>"""))
    for p in q['photos'][1:3]:
        s.append(page(f"""<div class='c' style="background-image:url({photo(p)})"><div class='lt'></div><div class='wm'>@dagguu.home</div></div>"""))
    return s

with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': 1080, 'height': 1350})
    for q in Q:
        if q['id'] in HAVE and '--all' not in sys.argv: continue
        out = os.path.join(OUT, q['id']); os.makedirs(out, exist_ok=True)
        for n, h in enumerate(build(q), 1):
            pg.set_content(h); pg.wait_for_timeout(300)
            # 표지 두 줄이 넘치면 글씨를 줄인다
            pg.evaluate("""()=>{const t=document.querySelector('.t'); if(!t) return; const L=[...t.querySelectorAll('.ln')], max=t.clientWidth;
              let f=98; while(L.some(l=>l.scrollWidth>max+1)&&f>60){ f-=2; t.style.fontSize=f+'px'; } }""")
            pg.screenshot(path=os.path.join(out, f'{n}.jpg'), type='jpeg', quality=95)
        print(out)
    b.close()
