#!/usr/bin/env python3
"""쿠팡 골드박스 화면에서 읽은 할인율을 data.json 의 goldbox·moreDeals 에 붙인다.
(쿠팡 파트너스 API 골드박스 응답에는 할인율이 없어서, 07:23 아기용품 핫딜 작업이 골드박스 페이지에서 읽은 값을 쓴다.)
입력: scripts/goldbox_rates.json = [{"pid": "상품번호(/vp/products/ 뒤 숫자)", "rate": "36", "orig": "60,000원"}, ...]
사용: python3 scripts/apply_gold_rates.py
"""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, 'data.json')
d = json.load(open(p, encoding='utf-8'))
R = {str(x.get('pid')): x for x in json.load(open(os.path.join(ROOT, 'scripts', 'goldbox_rates.json'), encoding='utf-8'))}
n = 0
for key in ('goldbox', 'moreDeals'):
    for g in d.get(key) or []:
        m = re.search(r'pageKey=(\d+)', g.get('u', ''))
        r = R.get(m.group(1)) if m else None
        if not r or not str(r.get('rate', '')).strip('% '): continue
        g['rate'] = str(r['rate']).strip('% ') + '%'
        if r.get('orig'): g['orig'] = r['orig']
        n += 1
open(p, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, separators=(',', ':')))
print(f'할인율 붙인 골드박스 상품 {n}개')
