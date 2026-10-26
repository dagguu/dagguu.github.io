# OpenAI TTS 로 릴스 대본 읽기 (2026-10-26 시온님 "api 가 있어야 해"). 키: Secrets OPENAI_API_KEY.
# 입력 scripts/tts/<name>.json {lines:[...]}. 줄마다 mp3 → 길이 기록(자막·컷 맞추기용) + 전체 이어 붙인 full.mp3.
import json, os, sys, subprocess, argparse, datetime, requests
ap = argparse.ArgumentParser(); ap.add_argument("--name", default="daytona"); ap.add_argument("--voices", default="nova,shimmer,coral")
ap.add_argument("--model", default="gpt-4o-mini-tts"); ap.add_argument("--whole", default="1"); a = ap.parse_args()
KEY = os.environ.get("OPENAI_API_KEY", "").strip()
st = {"at": datetime.datetime.utcnow().isoformat(), "name": a.name, "voices": {}}
def save(): json.dump(st, open("scripts/tts_status.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
if not KEY: st["error"] = "OPENAI_API_KEY 없음"; save(); sys.exit(0)
L = json.load(open(f"scripts/tts/{a.name}.json", encoding="utf-8"))["lines"]
INS = ("Voice: 20대 후반 한국 여성, 서울 표준어. 인스타 릴스 여행 내레이션처럼 친구한테 소개하듯 다정하고 생기 있게. "
       "Tone: 따뜻하고 설레는 느낌, 광고 성우처럼 과하지 않게. Pacing: 조금 빠르게, 쉼표에서만 아주 짧게 쉬기. "
       "Pronunciation: 한국어 억양을 자연스럽게, 문장 끝을 너무 올리거나 끌지 않기.")
if a.whole == "1":
    J = json.load(open(f"scripts/tts/{a.name}.json", encoding="utf-8"))
    TEXT = J.get("text") or " ".join(J["lines"])
    for v in a.voices.split(","):
        os.makedirs("tts_out/" + a.name, exist_ok=True)
        r = requests.post("https://api.openai.com/v1/audio/speech", headers={"Authorization": "Bearer " + KEY},
                          json={"model": a.model, "voice": v, "input": TEXT, "response_format": "mp3", "instructions": INS}, timeout=180)
        info = {"model": a.model}
        if r.status_code != 200: info["error"] = r.text[:300]
        else:
            p = f"tts_out/{a.name}/whole_{v}.mp3"; open(p, "wb").write(r.content)
            info["total"] = round(float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",p],capture_output=True,text=True).stdout or 0), 2)
            w = requests.post("https://api.openai.com/v1/audio/transcriptions", headers={"Authorization": "Bearer " + KEY},
                              files={"file": (os.path.basename(p), open(p, "rb"), "audio/mpeg")},
                              data={"model": "whisper-1", "language": "ko", "response_format": "verbose_json", "timestamp_granularities[]": "word"}, timeout=180)
            info["words"] = (w.json().get("words") if w.status_code == 200 else w.text[:200])
        st["voices"][v] = info; save()
    sys.exit(0)
for v in a.voices.split(","):
    out = f"tts_out/{a.name}/{v}"; os.makedirs(out, exist_ok=True); info = {"lines": []}
    for i, t in enumerate(L, 1):
        body = {"model": a.model, "voice": v, "input": t, "response_format": "mp3", "instructions": INS}
        r = requests.post("https://api.openai.com/v1/audio/speech", headers={"Authorization": "Bearer " + KEY}, json=body, timeout=120)
        if r.status_code != 200:
            body.pop("instructions"); body["model"] = "tts-1-hd"
            r = requests.post("https://api.openai.com/v1/audio/speech", headers={"Authorization": "Bearer " + KEY}, json=body, timeout=120)
            info["model"] = "tts-1-hd"
        if r.status_code != 200: info["error"] = r.text[:300]; break
        p = f"{out}/{i:02d}.mp3"; open(p, "wb").write(r.content)
        d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True).stdout or 0)
        info["lines"].append({"n": i, "t": t, "dur": round(d, 3)})
    info.setdefault("model", a.model)
    if not info.get("error"):
        lst = f"{out}/list.txt"; open(lst, "w").write("".join(f"file '{i:02d}.mp3'\n" for i in range(1, len(L) + 1)))
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c:a", "libmp3lame", "-q:a", "2", f"tts_out/{a.name}/full_{v}.mp3"])
        info["total"] = round(sum(x["dur"] for x in info["lines"]), 2)
    st["voices"][v] = info; save()
save()
