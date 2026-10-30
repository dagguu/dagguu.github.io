#!/usr/bin/env python3
"""여행 탭 '영상으로 다음 여행을 찾아보세요'용 릴스 미리보기 (2026-10-30 시온님 "내가 만든 릴스를 마이리얼트립 지금특가처럼 넣어줘").
scripts/tts/<name>.json 의 stay(감성숙소 slug)마다 insta 브랜치 reels/<name>/reel.mp4 → v/<stay>.mp4 (540x960, 가볍게, 소리 포함)
와 thumb.jpg.frame.png(글씨 없는 표지 프레임, 없으면 thumb.jpg) → v/<stay>.jpg(포스터) 를 만든다. 이미 있으면 건너뜀(--all 이면 다시). insta 브랜치는 git fetch origin insta 로 받아 둔다.
gen_stays.py 가 v/ 에 있는 것으로 m/reels.json 을 만든다."""
import glob, json, os, subprocess, sys, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALL = "--all" in sys.argv
def blob(path, out):
    r = subprocess.run(["git", "-C", ROOT, "show", "origin/insta:" + path], capture_output=True)
    if r.returncode or not r.stdout: return False
    open(out, "wb").write(r.stdout); return True
os.makedirs(os.path.join(ROOT, "v"), exist_ok=True)
n = 0
for f in sorted(glob.glob(os.path.join(ROOT, "scripts", "tts", "*.json"))):
    name = os.path.basename(f)[:-5]
    try: stay = json.load(open(f, encoding="utf-8")).get("stay")
    except Exception: continue
    if not stay or not os.path.exists(os.path.join(ROOT, "scripts", "stays", stay + ".json")): continue
    mp4, jpg = os.path.join(ROOT, "v", stay + ".mp4"), os.path.join(ROOT, "v", stay + ".jpg")
    if os.path.exists(mp4) and os.path.exists(jpg) and not ALL: continue
    with tempfile.TemporaryDirectory() as td:
        src, th = os.path.join(td, "r.mp4"), os.path.join(td, "t.jpg")
        if not blob(f"reels/{name}/reel.mp4", src): print(name, "릴스 없음"); continue
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-vf", "scale=540:-2", "-c:v", "libx264", "-preset", "slow", "-crf", "30",
                        "-profile:v", "main", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", mp4], check=True)
        if blob(f"reels/{name}/thumb.jpg.frame.png", th) or blob(f"reels/{name}/thumb.jpg", th):   # 글씨 없는 표지 프레임 먼저
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", th, "-vf", "scale=540:-2", "-q:v", "5", jpg], check=True)
        else:
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "0.5", "-i", mp4, "-frames:v", "1", "-q:v", "5", jpg], check=True)
    n += 1; print(stay, os.path.getsize(mp4) // 1024, "KB")
print(f"릴스 미리보기 새로 만듦 {n}")
