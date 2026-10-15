#!/usr/bin/env python3
"""오늘 클릭이 많이 몰릴 체험단을 골라, 시온님이 쿠팡 인플루언서 링크를 만들 상품 주소 목록을 쓴다.

python3 scripts/gen_inf_list.py [YYYY-MM-DD] [--max 10]
고르는 순서: ① 오늘 인스타 카드뉴스(scripts/insta_queue.json) ② 오늘 단톡방 공지(chat/<날짜>.txt)
③ 오늘 새로 올라온 체험단 중 금액 큰 것. 이미 infUrl 이 있거나 마감된 것은 뺀다.
결과: inf/<날짜>.txt (시온님이 링크를 만들어 보내주면 data.json item.infUrl 에 넣는다)
"""
import json, os, re, sys, datetime as dt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KST = dt.timezone(dt.timedelta(hours=9))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
day = args[0] if args else dt.datetime.now(KST).strftime('%Y-%m-%d')
MAX = int(sys.argv[sys.argv.index('--max') + 1]) if '--max' in sys.argv else 10

d = json.load(open(os.path.join(ROOT, 'data.json'), encoding='utf-8'))
items = d['items']; by = {i['id']: i for i in items}
CAT = {c['k']: c['t'] for c in d.get('categories', [])}
CAT.setdefault('stay', '숙박'); CAT.setdefault('baby', '육아')

def value(it):
    w = str(it.get('worth') or '').replace(',', '')
    m = re.findall(r'\d+(?:\.\d+)?', w)
    if m: return max(float(x) for x in m) * (10000 if '만' in w else 1)
    if it.get('cpPrice'): return float(it['cpPrice'])
    v = 0
    for n, man in re.findall(r'(\d{1,3}(?:,\d{3})+|\d+)\s*(만\s*)?원', it.get('benefit', '')):
        v = max(v, int(n.replace(',', '')) * (10000 if man else 1))
    return v

def ok(it):
    return it and not it.get('infUrl') and not it.get('closed') and it.get('cpUrl') \
        and (it.get('end') or '9999') >= day

def created(it):
    c = it.get('createdAt')
    return dt.datetime.fromtimestamp(c / 1000, KST).strftime('%Y-%m-%d') if c else ''

picked, why = [], {}
def add(it, reason):
    if ok(it) and it['id'] not in why and len(picked) < MAX:
        picked.append(it); why[it['id']] = reason

# ① 인스타
try:
    for q in json.load(open(os.path.join(ROOT, 'scripts', 'insta_queue.json'), encoding='utf-8')):
        add(by.get(q.get('id')), '인스타 ' + q.get('handle', ''))
except Exception: pass
# ② 단톡방
cp = os.path.join(ROOT, 'chat', f'{day}.txt')
if os.path.exists(cp):
    txt = open(cp, encoding='utf-8').read()
    for it in items:
        if it.get('applyUrl') and it['applyUrl'] in txt: add(it, '단톡방')
# ③ 오늘 새로 올라온 고가 체험단
for it in sorted([i for i in items if created(i) == day], key=lambda i: -value(i)):
    add(it, '오늘 새로 올라온 고가 ' + CAT.get(it.get('cat', 'stay'), ''))

if not picked:
    print('오늘은 인플루언서 링크로 바꿀 체험단이 없어요'); sys.exit(0)
L = [f'🔗 인플루언서 링크 만들 상품 ({day}, {len(picked)}개)',
     '쿠팡 인플루언서에서 아래 주소로 링크를 만들어 "번호 + 링크"로 보내주시면 사이트·단톡방 링크를 바꿔둘게요.', '']
for n, it in enumerate(picked, 1):
    v = value(it)
    L += [f'{n}. {it["name"]} ({CAT.get(it.get("cat", "stay"), "")}) — {why[it["id"]]}' + (f' · 약 {int(v):,}원' if v else ''),
          f'   쿠팡 주소: {it["cpUrl"]}', f'   (id: {it["id"]})']
os.makedirs(os.path.join(ROOT, 'inf'), exist_ok=True)
out = os.path.join(ROOT, 'inf', f'{day}.txt')
open(out, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print(out); print('\n'.join(L))
