#!/usr/bin/env python3
"""오늘 만든 인스타 카드뉴스(insta_out/<날짜>/<id>/*.jpg)를 네이버 메일로 보낸다.

GitHub Secrets: NAVER_MAIL_ID(아이디, @naver.com 앞부분), NAVER_MAIL_PW(네이버 애플리케이션 비밀번호).
받는 사람은 보내는 사람 본인(아이디@naver.com). 비밀값이 없으면 아무것도 하지 않는다.
본문에는 queue 의 caption(인스타 본문)·dm(DM 답장 문구)을 넣는다.
"""
import os, sys, json, glob, smtplib, datetime as dt
from email.message import EmailMessage

uid, pw = os.environ.get('NAVER_MAIL_ID', '').strip(), os.environ.get('NAVER_MAIL_PW', '').strip()
if not uid or not pw:
    print('메일 비밀값이 없어 건너뜀'); sys.exit(0)
addr = uid if '@' in uid else uid + '@naver.com'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KST = dt.timezone(dt.timedelta(hours=9))
day = dt.datetime.now(KST).strftime('%Y-%m-%d')
queue = json.load(open(os.path.join(ROOT, 'scripts', 'insta_queue.json'), encoding='utf-8'))

msg = EmailMessage()
msg['Subject'] = f'[다꾸 인스타] {day} 카드뉴스'
msg['From'] = addr
msg['To'] = addr
body = []
for n, q in enumerate(queue, 1):
    body.append(f'■ {n}번 게시물 ({q["id"]})')
    if q.get('caption'): body += ['', '[본문]', q['caption']]
    if q.get('dm'): body += ['', '[DM 답장]', q['dm']]
    body.append('')
    for f in sorted(glob.glob(os.path.join(ROOT, 'insta_out', day, q['id'], '*.jpg'))):
        msg.add_attachment(open(f, 'rb').read(), maintype='image', subtype='jpeg',
                           filename=f'{n}-{os.path.basename(f)}')
msg.set_content('\n'.join(body) or '오늘 카드뉴스예요.')
with smtplib.SMTP_SSL('smtp.naver.com', 465) as s:
    s.login(uid.split('@')[0], pw)
    s.send_message(msg)
print('메일 보냄')
