#!/usr/bin/env python3
"""감성숙소 매거진 다음 숙소 고르기 (2026-10-25 시온님 "순서는 랜덤, 체험단 모집중인 숙소가 있다면 그 숙소를 먼저").
scripts/stay_list.json 에서 국내 숙소(kind 없음)·아직 안 쓴 것(done 없음) 중
 ① data.json 에 지금 모집 중인 숙박 체험단(cat stay, end>=오늘)과 이름이 맞는 숙소 → 마감 가까운 순(오늘 마감은 뒤로), pid 는 그 체험단의 coupangPid
 ② 없으면 data.json 모집 중 감성 숙박(쿠팡 상품 있음·매거진에 없음, 2026-10-30)
 ③ 그것도 없으면 나머지에서 무작위(날짜를 씨앗으로 써서 같은 날 다시 돌려도 같은 결과)
python3 scripts/pick_stay.py [개수=5]  → 후보를 순서대로 출력(1번이 쿠팡트래블에 없으면 다음 후보로)."""
import json, os, re, sys, random, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from yeogi_top import is_top, search_bonus, signals   # 여기어때 잘 팔리는 숙소(2026-10-30)
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
# 계절 트렌드(2026-10-28 시온님 "지금 트렌드가 온천·스파·단풍·노천탕·온수풀"): 10~3월엔 이 말이 이름·지역·메모·체험단 글에 있는 숙소를 먼저
MON = int(TODAY[5:7])
SEASON = re.compile(r"온천|스파|노천|온수|료칸|히노끼|자쿠지|월풀(?!빌라)|사우나|족욕|단풍|탕") if MON in (10, 11, 12, 1, 2, 3) else re.compile(r"수영장|풀빌라|오션|계곡|바다")
def warm(x, it=None):
    s = " ".join(str(x.get(f) or "") for f in ("name", "area", "memo", "tags", "note"))
    if it: s += " " + " ".join(str(it.get(f) or "") for f in ("name", "benefit", "sum"))
    return bool(SEASON.search(s))
first = sorted([(camp(x), x) for x in todo if camp(x)], key=lambda t: (t[0]["end"] <= TODAY, not warm(t[1], t[0]), t[0]["end"]))  # 오늘 마감은 뒤로(글이 오후에 올라가서)
# 2026-10-30 시온님 "매거진 1개는 지금 체험단 모집중인 숙소로": 목록에 모집 중 숙소가 없으면 data.json 모집 중 감성 숙박(쿠팡 상품 있는 곳, 매거진에 아직 없는 곳)에서 고른다. 목록 무작위(rest)는 그것도 없을 때만.
import glob
used = set()
for f in glob.glob(os.path.join(ROOT, "scripts", "stays", "*.json")):
    try: J = json.load(open(f, encoding="utf-8")); used.add(str(J.get("pid") or J.get("coupangPid") or ""))
    except Exception: pass
used |= {str(c.get("coupangPid")) for c, _ in first}
MOOD = re.compile(r"풀빌라|독채|한옥|글램핑|스테이|료칸|펜션|카라반|오션|빌라|캠핑|리조트|스파|온천")
BAD = re.compile(r"모텔|게스트하우스|호스텔|비즈니스|연수원|레지던스|파티룸")
seen = set(); extra = []
for it in sorted(opened, key=lambda it: (it["end"] <= TODAY, not warm({}, it), not MOOD.search(it.get("name", "")), -(int(re.sub(r"\D", "", str(it.get("worth") or "")) or 0)), it["end"])):
    pid = str(it.get("coupangPid") or "")
    if not pid or pid in used or pid in seen or BAD.search(it.get("name", "")): continue
    seen.add(pid)
    m = re.match(r"(.*?)\s*\(([^)]*)\)\s*$", it.get("name", ""))
    extra.append({"name": m.group(1) if m else it["name"], "area": ((it.get("region") or "") + " " + (m.group(2) if m else "")).strip(), "camp": it["id"], "campEnd": it["end"], "pid": pid, "from": "data.json 모집 중 체험단"})
rest = [x for x in todo if not camp(x)]
random.Random(TODAY).shuffle(rest)
rest.sort(key=lambda x: (not warm(x), -signals(x.get("name"), x.get("slug"))[0]))  # 섞은 뒤 계절 숙소를 앞으로(안정 정렬이라 그 안에서는 무작위)
out = [dict(x, camp=c["id"], campEnd=c["end"], pid=c.get("coupangPid") or "") for c, x in first] + extra + rest
out = [dict(x, why=signals(x.get("name"), x.get("slug"))[1]) for x in out]
print(json.dumps(out[:n], ensure_ascii=False, indent=1))
print(f"# 모집 중 체험단이 있는 후보 {len(first)}곳 · 남은 국내 후보 {len(todo)}곳", file=sys.stderr)
