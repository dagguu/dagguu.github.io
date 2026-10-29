#!/usr/bin/env python3
"""주간 감성숙소 모음 릴스(weekly_out/<날짜>/reel.mp4 + 캡션)를 시온님 네이버 메일로 보낸다. Secrets NAVER_MAIL_ID/PW 없으면 건너뜀."""
import os, sys, json, smtplib
from email.message import EmailMessage
uid, pw = os.environ.get('NAVER_MAIL_ID', '').strip(), os.environ.get('NAVER_MAIL_PW', '').strip()
if not uid or not pw: print('메일 비밀값이 없어 건너뜀'); sys.exit(0)
addr = uid if '@' in uid else uid + '@naver.com'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); day = sys.argv[1]
J = json.load(open(os.path.join(ROOT, 'scripts', 'weekly', day + '.json'), encoding='utf-8'))
v = os.path.join(ROOT, 'weekly_out', day, 'reel.mp4')
msg = EmailMessage(); msg['Subject'] = f"[다꾸 인스타] 주간 감성숙소 모음 릴스 · {J['title']}"; msg['From'] = addr; msg['To'] = addr
msg.set_content('\n'.join([J['title'], '', '음악은 인스타에서 넣고, "AI 정보" 표시를 켜 주세요.', '',
    '[캡션]', J.get('caption', ''), '', '[영상 주소]', f'https://raw.githubusercontent.com/dagguu/dagguu.github.io/insta/weekly/{day}/reel.mp4']))
if os.path.exists(v) and os.path.getsize(v) < 18e6: msg.add_attachment(open(v, 'rb').read(), maintype='video', subtype='mp4', filename=f'감성숙소모음_{day}.mp4')
with smtplib.SMTP_SSL('smtp.naver.com', 465) as s: s.login(uid.split('@')[0], pw); s.send_message(msg)
print('메일 보냄')
