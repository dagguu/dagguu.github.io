#!/usr/bin/env python3
"""@dagguu.trip 인스타 카드뉴스(1080x1350) 만들기 — 숙소 사진 위에 글씨를 얹는 시온님 피드 형식.

scripts/insta_queue.json 의 각 항목을 읽어 insta_out/<날짜>/<id>/1~3.jpg 를 만든다.
항목: {"id": data.json item id, "photos": [사진 주소 3개], "l1": "흰 글씨 줄", "l2": "색 글씨 줄",
       "tags": "#감성숙소 #제주여행", "color": "#ffe14d"(선택), "handle": "@dagguu.trip"(육아는 "@dagguu.home")}
- 1장: 표지(사진 + 아래 그라데이션 + 해시태그 한 줄 + 큰 제목 두 줄 + 우상단 @dagguu.trip)
- 2~3장: 사진 + 우상단 @dagguu.trip 만 (글씨 없음)
표지 글씨에 금액·무료·제공·팔로우 같은 말은 쓰지 않는다(계정 제재 위험).
"""
import json, os, re, sys, base64, html, urllib.request, datetime as dt
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KST = dt.timezone(dt.timedelta(hours=9))
day = dt.datetime.now(KST).strftime('%Y-%m-%d')
d = json.load(open(os.path.join(ROOT, 'data.json'), encoding='utf-8'))
items = {i['id']: i for i in d['items']}
queue = json.load(open(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'scripts', 'insta_queue.json'), encoding='utf-8'))
e = html.escape

W, H = 1080, 1350
_SR = None
def _sr():
    """OpenCV 초해상도(FSRCNN x2, 빠름) 모델. 없으면 None → Lanczos 로 대신."""
    global _SR
    if _SR is None:
        _SR = False
        try:
            import cv2
            mp = os.path.join(os.environ.get('RUNNER_TEMP', '/tmp'), 'FSRCNN_x2.pb')
            if not os.path.exists(mp):
                urllib.request.urlretrieve('https://github.com/Saafke/FSRCNN_Tensorflow/raw/master/models/FSRCNN_x2.pb', mp)
            m = cv2.dnn_superres.DnnSuperResImpl_create(); m.readModel(mp); m.setModel('fsrcnn', 2); _SR = m
        except Exception as ex:
            print('초해상도 모델 못 씀, Lanczos 사용:', ex)
    return _SR or None

def fetch(src):
    if src.startswith('//'): src = 'https:' + src
    if src.startswith('http'):
        req = urllib.request.Request(src, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.coupang.com/'})
        return urllib.request.urlopen(req, timeout=30).read()
    return open(src, 'rb').read()

def data_uri(src):
    """사진을 받아(필요하면 상세페이지 부분 잘라내기) 1080x1350 에 맞게 화질을 올려 data URI 로.
    src 끝에 #crop=y0,y1 (0~1, 세로 비율)을 붙이면 긴 상세페이지 이미지의 그 부분만 쓴다."""
    from PIL import Image, ImageFilter
    import io
    crop = None
    if '#crop=' in src:
        src, c = src.split('#crop=', 1); crop = [float(v) for v in c.split(',')[:2]]
    im = Image.open(io.BytesIO(fetch(src))).convert('RGB')
    if crop:
        w, h = im.size; im = im.crop((0, int(h * crop[0]), w, int(h * crop[1])))
    w, h = im.size
    scale = max(W / w, H / h)
    if scale > 1.15:  # 작은 사진은 초해상도로 2배 키운 뒤 맞춤
        m = _sr()
        if m:
            import numpy as np, cv2
            im = Image.fromarray(cv2.cvtColor(m.upsample(cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR)), cv2.COLOR_BGR2RGB))
        else:
            im = im.resize((w * 2, h * 2), Image.LANCZOS)
        w, h = im.size; scale = max(W / w, H / h)
    nw, nh = max(W, round(w * scale)), max(H, round(h * scale))
    im = im.resize((nw, nh), Image.LANCZOS)
    l, t = (nw - W) // 2, (nh - H) // 2
    im = im.crop((l, t, l + W, t + H)).filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
    b = io.BytesIO(); im.save(b, 'JPEG', quality=95)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()

