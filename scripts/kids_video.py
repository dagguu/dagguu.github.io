"""다꾸키즈 상품 숏폼 영상 (2026-11-12 시온님 "오늘 영상 만들어보자" → 상품 사진으로 만들기).

쇼핑몰 공개 상품 API 로 상품을 고르고(검색 많은 브랜드·겨울 아우터·신상 우선, 또는 NOS 로 직접),
상품 상세 설명 사진(모델 착용컷) 4장에 천천히 다가가는 움직임 + 글자(브랜드·상품명·가격·dagguukids.com)를 얹어
1080x1920 세로 14초 mp4 를 만든다. 소리 없음(음악은 편집 앱에서). AI 로 사진을 바꾸지 않는다.
결과: kids/v/<상품번호>.mp4 · .jpg(표지) · kids/v/list.json
"""
import json, os, re, subprocess, sys, tempfile
from io import BytesIO
import requests
from PIL import Image, ImageDraw, ImageFilter, ImageFont

CID = "JzTmuiBPItGvZ6KG8g3aPC"
API = "https://dagguu.cafe24api.com/api/v2"
SHOP = "https://dagguukids.com"
OUT = "kids/v"
W, H = 1080, 1920
SEG = 3.5  # 사진 한 장 초
FPS = 30
BRANDS = ["아오스타", "제니베이직", "데일리베베", "피피"]
OUTER = ["점퍼", "패딩", "자켓", "재킷", "코트", "후리스", "플리스", "집업", "무스탕", "아노락", "가디건", "조끼", "베스트"]
UA = {"User-Agent": "Mozilla/5.0 dagguukids-video"}


