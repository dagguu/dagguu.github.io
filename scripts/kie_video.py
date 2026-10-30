# kie.ai Veo 3.1 (Lite) 로 감성숙소 사진 → 세로 짧은 영상 (2026-10-26 시온님 요청).
# 시온님 설정: image to video · Veo3 Lite · 9:16 · 1080p · 4초 (35크레딧/개).
# 키: Secrets KIE_API_KEY (시온님이 직접 넣음, Claude 는 보지 않음).
# 프롬프트: scripts/kie_prompts/<slug>.json [{"n":1,"prompt":"..."}] (19:44 인스타 작업이 씀). 없으면 사진 설명으로 기본 프롬프트.
# 인물(2026-10-26 시온님): 프롬프트 항목에 "img"(사진 편집 프롬프트)가 있으면 먼저 nano-banana-edit 로
#   원본 사진에 한국 여성 뒷모습을 넣은 9:16 이미지를 만들고(kie_out/.../<n>.jpg 도 저장), 그 이미지로 영상을 만든다.
# 결과: kie_out/<date>/<slug>/<n>.mp4 (워크플로가 insta 브랜치 video/ 로 올림) + scripts/kie_status.json(크레딧·상태, 키·주소 없음)
import json, os, sys, time, glob, datetime, urllib.request, urllib.error, argparse
KST = datetime.timezone(datetime.timedelta(hours=9))
TODAY = datetime.datetime.now(KST).strftime("%Y-%m-%d")
ap = argparse.ArgumentParser()
ap.add_argument("--slug", default="")
ap.add_argument("--count", type=int, default=1)
ap.add_argument("--tier", default="veo3_lite")
ap.add_argument("--res", default="1080p")
ap.add_argument("--dur", type=int, default=4)
ap.add_argument("--only", default="")
ap.add_argument("--task", default="")  # 이미 만든 작업 다시 받기(크레딧 안 씀)  # 사진 번호 "1,3,5"
a = ap.parse_args()
KEY = os.environ.get("KIE_API_KEY", "").strip()
API = "https://api.kie.ai/api/v1/jobs"
status = {"at": datetime.datetime.now(KST).strftime("%Y-%m-%d %H:%M"), "tier": a.tier, "res": a.res, "dur": a.dur, "jobs": []}
def save():
    json.dump(status, open("scripts/kie_status.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
if not KEY:
    status["error"] = "KIE_API_KEY 없음 (저장소 Settings → Secrets → Actions 에 넣어 주세요)"; save(); print(status["error"]); sys.exit(0)
stays = {}
for f in glob.glob("scripts/stays/*.json"):
    d = json.load(open(f, encoding="utf-8")); stays[d["slug"]] = d
slug = a.slug or next((s for s, d in sorted(stays.items(), key=lambda x: x[1].get("date", "")) [::-1] if d.get("date", "") <= TODAY), "")
P = stays.get(slug)
if not P:
    status["error"] = "숙소 글 없음: " + slug; save(); sys.exit(0)
status["slug"] = slug; status["name"] = P["name"]
pf = f"scripts/kie_prompts/{slug}.json"
PL = json.load(open(pf, encoding="utf-8")) if os.path.exists(pf) else []
prompts = {x["n"]: x["prompt"] for x in PL}
people = {x["n"] for x in PL if x.get("people") or x.get("img")}
imgp = {x["n"]: x["img"] for x in PL if x.get("img")}
photos = P.get("photos", [])
nums = [int(x) for x in a.only.split(",") if x.strip()] if a.only else list(range(1, len(photos) + 1))[: a.count]
TAIL_P = " Keep the exact same Korean person from the image with the same face, hair and clothes (long white skirt); she stays turned away (back view or slight side profile), never turns her head toward the camera, no face close-up. Keep the room, architecture and view exactly unchanged. Smooth cinematic camera motion, natural light, no text."
# 2026-10-30 시온님 "사진을 좌우로 미는 게 아니라 스마트폰 짐벌로 직접 걸어가며 찍은 것처럼 공간감 있게": 모든 장면 프롬프트에 붙임
GIMBAL = " Make it look like real filmed video, not a still photo: a slow, gentle camera drift (a subtle push-in or a slow sideways glide through the space with real parallax depth, small and smooth), plus natural living motion inside the scene - steam rising from warm water, soft water ripples, leaves swaying or drifting down, warm lights glowing, curtains moving slightly. Clear sunny midday look: vivid deep-blue sky with a few white clouds wherever sky shows, bright direct sunlight, crisp saturated greens with some orange autumn leaves, clean bright whites indoors; not dark, hazy, golden-hour or gloomy. This is NOT a 2D pan, slide or zoom across a flat photo. IMPORTANT: no drones, gimbals, cameras, phones, tripods or any filming equipment appear anywhere in the frame - show only the place itself."  # 2026-10-30 21:52 시온님: 영상처럼 보이게(작은 카메라 움직임 + 김·물결·나뭇잎 같은 살아 있는 움직임) + 밝은 가을 톤
TAIL = " No people. Keep the original architecture, rooms and layout exactly unchanged. Smooth cinematic camera motion, natural light."
def call(url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"},
                                 method="POST" if body is not None else "GET")
    try:
        return json.load(urllib.request.urlopen(req, timeout=60))
    except urllib.error.HTTPError as e:
        return {"code": e.code, "msg": e.read().decode("utf-8", "ignore")[:300]}
def find_urls(o):
    out = []
    if isinstance(o, str):
        st = o.strip()
        if st.startswith("{") or st.startswith("["):
            try: return find_urls(json.loads(st))
            except Exception: pass
        if st.startswith("http") and (".mp4" in st or "video" in st.lower() or "result" in st.lower()): out.append(st)
    elif isinstance(o, dict):
        for v in o.values(): out += find_urls(v)
    elif isinstance(o, list):
        for v in o: out += find_urls(v)
    return out
def find_imgs(o):
    out = []
    if isinstance(o, str):
        st = o.strip()
        if st.startswith("{") or st.startswith("["):
            try: return find_imgs(json.loads(st))
            except Exception: pass
        if st.startswith("http") and any(e in st.lower() for e in (".png", ".jpg", ".jpeg", ".webp")): out.append(st)
    elif isinstance(o, dict):
        for v in o.values(): out += find_imgs(v)
    elif isinstance(o, list):
        for v in o: out += find_imgs(v)
    return out
def wait(tid, limit=600):
    end = time.time() + limit
    while time.time() < end:
        time.sleep(8)
        d = call(f"{API}/recordInfo?taskId={tid}").get("data") or {}
        if d.get("state") in ("success", "fail"): return d
    return {}
def make_image(n, src):
    r = call(API + "/createTask", {"model": "google/nano-banana-edit", "input": {"prompt": imgp[n], "image_urls": [src],
             "output_format": "jpeg", "image_size": "9:16"}})
    tid = (r.get("data") or {}).get("taskId") if isinstance(r.get("data"), dict) else None
    st = {"n": n, "taskId": tid}
    if not tid: st["msg"] = str(r.get("msg") or r)[:300]; return None, st
    d = wait(tid); st["state"] = d.get("state"); st["credits"] = d.get("creditsConsumed")
    if d.get("state") != "success": st["msg"] = str(d.get("failMsg") or "시간 초과")[:300]; return None, st
    u = (find_imgs(d) or [None])[0]
    if u:
        os.makedirs(f"kie_out/{TODAY}/{slug}", exist_ok=True)
        open(f"kie_out/{TODAY}/{slug}/{n}.jpg", "wb").write(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=120).read())
        st["file"] = f"video/{TODAY}/{slug}/{n}.jpg"
    return u, st
status["images"] = []
jobs = []
if a.task:
    nums = []
    jobs.append({"n": int(a.only or 1), "taskId": a.task, "state": "submitted"}); status["jobs"] = jobs
for n in nums:
    if n < 1 or n > len(photos): continue
    ph = photos[n - 1]
    pr = (prompts.get(n) or ("Slow push-in camera move. " + ph.get("cap", ""))) + GIMBAL + (TAIL_P if n in people else TAIL)
    src = ph["src"]
    if n in imgp:
        u, st = make_image(n, src); status["images"].append(st); save()
        if not u:
            jobs.append({"n": n, "state": "error", "msg": "이미지 만들기 실패"}); status["jobs"].append(jobs[-1]); save(); continue
        src = u
    body = {"model": "veo-3-1", "input": {"prompt": pr, "image_urls": [src], "aspect_ratio": "9:16",
            "resolution": a.res, "duration": a.dur, "generation_type": "FIRST_AND_LAST_FRAMES_2_VIDEO",
            "model": a.tier, "enable_translation": True}}
    r = call(API + "/createTask", body)
    tid = (r.get("data") or {}).get("taskId") if isinstance(r.get("data"), dict) else None
    j = {"n": n, "cap": ph.get("cap", ""), "taskId": tid, "state": "submitted" if tid else "error"}
    if not tid: j["msg"] = str(r.get("msg") or r)[:300]
    jobs.append(j); status["jobs"].append(j); save()
    time.sleep(1)
deadline = time.time() + 20 * 60
while time.time() < deadline and any(j["state"] not in ("success", "fail", "error") for j in jobs):
    time.sleep(15)
    for j in jobs:
        if j["state"] in ("success", "fail", "error"): continue
        r = call(f"{API}/recordInfo?taskId={j['taskId']}")
        d = r.get("data") or {}
        j["state"] = d.get("state", j["state"])
        if d.get("creditsConsumed") is not None: j["credits"] = d.get("creditsConsumed")
        if j["state"] == "fail": j["msg"] = str(d.get("failMsg") or "")[:300]
        if j["state"] == "success":
            urls = find_urls(d)
            j["raw_keys"] = list(d.keys())[:30]
            if urls:
                os.makedirs(f"kie_out/{TODAY}/{slug}", exist_ok=True)
                req = urllib.request.Request(urls[0], headers={"User-Agent": "Mozilla/5.0"})
                open(f"kie_out/{TODAY}/{slug}/{j['n']}.mp4", "wb").write(urllib.request.urlopen(req, timeout=120).read())
                j["file"] = f"video/{TODAY}/{slug}/{j['n']}.mp4"
            else:
                j["state"] = "fail"; j["msg"] = "결과 주소 없음"
    save()
status["credits_total"] = sum(j.get("credits") or 0 for j in jobs) + sum(i.get("credits") or 0 for i in status["images"])
save()
print(json.dumps(status, ensure_ascii=False, indent=1))
