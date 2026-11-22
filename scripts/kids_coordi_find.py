"""다꾸키즈 브랜드 상품끼리 같은 코디 사진(상세 사진)을 함께 쓴 쌍 찾기.
2026-11-22 시온님 "보니토 상품에 코디 같이한 상품 태그 + 추가상품": 도매처가 같은 플랫레이·착용 사진을 여러 상품 상세에 나눠 올려서,
사진이 거의 같은(dHash 거리 ≤ 5) 상품끼리 같이 코디한 상품으로 본다. 결과 scripts/kids_coordi_pairs.json (Claude 가 확인 후 태그·추가상품에 씀).
사용: python scripts/kids_coordi_find.py 보니토
"""
import io, json, os, re, sys, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

API = "https://dagguu.cafe24api.com/api/v2/products"
CID = "JzTmuiBPItGvZ6KG8g3aPC"
SHOP = "https://dagguukids.com"
UA = {"User-Agent": "Mozilla/5.0"}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def get(url, h=None, t=40):
    return urllib.request.urlopen(urllib.request.Request(url, headers=h or UA), timeout=t).read()


def products(brand):
    out = []
    for off in range(0, 1000, 100):
        q = f"{API}?limit=100&offset={off}&display=T&selling=T&product_name={urllib.parse.quote(brand)}&fields=product_no,product_name,detail_image"
        got = json.loads(get(q, {"X-Cafe24-Client-Id": CID}))["products"]
        out += [p for p in got if p["product_name"].startswith(brand)]
        if len(got) < 100:
            break
    return out


def imgs(no):
    h = get(f"{SHOP}/product/detail.html?product_no={no}").decode("utf-8", "ignore")
    i = h.find('id="prdDetail"')
    h = h[i:] if i >= 0 else h
    urls = []
    for u in re.findall(r'ec-data-src="(https://ecimg\.cafe24img\.com/[^"]+/web/upload/NNEditor/[^"]+)"', h):
        if u not in urls:
            urls.append(u)
    return urls[:24]


def dhash(u):
    try:
        im = Image.open(io.BytesIO(get(u))).convert("L")
        w, h = im.size
        if w / h > 1.3 or w < 300:  # 가로로 긴 사이즈표·작은 그림 뺌
            return None
        im = im.resize((17, 16))
        px = list(im.getdata())
        v = 0
        for r in range(16):
            for c in range(16):
                v = v << 1 | (px[r * 17 + c] > px[r * 17 + c + 1])
        return v
    except Exception:
        return None


def main():
    brand = sys.argv[1] if len(sys.argv) > 1 else "보니토"
    ps = products(brand)
    print(len(ps), "상품")
    with ThreadPoolExecutor(8) as ex:
        lists = list(ex.map(lambda p: imgs(p["product_no"]), ps))
    jobs = [(p["product_no"], u) for p, L in zip(ps, lists) for u in L] + [(p["product_no"], p["detail_image"]) for p in ps if p.get("detail_image")]
    with ThreadPoolExecutor(12) as ex:
        hs = list(ex.map(lambda j: dhash(j[1]), jobs))
    H = [(n, u, h) for (n, u), h in zip(jobs, hs) if h is not None]
    print(len(H), "사진")
    pairs = {}
    for i in range(len(H)):
        for j in range(i + 1, len(H)):
            a, b = H[i], H[j]
            if a[0] == b[0]:
                continue
            if bin(a[2] ^ b[2]).count("1") <= 12:  # 256비트 중 12 이하 = 같은 사진
                k = f"{min(a[0], b[0])}-{max(a[0], b[0])}"
                pa, pb = (a, b) if a[0] < b[0] else (b, a)
                pairs.setdefault(k, []).append([pa[1].split("/")[-1], pb[1].split("/")[-1]])
    names = {p["product_no"]: p["product_name"] for p in ps}
    json.dump({"brand": brand, "names": names, "pairs": pairs}, open(os.path.join(ROOT, "scripts", "kids_coordi_pairs.json"), "w"), ensure_ascii=False, indent=1)
    print(len(pairs), "쌍")


if __name__ == "__main__":
    main()
