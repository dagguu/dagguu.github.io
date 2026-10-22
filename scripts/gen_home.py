#!/usr/bin/env python3
"""@dagguu.home 정보성 카드뉴스(1080x1350) — 육아맘 생활 정보 + 마지막 장에 육아 체험단 제품 1개.
(2026-10-22 시온님 "정보성 피드", "너무 어둡지 않게 밝게")

scripts/home_queue.json 의 각 항목 → insta_out/home/<id>/1~N.jpg (이미 insta 브랜치에 있는 id 는 --all 없으면 건너뜀)
항목: {"id", "item": data.json item id, "date", "at": "21:07",
       "photos": [{"src": 쿠팡 상품 대표·갤러리 사진 주소(1200x1200ex), "box": [x0,y0,x1,y1]}, …],
       "cover": 표지 사진 번호, "h": [표지 굵은 글씨 2~3줄], "sub": 표지 작은 설명,
       "slides": [{"t": 정보 장 제목, "items": [3~4줄], "src": 출처(공식 기관 안내를 쓸 때), "bg": 흐린 바탕 사진 번호}, …](2~3장),
       "product": {"photo": 사진 번호, "name", "lines": [특징 1~2줄], "k": 꼬리표(선택)},
       "caption": 본문}
- 사진은 쿠팡 상품 페이지의 대표·갤러리 사진만(상세페이지 이미지 X, 남의 SNS 사진 X). 사람 얼굴·색상 견본·글씨는 box 로 잘라 뺀다.
- 정보는 일반 생활 정보·공식 기관 안내만(출처 표시). 효능·의학 표현, 확인 안 된 숫자, 지어낸 경험담 금지.
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
# 2026-10-22 18:43 시온님 "정보성 피드, 너무 어둡지 않게 밝게": 표지(사진 + 옅은 그늘 + 흰 글씨) → 정보 장(흐린 밝은 사진 바탕 + 흰 카드 체크리스트) → 마지막 제품 장
CSS = """*{margin:0;box-sizing:border-box}
body{width:1080px;height:1350px;overflow:hidden;background:#f6f1ea}
.c{position:relative;width:1080px;height:1350px;overflow:hidden;color:#fff;font-family:'Noto Sans CJK KR','Noto Sans KR',sans-serif;letter-spacing:-.04em;background:#f6f1ea}
.bg{position:absolute;inset:0;background-size:cover;background-position:center}
.blur{inset:-60px;filter:blur(22px) brightness(1.08) saturate(.9)}
.wash{position:absolute;inset:0;background:rgba(250,246,240,.5)}
.dk{position:absolute;inset:0;background:linear-gradient(180deg,rgba(40,30,25,.10) 0%,rgba(40,30,25,.08) 40%,rgba(40,30,25,.52) 100%)}
.wm{position:absolute;top:42px;right:52px;font-size:25px;font-weight:500;letter-spacing:0;text-shadow:0 1px 6px rgba(0,0,0,.35)}
.wm.d{color:#7a6a60;text-shadow:none}
.tx{position:absolute;left:84px;right:60px;bottom:140px;text-shadow:0 2px 14px rgba(0,0,0,.28)}
.t{font-size:96px;font-weight:900;line-height:1.2}
.ln{white-space:nowrap}
.sub{margin-top:28px;font-size:36px;font-weight:500}
.card{position:absolute;left:70px;right:70px;top:150px;bottom:150px;background:rgba(255,255,255,.93);border-radius:40px;padding:80px 70px;color:#2e2724;box-shadow:0 20px 50px rgba(90,64,44,.12);display:flex;flex-direction:column}
.no{font-size:30px;font-weight:800;color:#c08a83;letter-spacing:.06em}
.ct{margin-top:18px;font-size:66px;font-weight:900;line-height:1.25}
.ul{margin-top:56px;display:flex;flex-direction:column;gap:38px}
.li{display:flex;gap:24px;align-items:flex-start;font-size:40px;font-weight:600;line-height:1.4}
.ck{flex:none;width:46px;height:46px;border-radius:50%;background:#f3e3df;color:#b57f78;font-size:28px;font-weight:900;display:flex;align-items:center;justify-content:center;margin-top:4px}
.src{margin-top:auto;font-size:24px;color:#9a8b82;line-height:1.5}
.pph{position:absolute;left:0;right:0;top:0;height:780px;background-size:cover;background-position:center}
.pcard{position:absolute;left:0;right:0;bottom:0;top:720px;background:#fffdfa;border-radius:44px 44px 0 0;padding:64px 80px;color:#2e2724}
.pk{display:inline-block;font-size:26px;font-weight:800;color:#b57f78;background:#f6e9e6;border-radius:30px;padding:8px 22px}
.pn{margin-top:22px;font-size:58px;font-weight:900;line-height:1.25}
.pl{margin-top:24px;font-size:36px;font-weight:500;line-height:1.55;color:#4a403b}
.pf{position:absolute;left:80px;bottom:64px;font-size:30px;font-weight:700;color:#b57f78}
"""
def page(inner): return f"<html><head><meta charset='utf-8'><style>{CSS}</style></head><body><div class='c'>{inner}</div></body></html>"

def build(q):
    P = [photo(p) for p in q['photos']]
    s = []
    lines = q.get('h') or [q.get('l1', ''), q.get('l2', '')]
    s.append(page(f"""<div class='bg' style="background-image:url({P[q.get('cover',0)]})"></div><div class='dk'></div>
<div class='wm'>@dagguu.home</div><div class='tx'><div class='t'>{''.join(f"<div class='ln'>{e(x)}</div>" for x in lines if x)}</div>
{f"<div class='sub'>{e(q['sub'])}</div>" if q.get('sub') else ''}</div>"""))
    for i, sl in enumerate(q.get('slides', []), 1):
        lis = ''.join(f"<div class='li'><span class='ck'>✓</span><span>{e(x)}</span></div>" for x in sl['items'])
        s.append(page(f"""<div class='bg blur' style="background-image:url({P[sl.get('bg',0)]})"></div><div class='wash'></div>
<div class='wm d'>@dagguu.home</div><div class='card'><div class='no'>{i:02d}</div><div class='ct'>{e(sl['t'])}</div><div class='ul'>{lis}</div>
{f"<div class='src'>{e(sl['src'])}</div>" if sl.get('src') else ''}</div>"""))
    pr = q.get('product')
    if pr:
        s.append(page(f"""<div class='pph' style="background-image:url({P[pr.get('photo',0)]})"></div><div class='wm'>@dagguu.home</div>
<div class='pcard'><span class='pk'>{e(pr.get('k','오늘 정보에 맞는 제품'))}</span><div class='pn'>{e(pr['name'])}</div>
<div class='pl'>{'<br>'.join(e(x) for x in pr.get('lines', []))}</div><div class='pf'>제품은 프로필링크에서 확인해주세요!</div></div>"""))
    if not q.get('slides') and not pr:  # 예전 형식: 사진만 2~3장
        for p in P[1:3]:
            s.append(page(f"""<div class='bg' style="background-image:url({p})"></div><div class='wm'>@dagguu.home</div>"""))
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
              let f=96; while(L.some(l=>l.scrollWidth>max+1)&&f>60){ f-=2; t.style.fontSize=f+'px'; } }""")
            pg.screenshot(path=os.path.join(out, f'{n}.jpg'), type='jpeg', quality=95)
        print(out)
    b.close()
