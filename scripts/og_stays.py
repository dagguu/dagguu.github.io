# 감성숙소 매거진 링크 미리보기 그림: scripts/stays/<slug>.json 의 표지 사진(photos[0])을
# 받아 images/og/m-<slug>.jpg (1200x630) 로 저장한다. 없는 것만 (--all 이면 전부).
# 스레드·카톡 미리보기 로봇이 쿠팡 이미지 주소를 못 읽어서 다른 그림이 뜨던 문제(2026-10-25) 때문.
import json, glob, os, sys, io, urllib.request
from PIL import Image
os.makedirs('images/og', exist_ok=True)
allf = '--all' in sys.argv
for f in sorted(glob.glob('scripts/stays/*.json')):
    d = json.load(open(f, encoding='utf-8'))
    out = f"images/og/m-{d['slug']}.jpg"
    if os.path.exists(out) and not allf: continue
    src = (d.get('photos') or [{}])[0].get('src')
    if not src: continue
    try:
        req = urllib.request.Request(src, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://trip.coupang.com/'})
        im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert('RGB')
    except Exception as ex:
        print('fail', d['slug'], ex); continue
    W, H = 1200, 630
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - W) // 2, (im.height - H) // 2
    im.crop((x, y, x + W, y + H)).save(out, quality=86, optimize=True)
    print('ok', out)
