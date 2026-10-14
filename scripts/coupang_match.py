#!/usr/bin/env python3
"""체험단 쿠팡 매칭용: scripts/match_queries.json 의 검색어들을 쿠팡 파트너스 공식 검색 API 로 찾아
scripts/match_results.json 에 남긴다(상품번호·이름·가격·이미지·파트너스 링크). 수동 실행 전용. 키는 출력하지 않는다."""
import json, os, sys, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import coupang_api as C
qs = json.load(open(os.path.join(C.ROOT, "scripts", "match_queries.json"), encoding="utf-8"))
out = {}
for q in qs[:30]:
    try:
        d = C.call("GET", C.BASE + "/products/search", "keyword=" + urllib.parse.quote(q) + "&limit=5&subId=dagguu") or {}
        out[q] = [{"pid": str(i.get("productId")), "name": i.get("productName"), "price": i.get("productPrice"),
                   "img": i.get("productImage"), "url": i.get("productUrl"), "rocket": i.get("isRocket")} for i in (d.get("productData") or [])]
    except Exception as e:
        out[q] = {"error": str(e)[:200]}
json.dump(out, open(os.path.join(C.ROOT, "scripts", "match_results.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
