# 릴스 장면마다 kie Veo3 Lite 영상 만들기 (2026-10-26 시온님 "kie veo3로 영상 만들어야지!").
# 입력 scripts/tts/<name>.json scenes 의 img(겹치면 한 번만): "ai:N" = insta 브랜치 img/<imgDate>/<stay>/N_pro|_edit.jpg (raw 주소),
#   "p:N" = 감성숙소 json 사진 N. 프롬프트: 장면 vp → kie_prompts/<stay>.json 의 prompt(n) → 사진 설명.
# 결과 kie_out/<imgDate>/<stay>/clip_<kind><N>.mp4 (워크플로가 insta 브랜치 video/ 로) — reel_make.py 가 있으면 사진 대신 이 영상을 씀.
import re, json, os, sys, time, glob, datetime, urllib.request, urllib.error, argparse, subprocess
ap = argparse.ArgumentParser(); ap.add_argument("--name", default="daytona"); ap.add_argument("--only", default=""); ap.add_argument("--tier", default="veo3_lite"); ap.add_argument("--fetch", default=""); ap.add_argument("--src", default="")  # 장면 json 경로(비우면 scripts/tts/<name>.json, 인스타 영상 피드는 scripts/carousel/<slug>.json)  # 1 = 지난 상태 파일의 작업만 다시 받기(크레딧 안 씀)
a = ap.parse_args()
KEY = os.environ.get("KIE_API_KEY", "").strip(); API = "https://api.kie.ai/api/v1/jobs"
st = {"at": datetime.datetime.utcnow().isoformat(), "name": a.name, "jobs": []}
def save(): json.dump(st, open("scripts/kie_scenes_status.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
if not KEY: st["error"] = "KIE_API_KEY 없음"; save(); sys.exit(0)
J = json.load(open(a.src or f"scripts/tts/{a.name}.json", encoding="utf-8")); stay, day = J["stay"], J["imgDate"]
P = json.load(open(f"scripts/stays/{stay}.json", encoding="utf-8"))
pf = f"scripts/kie_prompts/{stay}.json"; KP = {x["n"]: x for x in (json.load(open(pf, encoding="utf-8")) if os.path.exists(pf) else [])}
LOOK0 = next((x.get("look") for x in KP.values() if x.get("look")), "day")  # 숙소 기본 색감
TAIL_P = " Keep the exact same Korean person from the image with the same face, hair and clothes (long white skirt); she stays turned away (back view or slight side profile), never turns her head toward the camera, no face close-up. Keep the room, architecture and view exactly unchanged. Smooth cinematic camera motion, natural light, no text."
# 2026-11-02 시온님: 강아지·아이·아빠 장면(kie_prompts "who")은 그 모습을 유지하는 꼬리말
WHO_T = {"dog": " Keep the same small fluffy cream Pomeranian dog from the image; it moves naturally and gently (tail wagging, sniffing, trotting a few steps), stays the same size and look.",
         "kid": " Keep the same Korean child from the image seen from behind; the child never turns toward the camera, face never visible, moves naturally (walking, looking around).",
         "dad": " Keep the same Korean man from the image seen from behind or side; he never turns toward the camera, face never visible."}
def who_tail(k):
    ws = [w.strip() for w in str(k.get("who") or "").split(",") if w.strip() in WHO_T]
    if k.get("people"):
        base = TAIL_P.replace("(long white skirt)", "(" + k["outfit"] + ")") if k.get("outfit") else TAIL_P
    elif ws:
        base = " Keep the room, architecture and view exactly unchanged. Smooth cinematic camera motion, natural light, no text."
    else:
        return TAIL
    return base + "".join(WHO_T[w] for w in ws)
# 2026-10-30 시온님 "사진을 좌우로 미는 게 아니라 스마트폰 짐벌로 직접 걸어가며 찍은 것처럼 공간감 있게": 모든 장면 프롬프트에 붙임
GIMBAL = " Make it look like real filmed video, not a still photo: a slow, gentle camera drift (a very slow steady push-in into the space with real parallax depth, small and smooth, no sudden zoom), plus natural living motion inside the scene - steam rising from warm water, soft water ripples, leaves swaying or drifting down, warm lights glowing, curtains moving slightly. {TONE} This is NOT a 2D pan, slide or zoom across a flat photo. IMPORTANT: no drones, gimbals, cameras, phones, tripods or any filming equipment appear anywhere in the frame - show only the place itself."  # 2026-10-30 21:52 시온님: 영상처럼 보이게(작은 카메라 움직임 + 김·물결·나뭇잎 같은 살아 있는 움직임) + 밝은 가을 톤
LOOK = {"day": " Clear sunny midday look: vivid deep-blue sky with a few white clouds wherever sky shows, bright direct sunlight, crisp saturated greens with some orange autumn leaves, clean bright whites indoors; not dark, hazy, golden-hour or gloomy.",
        "sunset": " Late-afternoon sunset look: warm orange-pink sky over the hills, low golden light, window lights starting to glow, steam over warm water; bright and clear, not murky.",
        "night": " Early-night blue-hour look: deep navy sky, warm yellow window and lantern lights, soft reflections on water, gentle steam; clean and clear, details visible, not pitch-black.",
        "moody": " Keep the place's own dark moody concept lighting: deep shadows, dark stone and wood, warm amber indirect lights, lanterns glowing, reflections and steam; cinematic, details visible, do not brighten into daylight.",
        "warm": " Cozy warm interior look: soft warm lamps and indirect light, honey-toned wood, calm and inviting, clear not murky.",
        "pastel": " Soft bright airy look: creamy whites, gentle pastel colors, diffused sunlight through sheer curtains, light and dreamy, not harsh or dark."}  # 2026-10-31 시온님: 숙소 콘셉트별 색감  # 2026-10-31 시온님: 하루 흐름(낮 → 노을 → 밤)
# 2026-11-02 시온님 "힉스필드처럼 크래시줌·돌리·오빗·휩팬": kie_prompts 항목 "move": "dolly"|"orbit"|"crash" 면 느린 드리프트 대신 그 카메라 움직임(장비 이름은 쓰지 않음)
# 2026-11-02 시온님 "갑자기 확 커지는 확대샷 하지 말고 아주 천천히 안쪽으로 들어가는 느낌으로": crash 는 쓰지 않고(옛 json 은 slowin 으로 처리), 기본 움직임도 아주 느린 전진
SLOWIN = "a very slow, steady, continuous push-in: the camera creeps gently forward into the space at a constant speed for the whole clip, the frame grows only slightly, no sudden zoom, no speed change, real parallax depth"
MOVE = {"slowin": SLOWIN, "crash": SLOWIN,
        "dolly": "a very slow, steady dolly-in: the camera glides gently forward deep into the space at a constant speed, with soft parallax as near objects pass by, no sudden zoom or speed change",
        "reveal": "a slow, majestic aerial reveal: the camera starts low and close behind foreground trees, water or rooftops and rises smoothly upward and slightly backward at a constant speed, uncovering the whole building in its full setting (mountains, sea, forest or fields around it) so the viewer gasps at the view; the entire property is visible and centered by the end, one continuous move, no sudden zoom",  # 2026-11-03 시온님: 첫 장면 = 건물 전체 드론샷, 우와~ 감탄·어딘지 궁금하게
        "orbit": "a smooth slow half orbit: the camera circles gently around the main subject in an arc from left to right, keeping it centered, background sliding behind it with soft parallax"}
def gimbal(tm, mv=None):
    g = GIMBAL.replace(" {TONE}", LOOK.get(tm or globals().get("LOOK0") or "day", LOOK["day"]))
    if mv in MOVE: g = re.sub(r"a slow, gentle camera drift \([^)]*\)", MOVE[mv], g)
    return g
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
        src = RAW + path; pr = (s.get("vp") or KP.get(n, {}).get("prompt") or "Slow push-in camera move.") + gimbal(s.get("time") or KP.get(n, {}).get("time"), s.get("move") or KP.get(n, {}).get("move")) + who_tail(KP.get(n, {}))  # 2026-10-28: 사람 없는 AI 이미지에도 TAIL_P 를 붙여서 Veo 가 여자를 만들어 넣었음
    else:
        src = P["photos"][n - 1]["src"]; pr = (s.get("vp") or "Slow push-in camera move. " + P["photos"][n - 1].get("cap", "")) + gimbal(s.get("time")) + TAIL
    body = {"model": "veo-3-1", "input": {"prompt": pr, "image_urls": [src], "aspect_ratio": "9:16", "resolution": "1080p", "duration": 4,
            "generation_type": "FIRST_AND_LAST_FRAMES_2_VIDEO", "model": a.tier, "enable_translation": True}}
    r = call(API + "/createTask", body)
    tid = (r.get("data") or {}).get("taskId") if isinstance(r.get("data"), dict) else None
    st["jobs"].append({"img": s["img"], "taskId": tid, "state": "submitted" if tid else "error", **({} if tid else {"msg": str(r.get("msg") or r)[:300]})}); save(); time.sleep(1)
# 2026-11-02 시온님 "휩팬·돌진 같은 효과": tts 장면에 "tr": "whip"|"rush" 가 있으면 앞 장면 AI 이미지(끝)와 이 장면 AI 이미지(처음)를 이어 주는 전환 영상을 하나 더 만든다(clip_tr<번호>.mp4) → reel_make.py 가 그 장면 맨 앞에 0.5초로 빨리 감아 넣는다.
TRP = {"whip": "A fast whip pan transition: the camera swings quickly sideways from the first scene with strong motion blur, then lands smoothly on the second scene and holds. Real camera motion only, no graphic effects, no text, no people.",
       "rush": "A fast forward rush transition: the camera dashes quickly forward through the first scene with motion blur and arrives in the second scene, then slows and holds. Real camera motion only, no graphic effects, no text, no people."}
def ai_src(img):
    k, n = img.split(":")
    if k != "ai": return None
    path = next((f"img/{day}/{stay}/{n}{suf}.jpg" for suf in ("_pro", "_edit") if subprocess.run(["git", "cat-file", "-e", f"origin/insta:img/{day}/{stay}/{n}{suf}.jpg"]).returncode == 0), None)
    return RAW + path if path else None
TRP = {}  # 2026-11-03 시온님 "옆으로 휙 넘어가는 것도 빼줘": AI 전환(whip·rush)을 만들지 않는다. tts json 에 tr 이 남아 있어도 무시
for i, s in enumerate(J["scenes"]):
    if i == 0 or s.get("tr") not in TRP or s["img"] == J["scenes"][i - 1]["img"]: continue
    key = "tr:" + s["img"].split(":")[1]
    if only and key not in only and s["img"] not in only: continue
    a0, a1 = ai_src(J["scenes"][i - 1]["img"]), ai_src(s["img"])
    if not (a0 and a1): st["jobs"].append({"img": key, "state": "error", "msg": "전환용 AI 이미지 없음"}); save(); continue
    body = {"model": "veo-3-1", "input": {"prompt": TRP[s["tr"]], "image_urls": [a0, a1], "aspect_ratio": "9:16", "resolution": "1080p", "duration": 4,
            "generation_type": "FIRST_AND_LAST_FRAMES_2_VIDEO", "model": a.tier, "enable_translation": True}}
    r = call(API + "/createTask", body)
    tid = (r.get("data") or {}).get("taskId") if isinstance(r.get("data"), dict) else None
    st["jobs"].append({"img": key, "taskId": tid, "state": "submitted" if tid else "error", **({} if tid else {"msg": str(r.get("msg") or r)[:300]})}); save(); time.sleep(1)
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
