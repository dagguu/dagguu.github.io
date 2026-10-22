#!/usr/bin/env python3
"""@dagguu.home 감성 카드(1080x1350) — 육아 체험단 제품 소개용 (2026-10-22 시온님 "인스타는 이미지가 감성적이어야").

scripts/home_queue.json 의 각 항목 → insta_out/home/<id>/1~3.jpg (이미 insta 브랜치에 있는 id 는 --all 없으면 건너뜀)
항목: {"id": 글 id, "item": data.json item id, "date": "YYYY-MM-DD", "at": "21:07",
       "photos": [{"src": 쿠팡 상품 대표·갤러리 사진 주소, "box": [x0,y0,x1,y1] 0~1 비율로 쓸 부분}, … 3개],
       "l1": 표지 첫 줄, "l2": 표지 둘째 줄(장밋빛), "tags": 표지 작은 해시태그, "caption": 본문}
- 사진은 쿠팡 상품 페이지의 대표·갤러리 사진만(상세페이지 이미지 X, 남의 SNS 사진 X).
- 사람 얼굴이 보이지 않게 box 로 잘라 쓴다. 색상 견본 동그라미·글씨가 들어간 부분도 box 밖으로.
- 디자인: 크림 바탕 + 둥근 사진 액자 + 명조 글씨. 2~3장은 사진 + 아래 작은 @dagguu.home 만.
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

def photo(p, maxh, fixed=False):
    """box 부분만 잘라 폭 940(작으면 키움)으로. (data URI, 높이)"""
    im = Image.open(io.BytesIO(fetch(p['src']))).convert('RGB')
    w, h = im.size
    x0, y0, x1, y1 = p.get('box', [0, 0, 1, 1])
    im = im.crop((int(w * x0), int(h * y0), int(w * x1), int(h * y1)))
    cw, ch = im.size
    ph = maxh if fixed else min(maxh, round(PW * ch / cw))
    # 액자 비율에 맞게 가운데 맞춤 자르기
    tr = PW / ph
    if cw / ch > tr:
        nw = int(ch * tr); im = im.crop(((cw - nw) // 2, 0, (cw - nw) // 2 + nw, ch))
    else:
        nh = int(cw / tr); im = im.crop((0, (ch - nh) // 2, cw, (ch - nh) // 2 + nh))
    im = im.resize((PW, ph), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.2, percent=50, threshold=2))
    b = io.BytesIO(); im.save(b, 'JPEG', quality=94)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode(), ph

FONT = "<link href='https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@700&display=block' rel='stylesheet'>"
CSS = """*{margin:0;box-sizing:border-box}
body{width:1080px;height:1350px;overflow:hidden;background:#f4eee6}
.c{position:relative;width:1080px;height:1350px;background:#f4eee6;color:#4a3b32;font-family:'Gowun Batang','Noto Serif CJK KR',serif;letter-spacing:-.02em}
.c:before{content:'';position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 0%,rgba(255,255,255,.55),rgba(255,255,255,0) 60%)}
.top{position:absolute;top:50px;left:70px;right:70px;display:flex;justify-content:space-between;font:600 23px/1 'Noto Sans CJK KR',sans-serif;color:#9a8574;letter-spacing:.14em}
.pn{position:absolute;left:70px;width:940px;border-radius:26px;overflow:hidden;box-shadow:0 18px 40px rgba(90,64,44,.12)}
.pn img{display:block;width:940px}
.tx{position:absolute;left:76px;right:70px;bottom:96px}
.tg{font:500 26px 'Noto Sans CJK KR',sans-serif;color:#a48d7a;margin-bottom:20px}
.ln{font-size:66px;font-weight:700;line-height:1.3;white-space:nowrap}
.l2{color:#b57f78}
.ft{position:absolute;bottom:58px;width:100%;text-align:center;font:600 23px 'Noto Sans CJK KR',sans-serif;color:#9a8574;letter-spacing:.14em}
"""
def page(inner): return f"<html><head><meta charset='utf-8'>{FONT}<style>{CSS}</style></head><body><div class='c'>{inner}</div></body></html>"

def build(q):
    s = []
    src, h = photo(q['photos'][0], 860, True)
    s.append(page(f"""<div class='top'><span>DAGGUU HOME</span><span>@dagguu.home</span></div>
<div class='pn' style='top:110px'><img src='{src}'></div>
<div class='tx'><div class='tg'>{e(q.get('tags',''))}</div><div class='t'><div class='ln'>{e(q['l1'])}</div><div class='ln l2'>{e(q['l2'])}</div></div></div>"""))
    for p in q['photos'][1:3]:
        src, h = photo(p, 1130)
        top = max(80, (1350 - 70 - h) // 2)
        s.append(page(f"""<div class='pn' style='top:{top}px'><img src='{src}'></div><div class='ft'>@dagguu.home</div>"""))
    return s

with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': 1080, 'height': 1350})
    for q in Q:
        if q['id'] in HAVE and '--all' not in sys.argv: continue
        out = os.path.join(OUT, q['id']); os.makedirs(out, exist_ok=True)
        for n, h in enumerate(build(q), 1):
            pg.set_content(h, wait_until='networkidle'); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(300)
            # 표지 두 줄이 넘치면 글씨를 줄인다
            pg.evaluate("""()=>{const t=document.querySelector('.t'); if(!t) return; const L=[...t.querySelectorAll('.ln')], max=t.clientWidth;
              let f=66; while(L.some(l=>l.scrollWidth>max+1)&&f>44){ f-=2; L.forEach(l=>l.style.fontSize=f+'px'); } }""")
            pg.screenshot(path=os.path.join(out, f'{n}.jpg'), type='jpeg', quality=95)
        print(out)
    b.close()
