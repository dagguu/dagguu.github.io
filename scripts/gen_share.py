#!/usr/bin/env python3
"""공유용 미리보기 페이지 만들기.

data.json 을 읽어서
  s/<체험단 id>.html  -> 체험단 사진이 카톡 미리보기에 뜨고, 사이트의 #/item?id=... 로 이동
  t/<토스 코드>.html  -> 토스 상품 사진이 미리보기에 뜨고, 사이트의 #/deals?t=... 로 이동
을 새로 만듭니다. data.json 을 바꿀 때마다 한 번 실행하세요.
"""
import json, html, os, re, shutil
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://www.dagguu.com"
d = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))

def page(title, desc, img, target):
    e = lambda s: html.escape(str(s or ""), quote=True)
    return f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)}</title>
<meta name="robots" content="noindex">
<meta name="description" content="{e(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="다꾸 체험단 모음">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{e(img)}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url={e(target)}">
<script>location.replace({json.dumps(target)});</script>
</head><body style="font-family:sans-serif;text-align:center;padding:40px 16px">
<p><a href="{e(target)}">다꾸 체험단 모음에서 보기 ›</a></p>
</body></html>
'''

def reset(name):
    p = os.path.join(ROOT, name)
    shutil.rmtree(p, ignore_errors=True)
    os.makedirs(p)
    return p

def mmdd(s):
    try: return datetime.fromisoformat(str(s)[:10]).strftime("%-m월 %-d일")
    except Exception: return ""

sdir = reset("s")
n_s = 0
for it in d.get("items", []):
    iid = str(it.get("id", ""))
    if not re.fullmatch(r"[A-Za-z0-9_-]+", iid): continue
    img = it.get("image") or ""
    if img and not img.startswith("http"): img = SITE + "/" + img.lstrip("/")
    if not img: img = SITE + "/images/og.png"
    bits = []
    if it.get("worth"): bits.append(f"💰 {it['worth']} 상당")
    if it.get("benefit"): bits.append(f"🎁 {it['benefit']}")
    if it.get("end"): bits.append(f"🗓️ {mmdd(it['end'])}까지 모집")
    title = f"[체험단] {it.get('name','')}"
    desc = " · ".join(bits) + " | 다꾸 체험단 모음"
    open(os.path.join(sdir, iid + ".html"), "w", encoding="utf-8").write(
        page(title, desc, img, "/#/item?id=" + iid))
    n_s += 1

tdir = reset("t")
n_t = 0
for x in d.get("toss", []):
    m = re.search(r"/_m/([A-Za-z0-9_-]+)", str(x.get("u", "")))
    if not m: continue
    code = m.group(1)
    price = " ".join(p for p in (x.get("rate"), x.get("price")) if p)
    title = f"🛒 {x.get('name','')}"
    desc = (f"🔥 {price} · " if price else "") + "오늘의 하루특가 | 다꾸 체험단 모음"
    open(os.path.join(tdir, code + ".html"), "w", encoding="utf-8").write(
        page(title, desc, x.get("img") or SITE + "/images/og.png", "/#/deals?t=" + code))
    n_t += 1

print(f"체험단 공유 페이지 {n_s}개, 하루특가 공유 페이지 {n_t}개 생성")
