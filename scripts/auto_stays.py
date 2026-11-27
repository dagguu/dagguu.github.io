#!/usr/bin/env python3
"""인플렉서 숙박 체험단 자동 등록 (2026-11-27).
GitHub Actions(auto-stays.yml)에서 실행 — 작업 컨테이너는 인플렉서·체험단 사이트에 못 닿음.
- 인플렉서 숙박 키워드 검색 → category 숙박, 시작일 SINCE 이후, 마감 오늘 이후, data.json 에 없는 것
- 숙박이 아닌 것(레슨·데이유즈·애견호텔·식당 등) 뺌, 같은 사이트·같은 숙소는 하나로(applies)
- 사진: 신청 페이지 og:image 또는 사이트별 썸네일. 사진을 못 찾으면 등록하지 않고 목록만 남김
- 쿠팡 매칭은 하지 않음(cpUrl 빈 값, 2026-11-24 쿠팡에 없어도 등록 규칙)
결과: data.json 에 추가 + scripts/auto_stays_last.json (추가·제외·사진 없음 목록)
사용: python3 scripts/auto_stays.py [SINCE=YYYY-MM-DD]
"""
import json, os, re, sys, time, html, urllib.request, urllib.parse, datetime as dt

KST = dt.timezone(dt.timedelta(hours=9))
NOW = dt.datetime.now(KST)
TODAY = NOW.strftime('%Y-%m-%d')
SINCE = sys.argv[1] if len(sys.argv) > 1 else (NOW - dt.timedelta(days=1)).strftime('%Y-%m-%d')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DP = os.path.join(ROOT, 'data.json')
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}

M = '&'.join('media=' + m for m in ['BP_', 'BC_', 'IP_', 'IR_', 'YS_', 'YP_', 'TT_'])
KW = ['펜션', '호텔', '리조트', '풀빌라', '글램핑', '캠핑', '숙박', '한옥', '스테이', '독채', '카라반', '게스트하우스', '민박', '숙소', '빌라']
CH = {'BP_': 'blog', 'BC_': 'clip', 'IP_': 'insta', 'IR_': 'reels', 'YS_': 'youtube', 'YP_': 'youtube', 'TT_': 'tiktok'}

PROV = {'서울': '서울', '경기': '경기', '인천': '인천', '강원': '강원', '충남': '충청', '충북': '충청', '대전': '충청', '세종': '충청',
        '전남': '전라', '전북': '전라', '광주': '전라', '전남광주통합': '전라', '경남': '경상', '경북': '경상', '대구': '경상', '울산': '경상',
        '부산': '부산', '제주': '제주'}
CITY = {'가평': '경기', '양평': '경기', '포천': '경기', '수원': '경기', '용인': '경기', '동탄': '경기', '화성': '경기', '안산': '경기', '양주': '경기',
        '파주': '경기', '안성': '경기', '연천': '경기', '부평': '인천', '송도': '인천', '강릉': '강원', '속초': '강원', '양양': '강원', '춘천': '강원',
        '홍천': '강원', '평창': '강원', '고성': '강원', '정선': '강원', '삼척': '강원', '동해': '강원', '제천': '충청', '단양': '충청', '천안': '충청',
        '아산': '충청', '태안': '충청', '보령': '충청', '공주': '충청', '청주': '충청', '목포': '전라', '여수': '전라', '순천': '전라', '해남': '전라',
        '담양': '전라', '전주': '전라', '군산': '전라', '남원': '전라', '마산': '경상', '창원': '경상', '거제': '경상', '통영': '경상', '남해': '경상',
        '경주': '경상', '포항': '경상', '영덕': '경상', '안동': '경상', '김해': '경상', '밀양': '경상', '청도': '경상', '해운대': '부산', '기장': '부산',
        '서귀포': '제주'}
SRC = {'xn--939au0g4vj8sq.net': '강남맛집', 'popomon.com': '포포몬', 'revu.net': '레뷰', 'odiya.kr': '어디야', 'keyplat.net': '키플랫',
       'ringble.co.kr': '링블', 'cometoplay.kr': '놀러와', 'xn--5y2bw0fi0u.kr': '클립뷰', 'reviewplace.co.kr': '리뷰플레이스',
       'dinnerqueen.net': '디너의여왕', 'reviewnote.co.kr': '리뷰노트', 'mrblog.net': '미블', 'seoulouba.co.kr': '서울오빠'}

