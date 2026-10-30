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
                    for page in range(40):
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
            ml = (old.get(slug) or {}).get("u") if (old.get(slug) or {}).get("mname") == hit.get("itemName") else None   # 같은 숙소면 예전 링크 그대로
            if not ml:
              try: ml = (M.post("/v1/mylink", {"targetUrl": hit["productUrl"]}, 0.3) or {}).get("mylink")
              except Exception as ex: ml = None; st["err"] = "mylink " + str(ex)[:120]
            if ml:
                out[slug] = {"mname": hit.get("itemName"), "price": sp, "orig": op, "rate": round((op - sp) * 100 / op) if op > sp else 0,
                             "u": ml, "checkIn": cin, "at": today, "score": hit.get("reviewScore"), "reviews": hit.get("reviewCount"),
                             "pu": hit.get("productUrl") or ""}
                bp = {k: v for k, v in hit.items() if re.search(r"best|lowest|guarant|badge|tag|label|promo", k, re.I)}
                if bp: out[slug]["bp"] = bp   # 최저가 보장제 같은 표시가 API 에 있으면(2026-10-30 확인용)
                st["hitKeys"] = sorted(hit.keys())
        elif slug in old:
            out[slug] = old[slug]; st["kept"] = True   # 이번에 못 찾으면 예전 것 유지(조회일은 그대로라 화면에 날짜가 보임)
        status["stays"][slug] = st
        print(slug, "→", st.get("hit") or ("유지" if st.get("kept") else "못 찾음"))
    json.dump(out, open(outp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(status, open(os.path.join(ROOT, "scripts", "stay_mrt_status.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"::notice::감성숙소 마이리얼트립 {len(out)}곳")

def cand(limit=40, pages=12):
    """숙소 고르기용(2026-10-30 시온님 "마이리얼트립 프로모션 숙소도 확인해서 골라줘"): 숙찾남 목록(stay_list.json) 후보 중
    신호 점수·계절 숙소가 높은 limit 곳을 지역별로 묶어 검색(지역 결과는 한 번만 받아 같이 씀)하고, 이름이 맞으면 할인율만 남긴다(링크 X).
    → scripts/stay_mrt_cand.json {"at","checkIn","items":{목록 이름:{mname,price,orig,rate}}}"""
    if not M.KEY: print("MRT_API_KEY 없음"); return
    from yeogi_top import signals
    now = datetime.now(KST)
    sat = now + timedelta(days=(5 - now.weekday()) % 7 or 7)
    if (sat - now).days < 4: sat += timedelta(days=7)
    cin, cout = sat.strftime("%Y-%m-%d"), (sat + timedelta(days=1)).strftime("%Y-%m-%d")
    L = json.load(open(os.path.join(ROOT, "scripts", "stay_list.json"), encoding="utf-8"))
    L = [x for x in (L if isinstance(L, list) else (L.get("list") or L.get("items") or [])) if isinstance(x, dict) and not x.get("kind") and x.get("area")]
    warm = re.compile(r"온천|스파|노천|온수|료칸|히노끼|자쿠지|사우나|족욕|탕")
    L.sort(key=lambda x: -(signals(x["name"])[0] + (3 if warm.search(x["name"] + " " + str(x.get("memo") or "")) else 0)))
    L = L[:limit]
    regions, out = {}, {}
    for x in L:
        city = city_of(x)
        if city not in regions:
            items = []
            try:
                rs = (M.post("/v1/products/accommodation/region-autocomplete", {"keyword": city, "isDomestic": True}, 0.4) or {}).get("regions") or []
                r = next((y for y in rs if y.get("type") == "CITY"), rs[0] if rs else None)
                for page in range(pages if r else 0):
                    got = (M.post("/v1/products/accommodation/search", {"regionId": r["regionId"], "checkIn": cin, "checkOut": cout, "adultCount": 2, "page": page, "size": 50}) or {}).get("items") or []
                    items += got
                    if not got: break
            except SystemExit: raise
            except Exception as ex: print("지역 검색 실패", city, ex)
            regions[city] = items
        hit = next((it for it in regions[city] if same(it.get("itemName"), x["name"])), None)
        if hit:
            sp, op = int(hit.get("salePrice") or 0), int(hit.get("originalPrice") or 0)
            out[x["name"]] = {"mname": hit.get("itemName"), "price": sp, "orig": op, "rate": round((op - sp) * 100 / op) if op > sp else 0}
        print(x["name"], "→", out.get(x["name"], {}).get("rate", "못 찾음"))
    json.dump({"at": now.strftime("%Y-%m-%d %H:%M"), "checkIn": cin, "n": len(L), "items": out}, open(os.path.join(ROOT, "scripts", "stay_mrt_cand.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"::notice::후보 {len(L)}곳 중 마이리얼트립에서 찾은 곳 {len(out)}")

if __name__ == "__main__":
    cand() if "--cand" in sys.argv else main()
