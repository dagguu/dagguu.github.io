#!/usr/bin/env python3
"""카카오톡 채널 캐러셀(피드형) 카드 이미지 만들기.

scripts/kakao_queue.json = {"date": "YYYY-MM-DD", "cards": [카드, ...]} (2~6장)
카드: {"photos": [{"img", "fit": "cover"(숙소)|"contain"(제품), "name": 사진 위 작은 이름, "tag": 아래 가격·혜택 딱지}] (2~4장 콜라주, 3장이면 첫 장이 넓게),
       (옛 형식 "img"+"fit" 한 장도 됨)
       "bg": 배경 파스텔색, "accent": 강조색, "pill": 맨 위 작은 꼬리표,
       "l1": 큰 글씨 1줄, "l2": 강조색 큰 글씨 1줄, "sticker": 동그라미 스티커(짧게, 줄바꿈은 \n), "sub": 제목 아래 흰 띠 한 줄(선택),
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
body{{width:{W}px;height:{H}px;overflow:hidden;font-family:'Jua','Noto Sans CJK KR',sans-serif;letter-spacing:-.02em}}
.pill,.t,.sub,.nm,.tag,.st,.wm{{font-family:'Jua','Noto Sans CJK KR',sans-serif;font-weight:400 !important}}
.c{{position:relative;width:{W}px;height:{H}px;padding:50px 40px 0;text-align:center;overflow:hidden}}
.rays{{position:absolute;left:-50%;top:-60%;width:200%;height:200%;opacity:.55}}
.dot{{position:absolute;border-radius:50%}}
.pill{{position:relative;display:inline-block;padding:10px 28px;border-radius:40px;font-size:34px;font-weight:900;color:#fff;margin-bottom:14px;box-shadow:0 4px 0 rgba(0,0,0,.12)}}
.t{{position:relative;font-weight:900;line-height:1.08;color:#24193a;-webkit-text-stroke:14px #fff;paint-order:stroke fill;filter:drop-shadow(0 6px 0 rgba(0,0,0,.10))}}
.t b{{display:block;font-weight:400;font-family:'Black Han Sans','Jua',sans-serif;letter-spacing:-.01em}}
.t b.w{{color:#fff;-webkit-text-stroke:10px #111;paint-order:stroke fill}}
.t b.k{{font-family:'Black Han Sans','Jua',sans-serif;letter-spacing:-.01em}}
.sub{{position:relative;display:inline-block;margin-top:14px;font-size:32px;font-weight:800;color:#24193a;background:#fff;border-radius:14px;padding:6px 18px}}
.g{{position:absolute;left:40px;right:40px;bottom:46px;top:{{TOP}}px;display:grid;grid-template-columns:1fr 1fr;gap:20px}}
.tile{{position:relative;border-radius:30px;overflow:hidden;background:#fff;border:7px solid #fff;box-shadow:0 10px 24px rgba(40,20,80,.20)}}
.tile:nth-child(odd){{transform:rotate(-1.6deg)}} .tile:nth-child(even){{transform:rotate(1.6deg)}}
.tile.wide{{grid-column:1 / span 2}}
.tile img{{width:100%;height:100%;object-fit:cover;display:block}}
.tile.ct img{{object-fit:contain;padding:22px 22px 70px}}
.nm{{position:absolute;left:0;right:0;top:0;padding:12px 16px 30px;text-align:left;color:#fff;font-size:27px;font-weight:800;background:linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,0))}}
.tile.ct .nm{{color:#3a3050;background:none;padding:10px 14px;font-size:24px}}
.tag{{position:absolute;left:12px;bottom:12px;padding:8px 16px;border-radius:16px;font-size:30px;font-weight:900;color:#fff;white-space:nowrap}}
.st{{font-family:'Jua','Noto Sans CJK KR',sans-serif !important;position:absolute;right:22px;width:200px;height:200px;border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:5;
  color:#fff;font-weight:900;line-height:1.02;transform:rotate(10deg);box-shadow:0 10px 24px rgba(0,0,0,.22);border:8px solid #fff;white-space:pre-line}}
.wm{{position:absolute;right:46px;bottom:14px;color:rgba(36,25,58,.55);font-size:22px;font-weight:800}}
"""

