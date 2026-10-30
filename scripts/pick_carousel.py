#!/usr/bin/env python3
"""영상 피드(@dagguu.trip 캐러셀) 숙소 고르기 — 2026-10-30 시온님:
"영상피드랑 릴스랑 숙소가 겹치는데, 내일부터는 안 겹치게 영상피드는 체험단 모집하는 감성 숙소로.
 지금 진행 중인 국내숙소추천 매거진 글을 영상피드로."

순서: 오늘(없으면 최근) 공개된 감성숙소 매거진 글(scripts/stays/<slug>.json, date ≤ 오늘) 중
  ① 지금 체험단 모집 중(data.json cat stay, end ≥ 오늘, coupangPid == 글 pid)
  ② 오늘 릴스 숙소(scripts/reels_done.json 오늘·scripts/reel_plan.json 오늘 줄)가 아님
  ③ 아직 영상 피드·카드뉴스로 안 만든 것(scripts/insta_done.json "m:<slug>", scripts/carousel/<slug>.json 없음)
  을 모두 맞는 글을 최근 날짜 → 마감 가까운 순으로 1개.
  ①이 없으면(매거진 작업이 모집 중 숙소를 못 찾은 날) 오늘 매거진 글 중 ②③만 맞는 것(camp 없음, 알림에 밝힘). 그것도 없으면 출력 없음 → 그날 영상 피드 건너뜀.
출력: slug  no  이름  체험단마감  (--json 이면 JSON)
"""
import json, os, glob, sys, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = lambda *p: os.path.join(ROOT, *p)
TODAY = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%Y-%m-%d")
if len(sys.argv) > 1 and sys.argv[1][:2] == "20": TODAY = sys.argv[1]

def load(p, d):
    try: return json.load(open(p, encoding="utf-8"))
    except Exception: return d

data = load(S("data.json"), {})
camp = {}
for it in data.get("items", []):
    if it.get("cat") == "stay" and str(it.get("end") or "") >= TODAY and not it.get("closed") and it.get("coupangPid"):
        k = str(it["coupangPid"])
        if k not in camp or it["end"] < camp[k]["end"]: camp[k] = it

reel = set()
r = load(S("scripts", "reels_done.json"), {})
if isinstance(r, dict) and isinstance(r.get(TODAY), dict): reel.add(r[TODAY].get("slug"))
for x in load(S("scripts", "reel_plan.json"), {}).get("plan", []):
    if x.get("date") == TODAY and x.get("slug"): reel.add(x["slug"])

done = set(str(x) for x in load(S("scripts", "insta_done.json"), []))

cand = []
for f in glob.glob(S("scripts", "stays", "*.json")):
    if f.endswith("README.md"): continue
    j = load(f, None)
    if not isinstance(j, dict): continue
    slug = os.path.basename(f)[:-5]
    if str(j.get("date") or "9999") > TODAY: continue
    c = camp.get(str(j.get("pid") or j.get("coupangPid") or ""))
    if slug in reel or f"m:{slug}" in done or os.path.exists(S("scripts", "carousel", slug + ".json")): continue
    if not c and j.get("date") != TODAY: continue
    cand.append((j.get("date"), c["end"] if c else "", slug, j))
cand.sort(key=lambda t: (not t[1], t[0] != TODAY, -int(t[0].replace("-", "")), t[1] <= TODAY, t[1]))
if not cand:
    print("", file=sys.stderr); print(f"# {TODAY}: 체험단 모집 중인 감성숙소 글 중 릴스와 안 겹치는 새 숙소 없음 → 영상 피드 건너뜀", file=sys.stderr); sys.exit(0)
d, end, slug, j = cand[0]
if "--json" in sys.argv:
    print(json.dumps({"slug": slug, "no": j.get("no"), "name": j.get("name"), "date": d, "campEnd": end or None, "fallback": not end, "reel": sorted(x for x in reel if x)}, ensure_ascii=False))
else:
    print(slug, j.get("no"), j.get("name"), end)
