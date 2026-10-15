#!/usr/bin/env python3
"""카카오톡 채널 캐러셀(피드형) 카드 이미지 만들기.

scripts/kakao_queue.json = {"date": "YYYY-MM-DD", "cards": [카드, ...]} (2~6장)
카드: {"img": 사진 주소, "fit": "cover"(숙소 사진) | "contain"(제품 사진),
       "bg": 배경 파스텔색, "accent": 강조색, "pill": 맨 위 작은 꼬리표,
       "l1": 큰 글씨 1줄, "l2": 강조색 큰 글씨 1줄, "sticker": 동그라미 스티커(짧게, 줄바꿈은 \n),
       "title"/"desc"/"btn"/"url": 카카오 관리자센터에 넣을 글(이미지에는 안 들어감)}
결과: kakao_out/<date>/1.jpg ... (900x1200, 3:4 — 카카오 캐러셀 피드형 허용 비율 2:1~3:4)
"""
import json, os, sys, base64, html, re, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Q = json.load(open(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else os.path.join(ROOT, 'scripts', 'kakao_queue.json'), encoding='utf-8'))
e = html.escape
W, H = 900, 1200

def fetch(src):
    if src.startswith('//'): src = 'https:' + src
    if not src.startswith('http'): return open(os.path.join(ROOT, src), 'rb').read()
    ref = 'https://trip.coupang.com/' if 'coupang' in src else 'https://shopping.toss.im/'
    req = urllib.request.Request(src, headers={'User-Agent': 'Mozilla/5.0', 'Referer': ref})
    return urllib.request.urlopen(req, timeout=30).read()

def data_uri(src):
    tries = [src]
    # 쿠팡트래블 썸네일은 400x400 으로 잘려 있어 큰 사진을 먼저 시도
    m = re.search(r'/thumbnails/remote/[^/]+/(image/.+)$', src)
    if m: tries = ['https://image.coupangcdn.com/' + m.group(1), re.sub(r'/remote/[^/]+/', '/remote/800x800ex/', src), src]
    for t in tries:
        try:
            b = fetch(t)
            if len(b) > 2000: break
        except Exception as ex:
            print('사진 실패', t, ex)
    kind = 'png' if b[:4] == b'\x89PNG' else 'jpeg'
    return f'data:image/{kind};base64,' + base64.b64encode(b).decode()

CSS = f"""*{{margin:0;box-sizing:border-box}}
body{{width:{W}px;height:{H}px;overflow:hidden;font-family:'Noto Sans CJK KR','Noto Sans KR',sans-serif;letter-spacing:-.04em}}
.c{{position:relative;width:{W}px;height:{H}px;padding:58px 54px 0;text-align:center}}
.pill{{display:inline-block;padding:12px 30px;border-radius:40px;font-size:34px;font-weight:800;color:#fff;margin-bottom:22px}}
.t{{font-size:84px;font-weight:900;line-height:1.14;color:#2b2140;-webkit-text-stroke:2px #fff;paint-order:stroke fill;text-shadow:0 4px 0 rgba(255,255,255,.9)}}
.t b{{display:block;font-weight:900}}
.ph{{position:absolute;left:54px;right:54px;bottom:54px;top:{int(H*0.40)}px;border-radius:40px;overflow:hidden;background:#fff;box-shadow:0 10px 30px rgba(40,20,80,.16)}}
.ph img{{width:100%;height:100%;object-fit:cover}}
.ph.ct img{{object-fit:contain;padding:36px}}
.st{{position:absolute;right:30px;top:{int(H*0.40)-70}px;width:220px;height:220px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  color:#fff;font-size:44px;font-weight:900;line-height:1.08;transform:rotate(8deg);box-shadow:0 8px 20px rgba(0,0,0,.18);border:6px solid #fff;white-space:pre-line}}
.wm{{position:absolute;left:84px;bottom:80px;background:rgba(255,255,255,.9);color:#6b4bd6;font-size:26px;font-weight:800;padding:8px 18px;border-radius:20px}}
"""

def card(c):
    ac = c.get('accent', '#ff6b3d')
    ph = data_uri(c['img'])
    fit = ' ct' if c.get('fit') == 'contain' else ''
    ml = max((len(x) for x in str(c.get('sticker', '')).split('\n')), default=0)
    fs = 50 if ml <= 3 else 42 if ml <= 5 else 34
    st = f"<div class='st' style='background:{ac};font-size:{fs}px'>{e(c['sticker'])}</div>" if c.get('sticker') else ''
    return f"""<html><head><meta charset='utf-8'><style>{CSS}</style></head><body>
<div class='c' style='background:{c.get('bg', '#fff4d6')}'>
<div class='pill' style='background:{ac}'>{e(c.get('pill', ''))}</div>
<div class='t'><b>{e(c['l1'])}</b><b style='color:{ac}'>{e(c.get('l2', ''))}</b></div>
<div class='ph{fit}'><img src="{ph}"></div>{st}<div class='wm'>다꾸 체험단</div>
</div></body></html>"""

def text():
    raw = f"https://raw.githubusercontent.com/dagguu/dagguu.github.io/insta/kakao/{Q['date']}"
    L = [f"카카오톡 채널 캐러셀(피드형) {Q['date']} — 카드 {len(Q['cards'])}장", "관리자센터 > 메시지 작성 > 캐러셀형 > 카드마다 아래 이미지·제목·설명·버튼을 넣어요.", ""]
    for n, c in enumerate(Q['cards'], 1):
        for k, lim in (('title', 20), ('desc', 180), ('btn', 8)):
            if len(c[k]) > lim: raise SystemExit(f"카드 {n} {k} {len(c[k])}자 > {lim}자")
        if c['desc'].count('\n') > 2: raise SystemExit(f"카드 {n} 설명 줄바꿈 3번 이상")
        L += [f"━━ 카드 {n} ━━", f"이미지: {raw}/{n}.jpg", f"제목: {c['title']}", "설명:", c['desc'], f"버튼: {c['btn']} | {c['url']}"]
        if c.get('btn2'): L.append(f"버튼2: {c['btn2']} | {c['url2']}")
        L.append("")
    return "\n".join(L)

if '--text' in sys.argv:
    print(text()); sys.exit(0)
text()  # 글자수 검사

from playwright.sync_api import sync_playwright
out = os.path.join(ROOT, 'kakao_out', Q['date'])
os.makedirs(out, exist_ok=True)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': W, 'height': H})
    for n, c in enumerate(Q['cards'], 1):
        pg.set_content(card(c)); pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(out, f'{n}.jpg'), type='jpeg', quality=88)
        print(out, n)
    b.close()
