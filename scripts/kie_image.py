# kie.ai 이미지만 만들기 (2026-10-26 시온님 "내 kie 에서 이미지 생성 가능하니까"). 영상은 만들지 않는다.
# 감성숙소 사진 + scripts/kie_prompts/<slug>.json 의 "img" 프롬프트 → 세로 9:16 이미지.
# 모델: google/nano-banana-edit(기본, 4크레딧, 2026-10-26 시온님) / nano-banana-pro(18크레딧, input.image_input·aspect_ratio·resolution) / bytedance/seedream-v4-edit(input.image_urls·image_size·image_resolution)
# 키: Secrets KIE_API_KEY (시온님이 직접). 결과 kie_img/<date>/<slug>/<n>_<model>.jpg (워크플로가 insta 브랜치 img/ 로) + scripts/kie_img_status.json
import json, os, sys, time, glob, datetime, urllib.request, urllib.error, argparse
KST = datetime.timezone(datetime.timedelta(hours=9))
TODAY = datetime.datetime.now(KST).strftime("%Y-%m-%d")
ap = argparse.ArgumentParser()
ap.add_argument("--slug", default="")
ap.add_argument("--only", default="")
ap.add_argument("--model", default="google/nano-banana-edit")
ap.add_argument("--res", default="2K")
ap.add_argument("--tasks", default="")  # "1:taskId,5:taskId" 이미 만든 결과 다시 받기(크레딧 안 씀)
a = ap.parse_args()
KEY = os.environ.get("KIE_API_KEY", "").strip()
API = "https://api.kie.ai/api/v1/jobs"
status = {"at": datetime.datetime.now(KST).strftime("%Y-%m-%d %H:%M"), "model": a.model, "res": a.res, "images": []}
def save(): json.dump(status, open("scripts/kie_img_status.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
if not KEY: status["error"] = "KIE_API_KEY 없음"; save(); sys.exit(0)
stays = {}
for f in glob.glob("scripts/stays/*.json"):
    d = json.load(open(f, encoding="utf-8")); stays[d["slug"]] = d
slug = a.slug or next((s for s, d in sorted(stays.items(), key=lambda x: x[1].get("date", ""))[::-1] if d.get("date", "") <= TODAY), "")
P = stays.get(slug)
if not P: status["error"] = "숙소 글 없음: " + slug; save(); sys.exit(0)
status["slug"] = slug
PL = json.load(open(f"scripts/kie_prompts/{slug}.json", encoding="utf-8"))
imgp = {x["n"]: x["img"] for x in PL if x.get("img")}
photos = P.get("photos", [])
srcs = {int(x["n"]): x["src"] for x in PL if x.get("src")}
LOOK0 = next((x.get("look") for x in PL if x.get("look")), "day")  # 숙소 기본 색감(첫 항목 등에 "look": day|moody|warm|pastel)
times = {int(x["n"]): x.get("time") or LOOK0 for x in PL}  # 2026-10-31 시온님: 하루 흐름(낮 → 노을 → 밤), 장면마다 "time": day|sunset|night  # 장면별 사진 주소(여기어때·마이리얼트립 숙소 사진 등)
nums = [int(x) for x in a.only.split(",") if x.strip()] if a.only else sorted(imgp)
def call(url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"},
                                 method="POST" if body is not None else "GET")
    try: return json.load(urllib.request.urlopen(req, timeout=60))
    except urllib.error.HTTPError as e: return {"code": e.code, "msg": e.read().decode("utf-8", "ignore")[:300]}
def find_imgs(o):
    out = []
    if isinstance(o, str):
        st = o.strip()
        if st[:1] in "{[":
            try: return find_imgs(json.loads(st))
            except Exception: pass
        if st.startswith("http") and any(e in st.lower() for e in (".png", ".jpg", ".jpeg", ".webp")): out.append(st)
    elif isinstance(o, dict):
        for v in o.values(): out += find_imgs(v)
    elif isinstance(o, list):
        for v in o: out += find_imgs(v)
    return out
def result_imgs(d):
    rj = d.get("resultJson")
    if isinstance(rj, str):
        try: rj = json.loads(rj)
        except Exception: rj = {}
    u = find_imgs((rj or {}).get("resultUrls") or rj or [])
    return u or find_imgs({k: v for k, v in d.items() if k not in ("param", "input")})
OUTFIT = " Outfit (always): the woman wears a long flowing white skirt (ankle-length) with a simple top suited to the season; keep this white long skirt clearly visible."  # 2026-10-26 시온님: 여자는 항상 흰색 긴 치마
TONE = " Color and light (autumn tone): clear sunny midday - a vivid deep-blue sky with a few small white clouds wherever sky is visible, bright direct sunlight, crisp clean colors, fresh saturated green trees with some orange autumn leaves, bright clean whites indoors with daylight through the windows; vivid but natural, not dark, hazy, golden-hour or gloomy, keep the real place unchanged."  # 2026-10-30 23:48 시온님 "맑은 날 한낮 파란 하늘" (예전 21:52 밝은 가을톤)
TONE_T = {  # 하루 흐름 장면용 (기본 day = TONE)
    "sunset": " Color and light (autumn tone): late-afternoon sunset - warm orange and pink sky glow over the hills, soft low golden sunlight, warm lights starting to glow inside, gentle steam over warm water; still bright and clear, not dark or murky, keep the real place unchanged.",
    "night": " Color and light (autumn tone): early night (blue hour) - deep navy sky with a few stars, warm yellow lights glowing from windows and lanterns, soft reflections on water, gentle steam; clean and clear, details still visible, not pitch-black or noisy, keep the real place unchanged.",
    # 2026-10-31 시온님 "숙소마다 특색이 있으니 색감은 알아서": 숙소 콘셉트별 색감
    "moody": " Color and light (autumn tone): keep the place's own dark, moody concept lighting - deep shadows, dark stone, wood and walls, warm amber indirect lights, lanterns and candles glowing, soft reflections on water and gentle steam; rich and cinematic, details still visible, do NOT brighten it into daylight, keep the real place unchanged.",
    "warm": " Color and light (autumn tone): cozy warm interior light - soft warm lamps and indirect lighting, honey-toned wood, gentle evening window light, calm and inviting, clean and clear, not dim or murky, keep the real place unchanged.",
    "pastel": " Color and light (autumn tone): soft bright airy daylight - creamy whites, gentle pastel colors (pale blue, pink, beige), diffused sunlight through sheer curtains, light and dreamy like a boutique hotel photo, not harsh, not dark, keep the real place unchanged."}
SIZE = " Make the image in a vertical 9:16 size (portrait, 9:16 aspect ratio, full-bleed, no borders or letterboxing)."  # 2026-10-29 시온님: 프롬프트에 "9:16 사이즈로" 꼭
def body(prompt, src, tm="day"):
    if "woman" in prompt.lower(): prompt = prompt + OUTFIT  # 사람 없는 프롬프트(바다 채우기 등)엔 안 붙임
    if "autumn tone" not in prompt: prompt = prompt + TONE_T.get(tm, TONE)
    if "9:16" not in prompt: prompt = prompt + SIZE
    if "nano-banana-edit" in a.model:
        return {"model": a.model, "input": {"prompt": prompt, "image_urls": [src], "output_format": "jpeg", "image_size": "9:16"}}
    if "seedream" in a.model:
        return {"model": a.model, "input": {"prompt": prompt, "image_urls": [src], "image_size": "portrait_16_9",
                "image_resolution": a.res, "max_images": 1}}
    return {"model": a.model, "input": {"prompt": prompt, "image_input": [src], "aspect_ratio": "9:16", "resolution": a.res}}
jobs = []
if a.tasks:
    for t in a.tasks.split(","):
        n, tid = t.split(":"); j = {"n": int(n), "taskId": tid.strip(), "state": "submitted"}; jobs.append(j); status["images"].append(j)
    nums = []
for n in nums:
    # 장면마다 kie_prompts 의 "src"(여기어때·마이리얼트립 숙소 페이지에서 고른 감성 사진 주소, 2026-10-30 시온님)가 있으면 그 사진, 없으면 감성숙소 json photos[n-1]
    if n not in imgp or n < 1 or (n > len(photos) and n not in srcs): continue
    r = call(API + "/createTask", body(imgp[n], srcs.get(n) or photos[n - 1]["src"], times.get(n, "day")))
    tid = (r.get("data") or {}).get("taskId") if isinstance(r.get("data"), dict) else None
    j = {"n": n, "taskId": tid, "state": "submitted" if tid else "error"}
    if not tid: j["msg"] = str(r.get("msg") or r)[:300]
    jobs.append(j); status["images"].append(j); save(); time.sleep(1)
end = time.time() + 15 * 60
while time.time() < end and any(j["state"] not in ("success", "fail", "error") for j in jobs):
    time.sleep(10)
    for j in jobs:
        if j["state"] in ("success", "fail", "error"): continue
        d = call(f"{API}/recordInfo?taskId={j['taskId']}").get("data") or {}
        j["state"] = d.get("state", j["state"])
        if j["state"] == "fail": j["msg"] = str(d.get("failMsg"))[:300]
        if j["state"] == "success":
            j["credits"] = d.get("creditsConsumed")
            u = (result_imgs(d) or [None])[0]; j["src_url_is_input"] = u in [p["src"] for p in photos] + list(srcs.values())
            if u:
                os.makedirs(f"kie_img/{TODAY}/{slug}", exist_ok=True)
                tag = "pro" if "pro" in a.model else ("edit" if "edit" in a.model and "nano" in a.model else "sd")
                fn = f"kie_img/{TODAY}/{slug}/{j['n']}_{tag}.jpg"
                open(fn, "wb").write(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=120).read())
                j["file"] = fn.replace("kie_img/", "img/")
        save()
save(); print(json.dumps(status, ensure_ascii=False))
