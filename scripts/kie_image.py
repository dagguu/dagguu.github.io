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
HUMAN = " Person rules (always): she stands, small in the frame and well away from the camera, seen from behind; both hands are hidden or relaxed at her sides, no close-up of hands, fingers, feet or legs. She does not sit on chairs and never touches or rests on furniture, tables, fire pits, grills or hot objects. Natural human proportions."  # 2026-11-03 시온님: 손 모양 이상·화로에 다리 올림 = 누가 봐도 AI
OUTFIT = " Outfit (always): the woman wears a long flowing white skirt (ankle-length) with a warm winter top or coat (the coat stays short enough to show the skirt); keep this white long skirt clearly visible."  # 2026-10-26 시온님: 여자는 항상 흰색 긴 치마
WINTER = " Winter scene: fresh natural white snow lies on the ground, roofs, trees and mountains wherever the outdoors is visible, including through windows; bare or snow-covered trees, no green leaves and no autumn leaves. Buildings, rooms and furniture stay exactly the same; no snow indoors. Pools and hot baths stay liquid and steaming, never frozen or covered with snow. The snow looks real and even, like a real winter photo."  # 2026-11-03 시온님 "내일부터 겨울이니까 눈 내린 겨울 느낌으로"
TONE = " Color and light (winter tone): clear bright winter day - a vivid deep-blue sky with a few small white clouds wherever sky is visible, bright direct sunlight, crisp clean colors, bright clean whites indoors with daylight through the windows; not dark, hazy, golden-hour or gloomy, keep the real place unchanged." + WINTER
TONE_T = {  # 하루 흐름 장면용 (기본 day = TONE)
    "sunset": " Color and light (winter tone): late-afternoon sunset - warm orange and pink sky glow over the snowy hills, soft low sunlight, warm lights starting to glow inside, gentle steam over warm water; still bright and clear, not dark or murky, keep the real place unchanged." + WINTER,
    "night": " Color and light (winter tone): early night (blue hour) - deep navy sky with a few stars, warm yellow lights glowing from windows and lanterns, soft reflections on water, gentle steam; clean and clear, details still visible, not pitch-black or noisy, keep the real place unchanged." + WINTER,
    # 2026-10-31 시온님 "숙소마다 특색이 있으니 색감은 알아서": 숙소 콘셉트별 색감
    "moody": " Color and light (winter tone): keep the place's own dark, moody concept lighting - deep shadows, dark stone, wood and walls, warm amber indirect lights, lanterns and candles glowing, soft reflections on water and gentle steam; rich and cinematic, details still visible, do NOT brighten it into daylight, keep the real place unchanged." + WINTER,
    "warm": " Color and light (winter tone): cozy warm interior light - soft warm lamps and indirect lighting, honey-toned wood, gentle evening window light, calm and inviting, clean and clear, not dim or murky, keep the real place unchanged." + WINTER,
    "pastel": " Color and light (winter tone): soft bright airy daylight - creamy whites, gentle pastel colors (pale blue, pink, beige), diffused sunlight through sheer curtains, light and dreamy like a boutique hotel photo, not harsh, not dark, keep the real place unchanged." + WINTER}
SIZE = " Make the image in a vertical 9:16 size (portrait, 9:16 aspect ratio, full-bleed, no borders or letterboxing)."  # 2026-10-29 시온님: 프롬프트에 "9:16 사이즈로" 꼭
OUTF = {int(x["n"]): x["outfit"] for x in PL if x.get("outfit")}  # 2026-11-01 시온님: 장면별 옷("outfit")이 있으면 흰 긴 치마 대신 그 옷(예: 니지모리 기모노)
# 2026-11-02 시온님: 애견 가능 숙소는 우리집 강아지(크림색 포메라니안), 키즈풀빌라는 아이 뒷모습, 가끔 아빠 한 장면.
# kie_prompts 항목 "who": "dog" | "kid" | "dad" (여러 명이면 "kid,dad") → 아래 문장이 붙고, dog 는 참고 사진(REF)을 두 번째 이미지로 같이 보낸다.
REF = {"dog": "https://raw.githubusercontent.com/dagguu/dagguu.github.io/insta/img/src/ref/dog.jpg"}
WHO = {"dog": " Add one small fluffy cream-and-light-orange Pomeranian dog that looks exactly like the dog in the second reference image (same fur color, round fluffy face, small pointed ears, plumed tail); the dog sits or trots naturally in the scene at a realistic small size. Use the second image only for the dog; keep the place from the first image unchanged.",
       "kid": " Add one Korean child about 4 years old with short black hair, seen fully from behind (back of the head only), face completely hidden, never facing the camera, wearing simple casual kids clothes suited to the season.",
       "dad": " Add one Korean man in his 30s with short black hair, seen from behind or from the side, face not visible and never facing the camera, wearing a plain white or light shirt and casual pants."}
WHOS = {int(x["n"]): [w.strip() for w in str(x["who"]).split(",") if w.strip() in WHO] for x in PL if x.get("who")}
def body(prompt, src, tm="day", n=0):
    if "woman" in prompt.lower(): prompt = prompt + HUMAN + ((" Outfit: " + OUTF[n]) if n in OUTF else OUTFIT)  # 사람 없는 프롬프트(바다 채우기 등)엔 안 붙임
    refs = []
    for w in WHOS.get(n, []):
        prompt += WHO[w]
        if w in REF: refs.append(REF[w])
    if "winter tone" not in prompt: prompt = prompt + TONE_T.get(tm, TONE)
    if "9:16" not in prompt: prompt = prompt + SIZE
    if "nano-banana-edit" in a.model:
        return {"model": a.model, "input": {"prompt": prompt, "image_urls": [src] + refs, "output_format": "jpeg", "image_size": "9:16"}}
    if "seedream" in a.model:
        return {"model": a.model, "input": {"prompt": prompt, "image_urls": [src] + refs, "image_size": "portrait_16_9",
                "image_resolution": a.res, "max_images": 1}}
    return {"model": a.model, "input": {"prompt": prompt, "image_input": [src] + refs, "aspect_ratio": "9:16", "resolution": a.res}}
jobs = []
if a.tasks:
    for t in a.tasks.split(","):
        n, tid = t.split(":"); j = {"n": int(n), "taskId": tid.strip(), "state": "submitted"}; jobs.append(j); status["images"].append(j)
    nums = []
for n in nums:
    # 장면마다 kie_prompts 의 "src"(여기어때·마이리얼트립 숙소 페이지에서 고른 감성 사진 주소, 2026-10-30 시온님)가 있으면 그 사진, 없으면 감성숙소 json photos[n-1]
    if n not in imgp or n < 1 or (n > len(photos) and n not in srcs): continue
    r = call(API + "/createTask", body(imgp[n], srcs.get(n) or photos[n - 1]["src"], times.get(n, "day"), n))
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
