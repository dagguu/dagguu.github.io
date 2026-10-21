#!/usr/bin/env python3
"""쿠팡 파트너스 공식 API로 data.json 을 갱신한다 (GitHub Actions 에서 실행).

키는 저장소 Secrets 의 COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 에서만 읽는다.
  1) goldbox : 오늘의 골드박스 상품 10개 (여행·숙소 상품 우선) → data.json 의 goldbox
  2) deeplink: 체험단(items) 중 cpUrl(쿠팡 원본 주소)만 있고 viewUrl 이 비어 있는 것 → 파트너스 링크로 변환
요청 사이 3초 이상 쉰다.
"""
import re, hmac, hashlib, json, os, sys, time, urllib.request
from datetime import datetime, timedelta, timezone

HOST = "https://api-gateway.coupang.com"
BASE = "/v2/providers/affiliate_open_api/apis/openapi"
AK, SK = os.environ.get("COUPANG_ACCESS_KEY", ""), os.environ.get("COUPANG_SECRET_KEY", "")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KST = timezone(timedelta(hours=9))
try: NAMES = json.load(open(os.path.join(ROOT, "scripts", "travel_names.json"), encoding="utf-8"))
except Exception: NAMES = {}

# 클릭 경로 구분(2026-10-18 시온님 요청): 파트너스 리포트에서 subId 별로 나눠 봄
SUB_SITE = "dagguu"       # 사이트(상세 페이지·버튼·핫딜) — 골드박스 API 와 같은 값
SUB_CHAT = "dagguuchat"   # 단톡방 공지 글 (item.chatUrl)


def call(method, path, query="", body=None):
    signed = time.strftime("%y%m%dT%H%M%SZ", time.gmtime())
    msg = signed + method + path + query
    sig = hmac.new(SK.encode(), msg.encode(), hashlib.sha256).hexdigest()
    auth = f"CEA algorithm=HmacSHA256, access-key={AK}, signed-date={signed}, signature={sig}"
    url = HOST + path + (("?" + query) if query else "")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"Authorization": auth, "Content-Type": "application/json;charset=UTF-8"})
    with urllib.request.urlopen(req, timeout=30) as r:
        out = json.loads(r.read().decode())
    time.sleep(3.2)
    if str(out.get("rCode")) not in ("0", "None") and out.get("rCode") is not None:
        raise RuntimeError(f"API 오류: {out.get('rCode')} {out.get('rMessage')}")
    return out.get("data")

def won(n):
    try: return f"{int(n):,}원"
    except Exception: return ""

def next7():
    n = datetime.now(KST); t = n.replace(hour=7, minute=0, second=0, microsecond=0)
    if t <= n: t += timedelta(days=1)
    return t.isoformat()

