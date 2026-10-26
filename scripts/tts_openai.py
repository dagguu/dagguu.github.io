# OpenAI TTS 로 릴스 대본 읽기 (2026-10-26 시온님 "api 가 있어야 해"). 키: Secrets OPENAI_API_KEY.
# 입력 scripts/tts/<name>.json {lines:[...]}. 줄마다 mp3 → 길이 기록(자막·컷 맞추기용) + 전체 이어 붙인 full.mp3.
import json, os, sys, subprocess, argparse, datetime, requests
ap = argparse.ArgumentParser(); ap.add_argument("--name", default="daytona"); ap.add_argument("--voices", default="nova,shimmer,coral")
ap.add_argument("--model", default="gpt-4o-mini-tts"); a = ap.parse_args()
KEY = os.environ.get("OPENAI_API_KEY", "").strip()
st = {"at": datetime.datetime.utcnow().isoformat(), "name": a.name, "voices": {}}
def save(): json.dump(st, open("scripts/tts_status.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
if not KEY: st["error"] = "OPENAI_API_KEY 없음"; save(); sys.exit(0)
L = json.load(open(f"scripts/tts/{a.name}.json", encoding="utf-8"))["lines"]
INS = "한국어 여성 내레이터. 밝고 차분한 여행 브이로그 말투로, 또박또박 자연스럽게 읽어 주세요."
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
