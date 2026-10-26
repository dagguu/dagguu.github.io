# 시온님 OpenAI(GPT) API 로 감성숙소 사진에 인물(한국 여성 뒷모습)을 넣은 세로 이미지 만들기 (2026-10-26 시온님 요청).
# 키: Secrets OPENAI_API_KEY (시온님이 직접 넣음, Claude 는 보지 않음).
# 프롬프트: scripts/kie_prompts/<slug>.json 항목의 "img" (사진 번호 n).
# 결과: gpt_out/<date>/<slug>/<n>.jpg (워크플로가 insta 브랜치 img/ 로 올림) + scripts/gpt_status.json(상태만, 키 없음)
# 영상은 만들지 않는다 — 시온님이 이미지를 보고 OK 한 것만 kie 영상으로 넘김.
import json, os, sys, io, base64, glob, datetime, argparse, urllib.request
import requests
from PIL import Image
KST = datetime.timezone(datetime.timedelta(hours=9))
TODAY = datetime.datetime.now(KST).strftime("%Y-%m-%d")
ap = argparse.ArgumentParser()
ap.add_argument("--slug", default=""); ap.add_argument("--only", default="1")
ap.add_argument("--model", default="gpt-image-1"); ap.add_argument("--quality", default="high")
ap.add_argument("--size", default="1024x1536")
a = ap.parse_args()
KEY = os.environ.get("OPENAI_API_KEY", "").strip()
st = {"at": datetime.datetime.now(KST).strftime("%Y-%m-%d %H:%M"), "model": a.model, "quality": a.quality, "size": a.size, "images": []}
def save(): json.dump(st, open("scripts/gpt_status.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
if not KEY:
    st["error"] = "OPENAI_API_KEY 없음 (저장소 Settings → Secrets → Actions 에 넣어 주세요)"; save(); sys.exit(0)
stays = {json.load(open(f, encoding="utf-8"))["slug"]: json.load(open(f, encoding="utf-8")) for f in glob.glob("scripts/stays/*.json")}
slug = a.slug or max((d for d in stays.values() if d.get("date", "") <= TODAY), key=lambda d: d["date"])["slug"]
P = stays[slug]; st["slug"] = slug; st["name"] = P["name"]
pf = f"scripts/kie_prompts/{slug}.json"
imgp = {x["n"]: x["img"] for x in (json.load(open(pf, encoding="utf-8")) if os.path.exists(pf) else []) if x.get("img")}
for n in [int(x) for x in a.only.split(",") if x.strip()]:
    j = {"n": n}
    if n not in imgp: j["error"] = "img 프롬프트 없음"; st["images"].append(j); continue
    src = P["photos"][n - 1]["src"]
    req = urllib.request.Request(src, headers={"User-Agent": "Mozilla/5.0", "Referer": "https://trip.coupang.com/"})
    im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert("RGB")
    buf = io.BytesIO(); im.save(buf, "PNG"); buf.seek(0)
    r = requests.post("https://api.openai.com/v1/images/edits", headers={"Authorization": "Bearer " + KEY},
                      files={"image[]": ("photo.png", buf, "image/png")},
                      data={"model": a.model, "prompt": imgp[n], "size": a.size, "quality": a.quality, "n": "1"}, timeout=300)
    try: d = r.json()
    except Exception: d = {"error": {"message": r.text[:300]}}
    if r.status_code != 200 or not d.get("data"):
        j["error"] = str((d.get("error") or {}).get("message") or d)[:300]; j["status"] = r.status_code
    else:
        out = Image.open(io.BytesIO(base64.b64decode(d["data"][0]["b64_json"]))).convert("RGB")
        os.makedirs(f"gpt_out/{TODAY}/{slug}", exist_ok=True)
        out.save(f"gpt_out/{TODAY}/{slug}/{n}.jpg", quality=92)
        j["file"] = f"img/{TODAY}/{slug}/{n}.jpg"; j["wh"] = out.size
        if d.get("usage"): j["usage"] = d["usage"]
    st["images"].append(j); save()
save(); print(json.dumps(st, ensure_ascii=False, indent=1))
