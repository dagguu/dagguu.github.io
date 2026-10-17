#!/usr/bin/env python3
"""마이리얼트립 마케팅파트너 API로 숙소 특가를 모아 data.json 의 mrtDeals 에 넣는다 (GitHub Actions mrt.yml).

키는 저장소 Secrets 의 MRT_API_KEY 에서만 읽는다(시온님이 직접 넣음, Claude 는 보지 않음).
문서: https://docs.myrealtrip.com  (Base https://partner-ext-api.myrealtrip.com, Authorization: Bearer KEY)
 1) /v1/products/accommodation/region-autocomplete  지역 → regionId
 2) /v1/products/accommodation/search  (분당 50건) 다음 토요일 1박·성인 2명 기준
 3) 정가 대비 할인 큰 순으로 지역별 최대 3개 → /v1/mylink 로 수익 링크(myrealt.rip)
"""
import json, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timedelta, timezone

KEY = os.environ.get("MRT_API_KEY", "").strip()
BASE = "https://partner-ext-api.myrealtrip.com"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KST = timezone(timedelta(hours=9))
DOM = ["제주", "부산", "강릉", "속초", "여수", "경주", "가평", "서울", "전주", "통영"]
ABR = ["오사카", "도쿄", "후쿠오카", "다낭", "방콕", "나트랑"]
PER, MINRATE = 3, 15

def post(path, body, wait=1.3):
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode(), method="POST",
        headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r: out = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        msg = e.read().decode()[:200]
        if e.code in (401, 403): print(f"::error::마이리얼트립 API 키 오류 {e.code} {msg}"); sys.exit(1)
        raise RuntimeError(f"{path} {e.code} {msg}")
    time.sleep(wait)
    return out.get("data")

def main():
    if not KEY: print("MRT_API_KEY 가 아직 없어서 건너뜀"); return
    now = datetime.now(KST)
    sat = now + timedelta(days=(5 - now.weekday()) % 7 or 7)
    if (sat - now).days < 4: sat += timedelta(days=7)
    cin, cout = sat.strftime("%Y-%m-%d"), (sat + timedelta(days=1)).strftime("%Y-%m-%d")
    out = []
    for dom, regs in ((True, DOM), (False, ABR)):
        for name in regs:
            try:
                rs = (post("/v1/products/accommodation/region-autocomplete", {"keyword": name, "isDomestic": dom}, 0.2) or {}).get("regions") or []
                r = next((x for x in rs if x.get("type") == "CITY"), rs[0] if rs else None)
                if not r: print("지역 없음:", name); continue
                data = post("/v1/products/accommodation/search", {"regionId": r["regionId"], "checkIn": cin, "checkOut": cout, "adultCount": 2, "page": 0, "size": 50}) or {}
            except Exception as e: print("검색 실패:", name, e); continue
            cand = []
            for it in data.get("items") or []:
                sp, op = int(it.get("salePrice") or 0), int(it.get("originalPrice") or 0)
                if not sp or op <= sp or not it.get("imageUrl") or not it.get("productUrl"): continue
                rate = round((op - sp) * 100 / op)
                if rate < MINRATE or rate > 90: continue
                if (it.get("reviewCount") or 0) < 5: continue
                cand.append((rate, it))
            cand.sort(key=lambda x: (-x[0], -(x[1].get("reviewCount") or 0)))
            for rate, it in cand[:PER]:
                try: ml = (post("/v1/mylink", {"targetUrl": it["productUrl"]}, 0.3) or {}).get("mylink")
                except Exception as e: print("링크 실패:", it.get("itemName"), e); continue
                if not ml: continue
                out.append({"dom": dom, "region": name, "name": it.get("itemName", ""), "img": it.get("imageUrl"),
                    "price": int(it["salePrice"]), "orig": int(it["originalPrice"]), "rate": rate,
                    "star": it.get("starRating"), "score": it.get("reviewScore"), "reviews": it.get("reviewCount"), "u": ml})
            print(f"{name}: 후보 {len(cand)} → {min(len(cand), PER)}개")
    if not out: print("::warning::마이리얼트립 특가를 하나도 못 모음(기존 목록 유지)"); return
    p = os.path.join(ROOT, "data.json"); d = json.load(open(p, encoding="utf-8"))
    d["mrtDeals"] = out
    d["mrtInfo"] = {"checkIn": cin, "checkOut": cout, "adults": 2, "updated": now.strftime("%Y-%m-%d %H:%M")}
    json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"::notice::마이리얼트립 특가 {len(out)}개 ({cin} 1박 성인 2명 기준)")

if __name__ == "__main__": main()