NOT_STAY = re.compile(r'레슨|데이유즈|애견호텔|호텔링|놀이방|혁신센터|캠프닉|당일\s*글램핑|당일 이용|식당|카페 이용|스파 이용권|요가|필라테스|헬스|사우나 이용권')
STAY_WORD = re.compile(r'1박|숙박|객실|하루')


def get(u, t=40, j=False, ref=None):
    h = dict(UA)
    if ref: h.update({'Referer': ref, 'Origin': ref.rstrip('/')})
    r = urllib.request.urlopen(urllib.request.Request(u, headers=h), timeout=t)
    b = r.read()
    if j: return json.loads(b)
    for enc in ('utf-8', 'euc-kr', 'cp949'):
        try: return b.decode(enc)
        except Exception: pass
    return b.decode('utf-8', 'ignore')


def src_of(u):
    host = urllib.parse.urlparse(u).netloc.lower().replace('www.', '')
    for k, v in SRC.items():
        if host.endswith(k): return v
    return host


def parse_title(t):
    t = re.sub(r'\s+', ' ', t).strip()
    m = re.match(r'^\[([^\]]+)\]\s*(.*)$', t)
    loc, nm = (m.group(1), m.group(2)) if m else ('', t)
    nm = re.sub(r'^\[[^\]]*\]\s*', '', nm)  # [클립] 같은 꼬리표
    nm = re.sub(r'\s*\(?\d+\s*차\)?$', '', nm)
    nm = re.sub(r'\s*(_?릴스|신규)$', '', nm).strip(' _-')
    parts = [p for p in re.split(r'[\s/]+', loc) if p]
    region, city = '', ''
    if parts:
        p0 = parts[0]
        if p0 in PROV:
            region = PROV[p0]
            city = parts[1] if len(parts) > 1 else ''
        else:
            city = p0
            region = CITY.get(re.sub(r'(시|군|구)$', '', p0), '')
    if region in ('서울', '부산', '인천'):
        c = region
    else:
        c = re.sub(r'(특별자치시|시|군)$', '', city) if city else ''
        if c.endswith('구') and len(c) > 1: c = region
    if not region and c: region = CITY.get(c, '')
    return region, nm, c


def worth_of(s):
    m = re.search(r'(?<![\d,])(\d+)\s*만\s*(?:(\d)\s*천)?\s*원?\s*상당', s)
    if m: return m.group(1) + '만원'
    m = re.search(r'([\d,]{5,})\s*원\s*상당', s)
    if m:
        n = int(m.group(1).replace(',', ''))
        if 10000 <= n <= 3000000: return f'{n // 10000}만원'
    return ''


def clean_benefit(s):
    s = re.sub(r'\s+', ' ', s or '').strip()
    s = re.sub(r'(자세한 (상품|내용)은 가이드[^ ]*.*$|반드시 가이드라인[^.]*\.?|<가이드 참고>|\*가이드참고!?)', '', s).strip()
    return s[:120]


