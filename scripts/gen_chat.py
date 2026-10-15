#!/usr/bin/env python3
"""단톡방(여행협찬·육아협찬) 공지 글 만들기.

data.json 에서 오늘 올라온(createdAt 이 오늘) 숙박·육아 체험단을 골라
시온님 단톡방 형식으로 chat/YYYY-MM-DD.txt 에 쓴다.
숫자·혜택·날짜는 data.json 에 있는 그대로만 쓴다(지어내지 않음).

사용: python3 scripts/gen_chat.py [YYYY-MM-DD] [--stay N] [--baby N] [--add id1,id2]
  --add: 오늘 올라온 것이 아니어도 모집중인 체험단을 골라 맨 앞에 더 넣는다(시온님 추천).
"""
import json, os, re, sys, datetime as dt

KST = dt.timezone(dt.timedelta(hours=9))
args = [a for a in sys.argv[1:]]
def opt(name, default):
    if name in args:
        i = args.index(name); v = int(args[i + 1]); del args[i:i + 2]; return v
    return default
N_STAY = opt('--stay', 3)
N_BABY = opt('--baby', 3)
ADD = []
if '--add' in args:
    i = args.index('--add'); ADD = [x for x in args[i + 1].split(',') if x]; del args[i:i + 2]
day = args[0] if args else dt.datetime.now(KST).strftime('%Y-%m-%d')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, 'data.json'), encoding='utf-8'))

def created_day(it):
    c = it.get('createdAt')
    if not c: return ''
    return dt.datetime.fromtimestamp(c / 1000, KST).strftime('%Y-%m-%d')

def won(w):  # "80만원" -> 800000
    m = re.match(r'(\d+(?:\.\d+)?)만원', w or '')
    return float(m.group(1)) * 10000 if m else 0

def md(s):  # "2026-10-12" -> "10월 12일"
    y, m, dd = s.split('-'); return f'{int(m)}월 {int(dd)}일'

def period(it):
    if it.get('start'):
        return f"{md(it['start'])}~{md(it['end'])} 마감"
    return f"{md(it['end'])} 마감"

def split_name(name):  # "호텔 JCS 여수 (여수)" -> ("호텔 JCS 여수", "여수")
    m = re.match(r'^(.*?)\s*\(([^()]*)\)\s*$', name)
    return (m.group(1), m.group(2)) if m else (name, '')

def kind(name, benefit):
    t = name + ' ' + benefit
    for k in ['풀빌라', '글램핑', '카라반', '캠핑', '한옥', '료칸', '호텔', '리조트', '펜션', '게스트하우스', '독채']:
        if k in t: return k
    return '숙소'

def josa_ro(word):  # 으로/로
    if not word: return '으로'
    c = ord(word[-1]) - 0xAC00
    if c < 0 or c > 11171: return '로'
    jong = c % 28
    return '로' if jong in (0, 8) else '으로'

def stay_post(it):
    nm, city = split_name(it['name'])
    region = it.get('region') or ''
    tag = f"[{region}/{city}]" if city and city != region else f"[{region or city}]"
    k = kind(nm, it.get('benefit', ''))
    w = it.get('worth')
    lines = [f"@all 🏡 {tag} {nm} 체험단 모집 소식!", ""]
    where = city or region
    lines.append(f"{where}{josa_ro(where)} {k} 여행 가고 싶은 분들🤍" if where else f"{k} 여행 가고 싶은 분들🤍")
    lines.append(f"{w} 상당 숙박 체험 소식 가져왔어요!" if w else "숙박 체험 소식 가져왔어요!")
    lines.append("어떤 숙소인지 먼저 구경해보세요 :)")
    lines += ["", "🎈 체험단 신청하기", it['applyUrl'], "", "🎈 숙소 먼저 확인하기", (it.get('infUrl') or it['viewUrl']), "",
              "🎁 특별혜택 미리보기", f"🏡 {it.get('benefit','').strip()}"]
    if w: lines.append(f"✔️ {w} 상당 숙박 체험")
    lines += ["", "마음에 드셨다면 체험단에도 신청해보세요🤍", "", "",
              "★ 중요내용 ★",
              "✔️ 신청자 중 선정되는 체험단이에요.",
              "✔️ 기준 인원·체험 가능일·추가 비용은 신청 페이지에서 확인해주세요.",
              "✔️ 필수 리뷰 조건도 확인하고 신청해주세요 :)", "",
              f"📌 모집 : {period(it)}"]
    return '\n'.join(lines)

