#!/usr/bin/env python3
"""오늘 카카오 채널 소식(텍스트형 + 캐러셀형 글 + 카드 이미지)을 시온님 네이버 메일로 보낸다.
2026-10-24 시온님 요청 "매일 메일로 보내줘 eun901002@naver.com".

.github/workflows/kakao-mail.yml 이 실행한다(채널 소식 예약 작업이 카드 확인을 끝낸 뒤 한 번 부름).
GitHub Secrets: NAVER_MAIL_ID, NAVER_MAIL_PW(인스타 메일과 같은 값). 없으면 아무것도 하지 않는다.
글: scripts/kakao_queue.json 의 text(텍스트형 초안) + gen_kakao.py --text 출력(캐러셀형).
사진: 인자로 받은 폴더(insta 브랜치 kakao/<날짜>/)의 1.jpg, 2.jpg ….
"""
import os, sys, json, glob, re, smtplib, subprocess
from email.message import EmailMessage

uid, pw = os.environ.get('NAVER_MAIL_ID', '').strip(), os.environ.get('NAVER_MAIL_PW', '').strip()
if not uid or not pw:
    print('메일 비밀값이 없어 건너뜀'); sys.exit(0)
addr = uid if '@' in uid else uid + '@naver.com'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Q = json.load(open(os.path.join(ROOT, 'scripts', 'kakao_queue.json'), encoding='utf-8'))
day = Q['date']
img_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'kakao_out', day)
imgs = sorted(glob.glob(os.path.join(img_dir, '*.jpg')), key=lambda p: int(re.sub(r'\D', '', os.path.basename(p)) or 0))
imgs = [p for p in imgs if re.fullmatch(r'\d+\.jpg', os.path.basename(p))]
car = subprocess.run([sys.executable, os.path.join(ROOT, 'scripts', 'gen_kakao.py'), '--text'],
                     capture_output=True, text=True, cwd=ROOT).stdout.strip()
txt = (Q.get('text') or '').strip()
body = '① 텍스트형\n\n' + (txt or '(오늘은 새 체험단이 없어 텍스트형이 없어요)') + '\n\n\n② 캐러셀형\n\n' + car + '\n'

msg = EmailMessage()
msg['Subject'] = f'[다꾸 채널 소식] {day} 텍스트형 + 카드 {len(imgs)}장'
msg['From'] = addr
msg['To'] = addr
msg.set_content(body)
msg.add_attachment(body.encode('utf-8'), maintype='text', subtype='plain', filename=f'채널소식_{day}.txt')
for p in imgs:
    msg.add_attachment(open(p, 'rb').read(), maintype='image', subtype='jpeg', filename=f'{day}_{os.path.basename(p)}')
with smtplib.SMTP_SSL('smtp.naver.com', 465) as s:
    s.login(uid.split('@')[0], pw)
    s.send_message(msg)
print('메일 보냄', addr.split('@')[1], len(imgs), '장')