def image_of(u):
    try:
        h = get(u, 30)
    except Exception as e:
        return ''
    for pat in (r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image'):
        m = re.search(pat, h, re.I)
        if m:
            im = html.unescape(m.group(1)).strip()
            if im and not re.search(r'logo|default|noimg|og_image|og-image|share', im, re.I):
                return urllib.parse.urljoin(u, im)
    for pat in (r'(https?://[^"\'\s]*gangnam-review\.net/data/file/cmp/[^"\'\s]+)', r'(/data/file/cmp/[^"\'\s]+\.(?:jpg|jpeg|png|webp))',
                r'(https?://files\.weble\.net/campaign/data/\d+/[^"\'\s]+)', r'(https?://[^"\'\s]+/data/(?:file|item)/[^"\'\s]+\.(?:jpg|jpeg|png|webp))',
                r'(https?://[^"\'\s]+/upload[^"\'\s]*\.(?:jpg|jpeg|png|webp))'):
        m = re.search(pat, h, re.I)
        if m: return urllib.parse.urljoin(u, html.unescape(m.group(1)))
    return ''


def main():
    d = json.load(open(DP))
    items = d['items']
    have = set()
    names = set()
    for x in items:
        have.add(x.get('applyUrl', ''))
        for a in x.get('applies') or []: have.add(a.get('url', ''))
        names.add(re.sub(r'\s|\(.*?\)', '', x.get('name', '')))
    res = {}
    for k in KW:
        try:
            r = get(f'https://inflexer.net:5000/search?query={urllib.parse.quote(k)}&{M}&type=VST&point=O&point=X&target=TOTAL', 60, True, 'https://inflexer.net/')
        except Exception as e:
            print('inflexer fail', k, e); continue
        for x in r.get('result', []):
            if x.get('category') == '숙박' and x.get('apl_stt_dt', '') >= SINCE and x.get('apl_due_dt', '') >= TODAY:
                res[x['url']] = x
        time.sleep(1)
    log = {'at': NOW.strftime('%Y-%m-%d %H:%M'), 'since': SINCE, 'found': len(res), 'added': [], 'skip': [], 'noimg': []}
    groups = {}
    for u, x in res.items():
        if u in have: log['skip'].append([x['title'], '이미 있음']); continue
        offer = clean_benefit(x.get('offer', ''))
        blob = x['title'] + ' ' + offer
        if NOT_STAY.search(blob) and not STAY_WORD.search(offer):
            log['skip'].append([x['title'], '숙박 아님']); continue
        if re.search(r'식당|혁신센터|그룹레슨|애견호텔|호텔링', blob):
            log['skip'].append([x['title'], '숙박 아님']); continue
        region, nm, city = parse_title(x['title'])
        src = src_of(u)
        key = (src, re.sub(r'\s', '', nm))
        g = groups.setdefault(key, {'region': region, 'nm': nm, 'city': city, 'src': src, 'list': []})
        g['list'].append((u, x, offer))
    n = 0
    for (src, nk), g in groups.items():
        full = g['nm'] + (f" ({g['city']})" if g['city'] else '')
        if re.sub(r'\s|\(.*?\)', '', full) in names:
            log['skip'].append([full, '같은 이름 있음']); continue
        lst = sorted(g['list'], key=lambda t: (t[1].get('media') != 'BP_', t[1]['url']))
        u0, x0, off0 = lst[0]
        img = image_of(u0)
        if not img:
            for u, x, o in lst[1:]:
                img = image_of(u)
                if img: break
        if not img:
            log['noimg'].append([full, u0]); continue
        chs = []
        for u, x, o in lst:
            c = CH.get(x.get('media'), '')
            if c and c not in chs: chs.append(c)
        n += 1
        it = {'id': f"i{TODAY.replace('-', '')}-a{n:02d}", 'region': g['region'], 'name': full, 'benefit': off0 or '숙박 체험권',
              'start': min(x.get('apl_stt_dt') for u, x, o in lst), 'end': max(x.get('apl_due_dt') for u, x, o in lst),
              'image': img, 'viewUrl': '', 'cpUrl': '', 'applyUrl': u0, 'source': src, 'cat': 'stay', 'ch': chs,
              'createdAt': int(time.time() * 1000)}
        w = worth_of(' '.join(o for u, x, o in lst))
        if w: it['worth'] = w
        if re.search(r'페이백|선결제', ' '.join(o for u, x, o in lst)): it['pay'] = ['payback']
        if len(lst) > 1:
            it['applies'] = [{'ch': [CH.get(x.get('media'), 'blog')], 'url': u, 'end': x.get('apl_due_dt')} for u, x, o in lst]
        items.append(it)
        names.add(re.sub(r'\s|\(.*?\)', '', full))
        log['added'].append([it['id'], full, src, ','.join(chs), it['end'], img[:90]])
        time.sleep(0.5)
    open(DP, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, separators=(',', ':')))
    json.dump(log, open(os.path.join(ROOT, 'scripts', 'auto_stays_last.json'), 'w'), ensure_ascii=False, indent=1)
    print('found', len(res), 'added', len(log['added']), 'noimg', len(log['noimg']), 'skip', len(log['skip']))


if __name__ == '__main__':
    main()