def pay_of(it):
    p = list(it.get('pay') or [])
    b = it.get('benefit', '')
    if re.search('페이백|선결제', b) and 'payback' not in p: p.append('payback')
    if '구매평' in b and 'review' not in p: p.append('review')
    return p

def baby_post(it):
    nm = it['name']
    w = it.get('worth')
    p = pay_of(it)
    lines = [f"@all 👶 [육아] {nm} 체험단 모집 소식!", "",
             "우리 아이 육아템 써보고 싶은 분들🤍"]
    lines.append(f"{w} 상당 제품 체험 소식 가져왔어요!" if w else "제품 체험 소식 가져왔어요!")
    lines.append("어떤 제품인지 먼저 구경해보세요 :)")
    lines += ["", "🎈 체험단 신청하기", it['applyUrl'], "", "🎈 제품 먼저 확인하기", (it.get('infUrl') or it['viewUrl']), "",
              "🎁 특별혜택 미리보기", f"🎀 {it.get('benefit','').strip()}"]
    if w: lines.append(f"✔️ {w} 상당 제품 체험")
    if it.get('ages'): lines.append(f"✔️ 추천 월령 : {', '.join(it['ages'])}")
    lines += ["", "마음에 드셨다면 체험단에도 신청해보세요🤍", "", "",
              "★ 중요내용 ★",
              "✔️ 신청자 중 선정되는 체험단이에요."]
    if 'payback' in p:
        lines.append("✔️ 먼저 구매한 뒤 돌려받는 페이백 방식이에요. 조건을 꼭 확인해주세요.")
    if 'review' in p:
        lines.append("✔️ 구매평 작성이 필요한 체험단이에요.")
    lines += ["✔️ 제공 내용·배송·필수 리뷰 조건은 신청 페이지에서 확인해주세요 :)", "",
              f"📌 모집 : {period(it)}"]
    return '\n'.join(lines)

def pick(cat, n):
    xs = [i for i in d['items'] if i.get('cat') == cat and not i.get('closed') and i.get('viewUrl')
          and i.get('applyUrl') and created_day(i) == day and i.get('end', '') > day]
    # 금액 큰 것 → 마감 여유 있는 것 순
    xs.sort(key=lambda i: (-won(i.get('worth')), -int((i.get('end') or '0').replace('-', ''))))
    return xs[:n]

def added(cat):
    by = {i['id']: i for i in d['items']}
    return [by[x] for x in ADD if x in by and by[x].get('cat') == cat and not by[x].get('closed')
            and by[x].get('end', '') >= day]

stays, babies = pick('stay', N_STAY), pick('baby', N_BABY)
stays = added('stay') + [i for i in stays if i['id'] not in ADD]
babies = added('baby') + [i for i in babies if i['id'] not in ADD]
if not stays and not babies:
    print('오늘 새로 올라온 숙박·육아 체험단이 없어요'); sys.exit(0)

SEP = '\n\n' + '─' * 20 + '\n\n'
out = []
MORE = '\n\n📢 더 많은 체험단 소식은 다꾸체험단에서 확인하세요!\nhttps://dagguu.github.io'
if stays: out.append('■ 여행협찬 단톡방\n\n' + SEP.join(stay_post(i) for i in stays) + MORE)
if babies: out.append('■ 육아협찬 단톡방\n\n' + SEP.join(baby_post(i) for i in babies) + MORE)
text = ('\n\n' + '═' * 20 + '\n\n').join(out) + '\n'
os.makedirs(os.path.join(ROOT, 'chat'), exist_ok=True)
path = os.path.join(ROOT, 'chat', f'{day}.txt')
open(path, 'w', encoding='utf-8').write(text)
print(path); print(text)
