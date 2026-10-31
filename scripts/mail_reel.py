#!/usr/bin/env python3
"""오늘 릴스(영상·썸네일 + 대본·캡션)를 시온님 네이버 메일로 보낸다(.github/workflows/reel-mail.yml, 2026-10-31 시온님 "메일로 보내줘").
본문은 실행 입력 BODY(base64)로만 받는다(저장소에 글을 남기지 않음). 영상·썸네일은 insta 브랜치 reels/<name>/ 에서 꺼낸다.
영상이 18MB 넘으면 메일 첨부용으로 화질을 조금 낮춘 사본(reel_mail.mp4)을 만들어 붙인다. 원본 주소는 본문에 있다."""
import os, sys, base64, smtplib, subprocess
from email.message import EmailMessage
uid, pw = os.environ.get('NAVER_MAIL_ID', '').strip(), os.environ.get('NAVER_MAIL_PW', '').strip()
if not uid or not pw: print('메일 비밀값이 없어 건너뜀'); sys.exit(0)
addr = uid if '@' in uid else uid + '@naver.com'
name = os.environ['NAME']
body = base64.b64decode(os.environ['BODY']).decode('utf-8')
def get(path, out):
    r = subprocess.run(['git', 'show', f'origin/insta:{path}'], capture_output=True)
    if r.returncode == 0: open(out, 'wb').write(r.stdout); return True
    print('없음', path); return False
msg = EmailMessage()
msg['Subject'] = os.environ.get('SUBJECT') or f'[다꾸 인스타] 오늘의 릴스 {name}'
msg['From'] = addr; msg['To'] = addr
msg.set_content(body)
msg.add_attachment(body.encode('utf-8'), maintype='text', subtype='plain', filename='릴스_대본_캡션.txt')
if get(f'reels/{name}/thumb.jpg', 'thumb.jpg'):
    msg.add_attachment(open('thumb.jpg', 'rb').read(), maintype='image', subtype='jpeg', filename='썸네일.jpg')
if get(f'reels/{name}/reel.mp4', 'reel.mp4'):
    v = 'reel.mp4'
    if os.path.getsize(v) > 18e6:
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', v, '-c:v', 'libx264', '-crf', '24', '-preset', 'medium',
                        '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', 'reel_mail.mp4'], check=True)
        v = 'reel_mail.mp4'
    print('영상', os.path.getsize(v))
    if os.path.getsize(v) < 19e6: msg.add_attachment(open(v, 'rb').read(), maintype='video', subtype='mp4', filename=f'릴스_{name}.mp4')
    else: print('영상이 커서 첨부 안 함(본문 주소)')
with smtplib.SMTP_SSL('smtp.naver.com', 465) as s:
    s.login(uid.split('@')[0], pw); s.send_message(msg)
print('메일 보냄')
