#!/usr/bin/env python3
"""다꾸키즈 오늘의 인스타 카드뉴스(사진 + 캡션)를 시온님 네이버 메일로 보낸다(2026-11-11). kids-cards.yml 이 부른다.
Secrets NAVER_MAIL_ID / NAVER_MAIL_PW(다른 메일과 같은 값). 인자: 카드 폴더(kids_out/<날짜>)."""
import os, sys, glob, re, smtplib
from email.message import EmailMessage

uid, pw = os.environ.get('NAVER_MAIL_ID', '').strip(), os.environ.get('NAVER_MAIL_PW', '').strip()
if not uid or not pw:
    print('메일 비밀값이 없어 건너뜀'); sys.exit(0)
addr = uid if '@' in uid else uid + '@naver.com'
d = sys.argv[1]
day = os.path.basename(d.rstrip('/'))
imgs = sorted([p for p in glob.glob(os.path.join(d, '*.jpg')) if re.fullmatch(r'\d+\.jpg', os.path.basename(p))],
              key=lambda p: int(os.path.basename(p)[:-4]))
cap = open(os.path.join(d, 'caption.txt'), encoding='utf-8').read()
msg = EmailMessage()
msg['Subject'] = f'[다꾸키즈 카드뉴스] {day} 카드 {len(imgs)}장'
msg['From'] = addr
msg['To'] = addr
msg.set_content('인스타 캡션\n\n' + cap + '\n\n(올릴 때 사진 순서 1 → 끝)\n')
for p in imgs:
    msg.add_attachment(open(p, 'rb').read(), maintype='image', subtype='jpeg', filename=f'{day}_{os.path.basename(p)}')
with smtplib.SMTP_SSL('smtp.naver.com', 465) as s:
    s.login(uid.split('@')[0], pw)
    s.send_message(msg)
print('메일 보냄', len(imgs))
