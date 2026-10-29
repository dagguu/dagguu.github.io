#!/usr/bin/env python3
"""인스타 영상 피드(carousel_out/<slug>/1~5.mp4 + 캡션)를 시온님 네이버 메일로 보낸다(2026-10-29).
Secrets NAVER_MAIL_ID/NAVER_MAIL_PW(인스타 메일과 같음). 없으면 건너뜀.
영상은 합쳐 18MB 이하면 첨부, 넘으면 insta 브랜치 주소(raw)만 적는다.
"""
import os, sys, json, glob, smtplib
from email.message import EmailMessage
uid, pw = os.environ.get('NAVER_MAIL_ID', '').strip(), os.environ.get('NAVER_MAIL_PW', '').strip()
if not uid or not pw: print('메일 비밀값이 없어 건너뜀'); sys.exit(0)
addr = uid if '@' in uid else uid + '@naver.com'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
slug = sys.argv[1]
J = json.load(open(os.path.join(ROOT, 'scripts', 'carousel', slug + '.json'), encoding='utf-8'))
d = os.path.join(ROOT, 'carousel_out', slug)
vids = [os.path.join(d, f'{i}.mp4') for i in range(1, 6) if os.path.exists(os.path.join(d, f'{i}.mp4'))]
extra = [p for p in (os.path.join(d, '1_notext.mp4'),) if os.path.exists(p)]
RAW = f'https://raw.githubusercontent.com/dagguu/dagguu.github.io/insta/carousel/{slug}/'
body = [f"[@dagguu.trip 영상 피드] {J.get('title', slug)}", '',
        '올리는 순서: 1.mp4(표지 글씨) → 2 → 3 → 4 → 5  ·  음악은 인스타에서 넣고, "AI 정보" 표시를 켜 주세요.', '',
        '[캡션]', J.get('caption', ''), '', '[영상 주소]']
body += [RAW + os.path.basename(p) for p in vids + extra]
msg = EmailMessage()
msg['Subject'] = f"[다꾸 인스타] 영상 피드 {len(vids)}장 · {J.get('title', slug)}"
msg['From'] = addr; msg['To'] = addr
msg.set_content('\n'.join(body))
cov = os.path.join(d, 'cover.jpg')
if os.path.exists(cov): msg.add_attachment(open(cov, 'rb').read(), maintype='image', subtype='jpeg', filename=f'{slug}_cover.jpg')
if sum(os.path.getsize(p) for p in vids) < 18e6:
    for p in vids: msg.add_attachment(open(p, 'rb').read(), maintype='video', subtype='mp4', filename=f'{slug}_{os.path.basename(p)}')
with smtplib.SMTP_SSL('smtp.naver.com', 465) as s:
    s.login(uid.split('@')[0], pw); s.send_message(msg)
print('메일 보냄', len(vids))
