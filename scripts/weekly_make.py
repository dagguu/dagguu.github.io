#!/usr/bin/env python3
"""주간 감성숙소 모음 릴스(9:16, 소리 없음) 만들기 — 2026-10-29 시온님 "이런 모음집도 괜찮은 것 같아, 일주일에 한 번 일요일마다".
참고 형식(카페 모음 릴스): 첫 2컷에 제목 2줄(큰 글씨 + 작은 영어), 그다음 숙소마다 1.2초 컷 2개 + 위쪽 가운데 "1. 숙소이름 (지역)".

입력 scripts/weekly/<날짜>.json:
  {"title": "이번 주 감성숙소 5곳", "sub": "Stay trip in Korea",
   "items": [{"slug": "...", "label": "마티에 부산하버시티 (부산)", "cuts": ["ai:3", "ai:7"] 또는 ["p:1", "p:4"]}],
   "intro": ["ai:3"] (선택, 제목 컷 — 없으면 첫 숙소 첫 컷), "caption": "..."}
  cuts: ai:N = insta 브랜치 video/*/<slug>/clip_aiN.mp4, vp:N = clip_pN.mp4 (Veo 장면 영상, 크레딧 0 재사용),
        p:N = 감성숙소 json photos N 사진(천천히 확대, 영상이 없을 때).
결과 weekly_out/<날짜>/reel.mp4 + cover.jpg + 상태 scripts/weekly_status.json. 워크플로가 insta 브랜치 weekly/<날짜>/ 로 올린다.
"""
import json, os, sys, glob, subprocess, urllib.request, argparse
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ap = argparse.ArgumentParser(); ap.add_argument("--date", required=True); a = ap.parse_args()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = json.load(open(os.path.join(ROOT, "scripts", "weekly", a.date + ".json"), encoding="utf-8"))
W, H, CUT, FPS = 1080, 1920, float(J.get("cut", 1.2)), 30
out = os.path.join(ROOT, "weekly_out", a.date); tmp = os.path.join(out, "_tmp"); os.makedirs(tmp, exist_ok=True)
st = {"date": a.date, "cuts": [], "errors": []}

def font(sz, bold=False):
    for p in ("/usr/share/fonts/opentype/noto/NotoSansCJK-%s.ttc" % ("Bold" if bold else "Medium"),
              "/usr/share/fonts/noto-cjk/NotoSansCJK-%s.ttc" % ("Bold" if bold else "Medium")):
        if os.path.exists(p): return ImageFont.truetype(p, sz, index=1)
    return ImageFont.load_default()

def text_png(lines, path):
    """참고 영상처럼 위쪽 가운데 얇은 흰 글씨 + 부드러운 그림자 (투명 PNG)."""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    y = int(H * 0.255)
    for t, sz in lines:
        f = font(sz); w = d.textlength(t, font=f)
        while w > W - 120 and sz > 30: sz -= 2; f = font(sz); w = d.textlength(t, font=f)
        d.text(((W - w) / 2, y), t, font=f, fill=(255, 255, 255, 255)); y += int(sz * 1.35)
    sh = im.split()[3].filter(ImageFilter.GaussianBlur(6)).point(lambda v: int(v * 0.55))
    base = Image.new("RGBA", (W, H), (0, 0, 0, 0)); base.putalpha(sh)
    base.alpha_composite(im); base.save(path)

def src_for(slug, cut):
    k, n = cut.split(":")
    if k in ("ai", "vp"):  # ai:N = clip_aiN (AI 이미지 영상), vp:N = clip_pN (숙소 사진 영상)
        nm = f"clip_{'ai' if k == 'ai' else 'p'}{n}.mp4"
        for path in sorted(subprocess.run(["git", "ls-tree", "-r", "--name-only", "origin/insta", "video/"], capture_output=True, text=True).stdout.split()):
            if path.endswith(f"/{slug}/{nm}"):
                dst = os.path.join(tmp, f"{slug}_{k}{n}.mp4")
                with open(dst, "wb") as fo: subprocess.run(["git", "show", "origin/insta:" + path], stdout=fo)
                return dst, "video"
        return None, None
    P = json.load(open(os.path.join(ROOT, "scripts", "stays", slug + ".json"), encoding="utf-8"))
    src = P["photos"][int(n) - 1]["src"]
    dst = os.path.join(tmp, f"{slug}_p{n}.jpg")
    try:
        open(dst, "wb").write(urllib.request.urlopen(urllib.request.Request(src, headers={"User-Agent": "Mozilla/5.0"}), timeout=30).read())
        return dst, "photo"
    except Exception as e:
        st["errors"].append(f"{slug} {cut}: {e}"); return None, None

def render(src, kind, ov, dst, start):
    if kind == "video":
        vf = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},setsar=1"
        inp = ["-ss", str(start), "-i", src]
    else:  # 사진: 천천히 확대(1.00 → 1.06)
        n = int(CUT * FPS)
        vf = (f"scale={W*2}:{H*2}:force_original_aspect_ratio=increase,crop={W*2}:{H*2},"
              f"zoompan=z='1+0.06*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS},setsar=1")
        inp = ["-loop", "1", "-i", src]
    cmd = ["ffmpeg", "-y", "-loglevel", "error"] + inp + ["-i", ov, "-filter_complex", f"[0:v]{vf}[v];[v][1:v]overlay=0:0,format=yuv420p[o]",
           "-map", "[o]", "-t", str(CUT), "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-r", str(FPS), dst]
    subprocess.run(cmd, check=True)

parts = []
title_png = os.path.join(tmp, "title.png"); text_png([(J["title"], 64), (J.get("sub", ""), 38)], title_png)
items = J["items"]
intro = J.get("intro") or [items[0]["cuts"][0]]
for j, cut in enumerate(intro):  # 제목 컷 (첫 숙소 영상 위)
    s, k = src_for(items[0]["slug"], cut)
    if s:
        p = os.path.join(tmp, f"c0_{j}.mp4"); render(s, k, title_png, p, 0.3 + j * 1.3); parts.append(p)
for i, it in enumerate(items, 1):
    lab = os.path.join(tmp, f"l{i}.png"); text_png([(f"{i}. {it['label']}", 50)], lab)
    for j, cut in enumerate(it["cuts"]):
        s, k = src_for(it["slug"], cut)
        if not s: st["errors"].append(f"{it['slug']} {cut}: 영상·사진 없음"); continue
        p = os.path.join(tmp, f"c{i}_{j}.mp4"); render(s, k, lab, p, 0.4 + (1.6 if (intro and cut in intro and i == 1) else 0)); parts.append(p)
        st["cuts"].append({"n": i, "slug": it["slug"], "cut": cut, "kind": k})
lst = os.path.join(tmp, "list.txt"); open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c:v", "libx264", "-preset", "slow", "-crf", "19",
                "-movflags", "+faststart", "-an", os.path.join(out, "reel.mp4")], check=True)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "0.5", "-i", os.path.join(out, "reel.mp4"), "-frames:v", "1", "-q:v", "2", os.path.join(out, "cover.jpg")], check=True)
subprocess.run(["rm", "-rf", tmp])
st["sec"] = round(float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(out, "reel.mp4")], capture_output=True, text=True).stdout or 0), 1)
json.dump(st, open(os.path.join(ROOT, "scripts", "weekly_status.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(st)
