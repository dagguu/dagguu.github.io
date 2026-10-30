#!/usr/bin/env python3
"""감성숙소 매거진(scripts/stays/*.json) 숙소마다 마이리얼트립 할인 정보 + 수익 링크를 찾는다 (2026-10-30 시온님 요청).

마이리얼트립 마케팅파트너 공식 API(키는 Secrets MRT_API_KEY, 시온님이 직접 넣음 — Claude 는 보지 않음).
 1) region-autocomplete 로 숙소 이름을 먼저 찾아보고(숙소가 바로 나오면 그걸로), 아니면 시·군 지역 → search 를 몇 쪽 넘기며 이름이 맞는 숙소를 찾는다.
 2) 다음 토요일 1박·성인 2명 기준 판매가·정가 → /v1/mylink 수익 링크.
 3) 이름이 확실히 맞을 때만 scripts/stay_mrt.json 에 넣는다(애매하면 버림). 못 찾은 곳·찾은 곳은 scripts/stay_mrt_status.json 에 남긴다.
화면: gen_stays.py 가 글 위쪽 "할인 정보" 상자로 보여 준다. '최저가' 같은 말은 쓰지 않는다(조회 날짜·조건만 밝힘).
"""
import json, os, re, glob, sys
from datetime import datetime, timedelta, timezone
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mrt_api as M

ROOT = M.ROOT
KST = timezone(timedelta(hours=9))
norm = lambda s: re.sub(r"[\s&·\-_,.()\[\]'\"]|호텔|펜션|풀빌라|리조트|글램핑|카라반|료칸|스테이|앤|and", "", str(s or "").lower())

def same(a, b):
    a, b = norm(a), norm(b)
    if len(a) < 2 or len(b) < 2: return False
    return a == b or (len(a) >= 3 and a in b) or (len(b) >= 3 and b in a)

def city_of(P):
    # "강원 강릉(주문진)" → 강릉, "부산 동구" → 부산, "인천 옹진(선재도)" → 옹진
    a = re.sub(r"\(.*?\)", "", P.get("area", "")).split()
    if not a: return ""
    if a[0] in ("부산", "서울", "인천", "대구", "대전", "광주", "울산", "제주") and len(a) == 1: return a[0]
    if a[0] in ("부산", "서울", "대구", "대전", "광주", "울산"): return a[0]
    return a[-1] if len(a) > 1 else a[0]

def main():
    if not M.KEY: print("MRT_API_KEY 가 아직 없어서 건너뜀"); return
    now = datetime.now(KST); today = now.strftime("%Y-%m-%d")
    sat = now + timedelta(days=(5 - now.weekday()) % 7 or 7)
    if (sat - now).days < 4: sat += timedelta(days=7)
    cin, cout = sat.strftime("%Y-%m-%d"), (sat + timedelta(days=1)).strftime("%Y-%m-%d")
    outp = os.path.join(ROOT, "scripts", "stay_mrt.json")
    try: old = json.load(open(outp, encoding="utf-8"))
    except Exception: old = {}
    out, status = {}, {"at": now.strftime("%Y-%m-%d %H:%M"), "checkIn": cin, "stays": {}}
    for f in sorted(glob.glob(os.path.join(ROOT, "scripts", "stays", "*.json"))):
        P = json.load(open(f, encoding="utf-8"))
        if P.get("hold") or P.get("date", "9999") > (now + timedelta(days=2)).strftime("%Y-%m-%d"): continue
        slug, name, city = P["slug"], P["name"], city_of(P)
        st = {"name": name, "city": city, "auto": [], "pages": 0}
        hit = None
        try:
            # 1) 숙소 이름 자동완성
            ac = M.post("/v1/products/accommodation/region-autocomplete", {"keyword": name, "isDomestic": True}, 0.4) or {}
            for k, v in ac.items():
                if isinstance(v, list):
                    for x in v[:8]: st["auto"].append({kk: x.get(kk) for kk in ("type", "name", "regionName", "regionId", "itemId", "id") if x.get(kk) is not None})
            # 2) 지역 검색에서 이름 맞추기: 괄호 속 동네(감포·선재도) → 시·군 → 도
            keys = []
            for k in re.findall(r"\((.*?)\)", P.get("area", "")) + [city] + P.get("area", "").split()[:1]:
                k = re.sub(r"\(.*?\)", "", k).strip()
                if k and k not in keys: keys.append(k)
            st["tried"] = []
            for kw in keys:
                if hit: break
                rs = (M.post("/v1/products/accommodation/region-autocomplete", {"keyword": kw, "isDomestic": True}, 0.4) or {}).get("regions") or []
                for r in [x for x in rs if x.get("type") == "CITY"][:2] or rs[:1]:
                    if hit: break
                    tr = {"kw": kw, "region": r.get("name") or r.get("regionName"), "type": r.get("type"), "pages": 0, "n": 0}
                    st["tried"].append(tr)
                    for page in range(12):
                        data = M.post("/v1/products/accommodation/search", {"regionId": r["regionId"], "checkIn": cin, "checkOut": cout, "adultCount": 2, "page": page, "size": 50}) or {}
                        items = data.get("items") or []
                        if page == 0: tr["keys"] = [k for k in data.keys() if k != "items"]; tr["total"] = data.get("totalCount") or data.get("total")
                        tr["pages"] = page + 1; tr["n"] += len(items)
                        hit = next((it for it in items if same(it.get("itemName"), name)), None)
                        if hit or not items: break
        except SystemExit: raise
        except Exception as ex:
            st["err"] = str(ex)[:150]
        if hit:
            st["hit"] = hit.get("itemName")
            sp, op = int(hit.get("salePrice") or 0), int(hit.get("originalPrice") or 0)
            try: ml = (M.post("/v1/mylink", {"targetUrl": hit["productUrl"]}, 0.3) or {}).get("mylink")
            except Exception as ex: ml = None; st["err"] = "mylink " + str(ex)[:120]
            if ml:
                out[slug] = {"mname": hit.get("itemName"), "price": sp, "orig": op, "rate": round((op - sp) * 100 / op) if op > sp else 0,
                             "u": ml, "checkIn": cin, "at": today, "score": hit.get("reviewScore"), "reviews": hit.get("reviewCount")}
        elif slug in old:
            out[slug] = old[slug]; st["kept"] = True   # 이번에 못 찾으면 예전 것 유지(조회일은 그대로라 화면에 날짜가 보임)
        status["stays"][slug] = st
        print(slug, "→", st.get("hit") or ("유지" if st.get("kept") else "못 찾음"))
    json.dump(out, open(outp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(status, open(os.path.join(ROOT, "scripts", "stay_mrt_status.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"::notice::감성숙소 마이리얼트립 {len(out)}곳")

if __name__ == "__main__": main()
