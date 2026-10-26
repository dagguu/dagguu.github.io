# 대본 장면 ↔ 사진 맞춘 릴스 만들기 (2026-10-26 시온님 "대본에 '바다 앞 통창'이면 영상도 그 이미지가 나와야 해").
# 입력 scripts/tts/<name>.json: voice(타입캐스트 voice_id)·tempo·stay(감성숙소 slug)·imgDate·scenes[{t 대본 조각, img "p:N"(숙소 사진 N) | "ai:N"(insta 브랜치 img/<imgDate>/<stay>/N_pro.jpg 또는 N_edit.jpg), hl 강조 단어}]
# 1) 타입캐스트 with-timestamps 로 전체 대본 음성 + 단어 시간  2) 장면마다 첫 단어~다음 장면 첫 단어 = 그 사진이 나오는 시간
# 3) 장면이 1.8초 넘으면 같은 사진을 넓게/가깝게 1.2초 안팎 컷으로 나눔, 컷마다 카메라 움직임(줌인·좌우 이동·줌아웃)
# 4) 자막: 2~3단어씩, 가운데 아래 흰 글씨+검은 테두리, hl 단어는 주황  → reel_out/<name>/reel.mp4 (워크플로가 insta 브랜치 reels/ 로)
import json, os, sys, subprocess, base64, argparse, datetime, requests
ap = argparse.ArgumentParser(); ap.add_argument("--name", default="daytona"); a = ap.parse_args()
KEY = os.environ.get("TYPECAST_API_KEY", "").strip()
st = {"at": datetime.datetime.utcnow().isoformat(), "name": a.name}
def save(): json.dump(st, open("scripts/reel_status.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
if not KEY: st["error"] = "TYPECAST_API_KEY 없음"; save(); sys.exit(0)
J = json.load(open(f"scripts/tts/{a.name}.json", encoding="utf-8")); SC = J["scenes"]
P = json.load(open(f"scripts/stays/{J['stay']}.json", encoding="utf-8"))
OUT = f"reel_out/{a.name}"; os.makedirs(OUT + "/cuts", exist_ok=True)
TEXT = " ".join(s["t"] for s in SC)
r = requests.post("https://api.typecast.ai/v1/text-to-speech/with-timestamps", headers={"X-API-KEY": KEY, "Content-Type": "application/json"},
                  json={"model": "ssfm-v30", "voice_id": J["voice"], "text": TEXT, "prompt": {"emotion_type": "smart"},
                        "output": {"audio_format": "mp3", "audio_tempo": float(J.get("tempo", 1.0)), "target_lufs": -14}}, timeout=240)
if r.status_code != 200: st["error"] = r.text[:300]; save(); sys.exit(0)
R = r.json(); open(OUT + "/voice.mp3", "wb").write(base64.b64decode(R["audio"])); W = R["words"]
dur = float(R.get("audio_duration") or W[-1]["end"]) + 0.6
# 장면 시작 시간: 단어를 순서대로 세어 맞춤
idx, starts, wsc = 0, [], []
for s in SC:
    n = len(s["t"].split()); starts.append(0.0 if idx == 0 else W[idx]["start"] - 0.05); wsc.append(W[idx:idx + n]); idx += n
ends = starts[1:] + [dur]
def src(img):
    kind, n = img.split(":"); p = f"{OUT}/src_{kind}{n}.jpg"
    if os.path.exists(p): return p
    if kind == "p":
        b = requests.get(P["photos"][int(n) - 1]["src"], headers={"Referer": "https://trip.coupang.com/", "User-Agent": "Mozilla/5.0"}, timeout=60).content
        open(p, "wb").write(b)
    else:
        for suf in ("_pro", "_edit", ""):
            q = subprocess.run(["git", "show", f"origin/insta:img/{J['imgDate']}/{J['stay']}/{n}{suf}.jpg"], capture_output=True)
            if q.returncode == 0: open(p, "wb").write(q.stdout); break
    return p
MOV = ["zin", "pr", "zout", "pl"]
def cut(img, d, mode, close, out):
    fr = max(2, round(d * 30)); base = "scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840"
    z0 = 1.25 if close else 1.0
    if mode == "zin":  z = f"{z0}+0.12*on/{fr}"; x = "iw/2-(iw/zoom/2)"; y = "ih/2-(ih/zoom/2)"
    elif mode == "zout": z = f"{z0+0.12}-0.12*on/{fr}"; x = "iw/2-(iw/zoom/2)"; y = "ih/2-(ih/zoom/2)"
    elif mode == "pr": z = f"{z0+0.15}"; x = f"(iw-iw/zoom)*on/{fr}"; y = "ih/2-(ih/zoom/2)"
    else:              z = f"{z0+0.15}"; x = f"(iw-iw/zoom)*(1-on/{fr})"; y = "ih/2-(ih/zoom/2)"
    vf = f"{base},zoompan=z='{z}':x='{x}':y='{y}':d={fr}:s=1080x1920:fps=30,format=yuv420p"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", img, "-vf", vf, "-frames:v", str(fr), "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", out], check=True)
def clip(img):
    kind, n = img.split(":"); p = f"{OUT}/clip_{kind}{n}.mp4"
    if os.path.exists(p): return p
    q = subprocess.run(["git", "show", f"origin/insta:video/{J['imgDate']}/{J['stay']}/clip_{kind}{n}.mp4"], capture_output=True)
    if q.returncode == 0 and len(q.stdout) > 1000: open(p, "wb").write(q.stdout); return p
    return None
def vcut(v, ss, d, close, out):
    vlen = float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",v],capture_output=True,text=True).stdout or 4)
    if ss + d > vlen: ss = max(0, vlen - d)
    sc = "scale=1350:2400:force_original_aspect_ratio=increase,crop=1080:1920" if close else "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"
    vf = f"{sc},setpts=PTS-STARTPTS,fps=30,format=yuv420p" + (f",tpad=stop_mode=clone:stop_duration={d}" if ss + d > vlen else "")
    subprocess.run(["ffmpeg","-y","-loglevel","error","-ss",f"{ss:.2f}","-i",v,"-t",f"{d:.3f}","-vf",vf,"-an","-r","30","-c:v","libx264","-preset","veryfast","-crf","18",out],check=True)
used = {}
cuts, plan, k = [], [], 0
for i, s in enumerate(SC):
    d = ends[i] - starts[i]; parts = max(1, round(d / 1.3)) if d > 1.8 else 1
    for j in range(parts):
        o = f"{OUT}/cuts/{len(cuts):02d}.mp4"; v = clip(s["img"])
        if v: ss = used.get(s["img"], 0.0); vcut(v, ss, d / parts, j % 2 == 1, o); used[s["img"]] = ss + d / parts
        else: cut(src(s["img"]), d / parts, MOV[k % 4], j % 2 == 1, o)
        cuts.append(o); k += 1
    plan.append({"video": bool(clip(s["img"])), "t": s["t"], "img": s["img"], "start": round(starts[i], 2), "end": round(ends[i], 2), "cuts": parts})
open(OUT + "/list.txt", "w").write("".join(f"file '{os.path.basename(c)}'\n" for c in cuts))
os.replace(OUT + "/list.txt", OUT + "/cuts/list.txt")
# 자막 (ASS)
def ts(t): t = max(0, t); return f"{int(t//3600)}:{int(t%3600//60):02d}:{t%60:05.2f}"
L = ["[Script Info]", "ScriptType: v4.00+", "PlayResX: 1080", "PlayResY: 1920", "", "[V4+ Styles]",
     "Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV",
     "Style: D,Noto Sans CJK KR Black,104,&H00FFFFFF,&H00000000,&H64000000,1,1,8,3,5,60,60,0",
     "Style: T,Noto Sans CJK KR Black,112,&H00FFFFFF,&H00000000,&H78000000,1,1,8,4,8,50,50,300", "", "[Events]",
     "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
TT = J.get("title") or []
if TT and J.get("titleInVideo"):  # 2026-10-26 22:24 시온님: 제목은 영상에 넣지 않고 썸네일로  # 제목: 맨 처음 2.8초, 위쪽, 윗줄 흰색·아랫줄 노란색 (2026-10-26 시온님)
    t1 = TT[0] + ("\\N{\\c&H00FFFF&}" + TT[1] if len(TT) > 1 else "")
    L.append(f"Dialogue: 1,{ts(0)},{ts(min(2.8, dur))},T,,0,0,0,,{t1}")
def chunk(ws):
    out, cur = [], []
    for w in ws:
        if cur and (len(cur) >= 2 or len("".join(x["text"] for x in cur + [w])) > 9): out.append(cur); cur = []
        cur.append(w)
    return out + ([cur] if cur else [])
for i, s in enumerate(SC):
    ws = wsc[i]; chunks = chunk(ws)
    for c, ch in enumerate(chunks):
        a0 = ch[0]["start"]; a1 = chunks[c + 1][0]["start"] if c + 1 < len(chunks) else (ends[i] if i + 1 < len(SC) else dur)
        txt = " ".join(w["text"].rstrip(",.") for w in ch)
        for h in s.get("hl", []): txt = txt.replace(h, "{\\c&H0080FF&}" + h + "{\\c&HFFFFFF&}")
        L.append(f"Dialogue: 0,{ts(a0)},{ts(a1)},D,,0,0,0,,{txt}")
open(OUT + "/sub.ass", "w", encoding="utf-8").write("\n".join(L) + "\n")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", OUT + "/cuts/list.txt", "-i", OUT + "/voice.mp3",
                "-vf", f"subtitles={OUT}/sub.ass", "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                "-c:a", "aac", "-b:a", "192k", "-t", f"{dur:.2f}", "-movflags", "+faststart", OUT + "/reel.mp4"], check=True)
if TT:  # 썸네일(표지) = thumb.img(기본 첫 풍경 장면) 영상/사진 + 제목 2줄
    th = J.get("thumb") or {}; ti = th.get("img") or next((x["img"] for x in SC if x["img"].startswith("p:")), SC[0]["img"])
    tsrc = clip(ti) or src(ti)
    subprocess.run([sys.executable, "scripts/reel_thumb.py", tsrc, OUT + "/thumb.jpg", TT[0], TT[1] if len(TT) > 1 else "", str(th.get("sec", 1.5))], check=False)
import shutil; shutil.rmtree(OUT + "/cuts"); [os.remove(f"{OUT}/{f}") for f in os.listdir(OUT) if f.startswith(("src_", "clip_"))]
st.update({"dur": round(dur, 2), "cuts": len(cuts), "plan": plan, "file": f"reels/{a.name}/reel.mp4"}); save()
