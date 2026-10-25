#!/usr/bin/env python3
"""스레드(@apple.mom1) 글 초안을 시온님 네이버 메일로 보낸다(2026-10-25 시온님 요청 "스레드 글 이메일로 보내줘").
.github/workflows/threads-mail.yml 이 실행한다(수동 또는 스레드 초안 작업이 부름). 게시는 하지 않는다.
글: scripts/threads_queue.json 중 아직 올릴 시간이 안 지난 것(한국 시간 기준, 인자 --all 이면 오늘 이후 전부).
사진: images/threads/<id>.jpg 가 있으면 첨부.
Secrets: NAVER_MAIL_ID, NAVER_MAIL_PW(인스타·카카오 메일과 같음). 없으면 아무것도 하지 않는다.
"""
import os, sys, json, smtplib, datetime
from email.message import EmailMessage

uid, pw = os.environ.get('NAVER_MAIL_ID', '').strip(), os.environ.get('NAVER_MAIL_PW', '').strip()
if not uid or not pw:
    print('메일 비밀값이 없어 건너뜀'); sys.exit(0)
addr = uid if '@' in uid else uid + '@naver.com'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Q = json.load(open(os.path.join(ROOT, 'scripts', 'threads_queue.json'), encoding='utf-8'))
now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9)))
today, hm = now.strftime('%Y-%m-%d'), now.strftime('%H:%M')
allday = '--all' in sys.argv
items = [x for x in Q if x['date'] > today or (x['date'] == today and (allday or x.get('at', '20:00') >= hm))]
items.sort(key=lambda x: (x['date'], x.get('at', '20:00')))
if not items:
    print('보낼 초안 없음'); sys.exit(0)

parts, imgs = [], []
for x in items:
    m, d = int(x['date'][5:7]), int(x['date'][8:10])
    kind = '링크글' if x.get('link') else '일상글'
    s = f"■ {m}/{d} {x.get('at', '20:00')} {kind}\n{x['text'].strip()}"
    if x.get('img'):
        s += f"\n사진: {x['img']}"
        p = os.path.join(ROOT, 'images', 'threads', x['id'] + '.jpg')
        if os.path.exists(p):
            imgs.append((p, f"{x['date']}_{x.get('at','').replace(':','')}_{x['id']}.jpg"))
    parts.append(s)
body = '\n\n\n'.join(parts) + '\n\n\n직접 올릴 때도 하루 3개를 한 번에 몰아 올리지 말고 시간 간격을 두세요.\n'

first, last = items[0]['date'], items[-1]['date']
msg = EmailMessage()
msg['Subject'] = f'[다꾸 스레드 초안] {first[5:]}~{last[5:]} 글 {len(items)}개'
msg['From'] = addr
msg['To'] = addr
msg.set_content(body)
msg.add_attachment(body.encode('utf-8'), maintype='text', subtype='plain', filename=f'스레드초안_{first}.txt')
for p, name in imgs:
    msg.add_attachment(open(p, 'rb').read(), maintype='image', subtype='jpeg', filename=name)
with smtplib.SMTP_SSL('smtp.naver.com', 465) as s:
    s.login(uid.split('@')[0], pw)
    s.send_message(msg)
print('메일 보냄', addr.split('@')[1], len(items), '개', len(imgs), '장')
