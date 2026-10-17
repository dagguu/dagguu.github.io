#!/usr/bin/env python3
"""네이버 데이터랩 검색어트렌드 API 로 '체험단' 관련 키워드 인기 비교 (GitHub Actions datalab.yml).

키: 저장소 Secrets NAVER_CLIENT_ID / NAVER_CLIENT_SECRET — 2026-07-31 부터 개발자센터 신규 발급이 막혀 NAVER API HUB(네이버 클라우드) 키를 쓴다(시온님이 발급·직접 입력, Claude 는 보지 않음).
API: POST https://naverapihub.apigw.ntruss.com/search-trend/v1/search (헤더 X-NCP-APIGW-API-KEY-ID/KEY). 예전 개발자센터 키면 NAVER_API_LEGACY=1  (한 번에 키워드 그룹 5개, 결과는 그 요청 안에서 0~100 상대값)
→ 모든 요청에 기준 키워드 '체험단' 을 넣어서, 다른 요청끼리도 '체험단=100' 기준으로 비교되게 맞춘다.
후보: 기본·분야·지역(숙박)·숙소 종류·data.json 모집 중 브랜드 + '체험단'. 최근 30일 합계로 순위.
결과: scripts/kw_trends.json (순위·지난 30일 점수·직전 30일 대비 증가율)
"""
import json, os, re, sys, time, urllib.request, urllib.parse, collections, hmac, hashlib, base64
from datetime import datetime, timedelta, timezone

CID, CSEC = os.environ.get("NAVER_CLIENT_ID", "").strip(), os.environ.get("NAVER_CLIENT_SECRET", "").strip()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KST = timezone(timedelta(hours=9))
BASE = "체험단"

def candidates():
    d = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))
    today = datetime.now(KST).strftime("%Y-%m-%d")
    op = [i for i in d.get("items", []) if not i.get("closed") and (i.get("end") or "9999") >= today]
    K = ["체험단 모집", "블로그 체험단", "인스타 체험단", "릴스 체험단", "무료 체험단", "체험단 사이트",
         "숙박 체험단", "호텔 체험단", "펜션 체험단", "풀빌라 체험단", "리조트 체험단", "글램핑 체험단", "캠핑 체험단", "한옥 체험단", "키즈풀빌라 체험단", "애견동반 체험단",
         "육아 체험단", "아기 체험단", "유아 체험단", "뷰티 체험단", "화장품 체험단", "생활용품 체험단", "가전 체험단", "청소기 체험단",
         "식품 체험단", "영양제 체험단", "반려동물 체험단", "강아지 체험단", "고양이 체험단", "맛집 체험단", "페이백 체험단", "구매평 체험단"]
    sig = collections.Counter()
    for i in op:
        if (i.get("cat") or "stay") != "stay": continue
        m = re.search(r"\(([^)]*)\)\s*$", i.get("name") or "")
        if m: sig[m.group(1).strip()] += 1
        if i.get("region"): sig[i["region"]] += 1
    for r in ["제주", "부산", "강릉", "속초", "가평", "경주", "여수", "양평", "거제", "태안", "서울", "인천", "포천", "남해", "통영", "전주"] + [k for k, _ in sig.most_common(25)]:
        for k in (f"{r} 체험단", f"{r} 숙박 체험단", f"{r} 풀빌라 체험단", f"{r} 펜션 체험단"):
            if k not in K: K.append(k)
    br = collections.Counter()
    for i in op:
        if (i.get("cat") or "stay") == "stay": continue
        w = re.sub(r"[^\w가-힣]", "", ((i.get("name") or "").split() or [""])[0])
        if len(w) >= 2: br[w] += 1
    for w, _ in br.most_common(60):
        k = f"{w} 체험단"
        if k not in K: K.append(k)
    return K

