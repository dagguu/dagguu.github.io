"""다꾸키즈 같은 브랜드 상품끼리 같은 코디 사진(상세 사진)을 함께 쓴 쌍 찾기 → 코디 태그·추가구성상품.
2026-11-22 시온님 "보니토 상품에 코디 같이한 상품 태그 + 추가상품" → "다른 브랜드도 다 해주고 업로드 할 때 다 해줘".
도매처가 같은 플랫레이·착용 사진을 여러 상품 상세에 나눠 올려서, 사진이 거의 같은(256비트 dHash 거리 ≤ 12) 상품끼리 같이 코디한 상품으로 본다.
결과:
  scripts/kids_coordi_add.json  {상품번호: [같이 코디한 상품번호 ≤4]} → 쇼핑몰 sync.py coordi_apply 가 카페24 추가구성상품으로 넣음
  kids/coordi_tags.json         자동 태그(같이 쓴 사진 위, 위치는 종류별 대략) — 손으로 넣은 태그(scripts/kids_coordi_auto.json 에 없는 상품)는 건드리지 않음
  scripts/kids_coordi_pairs.json 쌍과 겹친 사진 수(확인용)
사진 지문은 actions/cache(.coordi_cache/hash.json)에 남겨 새 상품만 계산.
사용: python scripts/kids_coordi_find.py [브랜드 | all]
"""
import io, json, os, re, sys, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

API = "https://dagguu.cafe24api.com/api/v2/products"
CID = "JzTmuiBPItGvZ6KG8g3aPC"
SHOP = "https://dagguukids.com"
UA = {"User-Agent": "Mozilla/5.0"}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, ".coordi_cache", "hash2.json")  # 2 = 사진 받기 실패한 상품은 저장 안 함(2026-11-22)
P = lambda *a: os.path.join(ROOT, *a)


def get(url, h=None, t=40):
    import time, urllib.error
    for k in range(6):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=h or UA), timeout=t).read()
        except (TimeoutError, ConnectionError, urllib.error.URLError) as e:
            if isinstance(e, urllib.error.HTTPError) and e.code not in (429, 500, 502, 503):
                raise
            if k == 5:
                raise
            time.sleep(2 + 3 * k)
            continue
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503) or k == 5:
                raise
            time.sleep(2 + 3 * k)


def products(brand):
    out = []
    for off in range(0, 10000, 100):
        q = f"{API}?limit=100&offset={off}&display=T&selling=T&fields=product_no,product_name,detail_image"
        if brand != "all":
            q += f"&product_name={urllib.parse.quote(brand)}"
        got = json.loads(get(q, {"X-Cafe24-Client-Id": CID}))["products"]
        out += got
        if len(got) < 100:
            break
        __import__("time").sleep(0.8)  # 공개 API 는 짧게 여러 번 부르면 429
    return out


def bkey(name):
    b = (name or "").split()[0] if (name or "").split() else ""
    b = re.sub(r"\(.*?\)", "", b)
    b = re.sub(r"(?i)con$", "", b) or b
    return b.lower()


def imgs(no):
    try:
        h = get(f"{SHOP}/product/detail.html?product_no={no}").decode("utf-8", "ignore")
    except Exception:
        return None
    i = h.find('id="prdDetail"')
    h = h[i:] if i >= 0 else h
    urls = []
    for u in re.findall(r'ec-data-src="(https://ecimg\.cafe24img\.com/[^"]+/web/upload/NNEditor/[^"]+)"', h):
        if u not in urls:
            urls.append(u)
    return urls[:24]


def mainimgs(no):
    """대표·추가 사진(카페24 product/big·extra/big) 주소 — 2026-11-22 시온님 "대표이미지에는 태그 안 되어 있어"."""
    try:
        h = get(f"{SHOP}/product/detail.html?product_no={no}").decode("utf-8", "ignore")
    except Exception:
        return None
    urls = []
    for u in re.findall(r'((?:https:)?//[^"\'\s]+/web/product/(?:big|extra/big)/[^"\'\s?]+\.(?:jpe?g|png|gif|webp))', h):
        u = ("https:" + u) if u.startswith("//") else u
        if u not in urls:
            urls.append(u)
    return urls[:12]


