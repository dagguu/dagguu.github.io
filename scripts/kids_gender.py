# 다꾸키즈 상품 모델 성별 판별(2026-11-25 시온님 "남아 카테고리에는 남자모델만, 여아 카테고리에는 여자모델만").
# 카페24 공개 상품 API 의 대표·추가 사진을 CLIP(openai/clip-vit-base-patch32)으로 보고 남자아이/여자아이/사람 없음을 고른다.
# 결과 kids/gender.json {상품번호: {"g": "boy"|"girl"|"none"|"unsure", "b": 남아점수, "w": 여아점수, "p": 사람점수}}
# 이미 본 상품은 다시 안 봄(대표 사진 주소가 바뀌면 다시 봄). 쇼핑몰 저장소 sync.py mode=genderfix 가 이 파일로 여아(50)·남아(51) 분류를 맞춘다.
import json, os, re, io, sys, time
import requests
from PIL import Image
import torch
from transformers import CLIPModel, CLIPProcessor

OUT = "kids/gender.json"
CID = "JzTmuiBPItGvZ6KG8g3aPC"
H = {"X-Cafe24-Client-Id": CID}
GIRL_WORDS = re.compile(r"원피스|스커트|치마|프릴|레이스|블라우스|드레스|공주|리본|러플|티어드|발레|헤어핀|헤어밴드|머리끈|타이즈")
BOY_WORDS = re.compile(r"남아전용|보이즈|BOY", re.I)

def get(url):
    for k in range(6):
        r = requests.get(url, headers=H, timeout=30)
        if r.status_code == 429:
            time.sleep(2 + k); continue
        r.raise_for_status(); return r.json()
    return {}

def products():
    out, off = [], 0
    while True:
        j = get(f"https://dagguu.cafe24api.com/api/v2/products?limit=100&offset={off}&fields=product_no,product_name,detail_image,list_image,additional_image")
        ps = j.get("products") or []
        out += ps
        if len(ps) < 100: break
        off += 100; time.sleep(0.4)
    return out

def imgs_of(p):
    u = [p.get("detail_image") or p.get("list_image")]
    for a in (p.get("additional_image") or [])[:3]:
        u.append(a.get("big") or a.get("medium") or a.get("small"))
    return [x if not x or x.startswith("http") else "https:" + x for x in u if x]

def main():
    old = json.load(open(OUT)) if os.path.exists(OUT) else {}
    ps = products()
    print("상품", len(ps))
    model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").eval()
    proc = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    T = {"boy": ["a photo of a little boy", "a photo of a young boy wearing kids clothes", "a toddler boy"],
         "girl": ["a photo of a little girl", "a photo of a young girl wearing kids clothes", "a toddler girl"],
         "none": ["a product photo of clothes with no person", "clothing laid flat on a plain background", "a mannequin wearing clothes", "a close-up of fabric"]}
    texts = sum(T.values(), [])
    grp = [g for g, v in T.items() for _ in v]
    with torch.no_grad():
        ti = proc(text=texts, return_tensors="pt", padding=True)
        tf = model.get_text_features(**ti); tf = tf / tf.norm(dim=-1, keepdim=True)
    new = {}
    done = 0
    for p in ps:
        no = str(p["product_no"]); name = p.get("product_name") or ""
        urls = imgs_of(p)
        key = urls[0] if urls else ""
        if no in old and old[no].get("k") == key:
            new[no] = old[no]; continue
        B = W = P = 0.0; n = 0
        for u in urls[:4]:
            try:
                im = Image.open(io.BytesIO(requests.get(u, timeout=30).content)).convert("RGB")
            except Exception:
                continue
            with torch.no_grad():
                ii = proc(images=im, return_tensors="pt")
                f = model.get_image_features(**ii); f = f / f.norm(dim=-1, keepdim=True)
                pr = (100 * f @ tf.T).softmax(-1)[0].tolist()
            s = {"boy": 0, "girl": 0, "none": 0}
            for g, v in zip(grp, pr): s[g] += v
            per = s["boy"] + s["girl"]
            if per >= 0.5:  # 사람 보이는 사진만 성별 점수에 넣음
                B += s["boy"]; W += s["girl"]; n += 1
            P = max(P, per)
        if GIRL_WORDS.search(name):
            g = "girl"
        elif BOY_WORDS.search(name):
            g = "boy"
        elif n == 0:
            g = "none"
        elif B >= W * 1.8:
            g = "boy"
        elif W >= B * 1.8:
            g = "girl"
        else:
            g = "unsure"
        new[no] = {"g": g, "b": round(B, 3), "w": round(W, 3), "p": round(P, 3), "n": n, "k": key}
        done += 1
        if done % 100 == 0:
            print("본 상품", done); json.dump(new, open(OUT, "w"), ensure_ascii=False)
    json.dump(new, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
    from collections import Counter
    print("새로 본 상품", done, Counter(v["g"] for v in new.values()))

if __name__ == "__main__":
    main()
