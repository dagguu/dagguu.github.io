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
def body(prompt, src):
    if "woman" in prompt.lower(): prompt = prompt + OUTFIT  # 사람 없는 프롬프트(바다 채우기 등)엔 안 붙임
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
    if n not in imgp or n < 1 or n > len(photos): continue
    r = call(API + "/createTask", body(imgp[n], photos[n - 1]["src"]))
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
            u = (result_imgs(d) or [None])[0]; j["src_url_is_input"] = u in [p["src"] for p in photos]
            if u:
                os.makedirs(f"kie_img/{TODAY}/{slug}", exist_ok=True)
                tag = "pro" if "pro" in a.model else ("edit" if "edit" in a.model and "nano" in a.model else "sd")
                fn = f"kie_img/{TODAY}/{slug}/{j['n']}_{tag}.jpg"
                open(fn, "wb").write(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=120).read())
                j["file"] = fn.replace("kie_img/", "img/")
        save()
save(); print(json.dumps(status, ensure_ascii=False))