def dhash(u, main=False):
    try:
        im = Image.open(io.BytesIO(get(u))).convert("L")
        w, h = im.size
        if not main and (w / h > 1.3 or w < 300):  # 가로로 긴 사이즈표·작은 그림 뺌
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


def ty(n):
    if re.search("비니|모자|캡|헤어|양말|삭스|타이즈|장갑|머플러|목도리|바라클라바|가방|신발|부츠|운동화", n) and not re.search("부츠컷", n):
        return "acc"
    if re.search("세트|슈트|수트|우주복|바디슈트|롬퍼|원피스|점프", n):
        return "set"
    if re.search("팬츠|레깅스|부츠컷|데님|바지|스커트|치마|조거|쇼츠", n):
        return "bot"
    return "top"


POS = {"acc": (28, 14), "top": (42, 32), "bot": (62, 74), "set": (50, 50)}


def main():
    brand = sys.argv[1] if len(sys.argv) > 1 else "all"
    ps = products(brand)
    ps = [p for p in ps if p.get("product_name")]
    print(len(ps), "상품")
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    todo = [p for p in ps if str(p["product_no"]) not in cache]
    print("새로 볼 상품", len(todo))
    with ThreadPoolExecutor(6) as ex:
        lists = list(ex.map(lambda p: imgs(p["product_no"]), todo))
    jobs = [(p["product_no"], u) for p, L in zip(todo, lists) if L is not None for u in L]
    with ThreadPoolExecutor(10) as ex:
        hs = list(ex.map(lambda j: dhash(j[1]), jobs))
    got = {}
    for (n, u), h in zip(jobs, hs):
        if h is not None:
            got.setdefault(str(n), []).append([u.split("/")[-1], format(h, "064x")])
    for p, L in zip(todo, lists):
        k = str(p["product_no"])
        # 사진을 하나도 못 받았으면(429·끊김) 저장하지 않고 다음에 다시 봄
        if L is not None and (got.get(k) or not L):
            cache[k] = got.get(k, [])
    live = {str(p["product_no"]) for p in ps}
    if brand == "all":
        cache = {k: v for k, v in cache.items() if k in live}
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    json.dump(cache, open(CACHE, "w"))
    # 대표·추가 사진 지문(따로 저장, 새 상품만)
    MC = os.path.join(ROOT, ".coordi_cache", "main2.json")
    mcache = json.load(open(MC)) if os.path.exists(MC) else {}
    mtodo = [p for p in ps if str(p["product_no"]) not in mcache]
    print("대표 사진 볼 상품", len(mtodo))
    with ThreadPoolExecutor(6) as ex:
        mlists = list(ex.map(lambda p: mainimgs(p["product_no"]), mtodo))
    mjobs = [(p["product_no"], u) for p, L in zip(mtodo, mlists) if L is not None for u in L]
    with ThreadPoolExecutor(10) as ex:
        mhs = list(ex.map(lambda j: dhash(j[1], True), mjobs))
    mgot = {}
    for (n, u), h in zip(mjobs, mhs):
        if h is not None:
            mgot.setdefault(str(n), []).append([u.split("/")[-1], format(h, "064x")])
    for p, L in zip(mtodo, mlists):
        k = str(p["product_no"])
        if L is not None and (mgot.get(k) or not L):
            mcache[k] = mgot.get(k, [])
    if brand == "all":
        mcache = {k: v for k, v in mcache.items() if k in live}
    json.dump(mcache, open(MC, "w"))

    names = {str(p["product_no"]): p["product_name"].strip() for p in ps}
    groups = {}
    for p in ps:
        groups.setdefault(bkey(p["product_name"]), []).append(str(p["product_no"]))
    pairs = {}
    for b, nos in groups.items():
        if len(nos) < 2:
            continue
        H = [(n, f, int(h, 16)) for n in nos for f, h in cache.get(n, [])]
        # 브랜드 공통 안내·배너 사진은 여러 상품에 똑같이 들어가서 모든 상품이 짝이 됨(2026-11-22 첫 전체 실행에서 48개가 서로 짝)
        # → 같은 사진이 6개 넘는 상품에 있으면 코디 사진이 아니라고 보고 뺀다
        near = [set() for _ in H]
        for i in range(len(H)):
            for j in range(i + 1, len(H)):
                if (H[i][2] ^ H[j][2]).bit_count() <= 12:
                    near[i].add(H[j][0]); near[j].add(H[i][0])
        # 2026-11-22 고침: "6개 넘으면" 은 보니토처럼 같은 플랫레이를 7~10개 상품에 나눠 쓰는 브랜드까지 빼 버림
        # → 12개 넘거나, 5개 이상이면서 브랜드 상품의 80% 이상에 들어간 사진만 공통 사진으로 봄
        gen = set()
        for i in range(len(H)):
            c = len(near[i] | {H[i][0]})
            if c > 12 or (c >= 5 and c >= 0.8 * len(nos)):
                gen.add(i)
        for i in range(len(H)):
            a = H[i]
            if i in gen:
                continue
            for j in range(i + 1, len(H)):
                c = H[j]
                if j in gen or a[0] == c[0] or (a[2] ^ c[2]).bit_count() > 12:
                    continue
                pa, pb = (a, c) if int(a[0]) < int(c[0]) else (c, a)
                pairs.setdefault(f"{pa[0]}-{pb[0]}", []).append([pa[1], pb[1]])
    norm = lambda s: re.sub(r"\s", "", s)
    add, tags = {}, {}
    for k, v in pairs.items():
        a, b = k.split("-")
        if norm(names[a]) == norm(names[b]) or ty(names[a]) == ty(names[b]) == "set":
            continue
        for x, y, i in ((a, b, 0), (b, a, 1)):
            add.setdefault(x, []).append((len(v), int(y)))
            for pr in v[:3]:
                tags.setdefault(x, {}).setdefault(pr[i], []).append(y)
    A = {x: [n for c, n in sorted(l, reverse=True)][:4] for x, l in add.items()}
    T = {}
    for x, fs in tags.items():
        out = []
        for f, ys in list(fs.items())[:6]:
            t, seen = [], set()
            for y in ys:
                if y in seen or int(y) not in A[x]:
                    continue
                seen.add(y)
                px, py = POS[ty(names[y])]
                t.append({"x": px, "y": py + 8 * len(t), "no": int(y)})
            if t:
                out.append({"f": f, "t": t})
        if out:
            T[x] = out
    # 대표·추가 사진이 태그 단 상세 사진과 같으면 같은 태그를 대표 사진에도
    for x, out in T.items():
        dh = {f: int(h, 16) for f, h in cache.get(x, [])}
        extra = []
        for mf, mh in mcache.get(x, []):
            mh = int(mh, 16)
            for it in out:
                if it["f"] in dh and (dh[it["f"]] ^ mh).bit_count() <= 12:
                    extra.append({"f": mf, "t": it["t"]})
                    break
        out.extend(extra)
    # 손으로 넣은 태그는 두고, 자동 태그만 새로
    auto = set(json.load(open(P("scripts", "kids_coordi_auto.json")))) if os.path.exists(P("scripts", "kids_coordi_auto.json")) else set()
    ct = json.load(open(P("kids", "coordi_tags.json")))
    manual = {k for k in ct if k not in auto}
    if brand == "all":
        for k in list(ct):
            if k in auto and k not in T:
                del ct[k]
        newauto = set()
    else:
        newauto = set(auto)
    for k, v in T.items():
        if k in manual:
            continue
        ct[k] = v
        newauto.add(k)
    open(P("kids", "coordi_tags.json"), "w").write(json.dumps(ct, ensure_ascii=False, separators=(",", ":")))
    json.dump(sorted(newauto, key=int), open(P("scripts", "kids_coordi_auto.json"), "w"))
    if brand != "all" and os.path.exists(P("scripts", "kids_coordi_add.json")):
        old = json.load(open(P("scripts", "kids_coordi_add.json")))
        old.update({k: v for k, v in A.items()})
        A = old
    json.dump(dict(sorted(A.items(), key=lambda x: int(x[0]))), open(P("scripts", "kids_coordi_add.json"), "w"), separators=(",", ":"))
    json.dump({k: len(v) for k, v in sorted(pairs.items())}, open(P("scripts", "kids_coordi_pairs.json"), "w"), separators=(",", ":"))
    print(len(pairs), "쌍 /", len(A), "상품 추가구성 /", len(T), "상품 태그")


if __name__ == "__main__":
    main()