def call(groups, start, end):
    body = {"startDate": start, "endDate": end, "timeUnit": "date",
            "keywordGroups": [{"groupName": g, "keywords": [g]} for g in groups]}
    if os.environ.get("NAVER_API_LEGACY"):
        u, h = "https://openapi.naver.com/v1/datalab/search", {"X-Naver-Client-Id": CID, "X-Naver-Client-Secret": CSEC}
    else:
        u, h = "https://naverapihub.apigw.ntruss.com/search-trend/v1/search", {"X-NCP-APIGW-API-KEY-ID": CID, "X-NCP-APIGW-API-KEY": CSEC}
    req = urllib.request.Request(u, data=json.dumps(body).encode(), method="POST", headers={**h, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r: out = json.loads(r.read().decode())
    time.sleep(0.4)
    return {x["title"]: x["data"] for x in out.get("results", [])}

# ---- 네이버 검색광고(SA) API 키워드도구: 월간 검색 수(실제 숫자)·경쟁도·연관 키워드 ----
AK, AS, AC = (os.environ.get(k, "").strip() for k in ("NAVER_AD_API_KEY", "NAVER_AD_SECRET", "NAVER_AD_CUSTOMER_ID"))
def num(v):
    try: return int(v)
    except Exception: return 5 if str(v).startswith("<") else 0
def sa_tool(hints):
    uri = "/keywordstool"; ts = str(int(time.time() * 1000))
    sig = base64.b64encode(hmac.new(AS.encode(), f"{ts}.GET.{uri}".encode(), hashlib.sha256).digest()).decode()
    q = urllib.parse.urlencode({"hintKeywords": ",".join(hints), "showDetail": "1"})
    req = urllib.request.Request(f"https://api.searchad.naver.com{uri}?{q}", headers={"X-Timestamp": ts, "X-API-KEY": AK, "X-Customer": AC, "X-Signature": sig})
    with urllib.request.urlopen(req, timeout=30) as r: out = json.loads(r.read().decode())
    time.sleep(0.4)
    return out.get("keywordList") or []
def sa_all(K):
    if not (AK and AS and AC): print("::warning::NAVER_AD_API_KEY/SECRET/CUSTOMER_ID 가 비어 있어서 검색 수는 건너뜀"); return {}, []
    vol, rel, fails = {}, {}, 0
    for i in range(0, len(K), 5):
        hints = [k.replace(" ", "") for k in K[i:i + 5]]
        try: L = sa_tool(hints)
        except Exception as e:
            fails += 1; print(f"::warning::검색광고 API 실패 {getattr(e, 'code', '')} {getattr(e, 'read', lambda: b'')()[:200]!r}")
            if fails >= 3: print("::error::검색광고 API 3번 실패해서 멈춤"); break
            continue
        for x in L:
            k = x.get("relKeyword", ""); v = num(x.get("monthlyPcQcCnt")) + num(x.get("monthlyMobileQcCnt"))
            row = {"vol": v, "pc": num(x.get("monthlyPcQcCnt")), "mo": num(x.get("monthlyMobileQcCnt")), "comp": x.get("compIdx", ""), "clk": round(float(x.get("monthlyAveMobileClkCnt") or 0) + float(x.get("monthlyAvePcClkCnt") or 0), 1)}
            if k in hints: vol[k] = row
            else: rel[k] = row
    related = sorted(({"kw": k, **v} for k, v in rel.items() if v["vol"] >= 30), key=lambda r: -r["vol"])[:300]
    return vol, related

def extra(hints):
    """수동 조회: HINTS="협찬,숙박협찬,…" → scripts/kw_extra.json (연관 키워드까지 검색 수 순)"""
    H = [h.strip().replace(" ", "") for h in hints.split(",") if h.strip()]
    rows = {}
    for i in range(0, len(H), 5):
        try: L = sa_tool(H[i:i + 5])
        except Exception as e: print(f"::warning::검색광고 API 실패 {getattr(e, 'code', '')} {getattr(e, 'read', lambda: b'')()[:200]!r}"); continue
        for x in L:
            k = x.get("relKeyword", "")
            rows[k] = {"kw": k, "vol": num(x.get("monthlyPcQcCnt")) + num(x.get("monthlyMobileQcCnt")), "comp": x.get("compIdx", ""), "hint": k in H}
    out = sorted(rows.values(), key=lambda r: -r["vol"])
    json.dump({"updated": datetime.now(KST).strftime("%Y-%m-%d %H:%M"), "hints": H, "rows": out}, open(os.path.join(ROOT, "scripts", "kw_extra.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"::notice::수동 조회 {len(H)}개 → 결과 {len(out)}개")

def main():
    if os.environ.get("HINTS"): return extra(os.environ["HINTS"])
    K0 = [k for k in candidates() if k != BASE]
    vol, related = sa_all(K0)
    if not CID or not CSEC: print("::warning::NAVER_CLIENT_ID/SECRET 이 비어 있어서 데이터랩 비율은 건너뜀(Secrets 이름 확인)")
    now = datetime.now(KST).date(); end = now - timedelta(days=1); start = end - timedelta(days=59); mid = end - timedelta(days=29)
    K = K0 if CID and CSEC else []
    res = {}
    for i in range(0, len(K), 4):
        grp = [BASE] + K[i:i + 4]
        try: data = call(grp, start.isoformat(), end.isoformat())
        except Exception as e:
            msg = getattr(e, "read", lambda: b"")()[:200]
            print(f"::warning::요청 실패 {getattr(e, 'code', '')} {msg!r} {e}"); fails = globals().setdefault("FAILS", 0) + 1; globals()["FAILS"] = fails
            if fails >= 3: print("::error::3번 연속 실패해서 멈춤"); return
            continue
        def sums(name):
            pts = data.get(name) or []
            a = sum(p["ratio"] for p in pts if p["period"] >= mid.isoformat()); b = sum(p["ratio"] for p in pts if p["period"] < mid.isoformat())
            return a, b
        ba, bb = sums(BASE)
        if not ba: continue
        for k in grp[1:]:
            a, b = sums(k)
            res[k] = {"score": round(a / ba * 100, 1), "prev": round(b / (bb or ba) * 100, 1), "grow": (round((a - b) / b * 100) if b else None)}
    for k in K0:
        v = vol.get(k.replace(" ", ""))
        if v: res.setdefault(k, {"score": None, "prev": None, "grow": None}).update(v)
    rank = sorted(res.items(), key=lambda kv: (-(kv[1].get("vol") or 0), -(kv[1].get("score") or 0)))
    out = {"updated": datetime.now(KST).strftime("%Y-%m-%d %H:%M"), "base": BASE, "period": f"{mid}~{end}",
           "note": "vol = 검색광고 키워드도구 월간 검색 수(PC+모바일, '<10'은 5로), comp = 경쟁 정도, clk = 월 평균 클릭. score = 데이터랩 최근 30일 '체험단'=100 상대값, grow = 직전 30일 대비 %",
           "rank": [{"kw": k, **v} for k, v in rank if (v.get("vol") or 0) > 0 or (v.get("score") or 0) > 0],
           "zero": [k for k, v in rank if not (v.get("vol") or 0) and not (v.get("score") or 0)], "related": related}
    json.dump(out, open(os.path.join(ROOT, "scripts", "kw_trends.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"::notice::키워드 {len(res)}개 중 검색 있는 것 {len(out['rank'])}개, 연관 키워드 {len(related)}개. 1위 {rank[0][0] if rank else '-'}")

if __name__ == "__main__": main()