def main():
    if not AK or not SK:
        print("COUPANG 키가 Secrets 에 없어서 건너뜀"); return 0
    p = os.path.join(ROOT, "data.json")
    d = json.load(open(p, encoding="utf-8"))
    changed = False

    if "goldbox" in sys.argv[1:] or len(sys.argv) == 1:
        gb = call("GET", BASE + "/products/goldbox", "subId=dagguu") or []
        travel = [g for g in gb if "AFFTDP" in str(g.get("productUrl", "")) or "여행" in str(g.get("categoryName", ""))]
        rest = [g for g in gb if g not in travel]
        pick = travel + rest
        end = next7()
        for g in pick:
            if "AFFTDP" in str(g.get("productUrl", "")) and g.get("productId"):
                t = NAMES.get(str(g["productId"]))
                g["productName"] = t if t else str(g.get("categoryName") or "여행") + " 골드박스 · " + str(g.get("productName", ""))
        seen, uniq = set(), []
        for g in pick:
            if g["productName"] in seen: continue
            seen.add(g["productName"]); uniq.append(g)
        pick = uniq[:10]
        d["goldbox"] = [{
            "name": g.get("productName", ""), "u": g.get("productUrl", ""), "img": g.get("productImage", ""),
            "rate": (f"{g['discountRate']}%" if g.get("discountRate") else ""), "rocket": bool(g.get("isRocket")), "price": won(g.get("productPrice")),
            "endAt": end} for g in pick if g.get("productUrl")]
        bk = re.compile(r"아기|유아|베이비|baby|키즈|kids|신생아|기저귀|분유|이유식|물티슈|젖병|젖꼭지|출산|유모차|카시트|아동|어린이|맘스|임산부", re.I)
        baby = [g for g in gb if g.get("productUrl") and "AFFTDP" not in str(g.get("productUrl")) and (bk.search(str(g.get("productName", ""))) or bk.search(str(g.get("categoryName", ""))))]
        d["babyGold"] = [{
            "name": g.get("productName", ""), "u": g.get("productUrl", ""), "img": g.get("productImage", ""),
            "price": won(g.get("productPrice")), "rocket": bool(g.get("isRocket")), "cat": str(g.get("categoryName") or ""), "endAt": end} for g in baby[:12]]
        print(f"골드박스 전체 {len(gb)}개 중 아기용품 {len(d['babyGold'])}개")
        # 특가 탭 아래 끝없이 이어지는 목록: 나머지 골드박스 + 카테고리별 베스트
        used = {x["u"] for x in d["goldbox"]}
        more = [{"name": g.get("productName", ""), "u": g.get("productUrl", ""), "img": g.get("productImage", ""),
                 "rate": (f"{g['discountRate']}%" if g.get("discountRate") else ""), "rocket": bool(g.get("isRocket")),
                 "price": won(g.get("productPrice")), "endAt": end, "k": "골드박스"}
                for g in gb if g.get("productUrl") and g.get("productUrl") not in used and "AFFTDP" not in str(g.get("productUrl"))]
        BEST = [(1011, "출산/유아동"), (1012, "식품"), (1014, "생활용품"), (1016, "가전디지털"), (1010, "뷰티"),
                (1013, "주방용품"), (1015, "홈인테리어"), (1024, "헬스/건강식품"), (1029, "반려동물"), (1017, "스포츠/레저")]
        best = {}
        for cid, nm in BEST:
            try:
                r = call("GET", BASE + f"/products/bestcategories/{cid}", "limit=50&subId=dagguu") or []
            except Exception as e:
                print("베스트 실패:", nm, e); continue
            best[nm] = [{"name": g.get("productName", ""), "u": g.get("productUrl", ""), "img": g.get("productImage", ""),
                         "rocket": bool(g.get("isRocket")), "price": won(g.get("productPrice")), "k": nm}
                        for g in r if g.get("productUrl")]
        mix, seen2, i = [], set(), 0
        while any(i < len(v) for v in best.values()):  # 카테고리를 돌아가며 섞기
            for v in best.values():
                if i < len(v) and v[i]["name"] not in seen2:
                    seen2.add(v[i]["name"]); mix.append(v[i])
            i += 1
        if more or mix:
            d["moreDeals"] = more + mix
            print(f"더보기 특가 골드박스 {len(more)} + 카테고리 베스트 {len(mix)}개")
        d["goldboxUpdated"] = datetime.now(KST).strftime("%H:%M")
        changed = True
        print(f"골드박스 {len(d['goldbox'])}개 갱신")

    if "season" in sys.argv[1:] or len(sys.argv) == 1:  # 날씨·계절 추천(2026-10-18): 이번 달에 쓸 검색어만 공식 검색 API 로
        import urllib.parse
        m = datetime.now(KST).month
        kws = ["제습기", "장우산", "랜턴", "아쿠아리움 입장권", "롯데월드 입장권", "에버랜드 이용권"]  # 검색 API 는 시간당 호출 수가 적어 한 번에 10개 이하로  # 전국 비·장마·소나기·태풍 대비(날씨 문구는 전국적일 때만)
        # 2026-10-22 시온님 "같은 이불만 나와": 달마다 검색어 묶음을 늘리고, 날마다 3개씩 돌아가며 새로 검색(검색 API 한도 때문)
        pool = {12: ["숙취해소제", "핫팩", "전기요", "수면양말", "가습기", "온수매트"], 1: ["핫팩", "전기요", "온수매트", "수면양말", "가습기", "패딩조끼"],
                2: ["핫팩", "전기요", "가습기", "수면양말"], 3: ["황사마스크", "침구청소기", "공기청정기", "봄이불"],
                4: ["침구청소기", "선크림", "공기청정기", "봄이불"], 5: ["선풍기", "모기퇴치기", "선크림", "냉감이불"], 6: ["선풍기", "쿨매트", "모기퇴치기", "냉감이불"],
                7: ["선풍기", "쿨매트", "모기퇴치기", "냉감이불"], 8: ["선풍기", "쿨매트", "모기퇴치기", "냉감이불"], 9: ["침구청소기", "전기요", "가습기", "차렵이불"],
                10: ["겨울이불", "침구청소기", "전기요", "온수매트", "가습기", "수면양말", "극세사 이불", "전기장판"],
                11: ["겨울이불", "전기요", "온수매트", "핫팩", "가습기", "수면양말", "극세사 이불", "전기장판"]}.get(m, [])
        if pool:
            doy = datetime.now(KST).timetuple().tm_yday; st = (doy * 3) % len(pool)
            kws += [pool[(st + i) % len(pool)] for i in range(min(3, len(pool)))]
        sd = dict(d.get("seasonDeals") or {})  # 실패한 검색어는 예전 결과 유지
        kws = kws[:10]; got = 0
        for q in kws:
            try:
                r = call("GET", BASE + "/products/search", "keyword=" + urllib.parse.quote(q) + "&limit=10&subId=dagguu") or {}
                sd[q] = [{"name": i.get("productName"), "price": won(i.get("productPrice")), "img": i.get("productImage"), "u": i.get("productUrl"),
                          "rocket": bool(i.get("isRocket"))} for i in (r.get("productData") or []) if i.get("productUrl")][:8]; got += 1
            except Exception as e:
                print("계절 추천 검색 실패:", q, e); break
        if got:
            d["seasonDeals"] = sd; d["seasonAt"] = datetime.now(KST).strftime("%Y-%m-%d"); changed = True
            print("계절 추천", {k: len(v) for k, v in sd.items()})

    if "deeplink" in sys.argv[1:] or len(sys.argv) == 1:
        for k, x in (d.get("links") or {}).items():  # 사이트 버튼용 쿠팡 링크 (예: 골드박스)
            if isinstance(x, dict) and x.get("cpUrl") and not x.get("u"):
                try:
                    r = call("POST", BASE + "/v1/deeplink", body={"coupangUrls": [x["cpUrl"]], "subId": SUB_SITE}) or []
                    if r and r[0].get("shortenUrl"): x["u"] = r[0]["shortenUrl"]; changed = True; print("버튼 링크 변환:", k)
                except Exception as e: print("버튼 링크 변환 실패:", k, e)
        for x in d.get("babyDeals", []) + d.get("lifeDeals", []):  # 아기용품·생활용품 핫딜
            if x.get("cpUrl") and not x.get("u"):
                try:
                    r = call("POST", BASE + "/v1/deeplink", body={"coupangUrls": [x["cpUrl"]], "subId": SUB_SITE}) or []
                    if r and r[0].get("shortenUrl"): x["u"] = r[0]["shortenUrl"]; changed = True
                except Exception as e: print("핫딜 변환 실패:", x.get("name"), e)
        todo = [it for it in d.get("items", []) if it.get("cpUrl") and not it.get("viewUrl")]
        for i in range(0, len(todo), 20):
            chunk = todo[i:i + 20]
            try:
                res = call("POST", BASE + "/v1/deeplink", body={"coupangUrls": [it["cpUrl"] for it in chunk], "subId": SUB_SITE}) or []
            except Exception as e:
                print("묶음 변환 실패, 하나씩 다시:", e); res = []
                for it in chunk:
                    try: res += call("POST", BASE + "/v1/deeplink", body={"coupangUrls": [it["cpUrl"]], "subId": SUB_SITE}) or []
                    except Exception as e2: print("변환 실패:", it.get("name"), e2)
            by = {r.get("originalUrl"): r.get("shortenUrl") for r in res}
            for it in chunk:
                if by.get(it["cpUrl"]):
                    it["viewUrl"] = by[it["cpUrl"]]; changed = True
        print(f"체험단 링크 변환 {sum(1 for it in todo if it.get('viewUrl'))}/{len(todo)}개")
        # 단톡방용 링크(subId=dagguuchat): 최근 3일 안에 올라온 모집 중 숙박·육아만
        since = (datetime.now(KST).timestamp() - 3 * 86400) * 1000
        today = datetime.now(KST).strftime("%Y-%m-%d")
        ct = [it for it in d.get("items", []) if it.get("cat") in ("stay", "baby") and it.get("cpUrl")
              and it.get("viewUrl") and not it.get("chatUrl") and not it.get("closed")
              and (it.get("end") or "") >= today and (it.get("createdAt") or 0) >= since]
        for i in range(0, len(ct), 20):
            chunk = ct[i:i + 20]
            try:
                res = call("POST", BASE + "/v1/deeplink", body={"coupangUrls": [it["cpUrl"] for it in chunk], "subId": SUB_CHAT}) or []
            except Exception as e:
                print("단톡방 링크 변환 실패:", e); res = []
            by = {r.get("originalUrl"): r.get("shortenUrl") for r in res}
            for it in chunk:
                if by.get(it["cpUrl"]):
                    it["chatUrl"] = by[it["cpUrl"]]; changed = True
        print(f"단톡방 링크 변환 {sum(1 for it in ct if it.get('chatUrl'))}/{len(ct)}개")

    if changed:
        open(p, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
    return 0

if __name__ == "__main__":
    sys.exit(main())
