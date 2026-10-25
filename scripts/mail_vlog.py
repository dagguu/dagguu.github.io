#!/usr/bin/env python3
"""@dagguu.vlog 스레드 초안을 시온님 네이버 메일로 보낸다(.github/workflows/vlog-mail.yml).
본문은 실행 입력 BODY(base64)로만 받는다(저장소에 글을 남기지 않음). PHOTOS 주소는 받아서 첨부."""
import os, sys, base64, smtplib, urllib.request
from email.message import EmailMessage
uid, pw = os.environ.get('NAVER_MAIL_ID', '').strip(), os.environ.get('NAVER_MAIL_PW', '').strip()
if not uid or not pw:
    print('메일 비밀값이 없어 건너뜀'); sys.exit(0)
addr = uid if '@' in uid else uid + '@naver.com'
body = base64.b64decode(os.environ['BODY']).decode('utf-8')
msg = EmailMessage()
msg['Subject'] = os.environ.get('SUBJECT') or '[다꾸] 스레드 초안'
msg['From'] = addr; msg['To'] = addr
msg.set_content(body)
msg.add_attachment(body.encode('utf-8'), maintype='text', subtype='plain', filename='스레드초안.txt')
n = 0
for i, u in enumerate((os.environ.get('PHOTOS') or '').split(), 1):
    try:
        req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
        data = urllib.request.urlopen(req, timeout=30).read()
        msg.add_attachment(data, maintype='image', subtype='jpeg', filename=f'{i}.jpg'); n += 1
    except Exception as e:
        print('사진 실패', i, type(e).__name__)
with smtplib.SMTP_SSL('smtp.naver.com', 465) as s:
    s.login(uid.split('@')[0], pw); s.send_message(msg)
print('메일 보냄', n, '장')
