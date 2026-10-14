#!/usr/bin/env python3
"""@dagguu.trip 인스타 카드뉴스(1080x1350) 만들기 — 숙소 사진 위에 글씨를 얹는 시온님 피드 형식.

scripts/insta_queue.json 의 각 항목을 읽어 insta_out/<날짜>/<id>/ 에 PNG 를 만든다.
항목: {"id": data.json item id, "photos": [사진 주소…], "l1": "흰 글씨 줄", "l2": "색 글씨 줄",
       "tags": "#감성숙소 #제주여행", "color": "#ffe14d"(선택), "captions": [사진별 감성 문구]}
- 1장: 표지(사진 + 아래 그라데이션 + 해시태그 한 줄 + 큰 제목 두 줄 + 우상단 @dagguu.trip)
- 2~(n-1)장: 사진 + 아래 감성 문구 한 줄(captions). 금액·무료·제공 같은 말은 쓰지 않는다(계정 제재 위험)
- 마지막: 사진(어둡게) + "댓글에 나도" 안내
숫자·혜택·마감일은 data.json 그대로만 쓴다.
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

def data_uri(src):
    if src.startswith('//'): src = 'https:' + src
    if src.startswith('http'):
        req = urllib.request.Request(src, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://trip.coupang.com/'})
        b = urllib.request.urlopen(req, timeout=30).read()
    else:
        b = open(src, 'rb').read()
    kind = 'png' if b[:4] == b'\x89PNG' else 'jpeg'
    return f'data:image/{kind};base64,' + base64.b64encode(b).decode()

def md(s): y, mo, dd = s.split('-'); return f'{int(mo)}/{int(dd)}'

CSS = """*{margin:0;box-sizing:border-box}
body{width:1080px;height:1350px;overflow:hidden;font-family:'Noto Sans CJK KR','Noto Sans KR',sans-serif;letter-spacing:-.035em}
.s{position:relative;width:1080px;height:1350px;background-size:cover;background-position:center;color:#fff}
.g{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 45%,rgba(0,0,0,.18) 62%,rgba(0,0,0,.62) 100%)}
.wm{position:absolute;top:34px;right:40px;font-size:26px;font-weight:600;opacity:.85;text-shadow:0 1px 6px rgba(0,0,0,.4)}
.box{position:absolute;left:62px;right:62px;bottom:92px}
.tg{font-size:30px;font-weight:600;opacity:.92;margin-bottom:14px;text-shadow:0 2px 8px rgba(0,0,0,.5)}
.t{font-size:84px;font-weight:900;line-height:1.2;text-shadow:0 3px 14px rgba(0,0,0,.55)}
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
<div class='wm'>@dagguu.trip</div><div class='box'><div class='tg'>{e(q.get('tags',''))}</div>
<div class='t'>{e(q['l1'])}<br><span style='color:{col}'>{e(q['l2'])}</span></div></div></div>"""))
    # 사진 속 글씨는 감성 문구만. 금액·"무료"·"제공" 같은 말은 넣지 않는다(인스타 계정 제재 위험, 시온님 요청).
    caps = q.get('captions') or []
    mids = ph[1:-1] if len(ph) > 2 else ph[1:2]
    for i, p in enumerate(mids):
        c = caps[i] if i < len(caps) else (f'📍 {city}' if city else '')
        pill = f"<div class='info'><div class='pill' style='font-weight:600'>{e(c)}</div></div>" if c else ''
        slides.append(page(f"""<div class='s' style="background-image:url({p})"><div class='g' style='background:linear-gradient(180deg,rgba(0,0,0,0) 60%,rgba(0,0,0,.45))'></div>
<div class='wm'>@dagguu.trip</div>{pill}</div>"""))
    last = ph[-1] if len(ph) > 1 else ph[0]
    slides.append(page(f"""<div class='s' style="background-image:url({last})"><div class='g' style='background:rgba(10,8,25,.55)'></div>
<div class='wm'>@dagguu.trip</div>
<div style='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center'>
<div style='font-size:42px;font-weight:700;opacity:.9;margin-bottom:26px;text-shadow:0 2px 10px rgba(0,0,0,.5)'>{e(q.get('end_top', '📍 ' + city if city else name))}</div>
<div style='font-size:86px;font-weight:900;line-height:1.25;text-shadow:0 3px 14px rgba(0,0,0,.5)'>이 숙소 궁금하다면<br>댓글에 <span style='color:{col}'>"나도"</span></div>
<div style='font-size:40px;font-weight:600;margin-top:40px;line-height:1.5;opacity:.95'>자세한 이야기 DM으로 전해드릴게요 💌</div>
<div style='position:absolute;bottom:80px;font-size:32px;font-weight:700;opacity:.85'>저장해두고 다음 여행 때 꺼내보세요 🤍</div></div></div>"""))
    return slides

with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': 1080, 'height': 1350})
    for q in queue:
        out = os.path.join(ROOT, 'insta_out', day, q['id'])
        os.makedirs(out, exist_ok=True)
        for n, h in enumerate(build(q), 1):
            pg.set_content(h); pg.wait_for_timeout(300)
            pg.screenshot(path=os.path.join(out, f'{n}.jpg'), type='jpeg', quality=90)
        print(out)
    b.close()
