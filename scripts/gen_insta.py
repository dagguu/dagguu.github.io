#!/usr/bin/env python3
"""인스타 체험단 소개 카드뉴스(1080x1350, 3장) 만들기.

사용: python3 scripts/gen_insta.py <item id> [--photo 사진파일] [--hook "표지 문구"] [--out 폴더]
- 사진을 주면 표지 배경으로 깔고(어둡게 덮어 글씨가 잘 보이게), 없으면 다꾸 색 배경으로 만든다.
- 숫자·혜택·마감일은 data.json 그대로만 쓴다.
"""
import json, os, re, sys, base64, html, datetime as dt
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
a = sys.argv[1:]
def opt(n, d=None):
    if n in a:
        i = a.index(n); v = a[i + 1]; del a[i:i + 2]; return v
    return d
photo, hook, out = opt('--photo'), opt('--hook'), opt('--out')
iid = a[0]
d = json.load(open(os.path.join(ROOT, 'data.json'), encoding='utf-8'))
it = next(i for i in d['items'] if i['id'] == iid)
out = out or os.path.join(ROOT, 'insta', iid)
os.makedirs(out, exist_ok=True)

m = re.match(r'^(.*?)\s*\(([^()]*)\)\s*$', it['name'])
name, city = (m.group(1), m.group(2)) if m else (it['name'], '')
stay = it.get('cat') == 'stay'
w = it.get('worth')
def md(s): y, mo, dd = s.split('-'); return f'{int(mo)}월 {int(dd)}일'
due = md(it['end']) + ' 마감'
e = html.escape

if not hook:
    if stay:
        kind = next((k for k in ['풀빌라', '글램핑', '한옥', '료칸', '호텔', '리조트', '펜션', '독채'] if k in it['name'] + it['benefit']), '숙소')
        hook = f"{city} {kind},<br>체험단으로 떠나요" if city else f"{kind},<br>체험단으로 떠나요"
    else:
        hook = "갖고 싶던 그 제품,<br>체험단으로 받아봐요"

bg = ''
if photo:
    ext = os.path.splitext(photo)[1].lower().lstrip('.') or 'jpeg'
    bg = f"url(data:image/{'jpeg' if ext=='jpg' else ext};base64,{base64.b64encode(open(photo,'rb').read()).decode()})"

CSS = """
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1350px;font-family:'Noto Sans CJK KR','Noto Sans KR',sans-serif;letter-spacing:-.03em;overflow:hidden}
.s{width:1080px;height:1350px;position:relative;display:flex;flex-direction:column;padding:96px 88px}
.brand{font-size:30px;font-weight:700;opacity:.85}
.chip{display:inline-block;font-size:30px;font-weight:700;padding:12px 26px;border-radius:999px}
"""
def page(body, extra=''):
    return f"<html><head><meta charset='utf-8'><style>{CSS}{extra}</style></head><body>{body}</body></html>"

cover_bg = (f"background:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.55)),{bg} center/cover" if bg
            else "background:radial-gradient(circle at 80% 15%,#ffd84d 0 140px,transparent 141px),radial-gradient(circle at 12% 88%,#ff9ec4 0 190px,transparent 191px),linear-gradient(160deg,#6d3cf0,#9b6bff)")
tag = ('#' + (city or '') + ('여행' if stay else '') + ' #' + ('숙박체험단' if stay else '체험단')).strip()
cover = page(f"""<div class='s' style='{cover_bg};color:#fff;justify-content:space-between'>
 <div class='brand'>@dagguu.trip</div>
 <div>
  <div style='font-size:34px;font-weight:600;opacity:.9;margin-bottom:26px'>{e(tag)}</div>
  <div style='font-size:92px;font-weight:900;line-height:1.22;text-shadow:0 4px 24px rgba(0,0,0,.25)'>{hook}</div>
  {f"<div style='margin-top:40px'><span class='chip' style='background:#ffd84d;color:#2a1a5e;font-size:40px'>💰 {e(w)} 상당</span></div>" if w else ''}
 </div>
 <div style='font-size:32px;font-weight:600;opacity:.9'>👉 넘겨서 확인하기</div>
</div>""")

rows = [('🏡' if stay else '🎁', '숙소' if stay else '제품', name)]
if city: rows.append(('📍', '지역', city if city == it.get('region') else f"{it.get('region','')} {city}".strip()))
rows.append(('🎀', '제공', it['benefit']))
if w: rows.append(('💰', '금액', f'{w} 상당'))
rows.append(('⏰', '모집', due))
info_rows = ''.join(f"<div style='display:flex;gap:28px;padding:34px 0;border-bottom:2px solid #eee8ff'><div style='font-size:46px;width:60px'>{ic}</div><div><div style='font-size:30px;color:#8a7fb0;font-weight:700;margin-bottom:8px'>{e(k)}</div><div style='font-size:42px;font-weight:700;line-height:1.35;color:#221c3a'>{e(v)}</div></div></div>" for ic, k, v in rows)
info = page(f"""<div class='s' style='background:#fbf9ff;color:#221c3a'>
 <div class='brand' style='color:#6d3cf0'>@dagguu.trip</div>
 <div style='font-size:64px;font-weight:900;margin:44px 0 20px'>체험단 정보 한눈에 ✨</div>
 {info_rows}
 <div style='margin-top:auto;font-size:28px;color:#8a7fb0'>기준 인원·체험 가능일·추가 비용·리뷰 조건은 신청 페이지에서 확인해주세요</div>
</div>""")

cta = page(f"""<div class='s' style='background:linear-gradient(160deg,#ffe9a8,#ffd1e3);color:#2a1a5e;justify-content:center;text-align:center;align-items:center'>
 <div style='font-size:120px;margin-bottom:30px'>💌</div>
 <div style='font-size:76px;font-weight:900;line-height:1.3'>신청 링크 궁금하면<br>댓글에 <span style='background:#6d3cf0;color:#fff;padding:0 22px;border-radius:24px'>나도</span></div>
 <div style='font-size:40px;font-weight:600;margin-top:44px;line-height:1.5'>확인하는 대로<br>모집 링크 DM으로 보내드려요!</div>
 <div style='margin-top:70px;font-size:34px;font-weight:700'>🔖 저장해두고 다음 여행 때 꺼내보세요</div>
 <div style='position:absolute;bottom:80px;font-size:32px;font-weight:700;opacity:.8'>여행비 아끼는 방법은 @dagguu.trip</div>
</div>""")

files = []
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1080, 'height': 1350})
    for i, h in enumerate([cover, info, cta], 1):
        pg.set_content(h); pg.wait_for_timeout(150)
        f = os.path.join(out, f'{i}.png'); pg.screenshot(path=f); files.append(f)
    b.close()
print('\n'.join(files))
