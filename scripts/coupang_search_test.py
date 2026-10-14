#!/usr/bin/env python3
"""쿠팡 파트너스 검색 API 시험 (수동 실행 전용). 결과를 scripts/coupang_search_test.json 에 남긴다. 키는 출력하지 않는다."""
import json, os, sys, time, urllib.parse, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import coupang_api as C
words = ["베베앙 물티슈","하기스 기저귀","앱솔루트 분유","8801043014809","깨끗한나라 화장지","삼다수 2L","다우니 섬유유연제","페리오 치약","햇반 210g","신라면"]
out = {"started": time.strftime("%Y-%m-%d %H:%M:%S"), "results": []}
for w in words:
    q = "keyword=" + urllib.parse.quote(w) + "&limit=5&subId=dagguu"
    t = time.time()
    try:
        d = C.call("GET", C.BASE + "/products/search", q) or {}
        items = d.get("productData") or []
        out["results"].append({"q": w, "ok": True, "n": len(items), "sec": round(time.time()-t, 1),
            "top": [{"name": i.get("productName","")[:60], "price": i.get("productPrice"), "rocket": i.get("isRocket"), "url": (i.get("productUrl") or "")[:60]} for i in items[:3]]})
    except urllib.error.HTTPError as e:
        out["results"].append({"q": w, "ok": False, "http": e.code, "msg": e.read().decode()[:200]})
    except Exception as e:
        out["results"].append({"q": w, "ok": False, "err": str(e)[:200]})
json.dump(out, open(os.path.join(C.ROOT, "scripts", "coupang_search_test.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
