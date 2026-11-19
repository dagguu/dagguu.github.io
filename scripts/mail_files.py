#!/usr/bin/env python3
"""저장소 파일(영상 등)을 시온님 네이버 메일로 보낸다(2026-11-20 "사이트 영상 다운받고 싶어"). files-mail.yml 이 부른다.
인자: 글롭 패턴(예: kids/v/*.mp4), 제목. 메일 한 통 첨부 합계 9MB 넘지 않게 나눠 보냄."""
import os, sys, glob, smtplib, mimetypes
from email.message import EmailMessage
uid, pw = os.environ.get('NAVER_MAIL_ID', '').strip(), os.environ.get('NAVER_MAIL_PW', '').strip()
if not uid or not pw:
    print('메일 비밀값이 없어 건너뜀'); sys.exit(0)
addr = uid if '@' in uid else uid + '@naver.com'
files = sorted(glob.glob(sys.argv[1])); title = sys.argv[2] if len(sys.argv) > 2 else '파일'
groups, cur, size = [], [], 0
for p in files:
    n = os.path.getsize(p)
    if cur and size + n > 9_000_000:
        groups.append(cur); cur, size = [], 0
    cur.append(p); size += n
if cur: groups.append(cur)
for i, g in enumerate(groups, 1):
    m = EmailMessage(); m['Subject'] = f'[다꾸] {title} ({i}/{len(groups)})'; m['From'] = addr; m['To'] = addr
    m.set_content('\n'.join(os.path.basename(p) for p in g) + '\n\n온라인 주소: https://www.dagguu.com/' + os.path.dirname(sys.argv[1]) + '/')
    for p in g:
        t = (mimetypes.guess_type(p)[0] or 'application/octet-stream').split('/')
        m.add_attachment(open(p, 'rb').read(), maintype=t[0], subtype=t[1], filename=os.path.basename(p))
    with smtplib.SMTP_SSL('smtp.naver.com', 465) as s:
        s.login(uid.split('@')[0], pw); s.send_message(m)
    print('메일', i, len(g))
