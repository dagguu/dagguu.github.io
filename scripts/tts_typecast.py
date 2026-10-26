# 타입캐스트 API 로 릴스 대본 읽기 (2026-10-26 시온님). 키: Secrets TYPECAST_API_KEY (시온님이 직접, Claude 는 보지 않음).
# --mode voices : GET /v3/voices → scripts/typecast_voices.json (목소리 고르기용, 키·주소 없음)
# --mode make   : scripts/tts/<name>.json 의 text 를 통째로 읽어 tts_out/<name>/tc_<n>.mp3
#                 + /v1/text-to-speech/with-timestamps 응답(자막·컷 맞추기용)을 tts_out/<name>/tc_<n>_ts.json 으로 저장.
import json, os, sys, subprocess, argparse, datetime, base64, requests
ap = argparse.ArgumentParser()
ap.add_argument("--mode", default="make"); ap.add_argument("--name", default="daytona")
ap.add_argument("--voices", default="")  # voice_id 쉼표. 비우면 typecast_voices.json 에서 젊은 여성 4명
ap.add_argument("--model", default="ssfm-v30"); ap.add_argument("--emotion", default="smart"); ap.add_argument("--tempo", default="1.05")
a = ap.parse_args()
KEY = os.environ.get("TYPECAST_API_KEY", "").strip(); API = "https://api.typecast.ai"; H = {"X-API-KEY": KEY, "Content-Type": "application/json"}
st = {"at": datetime.datetime.utcnow().isoformat(), "mode": a.mode, "name": a.name, "voices": {}}
def save(): json.dump(st, open("scripts/tts_typecast_status.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
if not KEY: st["error"] = "TYPECAST_API_KEY 없음 (Settings → Secrets → Actions)"; save(); sys.exit(0)
if a.mode == "voices":
    r = requests.get(API + "/v3/voices", headers=H, params={"model": a.model}, timeout=60)
    if r.status_code != 200: st["error"] = r.text[:300]; save(); sys.exit(0)
    d = r.json(); d = d.get("voices", d) if isinstance(d, dict) else d
    out = [{"id": v.get("voice_id"), "kor": (v.get("voice_name") or {}).get("kor") if isinstance(v.get("voice_name"), dict) else v.get("voice_name"),
            "gender": v.get("gender"), "age": v.get("age"), "use": v.get("use_cases"), "preview": v.get("preview_url"),
            "emotions": sorted({e for m in (v.get("models") or []) for e in (m.get("emotions") or [])})} for v in d]
    json.dump(out, open("scripts/typecast_voices.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    st["count"] = len(out); save(); sys.exit(0)
J = json.load(open(f"scripts/tts/{a.name}.json", encoding="utf-8")); TEXT = J.get("text") or " ".join(J["lines"])
ids = [x.strip() for x in a.voices.split(",") if x.strip()]
if not ids and os.path.exists("scripts/typecast_voices.json"):
    V = json.load(open("scripts/typecast_voices.json", encoding="utf-8"))
    ids = [v["id"] for v in V if str(v.get("gender")).lower() == "female" and str(v.get("age")).lower() in ("young_adult", "teenager", "middle_age")][:4]
os.makedirs("tts_out/" + a.name, exist_ok=True)
def body():
    return {"model": a.model, "text": TEXT, "prompt": {"emotion_type": a.emotion},
            "output": {"audio_format": "mp3", "audio_tempo": float(a.tempo), "target_lufs": -14}}
for n, vid in enumerate(ids, 1):
    info = {"id": vid}; b = body(); b["voice_id"] = vid
    r = requests.post(API + "/v1/text-to-speech", headers=H, json=b, timeout=180)
    if r.status_code != 200:
        b.pop("prompt"); r = requests.post(API + "/v1/text-to-speech", headers=H, json=b, timeout=180); info["noprompt"] = True
    if r.status_code != 200: info["error"] = r.text[:300]; st["voices"][f"tc_{n}"] = info; save(); continue
    p = f"tts_out/{a.name}/tc_{n}.mp3"; open(p, "wb").write(r.content)
    info["total"] = round(float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",p],capture_output=True,text=True).stdout or 0), 2)
    t = requests.post(API + "/v1/text-to-speech/with-timestamps", headers=H, json=b, timeout=180)
    if t.status_code == 200:
        try:
            tj = t.json()
            for k in list(tj.keys()) if isinstance(tj, dict) else []:
                if isinstance(tj[k], str) and len(tj[k]) > 2000: tj[k] = f"<{len(tj[k])} chars>"  # 오디오 base64 는 빼고 저장
            json.dump(tj, open(f"tts_out/{a.name}/tc_{n}_ts.json", "w", encoding="utf-8"), ensure_ascii=False)
            info["ts_keys"] = list(tj.keys()) if isinstance(tj, dict) else type(tj).__name__
        except Exception as e: info["ts_err"] = str(e)[:200]
    else: info["ts_err"] = t.text[:200]
    st["voices"][f"tc_{n}"] = info; save()
save()
