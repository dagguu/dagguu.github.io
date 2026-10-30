#!/usr/bin/env python3
"""숙소 검색량(2026-10-30 시온님 "네이버에서 숙소 실시간 검색량 많은거 확인 가능해?"):
네이버는 실시간 검색어 순위가 없어서(2021년 종료) 가장 가까운 공식 숫자 두 가지를 쓴다.
 ① 검색광고 키워드도구: 숙소 이름의 월간 검색 수(vol, PC+모바일, 최근 30일)
 ② 데이터랩 검색어트렌드: 하루 단위 상대값 → 최근 7일 평균 ÷ 그전 28일(jump, 1보다 크면 요즘 오르는 중)
대상: scripts/stay_list.json 국내 숙소 이름 + 지역·숙소 유형 키워드(TREND). 결과 scripts/stay_kw.json.
pick_reel.py·pick_stay.py 가 검색 많은 숙소·오르는 숙소를 먼저 고르는 데 쓴다. 키는 datalab.yml 과 같은 Secrets(시온님이 직접)."""
import json, os, re, sys
from datetime import datetime, timedelta
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import datalab_trend as D
TREND = ("풀빌라 키즈풀빌라 애견동반펜션 독채펜션 글램핑 료칸 한옥스테이 온천호텔 스파펜션 노천탕숙소 히노끼숙소 오션뷰호텔 "
         "가평풀빌라 가평펜션 양평펜션 포천풀빌라 강릉풀빌라 강릉호텔 속초호텔 양양풀빌라 경주풀빌라 경주한옥 부산호텔 "
         "거제풀빌라 남해펜션 여수풀빌라 제주풀빌라 제주독채 태안펜션 대부도펜션 인천호텔 서울호캉스 홍천펜션 포항풀빌라").split()
def kw(name):
    s = re.sub(r"\(.*?\)|\[.*?\]", "", str(name or ""))
    return re.sub(r"[^가-힣A-Za-z0-9]", "", s)
def main():
    L = json.load(open(os.path.join(D.ROOT, "scripts", "stay_list.json"), encoding="utf-8"))
    L = L if isinstance(L, list) else (L.get("list") or L.get("items") or [])
    stays = [x for x in L if isinstance(x, dict) and not x.get("kind") and x.get("name")]
    K, own = [], {}
    for x in stays:
        k = kw(x["name"])
        if len(k) >= 2 and k not in own: own[k] = x; K.append(k)
    for t in TREND:
        if t not in K: K.append(t)
    vol, related = D.sa_all(K)
    # 데이터랩은 검색 수가 어느 정도 있는 것만(0이면 의미 없음): 숙소 상위 150 + TREND
    up = {k.upper(): v for k, v in vol.items()}
    V = lambda k: (vol.get(k) or up.get(k.upper()) or {}).get("vol") or 0
    cand = sorted([k for k in own if V(k) >= 100], key=lambda k: -V(k))[:150] + TREND
    jump = {}
    if D.CID and D.CSEC:
        now = datetime.now(D.KST).date(); end = now - timedelta(days=1); start = end - timedelta(days=34); cut = (end - timedelta(days=6)).isoformat()
        fails = 0
        for i in range(0, len(cand), 5):
            grp = cand[i:i + 5]
            try: data = D.call(grp, start.isoformat(), end.isoformat())
            except Exception as e:
                fails += 1; print(f"::warning::데이터랩 실패 {getattr(e,'code','')}")
                if fails >= 3: break
                continue
            for k in grp:
                pts = data.get(k) or []
                a = [p["ratio"] for p in pts if p["period"] >= cut]; b = [p["ratio"] for p in pts if p["period"] < cut]
                if a and b and sum(b): jump[k] = round((sum(a) / len(a)) / (sum(b) / len(b)), 2)
                last = [p for p in pts if p["period"] == end.isoformat()]
    rows = []
    for k, x in own.items():
        rows.append({"name": x["name"], "area": x.get("area", ""), "slug": x.get("slug", ""), "kw": k, "vol": V(k), "jump": jump.get(k), "done": bool(x.get("done"))})
    rows.sort(key=lambda r: -r["vol"])
    tr = sorted([{"kw": t, "vol": V(t), "jump": jump.get(t)} for t in TREND], key=lambda r: -(r["jump"] or 0))
    rel = [r for r in related if re.search(r"펜션|풀빌라|호텔|리조트|글램핑|숙소|스테이|한옥|료칸|캠핑|카라반|온천|스파", r["kw"])][:80]
    out = {"updated": datetime.now(D.KST).strftime("%Y-%m-%d %H:%M"),
           "note": "vol=네이버 검색광고 월간 검색 수(최근 30일, PC+모바일) · jump=데이터랩 최근 7일 평균 ÷ 그전 28일(어제까지)",
           "stays": rows, "trend": tr, "related": rel}
    json.dump(out, open(os.path.join(D.ROOT, "scripts", "stay_kw.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("::notice::검색 많은 숙소", ", ".join(f"{r['name']} {r['vol']}" for r in rows[:5]))
if __name__ == "__main__": main()
