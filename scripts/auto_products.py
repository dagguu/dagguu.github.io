#!/usr/bin/env python3
"""고른 제품 체험단 등록 (2026-11-27). Claude 가 브라우저로 고른 목록(scripts/auto_products_in.json)을
GitHub Actions(auto-products.yml)에서 신청 페이지 사진(og:image 등)만 채워 data.json 에 넣는다.
in: [{"id","name","cat","benefit","ch":[..],"start","end","url","source","cpUrl"?,"ages"?,"worth"?,"applies"?:[{"ch":[..],"url","end"}]}]
사진을 못 찾은 것은 넣지 않고 scripts/auto_products_last.json 에 남김. 넣은 뒤 in 파일은 비움.
"""
import json, os, time, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from auto_stays import image_of

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DP = os.path.join(ROOT, 'data.json')
IP = os.path.join(ROOT, 'scripts', 'auto_products_in.json')
d = json.load(open(DP))
have = {x.get('applyUrl') for x in d['items']} | {x['id'] for x in d['items']}
log = {'added': [], 'noimg': [], 'skip': []}
for it in json.load(open(IP)):
    if it['url'] in have or it['id'] in have:
        log['skip'].append(it['name']); continue
    img = it.get('image') or image_of(it['url'])
    if not img:
        for a in it.get('applies') or []:
            img = image_of(a['url'])
            if img: break
    if not img:
        log['noimg'].append([it['name'], it['url']]); continue
    x = {'id': it['id'], 'region': '', 'name': it['name'], 'benefit': it['benefit'], 'start': it.get('start', ''), 'end': it['end'],
         'image': img, 'viewUrl': '', 'cpUrl': it.get('cpUrl', ''), 'applyUrl': it['url'], 'source': it['source'], 'cat': it['cat'],
         'ch': it['ch'], 'createdAt': int(time.time() * 1000)}
    for k in ('ages', 'worth', 'applies', 'pay'):
        if it.get(k): x[k] = it[k]
    d['items'].append(x)
    log['added'].append([x['id'], x['name'], img[:90]])
    time.sleep(0.5)
open(DP, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, separators=(',', ':')))
json.dump(log, open(os.path.join(ROOT, 'scripts', 'auto_products_last.json'), 'w'), ensure_ascii=False, indent=1)
json.dump([], open(IP, 'w'))
print('added', len(log['added']), 'noimg', len(log['noimg']), 'skip', len(log['skip']))
