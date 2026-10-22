"""스레드 글 사진: scripts/threads_img.json [{id, src, y0, y1}] → images/threads/<id>.jpg
쿠팡 상품 상세페이지 이미지(소개한 그 상품)의 일부(세로 y0~y1 픽셀)만 잘라 쓴다. 이미 만든 건 건너뜀.
만든 뒤 threads_queue.json 의 같은 id 에 img(raw 주소)를 넣는다."""
import json, os, io, urllib.request
from PIL import Image
R = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(R)
jobs = json.load(open(os.path.join(R, "threads_img.json"), encoding="utf-8"))
qp = os.path.join(R, "threads_queue.json"); q = json.load(open(qp, encoding="utf-8"))
RAW = "https://raw.githubusercontent.com/dagguu/dagguu.github.io/main/images/threads/{}.jpg"
os.makedirs(os.path.join(ROOT, "images", "threads"), exist_ok=True)
for j in jobs:
    out = os.path.join(ROOT, "images", "threads", j["id"] + ".jpg")
    if not os.path.exists(out):
        req = urllib.request.Request(j["src"], headers={"User-Agent": "Mozilla/5.0", "Referer": "https://www.coupang.com/"})
        im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=60).read())).convert("RGB")
        im = im.crop((0, int(j["y0"]), im.width, min(im.height, int(j["y1"]))))
        if im.width < 1080:
            r = 1080 / im.width; im = im.resize((1080, round(im.height * r)), Image.LANCZOS)
        im.save(out, "JPEG", quality=90); print("made", out, im.size)
    for x in q:
        if x["id"] == j.get("post", j["id"]): x["img"] = RAW.format(j["id"])
json.dump(q, open(qp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
