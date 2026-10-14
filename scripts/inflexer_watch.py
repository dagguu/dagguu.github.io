#!/usr/bin/env python3
"""인플렉서 새 체험단이 몇 시에 올라오는지 기록한다(매시 GitHub Actions).
결과: scripts/inflexer_log.csv  (한국시각, 종류, 전체수, 오늘 시작 수, 새로 본 url 수)"""
import json, os, csv, urllib.request, urllib.parse, datetime as dt
KST = dt.timezone(dt.timedelta(hours=9))
now = dt.datetime.now(KST); today = now.strftime('%Y-%m-%d')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
seenp = os.path.join(ROOT, 'scripts', 'inflexer_seen.json')
seen = set(json.load(open(seenp))) if os.path.exists(seenp) else set()
M = '&'.join('media=' + m for m in ['BP_', 'BC_', 'IP_', 'IR_', 'YS_', 'YP_'])
def get(q, t):
    u = f'https://inflexer.net:5000/search?query={urllib.parse.quote(q)}&{M}&point=O&point=X&target=TOTAL&type={t}'
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://inflexer.net/', 'Origin': 'https://inflexer.net'})
    return json.load(urllib.request.urlopen(req, timeout=60)).get('result', [])
rows = []
groups = {'SHP': [('', 'SHP')], 'VST숙박': [(k, 'VST') for k in ['펜션', '호텔', '리조트', '풀빌라', '글램핑', '캠핑', '숙박', '스테이', '독채']]}
for name, qs in groups.items():
    allr = {}
    for q, t in qs:
        for x in get(q, t):
            if name == 'VST숙박' and x.get('category') != '숙박': continue
            allr[x['url']] = x
    new = [u for u in allr if u not in seen]
    rows.append([now.strftime('%Y-%m-%d %H:%M'), name, len(allr), sum(1 for x in allr.values() if x.get('apl_stt_dt') == today), len(new) if seen else 0])
    seen |= set(allr)
p = os.path.join(ROOT, 'scripts', 'inflexer_log.csv')
first = not os.path.exists(p)
with open(p, 'a', newline='') as f:
    w = csv.writer(f)
    if first: w.writerow(['kst', 'kind', 'total', 'start_today', 'new_since_last'])
    w.writerows(rows)
json.dump(sorted(seen)[-20000:], open(seenp, 'w'))
print(rows)