def font(size, weight="ExtraBold"):
    for p in [os.path.expanduser(f"~/.local/share/fonts/Pretendard-{weight}.otf"),
              os.path.expanduser("~/.local/share/fonts/NotoSansKR.otf"),
              "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def products():
    out, off = [], 0
    while off < 1000:
        r = requests.get(f"{API}/products", params={"display": "T", "selling": "T", "limit": 100, "offset": off,
                         "fields": "product_no,product_name,price,detail_image,list_image,sold_out,created_date"},
                         headers={"X-Cafe24-Client-Id": CID}, timeout=30)
        ps = r.json().get("products", [])
        out += ps
        if len(ps) < 100:
            break
        off += 100
    return [p for p in out if p.get("sold_out") != "T"]


def desc_images(no):
    h = requests.get(f"{SHOP}/product/detail.html?product_no={no}", headers=UA, timeout=30).text
    i = h.find('id="prdDetail"')
    h = h[i:] if i >= 0 else h
    urls = re.findall(r'ec-data-src="(https://ecimg\.cafe24img\.com/[^"]+/web/upload/NNEditor/[^"]+)"', h)
    seen = []
    for u in urls:
        if u not in seen:
            seen.append(u)
    return seen


def load(url):
    r = requests.get(url, headers=UA, timeout=30)
    r.raise_for_status()
    return Image.open(BytesIO(r.content)).convert("RGB")


def pick_images(p):
    ims = []
    for u in desc_images(p["product_no"])[:10]:
        try:
            im = load(u)
        except Exception:
            continue
        w, h = im.size
        if w < 500 or w / h > 1.25:  # 작거나 가로로 긴 것(사이즈표·글씨)은 뺌
            continue
        ims.append(im)
        if len(ims) >= 4:
            break
    if len(ims) < 3 and p.get("detail_image"):
        try:
            ims.insert(0, load(p["detail_image"]))
        except Exception:
            pass
    return ims[:4]


def still(im, scale=1.12):
    """흐린 배경 + 가운데 사진 (움직일 여유 12%)."""
    SW, SH = int(W * scale), int(H * scale)
    bg = im.copy()
    r = max(SW / bg.width, SH / bg.height)
    bg = bg.resize((int(bg.width * r) + 1, int(bg.height * r) + 1)).crop((0, 0, SW, SH)).filter(ImageFilter.GaussianBlur(40))
    bg = Image.eval(bg, lambda v: int(v * 0.82))
    r2 = min(SW * 0.94 / im.width, SH * 0.68 / im.height)
    fg = im.resize((int(im.width * r2), int(im.height * r2)), Image.LANCZOS)
    bg.paste(fg, ((SW - fg.width) // 2, int(SH * 0.075)))
    return bg


def text_layer(brand, name, price, hook):
    L = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(L)
    # 위: 꼬리표
    f1 = font(34, "Bold")
    tag = "다꾸키즈 PICK"
    tw = d.textlength(tag, font=f1)
    d.rounded_rectangle((48, 70, 48 + tw + 44, 70 + 62), radius=31, fill=(106, 63, 200, 235))
    d.text((70, 80), tag, font=f1, fill="white")
    # 아래 그늘
    grad = Image.new("L", (1, 620))
    for y in range(620):
        grad.putpixel((0, y), int(250 * min(1, (y / 380)) ** 1.2))
    sh = Image.new("RGBA", (W, 620), (0, 0, 0, 255))
    sh.putalpha(grad.resize((W, 620)))
    L.alpha_composite(sh, (0, H - 620))
    y = H - 430
    if hook:
        fh = font(46, "Bold")
        d.text((60, y - 80), hook, font=fh, fill=(255, 226, 92))
    d.text((60, y), brand, font=font(40, "SemiBold"), fill=(220, 220, 220))
    fn = font(66)
    line = name
    while d.textlength(line, font=fn) > W - 120 and len(line) > 4:
        line = line[:-1]
    if line != name:
        line = line[:-1] + "…"
    d.text((60, y + 58), line, font=fn, fill="white")
    d.text((60, y + 150), f"{price:,}원", font=font(60), fill="white")
    d.text((60, y + 240), "남대문 아동복 · dagguukids.com", font=font(34, "SemiBold"), fill=(200, 200, 200))
    return L


def cover(im):
    """사진 그대로(효과 없음) 9:16 꽉 채우기 — 넘치는 쪽만 잘라냄(세로는 위쪽 기준)."""
    r = max(W / im.width, H / im.height)
    im = im.resize((int(im.width * r + 0.5), int(im.height * r + 0.5)), Image.LANCZOS)
    x = (im.width - W) // 2
    y = int((im.height - H) * 0.25)
    return im.crop((x, y, x + W, y + H))


HOLD = 3.0   # 사진 한 장 보여 주는 시간
SLIDE = 0.45  # 왼쪽으로 넘어가는 시간


def make(p, hook=None):
    """2026-11-12 시온님: 확대·축소 없이 사진 그대로, 사진만 왼쪽으로 넘어가게. 글자 없음(깔끔하게, 상품 정보는 쇼핑몰 화면이 보여 줌)."""
    no = p["product_no"]
    full = p["product_name"].strip()
    brand = full.split(" ")[0]
    price = int(float(p["price"]))
    ims = pick_images(p)
    if len(ims) < 3:
        print("사진 부족", no, full, len(ims))
        return None
    tmp = tempfile.mkdtemp()
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for i, im in enumerate(ims):
        c = cover(im)
        c.save(f"{tmp}/s{i}.jpg", quality=92)
        if i == 0:
            c.save(f"{OUT}/{no}.jpg", quality=86)
        cmd += ["-loop", "1", "-framerate", str(FPS), "-t", str(HOLD + SLIDE), "-i", f"{tmp}/s{i}.jpg"]
    fc, last = [], "[0:v]"
    for i in range(len(ims)):
        fc.append(f"[{i}:v]fps={FPS},format=yuv420p,setsar=1[v{i}]")
    last = "[v0]"
    for i in range(1, len(ims)):
        off = round(i * HOLD - (i - 1) * 0 , 3)
        off = round(i * HOLD, 3)
        fc.append(f"{last}[v{i}]xfade=transition=slideleft:duration={SLIDE}:offset={off}[x{i}]")
        last = f"[x{i}]"
    cmd += ["-filter_complex", ";".join(fc), "-map", last, "-c:v", "libx264", "-preset", "medium", "-crf", "26",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", f"{OUT}/{no}.mp4"]
    subprocess.run(cmd, check=True)
    return {"no": no, "name": full, "brand": brand, "price": price, "img": p.get("list_image"),
            "video": f"https://www.dagguu.com/{OUT}/{no}.mp4", "poster": f"https://www.dagguu.com/{OUT}/{no}.jpg",
            "url": f"{SHOP}/product/detail.html?product_no={no}"}


def choose(ps, k):
    def score(p):
        n = p["product_name"]
        b = n.split(" ")[0]
        s = 0
        if b in BRANDS:
            s += 10 - BRANDS.index(b) * 2
        if any(w in n for w in OUTER):
            s += 6
        return (s, p.get("created_date") or "", p["product_no"])
    out, used_b = [], {}
    for p in sorted(ps, key=score, reverse=True):
        b = p["product_name"].split(" ")[0]
        if used_b.get(b, 0) >= 2:
            continue
        out.append(p)
        used_b[b] = used_b.get(b, 0) + 1
        if len(out) >= k * 2:
            break
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    k = int(os.environ.get("COUNT", "5") or 5)
    nos = [int(x) for x in re.findall(r"[0-9]+", os.environ.get("NOS", ""))]
    ps = products()
    print("상품", len(ps))
    cand = [p for p in ps if p["product_no"] in nos] if nos else choose(ps, k)
    lst_path = f"{OUT}/list.json"
    lst = json.load(open(lst_path)) if os.path.exists(lst_path) else []
    done = []
    for p in cand:
        if len(done) >= (len(nos) if nos else k):
            break
        try:
            hook = "이번 주 신상 아우터" if any(w in p["product_name"] for w in OUTER) else "오늘의 신상"
            r = make(p, hook)
        except Exception as e:
            print("실패", p["product_no"], e)
            r = None
        if r:
            done.append(r)
            lst = [x for x in lst if x["no"] != r["no"]]
            lst.insert(0, r)
            print("만듦", r["no"], r["name"])
    json.dump(lst[:30], open(lst_path, "w"), ensure_ascii=False, indent=1)
    print("완료", len(done))
    if not done:
        sys.exit(1)


if __name__ == "__main__":
    main()
