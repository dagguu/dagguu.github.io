#!/usr/bin/env python3
"""인스타 @dagguu.trip 영상 피드(캐러셀 5장, 장마다 짧은 영상) 만들기.
2026-10-29 시온님: 숙찾남(roomfinder.kr) 피드처럼 5장이 각각 영상, 첫 장 글씨는 시온님 원래 표지 스타일
(해시태그 한 줄 + 흰 글씨 1줄 + 노란/하늘색 글씨 1줄 + 오른쪽 위 @dagguu.trip).

입력 scripts/carousel/<slug>.json:
  {"stay": slug, "imgDate": "YYYY-MM-DD", "cover": {"tags","l1","l2","color"}, "scenes": [{"img": "ai:N", "vp": "...", "cap": "2장부터 자막 상자 글"}] x5, "caption": "..."}
  cap(2026-10-30 시온님 "두번째 이미지부터 이런 느낌"): 반투명 밝은 회색 상자(사진 아래쪽) + 얇은 테두리 + 가운데 2줄, @dagguu.trip 은 오른쪽 위.
  stickers(2026-10-30 시온님 "영상피드에도 적용"): 장면·cover 에 [{"k","t","x","y","r","s","c","a"}] (scripts/cards/stickers.py), 아래 자막 상자를 피해 y 70% 안.
장면 영상 = insta 브랜치 video/<imgDate>/<stay>/clip_<kind><N>.mp4 (kie-scenes.yml --src scripts/carousel/<slug>.json 이 만든 9:16 Veo 영상)
결과 carousel_out/<slug>/1.mp4 ~ 5.mp4 (1080x1350 4:5, 소리 없음 — 음악은 시온님이 인스타에서),
     1_notext.mp4(글씨 없는 첫 장), cover.jpg(첫 장 첫 화면). 워크플로가 insta 브랜치 carousel/<slug>/ 로 올린다.
"""
import json, os, sys, subprocess, html, argparse
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "cards"))
from stickers import STICKER_HEAD, STICKER_CSS, stickers_html  # MZ 스티커(2026-10-30 시온님 "영상피드에도 적용")

ap = argparse.ArgumentParser(); ap.add_argument("--slug", required=True); a = ap.parse_args()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = json.load(open(os.path.join(ROOT, "scripts", "carousel", a.slug + ".json"), encoding="utf-8"))
stay, day = J["stay"], J["imgDate"]
out = os.path.join(ROOT, "carousel_out", a.slug); os.makedirs(out, exist_ok=True)
tmp = os.path.join(out, "_tmp"); os.makedirs(tmp, exist_ok=True)
e = html.escape
W, H = 1080, 1350
st = {"slug": a.slug, "slides": []}

def clip(img):
    k, n = img.split(":")
    path = f"video/{day}/{stay}/clip_{k}{n}.mp4"
    dst = os.path.join(tmp, f"src_{k}{n}.mp4")
    with open(dst, "wb") as f:
        r = subprocess.run(["git", "show", f"origin/insta:{path}"], stdout=f)
    return dst if r.returncode == 0 and os.path.getsize(dst) > 1000 else None

CSS = """*{margin:0;box-sizing:border-box}html,body{background:transparent}
body{width:1080px;height:1350px;overflow:hidden;font-family:'Noto Sans CJK KR','Noto Sans KR',sans-serif;letter-spacing:-.035em}
.s{position:relative;width:1080px;height:1350px;color:#fff}
.g{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 45%,rgba(0,0,0,.18) 62%,rgba(0,0,0,.62) 100%)}
.wm{position:absolute;top:34px;right:40px;font-size:26px;font-weight:600;opacity:.85;text-shadow:0 1px 6px rgba(0,0,0,.4)}
.box{position:absolute;left:62px;right:62px;bottom:92px}
.tg{font-size:30px;font-weight:600;opacity:.92;margin-bottom:14px;text-shadow:0 2px 8px rgba(0,0,0,.5)}
.t{font-size:84px;font-weight:900;line-height:1.2;text-shadow:0 3px 14px rgba(0,0,0,.55)}
.ln{white-space:nowrap}
.cap{position:absolute;left:90px;right:90px;bottom:120px;background:rgba(238,238,238,.9);border:2px solid rgba(40,40,40,.75);
 padding:30px 34px;text-align:center;color:#222;font-size:40px;font-weight:500;line-height:1.45;letter-spacing:-.5px;word-break:keep-all}
.cap b{font-weight:800;color:#111}.cap .red{display:block;color:#e2463c;font-weight:800;margin-bottom:6px}
"""
import re
def capfmt(t):
    """2장부터 자막 상자 글(2026-10-30 시온님 룸투어 피드 참고): 줄바꿈 \\n, **굵게**, {"red": 빨간 첫 줄, "t": 글}."""
    red = ""
    if isinstance(t, dict): red, t = t.get("red", ""), t.get("t", "")
    h = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", e(t).replace("\n", "<br>"))
    return (f"<span class='red'>{e(red)}</span>" if red else "") + h
