"""마감된 체험단 지우기 (2026-10-27 시온님 "마감된 체험단은 그냥 삭제해줘").
end 가 오늘(한국 날짜)보다 앞이거나 closed 인 체험단을 data.json 에서 뺀다. gen_share.py 맨 앞에서 부른다.
숙박 체험단의 쿠팡 상품번호는 scripts/ended_pids.json 에 남겨 감성숙소 글의 "모집이 끝났어요 · 알림받기" 상자에 쓴다."""
import json, os
from datetime import datetime, timedelta, timezone
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, "data.json"); EP = os.path.join(ROOT, "scripts", "ended_pids.json")
today = datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d")
raw = open(P, encoding="utf-8").read(); d = json.loads(raw)
items = d.get("items") or []
# 레뷰 프리미어(프리미어 인플루언서 전용) 캠페인도 뺀다(2026-11-24 시온님)
prem = lambda x: "premier" in (x.get("pay") or []) or "프리미어" in (x.get("name", "") + x.get("benefit", ""))
gone = [x for x in items if x.get("closed") or (x.get("end") and x["end"] < today) or prem(x)]
if gone:
    ep = set(json.load(open(EP, encoding="utf-8"))) if os.path.exists(EP) else set()
    ep |= {str(x["coupangPid"]) for x in gone if x.get("cat") == "stay" and x.get("coupangPid")}
    json.dump(sorted(ep), open(EP, "w", encoding="utf-8"), ensure_ascii=False)
    d["items"] = [x for x in items if x not in gone]
    open(P, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
# 같은 사이트·같은 숙소/제품을 매체별로 따로 등록했으면 하나로 합친다(2026-11-24 시온님 "매체별로 나뉘는 거는 버튼 두 개로")
import re as _re
def _nk(x): return (x.get("source") or "", _re.sub(r"\s*\([^)]*\)|\s", "", x.get("name") or ""))
_seen, _keep, merged = {}, [], 0
for x in d["items"]:
    k = _nk(x)
    if x.get("own") or not k[1] or k not in _seen: _seen.setdefault(k, x); _keep.append(x); continue
    m = _seen[k]
    if m.get("applyUrl") == x.get("applyUrl"): continue
    def _ap(y): return [dict(a) for a in (y.get("applies") or [])] or [{"ch": list(y.get("ch") or []), "url": y.get("applyUrl"), "end": y.get("end", ""), **({"ap": y["ap"]} if y.get("ap") else {})}]
    L = _ap(m)
    for a in _ap(x):
        if a.get("url") and all(b.get("url") != a["url"] for b in L): L.append(a)
    m["applies"] = L
    for c in x.get("ch") or []:
        if c not in (m.get("ch") or []): m.setdefault("ch", []).append(c)
    if x.get("end") and (m.get("end") or "") and x["end"] > m["end"]: m["end"] = x["end"]
    merged += 1
if merged:
    d["items"] = _keep
    open(P, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
    print(f"매체별로 나뉜 체험단 합침 {merged}개")
# 매체별 캠페인(applies) 중 마감된 것은 빼고, 신청 주소·매체를 남은 캠페인으로 맞춘다(2026-11-24)
fix = 0
for x in d["items"]:
    ap = x.get("applies") or []
    live = [a for a in ap if not (a.get("end") and a["end"] < today)]
    if ap and live and len(live) < len(ap):
        x["applies"] = live; x["applyUrl"] = live[0]["url"]
        chs = []
        for a in live:
            for c in a.get("ch") or []:
                if c not in chs: chs.append(c)
        if chs: x["ch"] = chs
        if live[0].get("ap"): x["ap"] = live[0]["ap"]
        fix += 1
if fix:
    open(P, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
    print(f"마감된 매체 캠페인 정리 {fix}개")
print(f"마감 체험단 {len(gone)}개 삭제 · 남은 {len(items) - len(gone)}개")
