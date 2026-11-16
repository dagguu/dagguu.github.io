"""다꾸키즈 브랜드별 사이즈표 자료(2026-11-15 시온님 "브랜드별 사이즈표 업데이트").
카페24 공개 상품 API 로 판매 중 상품을 모두 읽어 브랜드(상품명 첫 낱말)별로 묶고,
브랜드마다 상품 상세의 SIZE GUIDE(<!--dk-size--> 뒤 사진)를 찾아 kids/brand_size.json 에 적는다.
쇼핑몰 /product/brand_size.html 이 이 파일을 읽어 그린다."""
import json, re, time, datetime, urllib.request, urllib.parse

API = "https://dagguu.cafe24api.com/api/v2"
H = {"X-Cafe24-Client-Id": "JzTmuiBPItGvZ6KG8g3aPC"}
ALIAS = {"콘con": "콘"}
SAMPLE = 25         # 브랜드마다 사이즈표를 찾으려고 열어 보는 상품 수(최근 등록순)


def get(path):
    for t in range(6):
        try:
            req = urllib.request.Request(API + path, headers=H)
            with urllib.request.urlopen(req, timeout=40) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(2 + t * 2); continue
            if e.code == 404:
                return {}
            time.sleep(2)
        except Exception:
            time.sleep(2)
    return {}


def brand_of(name):
    w = (name or "").strip().split(" ")[0]
    w = ALIAS.get(w, w)
    return re.sub(r"\(.*$", "", w).strip()


def main():
    prods, off = [], 0
    while True:
        j = get(f"/products?limit=100&offset={off}&fields=product_no,product_name,created_date,detail_image,list_image")
        ps = j.get("products") or []
        prods += ps
        if len(ps) < 100:
            break
        off += 100
        time.sleep(0.35)
    cats = {}
    j = get("/categories?limit=100&fields=category_no,category_name,parent_category_no")
    for c in j.get("categories") or []:
        if int(c.get("parent_category_no") or 0) == 42:
            cats[c["category_name"].strip()] = int(c["category_no"])
    groups = {}
    for p in prods:
        b = brand_of(p.get("product_name"))
        if not b or re.match(r"^[0-9(\[]", b):
            continue
        groups.setdefault(b, []).append(p)
    out = []
    for b, ps in groups.items():
        ps.sort(key=lambda x: -int(x["product_no"]))
        item = {"n": b, "cnt": len(ps), "cate": cats.get(b), "img": [], "pno": None, "pname": ""}
        # 브랜드 모아보기 카드 사진(2026-11-16): 최근 상품 대표 사진(모델 사진으로 골라 올림) 4장
        item["cover"] = [p.get("detail_image") or p.get("list_image") for p in ps[:4] if (p.get("detail_image") or p.get("list_image"))]
        for p in ps[:SAMPLE]:
            d = (get(f"/products/{p['product_no']}?fields=description").get("product") or {}).get("description") or ""
            time.sleep(0.35)
            i = d.find("<!--dk-size-->")
            if i < 0:
                continue
            seg = d[i:]
            k = seg.find("SIZE ·")
            if k > 0:
                seg = seg[:k]
            imgs = re.findall(r'<img[^>]+src="([^"]+)"', seg)
            if imgs:
                item["img"] = imgs[:3]
                item["pno"] = int(p["product_no"])
                item["pname"] = re.sub(r" [0-9]{2}(봄|여름|가을|겨울) .*$", "", p["product_name"])
                break
        out.append(item)
    out.sort(key=lambda x: (-x["cnt"], x["n"]))
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%Y-%m-%d %H:%M")
    json.dump({"at": now, "products": len(prods), "brands": out}, open("kids/brand_size.json", "w"), ensure_ascii=False, separators=(",", ":"))
    print("상품", len(prods), "브랜드", len(out), "사이즈표 있음", sum(1 for x in out if x["img"]))


if __name__ == "__main__":
    main()