FIT = """()=>{const t=document.querySelector('.t'); if(!t) return; const L=[...t.querySelectorAll('.ln')], max=t.clientWidth;
  const over=()=>L.some(l=>l.scrollWidth>max+1);
  if(over()) L.forEach(l=>{ if(l.scrollWidth>max+1) l.textContent=l.textContent.replace(/[\\s]*[\\u2600-\\u27BF\\u{1F300}-\\u{1FAFF}\\uFE0F\\u200D]+[\\s]*$/u,''); });
  let f=84; while(over()&&f>48){ f-=2; t.style.fontSize=f+'px'; } }"""
c = J["cover"]; handle = c.get("handle", "@dagguu.trip")
HEAD = f"<html><head><meta charset='utf-8'>{STICKER_HEAD}<style>{CSS}{STICKER_CSS}</style></head><body><div class='s'>"
cover_html = f"""{HEAD}<div class='g'></div>{stickers_html(c.get('stickers'))}
<div class='wm'>{e(handle)}</div><div class='box'><div class='tg'>{e(c.get('tags',''))}</div>
<div class='t'><div class='ln'>{e(c['l1'])}</div><div class='ln' style='color:{c.get('color','#ffe14d')}'>{e(c['l2'])}</div></div></div></div></body></html>"""
wm_html = f"{HEAD}<div class='wm'>{e(handle)}</div></div></body></html>"
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={"width": W, "height": H})
    pages = [("cover.png", cover_html), ("wm.png", wm_html)]
    for i, sc in enumerate(J["scenes"][:5], 1):
        if i > 1 and (sc.get("cap") or sc.get("stickers")):
            capd = f"<div class='cap'>{capfmt(sc['cap'])}</div>" if sc.get("cap") else ""
            pages.append((f"ov{i}.png", f"{HEAD}{stickers_html(sc.get('stickers'))}{capd}<div class='wm'>{e(handle)}</div></div></body></html>"))
    for name, h in pages:
        try: pg.set_content(h, wait_until="networkidle", timeout=20000)
        except Exception: pg.set_content(h)
        pg.evaluate("async()=>{await document.fonts.ready}"); pg.wait_for_timeout(400)
        if name == "cover.png": pg.evaluate(FIT)
        pg.screenshot(path=os.path.join(tmp, name), omit_background=True)
    b.close()

# 9:16(1080x1920) → 가운데 4:5(1080x1350). 장면 json 에 "y": 0~1 을 넣으면 자르는 높이 위치(0 위, 0.5 가운데, 1 아래)
def render(src, ov, dst, y=0.5, sec=4.0):
    vf = f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,crop=1080:1350:0:(ih-1350)*{y},setsar=1,fps=30"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", src]
    if ov:
        cmd += ["-i", ov, "-filter_complex", f"[0:v]{vf}[v];[v][1:v]overlay=0:0,format=yuv420p[o]", "-map", "[o]"]
    else:
        cmd += ["-vf", vf + ",format=yuv420p"]
    cmd += ["-t", str(sec), "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-movflags", "+faststart", dst]
    subprocess.run(cmd, check=True)

for i, s in enumerate(J["scenes"][:5], 1):
    src = clip(s["img"])
    if not src: st["slides"].append({"n": i, "img": s["img"], "error": "장면 영상 없음"}); continue
    y = s.get("y", 0.5)
    ov = "cover.png" if i == 1 else (f"ov{i}.png" if (s.get("cap") or s.get("stickers")) else "wm.png")
    render(src, os.path.join(tmp, ov), os.path.join(out, f"{i}.mp4"), y)
    if i == 1:
        render(src, os.path.join(tmp, "wm.png"), os.path.join(out, "1_notext.mp4"), y)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "0.3", "-i", os.path.join(out, "1.mp4"), "-frames:v", "1", "-q:v", "2", os.path.join(out, "cover.jpg")], check=True)
    st["slides"].append({"n": i, "img": s["img"], "mb": round(os.path.getsize(os.path.join(out, f"{i}.mp4")) / 1e6, 1)})
subprocess.run(["rm", "-rf", tmp])
st["ok"] = sum(1 for x in st["slides"] if "error" not in x)
json.dump(st, open(os.path.join(ROOT, "scripts", "carousel_status.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(st)
