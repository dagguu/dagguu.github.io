#!/usr/bin/env python3
"""감성숙소 매거진 다음 숙소 고르기 (2026-10-25 시온님 "순서는 랜덤, 체험단 모집중인 숙소가 있다면 그 숙소를 먼저").
scripts/stay_list.json 에서 국내 숙소(kind 없음)·아직 안 쓴 것(done 없음) 중
 ① data.json 에 지금 모집 중인 숙박 체험단(cat stay, end>=오늘)과 이름이 맞는 숙소 → 마감 가까운 순(오늘 마감은 뒤로), pid 는 그 체험단의 coupangPid
 ② 없으면 나머지에서 무작위(날짜를 씨앗으로 써서 같은 날 다시 돌려도 같은 결과)
python3 scripts/pick_stay.py [개수=5]  → 후보를 순서대로 출력(1번이 쿠팡트래블에 없으면 다음 후보로)."""
import json, os, re, sys, random, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%Y-%m-%d")
n = int(sys.argv[1]) if len(sys.argv) > 1 else 5
L = json.load(open(os.path.join(ROOT, "scripts", "stay_list.json"), encoding="utf-8"))
d = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))
k = lambda s: re.sub(r"[^가-힣a-z0-9]", "", re.sub(r"\(.*?\)", "", str(s).lower()))
opened = [it for it in d.get("items", []) if it.get("cat") == "stay" and str(it.get("end") or "") >= TODAY and not it.get("closed")]
todo = [x for x in L if not x.get("kind") and not x.get("done")]
def camp(x):
    a = k(x["name"]); a = re.sub(r"^(가평|경주|포항|강릉|양양|속초|남해|제주|부산|태안|영덕|거제)", "", a) or a
    city = (x.get("area") or "").split(" ")[-1].rstrip("시군구")
    best = None
    for it in opened:
        b = k(it.get("name"))
        if len(a) >= 3 and a in b and (not city or city in str(it.get("name")) or city in str(it.get("region"))):
            if not best or it["end"] < best["end"]: best = it
    return best
first = sorted([(camp(x), x) for x in todo if camp(x)], key=lambda t: (t[0]["end"] <= TODAY, t[0]["end"]))  # 오늘 마감은 뒤로(글이 오후에 올라가서)
rest = [x for x in todo if not camp(x)]
random.Random(TODAY).shuffle(rest)
out = [dict(x, camp=c["id"], campEnd=c["end"], pid=c.get("coupangPid") or "") for c, x in first] + rest
print(json.dumps(out[:n], ensure_ascii=False, indent=1))
print(f"# 모집 중 체험단이 있는 후보 {len(first)}곳 · 남은 국내 후보 {len(todo)}곳", file=sys.stderr)
