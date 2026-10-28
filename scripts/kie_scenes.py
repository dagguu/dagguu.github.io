# 릴스 장면마다 kie Veo3 Lite 영상 만들기 (2026-10-26 시온님 "kie veo3로 영상 만들어야지!").
# 입력 scripts/tts/<name>.json scenes 의 img(겹치면 한 번만): "ai:N" = insta 브랜치 img/<imgDate>/<stay>/N_pro|_edit.jpg (raw 주소),
#   "p:N" = 감성숙소 json 사진 N. 프롬프트: 장면 vp → kie_prompts/<stay>.json 의 prompt(n) → 사진 설명.
# 결과 kie_out/<imgDate>/<stay>/clip_<kind><N>.mp4 (워크플로가 insta 브랜치 video/ 로) — reel_make.py 가 있으면 사진 대신 이 영상을 씀.
import json, os, sys, time, glob, datetime, urllib.request, urllib.error, argparse, subprocess
ap = argparse.ArgumentParser(); ap.add_argument("--name", default="daytona"); ap.add_argument("--only", default=""); ap.add_argument("--tier", default="veo3_lite"); ap.add_argument("--fetch", default="")  # 1 = 지난 상태 파일의 작업만 다시 받기(크레딧 안 씀)
a = ap.parse_args()
KEY = os.environ.get("KIE_API_KEY", "").strip(); API = "https://api.kie.ai/api/v1/jobs"
st = {"at": datetime.datetime.utcnow().isoformat(), "name": a.name, "jobs": []}
def save(): json.dump(st, open("scripts/kie_scenes_status.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
if not KEY: st["error"] = "KIE_API_KEY 없음"; save(); sys.exit(0)
J = json.load(open(f"scripts/tts/{a.name}.json", encoding="utf-8")); stay, day = J["stay"], J["imgDate"]
P = json.load(open(f"scripts/stays/{stay}.json", encoding="utf-8"))
pf = f"scripts/kie_prompts/{stay}.json"; KP = {x["n"]: x for x in (json.load(open(pf, encoding="utf-8")) if os.path.exists(pf) else [])}
TAIL_P = " Keep the exact same Korean person from the image with the same face, hair and clothes (long white skirt); she stays turned away (back view or slight side profile), never turns her head toward the camera, no face close-up. Keep the room, architecture and view exactly unchanged. Smooth cinematic camera motion, natural light, no text."
TAIL = " No people. Keep the original architecture, rooms and view exactly unchanged. Smooth cinematic camera motion, natural light, no text."
RAW = "https://raw.githubusercontent.com/dagguu/dagguu.github.io/insta/"
def call(url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None,
          headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"}, method="POST" if body is not None else "GET")
    try: return json.load(urllib.request.urlopen(req, timeout=60))
    except urllib.error.HTTPError as e: return {"code": e.code, "msg": e.read().decode("utf-8", "ignore")[:300]}
def walk(o):
    if isinstance(o, str):
        t = o.strip()
        if t[:1] in "{[":
            try: return walk(json.loads(t))
            except Exception: return []
        return [t] if t.startswith("http") and (".mp4" in t.lower() or "video" in t.lower()) and not t.lower().endswith((".jpg", ".jpeg", ".png", ".webp")) else []
    if isinstance(o, dict): return [u for v in o.values() for u in walk(v)]
    if isinstance(o, list): return [u for v in o for u in walk(v)]
    return []
def urls_in(d):
    # 입력(param·paramJson)에 든 사진 주소는 빼고 결과(resultJson·response 등)에서만 영상 주소를 찾음
    return walk({k: v for k, v in d.items() if k not in ("param", "paramJson", "input")})
only = {x.strip() for x in a.only.split(",") if x.strip()}
if a.fetch == "1":
    old = json.load(open("scripts/kie_scenes_status.json", encoding="utf-8"))
    st["jobs"] = [{"img": j["img"], "taskId": j["taskId"], "state": "submitted"} for j in old["jobs"] if j.get("taskId")]
    J["scenes"] = []
seen = []
for s in J["scenes"]:
    if s["img"] in seen or (only and s["img"] not in only): continue
    seen.append(s["img"]); kind, n = s["img"].split(":"); n = int(n)
    if kind == "ai":
        path = next((f"img/{day}/{stay}/{n}{suf}.jpg" for suf in ("_pro", "_edit") if subprocess.run(["git", "cat-file", "-e", f"origin/insta:img/{day}/{stay}/{n}{suf}.jpg"]).returncode == 0), None)
        if not path: st["jobs"].append({"img": s["img"], "state": "error", "msg": "AI 이미지 없음"}); save(); continue
        src = RAW + path; pr = (s.get("vp") or KP.get(n, {}).get("prompt") or "Slow push-in camera move.") + (TAIL_P if KP.get(n, {}).get("people") else TAIL)  # 2026-10-28: 사람 없는 AI 이미지에도 TAIL_P 를 붙여서 Veo 가 여자를 만들어 넣었음
    else:
        src = P["photos"][n - 1]["src"]; pr = (s.get("vp") or "Slow push-in camera move. " + P["photos"][n - 1].get("cap", "")) + TAIL
    body = {"model": "veo-3-1", "input": {"prompt": pr, "image_urls": [src], "aspect_ratio": "9:16", "resolution": "1080p", "duration": 4,
            "generation_type": "FIRST_AND_LAST_FRAMES_2_VIDEO", "model": a.tier, "enable_translation": True}}
    r = call(API + "/createTask", body)
    tid = (r.get("data") or {}).get("taskId") if isinstance(r.get("data"), dict) else None
    st["jobs"].append({"img": s["img"], "taskId": tid, "state": "submitted" if tid else "error", **({} if tid else {"msg": str(r.get("msg") or r)[:300]})}); save(); time.sleep(1)
end = time.time() + 22 * 60
while time.time() < end and any(j["state"] not in ("success", "fail", "error") for j in st["jobs"]):
    time.sleep(15)
    for j in st["jobs"]:
        if j["state"] in ("success", "fail", "error"): continue
        d = call(f"{API}/recordInfo?taskId={j['taskId']}").get("data") or {}
        j["state"] = d.get("state", j["state"]); j["credits"] = d.get("creditsConsumed")
        if j["state"] == "fail": j["msg"] = str(d.get("failMsg"))[:300]
        if j["state"] == "success":
            u = (urls_in(d) or [None])[0]
            if not u: j["state"] = "fail"; j["msg"] = "결과 주소 없음"; j["keys"] = {k: (str(v)[:200] if k not in ("param", "paramJson") else "") for k, v in d.items()}; continue
            os.makedirs(f"kie_out/{day}/{stay}", exist_ok=True); k, n = j["img"].split(":")
            open(f"kie_out/{day}/{stay}/clip_{k}{n}.mp4", "wb").write(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=180).read())
            j["file"] = f"video/{day}/{stay}/clip_{k}{n}.mp4"
    save()
st["credits_total"] = sum(j.get("credits") or 0 for j in st["jobs"]); save()