def card(c):
    ac = c.get('accent', '#ff6b3d'); bg = c.get('bg', '#fff4d6')
    photos = c.get('photos') or [{'img': c['img'], 'fit': c.get('fit', 'cover')}]
    n = len(photos)
    l1, l2 = c['l1'], c.get('l2', '')
    fs = int(min(112, 800 / (max(len(l1), len(l2)) * 0.97)))
    top = 50 + 64 + 2 * int(fs * 1.08) + (62 if c.get('sub') else 0) + 26
    tiles = []
    for i, p in enumerate(photos):
        wide = ' wide' if (n == 3 and i == 0) or n == 1 else ''
        ct = ' ct' if p.get('fit') == 'contain' else ''
        nm = f"<div class='nm'>{e(p['name'])}</div>" if p.get('name') else ''
        tg = f"<div class='tag' style='background:{p.get('tagc', ac)}'>{e(p['tag'])}</div>" if p.get('tag') else ''
        tiles.append(f"<div class='tile{wide}{ct}'><img src=\"{data_uri(p['img'])}\">{nm}{tg}</div>")
    rows = 1 if n <= 2 else 2
    ml = max((len(x) for x in str(c.get('sticker', '')).split('\n')), default=0)
    nl = str(c.get('sticker', '')).count('\n') + 1
    sfs = min(64 if ml <= 3 else 50 if ml <= 4 else 40, 150 // nl)
    st = f"<div class='st' style='top:{top-60}px;right:16px;background:{ac};font-size:{sfs}px'>{e(c['sticker'])}</div>" if c.get('sticker') else ''
    sub = f"<div class='sub'>{e(c['sub'])}</div>" if c.get('sub') else ''
    rays = f"<div class='rays' style='background:repeating-conic-gradient(from 0deg at 50% 50%,{bg} 0 9deg,#ffffff 9deg 18deg)'></div>"
    dots = ''.join(f"<div class='dot' style='left:{x}px;top:{y}px;width:{r}px;height:{r}px;background:{col}'></div>" for x, y, r, col in
                   ((40, 70, 26, ac), (820, 40, 18, '#ffd23f'), (70, 300, 14, '#4cc9f0'), (800, 300, 22, '#ff5c93'), (20, 200, 12, '#ffd23f')))
    css = CSS.replace('{TOP}', str(top))
    return f"""<html><head><meta charset='utf-8'><style>{css}.g{{grid-template-rows:repeat({rows},1fr)}}</style></head><body>
<div class='c' style='background:{bg}'>{rays}{dots}
<div class='pill' style='background:{ac}'>{e(c.get('pill', ''))}</div>
<div class='t' style='font-size:{fs}px'><b class='w'>{e(l1)}</b><b class='k' style='color:{ac}'>{e(l2)}</b></div>{sub}
<div class='g'>{''.join(tiles)}</div>{st}<div class='wm'>다꾸 체험단</div>
</div></body></html>"""


# ── v2: 연한 크림 배경 + 큰 제목 + 물결 스티커 + 2x2 카드(이름·짧은 문구·가격 버튼) + 아래 큰 버튼 (2026-10-16 시온님 예시) ──
import math
def wavy(r=100, n=14, amp=7):
    pts = []
    for k in range(360):
        a = math.radians(k); rr = r + amp * math.cos(n * a)
        pts.append(f"{120 + rr*math.cos(a):.1f},{120 + rr*math.sin(a):.1f}")
    return "M" + " L".join(pts) + " Z"
WAVY = wavy()
CSS2 = f"""*{{margin:0;box-sizing:border-box}}
body{{width:{W}px;height:{H}px;overflow:hidden;font-family:'Noto Sans CJK KR','Noto Sans KR',sans-serif;letter-spacing:-.03em}}
.c{{position:relative;width:{W}px;height:{H}px;overflow:hidden;text-align:center;padding-top:44px}}
.bub{{position:absolute;border-radius:50%}}
.lab{{position:relative;display:inline-block;padding:12px 34px;border-radius:40px;font-size:30px;font-weight:700;color:#2a2a2a}}
.h{{position:relative;font-family:'Black Han Sans','Jua',sans-serif;line-height:1.08;margin-top:16px}}
.h b{{display:block;font-weight:400}}
.sub{{position:relative;display:inline-block;margin-top:14px;font-size:29px;font-weight:600;color:#333;padding:0 6px 6px}}
.st{{position:absolute;right:8px;width:190px;height:190px;z-index:6;transform:rotate(-6deg)}}
.st svg{{position:absolute;inset:0;filter:drop-shadow(0 6px 10px rgba(0,0,0,.18))}}
.st div{{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Jua',sans-serif;color:#fff;line-height:1.05;white-space:pre-line}}
.g{{position:absolute;left:34px;right:34px;display:grid;grid-template-columns:1fr 1fr;gap:18px}}
.tile{{position:relative;border-radius:26px;overflow:hidden;background:#fff;box-shadow:0 8px 22px rgba(60,50,30,.13)}}
.tile img{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
.tile.ct img{{left:42%;width:58%;object-fit:contain;padding:22px 14px 22px 0}}
.tile .fd{{position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.96) 0%,rgba(255,255,255,.85) 38%,rgba(255,255,255,0) 66%)}}
.tile.ct .fd{{background:none}}
.tx{{position:absolute;left:24px;top:24px;right:20px;text-align:left}}
.nm{{font-weight:800;color:#1d1d1d;line-height:1.2;white-space:nowrap}}
.cp{{margin-top:12px;font-size:25px;font-weight:500;color:#444;line-height:1.38;white-space:pre-line}}
.pr{{position:absolute;left:18px;bottom:20px;display:flex;align-items:center;gap:12px;padding:10px 12px 10px 22px;border-radius:40px;color:#fff;font-size:28px;font-weight:800;box-shadow:0 4px 10px rgba(0,0,0,.15)}}
.pr i{{display:inline-flex;width:34px;height:34px;border-radius:50%;background:#fff;align-items:center;justify-content:center;font-style:normal;font-size:24px;font-weight:900}}
.cta{{position:absolute;left:50%;transform:translateX(-50%);bottom:34px;padding:22px 56px;border-radius:60px;color:#fff;font-size:32px;font-weight:800;white-space:nowrap;box-shadow:0 8px 18px rgba(0,0,0,.2)}}
"""
def card_v2(c):
    ac, lt, bg = c.get('accent', '#1f7a4a'), c.get('light', '#dcebd9'), c.get('bg', '#f5f3ea')
    l1, l2 = c['l1'], c.get('l2', '')
    fs = int(min(108, 680 / (max(len(l1), len(l2)) * 0.98)))
    gtop = 44 + 62 + 16 + int(fs * 1.08) * 2 + 14 + 48 + 34
    gbot = 34 + 86 + 30
    tiles = []
    for p in c['tiles']:
        ct = ' ct' if p.get('fit') == 'contain' else ''
        tiles.append(f"""<div class='tile{ct}'><img src="{data_uri(p['img'])}"><div class='fd'></div>
<div class='tx'><div class='nm' style='font-size:{28 if len(p["name"])<=8 else 25 if len(p["name"])<=10 else 22}px'>{e(p['name'])}</div><div class='cp'>{e(p.get('copy',''))}</div></div>
<div class='pr' style='background:{ac}'>{e(p['price'])}<i style='color:{ac}'>›</i></div></div>""")
    bubs = ''.join(f"<div class='bub' style='left:{x}px;top:{y}px;width:{r}px;height:{r}px;background:{lt};opacity:{o}'></div>"
                   for x, y, r, o in ((-90, 140, 260, .7), (720, -90, 280, .6), (760, 1040, 260, .55), (-60, 980, 180, .45)))
    sl = str(c.get('sticker', '')).split('\n')
    sti = ''.join(f"<span style='font-size:{28 if k==0 and len(sl)>2 else 40}px;color:{'#fff' if k==0 and len(sl)>2 else '#ffe14d'}'>{e(t)}</span>" for k, t in enumerate(sl))
    st = f"<div class='st' style='top:{44 + 62 + 16 + int(fs * 1.08) - 10}px'><svg viewBox='0 0 240 240'><path d='{WAVY}' fill='{ac}' stroke='#fff' stroke-width='6'/></svg><div>{sti}</div></div>" if c.get('sticker') else ''
    return f"""<html><head><meta charset='utf-8'><style>{CSS2}</style></head><body>
<div class='c' style='background:{bg}'>{bubs}
<div class='lab' style='background:{lt}'>{e(c.get('label',''))}</div>
<div class='h' style='font-size:{fs}px'><b style='color:#161616'>{e(l1)}</b><b style='color:{ac}'>{e(l2)}</b></div>
<div class='sub' style='border-bottom:5px solid {lt}'>{e(c.get('sub',''))}</div>{st}
<div class='g' style='top:{gtop}px;bottom:{gbot}px;grid-template-rows:1fr 1fr'>{''.join(tiles)}</div>
<div class='cta' style='background:{ac}'>{e(c.get('cta','지금 보러가기 →'))}</div>
</div></body></html>"""

# ── v3: 화려한 스타일 (2026-10-17 시온님 요청 "칙칙해, 화려하게") — 쨍한 그라데이션 배경 + 햇살 무늬 + 색종이 + 흰/노랑 외곽선 제목 + 노란 별 스티커 + 번호 배지 + 노란 가격·버튼 ──
import random
CSS3 = f"""*{{margin:0;box-sizing:border-box}}
body{{width:{W}px;height:{H}px;overflow:hidden;font-family:'Noto Sans CJK KR','Noto Sans KR',sans-serif;letter-spacing:-.03em}}
.c{{position:relative;width:{W}px;height:{H}px;overflow:hidden;text-align:center;padding-top:40px}}
.ray{{position:absolute;left:50%;top:230px;width:2400px;height:2400px;margin:-1200px 0 0 -1200px;border-radius:50%;
 background:repeating-conic-gradient(rgba(255,255,255,.16) 0 7deg,rgba(255,255,255,0) 7deg 15deg)}}
.glow{{position:absolute;left:50%;top:230px;width:900px;height:900px;margin:-450px 0 0 -450px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.35),rgba(255,255,255,0) 65%)}}
.cf{{position:absolute;border-radius:3px}}
.sp{{position:absolute;color:#fff;font-family:'Noto Sans CJK KR',sans-serif;line-height:1;text-shadow:0 0 12px rgba(255,255,255,.8)}}
.lab{{position:relative;display:inline-block;padding:11px 34px;border-radius:40px;font-size:30px;font-weight:900;color:#1a1033;background:#ffe14d;border:4px solid #1a1033;box-shadow:0 5px 0 #1a1033;transform:rotate(-2deg)}}
.h{{position:relative;font-family:'Black Han Sans','Jua','Noto Sans CJK KR',sans-serif;font-weight:900;line-height:1.06;margin-top:14px}}
.h b{{display:block;font-weight:inherit;-webkit-text-stroke:16px #1a1033;paint-order:stroke fill;text-shadow:0 9px 0 #1a1033}}
.sub{{position:relative;display:inline-block;margin-top:12px;font-size:29px;font-weight:800;background:#fff;border-radius:30px;padding:7px 26px;box-shadow:0 5px 0 rgba(26,16,51,.35)}}
.st{{position:absolute;right:-4px;width:190px;height:190px;z-index:6;transform:rotate(10deg)}}
.st svg{{position:absolute;inset:0;filter:drop-shadow(0 7px 0 #1a1033)}}
.st div{{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Jua','Noto Sans CJK KR',sans-serif;font-weight:900;line-height:1.05;white-space:pre-line}}
.g{{position:absolute;left:34px;right:34px;display:grid;grid-template-columns:1fr 1fr;gap:22px}}
.tile{{position:relative;border-radius:28px;overflow:hidden;background:#fff;border:6px solid #fff;box-shadow:0 8px 0 #1a1033,0 14px 26px rgba(0,0,0,.25)}}
.tile:nth-child(1),.tile:nth-child(4){{transform:rotate(-1.4deg)}} .tile:nth-child(2),.tile:nth-child(3){{transform:rotate(1.4deg)}}
.tile img{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
.tile.ct img{{left:42%;width:58%;object-fit:contain;padding:22px 14px 22px 0}}
.tile .fd{{position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.97) 0%,rgba(255,255,255,.88) 38%,rgba(255,255,255,0) 66%)}}
.tile.ct .fd{{background:none}}
.tx{{position:absolute;left:22px;top:22px;right:18px;text-align:left}}
.nm{{font-weight:900;color:#1a1033;line-height:1.2;white-space:nowrap}}
.cp{{margin-top:10px;font-size:25px;font-weight:600;color:#3d3550;line-height:1.36;white-space:pre-line}}
.no{{position:absolute;right:12px;top:12px;width:50px;height:50px;border-radius:50%;color:#fff;font-size:27px;font-weight:900;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 3px 0 #1a1033}}
.pr{{position:absolute;left:16px;bottom:18px;display:flex;align-items:center;gap:10px;padding:9px 11px 9px 20px;border-radius:40px;background:#ffe14d;color:#1a1033;font-size:28px;font-weight:900;border:3px solid #1a1033;box-shadow:0 4px 0 #1a1033}}
.pr i{{display:inline-flex;width:32px;height:32px;border-radius:50%;color:#fff;align-items:center;justify-content:center;font-style:normal;font-size:23px;font-weight:900}}
.cta{{position:absolute;left:50%;transform:translateX(-50%);bottom:30px;padding:20px 54px;border-radius:60px;background:#ffe14d;color:#1a1033;font-size:33px;font-weight:900;white-space:nowrap;border:5px solid #1a1033;box-shadow:0 8px 0 #1a1033}}
"""
def burst(n=16, r1=118, r2=92):
    pts = []
    for k in range(n * 2):
        a = math.pi * k / n - math.pi / 2; r = r1 if k % 2 == 0 else r2
        pts.append(f"{120 + r*math.cos(a):.1f},{120 + r*math.sin(a):.1f}")
    return "M" + " L".join(pts) + " Z"
BURST = burst()
def card_v3(c):
    ac = c.get('accent', '#ff3d7f'); a2 = c.get('accent2', '#ff9a3d')
    l1, l2 = c['l1'], c.get('l2', '')
    fs = int(min(108, 600 / (max(len(l1), len(l2)) * 0.98)))
    gtop = 40 + 64 + 14 + int(fs * 1.06) * 2 + 12 + 52 + 34
    gbot = 30 + 92 + 34
    rnd = random.Random(l1 + l2)
    cols = ['#ffe14d', '#ffffff', '#3dd6ff', '#7cff6b', '#ff7ad9', '#1a1033']
    cf = ''.join(f"<div class='cf' style='left:{rnd.randint(0,W)}px;top:{rnd.randint(0,gtop+40)}px;width:{rnd.randint(10,22)}px;height:{rnd.randint(6,12)}px;background:{rnd.choice(cols)};transform:rotate({rnd.randint(0,180)}deg);opacity:.9'></div>" for _ in range(34))
    cf += ''.join(f"<div class='sp' style='left:{x}px;top:{y}px;font-size:{s}px'>✦</div>" for x, y, s in ((60, 70, 46), (800, 40, 34), (40, 330, 30), (150, 210, 22), (720, 300, 26), (850, 1150, 30), (20, 1150, 26)))
    tiles = []
    for i, p in enumerate(c['tiles'], 1):
        ct = ' ct' if p.get('fit') == 'contain' else ''
        tiles.append(f"""<div class='tile{ct}'><img src="{data_uri(p['img'])}"><div class='fd'></div>
<div class='no' style='background:{ac if i % 2 else a2}'>{i}</div>
<div class='tx'><div class='nm' style='font-size:{28 if len(p["name"])<=8 else 25 if len(p["name"])<=10 else 22}px'>{e(p['name'])}</div><div class='cp'>{e(p.get('copy',''))}</div></div>
<div class='pr'>{e(p['price'])}<i style='background:{ac}'>›</i></div></div>""")
    sl = str(c.get('sticker', '')).split('\n')
    sti = ''.join(f"<span style='font-size:{30 if k==0 and len(sl)>2 else 44}px;color:{'#1a1033' if k==0 and len(sl)>2 else ac}'>{e(t)}</span>" for k, t in enumerate(sl))
    st = f"<div class='st' style='top:{40 + 64 + 14 + int(fs * 1.06) - 30}px'><svg viewBox='0 0 240 240'><path d='{BURST}' fill='#ffe14d' stroke='#1a1033' stroke-width='6' stroke-linejoin='round'/></svg><div>{sti}</div></div>" if c.get('sticker') else ''
    return f"""<html><head><meta charset='utf-8'><style>{CSS3}</style></head><body>
<div class='c' style='background:linear-gradient(160deg,{ac} 0%,{a2} 100%)'><div class='ray'></div><div class='glow'></div>{cf}
<div class='lab'>{e(c.get('label',''))}</div>
<div class='h' style='font-size:{fs}px'><b style='color:#fff'>{e(l1)}</b><b style='color:#ffe14d'>{e(l2)}</b></div>
<div class='sub' style='color:{ac}'>{e(c.get('sub',''))}</div>{st}
<div class='g' style='top:{gtop}px;bottom:{gbot}px;grid-template-rows:1fr 1fr'>{''.join(tiles)}</div>
<div class='cta'>{e(c.get('cta','지금 보러가기 →'))}</div>
</div></body></html>"""

def render(c): return card_v3(c) if c.get('style') == 'v3' else card_v2(c) if c.get('style') == 'v2' else card(c)

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
        pg.set_content(render(c)); pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(out, f'{n}.jpg'), type='jpeg', quality=88)
        print(out, n)
    b.close()