def md(s): y, mo, dd = s.split('-'); return f'{int(mo)}/{int(dd)}'

CSS = """*{margin:0;box-sizing:border-box}
body{width:1080px;height:1350px;overflow:hidden;font-family:'Noto Sans CJK KR','Noto Sans KR',sans-serif;letter-spacing:-.035em}
.s{position:relative;width:1080px;height:1350px;background-size:cover;background-position:center;color:#fff}
.g{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 45%,rgba(0,0,0,.18) 62%,rgba(0,0,0,.62) 100%)}
.wm{position:absolute;top:34px;right:40px;font-size:26px;font-weight:600;opacity:.85;text-shadow:0 1px 6px rgba(0,0,0,.4)}
.box{position:absolute;left:62px;right:62px;bottom:92px}
.tg{font-size:30px;font-weight:600;opacity:.92;margin-bottom:14px;text-shadow:0 2px 8px rgba(0,0,0,.5)}
.t{font-size:84px;font-weight:900;line-height:1.2;text-shadow:0 3px 14px rgba(0,0,0,.55)}
.ln{white-space:nowrap}
.info{position:absolute;left:50px;bottom:64px;right:50px;display:flex}
.pill{background:rgba(20,16,40,.62);backdrop-filter:blur(6px);border-radius:22px;padding:22px 30px;font-size:40px;font-weight:700;line-height:1.35}
.pill small{display:block;font-size:28px;font-weight:600;opacity:.8;margin-bottom:4px}
"""
def page(inner): return f"<html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{inner}</body></html>"

def build(q):
    it = items[q['id']]
    m = re.match(r'^(.*?)\s*\(([^()]*)\)\s*$', it['name'])
    name, city = (m.group(1), m.group(2)) if m else (it['name'], '')
    col = q.get('color', '#ffe14d')
    ph = [data_uri(p) for p in q['photos']]
    slides = []
    slides.append(page(f"""<div class='s' style="background-image:url({ph[0]})"><div class='g'></div>
<div class='wm'>{e(q.get('handle','@dagguu.trip'))}</div><div class='box'><div class='tg'>{e(q.get('tags',''))}</div>
<div class='t'><div class='ln'>{e(q['l1'])}</div><div class='ln' style='color:{col}'>{e(q['l2'])}</div></div></div></div>"""))
    # 2~3장: 사진 + 우상단 @dagguu.trip 만 (글씨 없음, 시온님 요청 2026-10-15)
    for p in ph[1:3]:
        slides.append(page(f"""<div class='s' style="background-image:url({p})"><div class='wm'>{e(q.get('handle','@dagguu.trip'))}</div></div>"""))
    return slides

with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': 1080, 'height': 1350})
    for q in queue:
        out = os.path.join(ROOT, 'insta_out', day, q['id'])
        os.makedirs(out, exist_ok=True)
        for n, h in enumerate(build(q), 1):
            pg.set_content(h); pg.wait_for_timeout(300)
            # 표지 글씨는 꼭 두 줄: 넘치면 끝의 하트(이모지)를 지우고, 그래도 넘치면 글씨를 줄인다
            pg.evaluate("""()=>{const t=document.querySelector('.t'); if(!t) return; const L=[...t.querySelectorAll('.ln')], max=t.clientWidth;
              const over=()=>L.some(l=>l.scrollWidth>max+1);
              if(over()) L.forEach(l=>{ if(l.scrollWidth>max+1) l.textContent=l.textContent.replace(/[\\s]*[\\u2600-\\u27BF\\u{1F300}-\\u{1FAFF}\\uFE0F\\u200D]+[\\s]*$/u,''); });
              let f=84; while(over()&&f>48){ f-=2; t.style.fontSize=f+'px'; } }""")
            pg.screenshot(path=os.path.join(out, f'{n}.jpg'), type='jpeg', quality=95)
        print(out)
    b.close()
