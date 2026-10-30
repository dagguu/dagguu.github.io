#!/usr/bin/env python3
"""릴스 숙소 고르기 (2026-10-28 23:04 시온님 "릴스는 체험단 모집이랑 상관없이 조회수 잘 나올 것 같은 숙소로").
체험단 모집 여부는 보지 않는다. scripts/stay_list.json(시온님이 고른 국내 숙소 목록) 전체에서
 · 이미 릴스를 만든 숙소(insta 브랜치 reels/<slug>/reel.mp4, scripts/reels_done.json 의 slug)는 빼고
 · 점수 = 계절 트렌드(10~3월: 온천·스파·노천·온수·료칸·히노끼·자쿠지·월풀·사우나·단풍 +3)
          + 조회수 잘 나온 썸네일 꼴에 맞는 특징(reels_templates.md "숙찾남 조회수 순위": 한옥·료칸·일본·인피니티·오션뷰·바다 앞·계곡·독채·글램핑·카라반·낚시·동굴·섬·기차 +1씩, 최대 +3)
          + 사흘 안에 같은 지역(시·군)으로 만든 릴스가 있으면 -2
 · 사흘 안에 만든 릴스와 같은 특징 말(료칸·한옥 등)이 겹치면 겹친 만큼 -1 — 만든 날 reels_done.json 에 {"YYYY-MM-DD": {"slug","name","area","words":[특징 말]}} 를 적는다
 · 점수 같으면 날짜를 씨앗으로 무작위.
python3 scripts/pick_reel.py [개수=5] → 후보를 순서대로 출력. 1번이 쿠팡트래블에 없거나 사진이 부족하면 다음 후보."""
import json, os, re, sys, random, datetime, subprocess
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__)))
from yeogi_top import is_top, search_bonus, signals, openrun_extra
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KST = datetime.timezone(datetime.timedelta(hours=9))
TODAY = datetime.datetime.now(KST).strftime("%Y-%m-%d")
n = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 5
L = json.load(open(os.path.join(ROOT, "scripts", "stay_list.json"), encoding="utf-8"))
try: done = json.load(open(os.path.join(ROOT, "scripts", "reels_done.json"), encoding="utf-8"))
except Exception: done = {}
made = set(v.get("slug") for v in done.values() if isinstance(v, dict)) if isinstance(done, dict) else set()
try:
    out = subprocess.run(["git", "-C", ROOT, "ls-tree", "-r", "--name-only", "origin/insta", "reels"], capture_output=True, text=True).stdout
    made |= set(re.findall(r"reels/([^/]+)/reel\.mp4", out))
except Exception: pass
for _f in __import__("glob").glob(os.path.join(ROOT, "scripts", "tts", "*.json")):   # reels/<이름>/ 이름이 slug 와 다를 수 있어 tts json 의 stay 로도 뺀다
    try: made.add(json.load(open(_f, encoding="utf-8")).get("stay"))
    except Exception: pass
since = (datetime.datetime.now(KST) - datetime.timedelta(days=3)).strftime("%Y-%m-%d")
recent = [v for k, v in (done.items() if isinstance(done, dict) else []) if isinstance(v, dict) and k >= since]
recent_area = [v.get("area", "") for v in recent]
recent_words = set(w for v in recent for w in v.get("words", []))  # 사흘 안에 쓴 숙소 특징(료칸·한옥…) — 같은 꼴만 연달아 나오지 않게
MON = int(TODAY[5:7])
WARM = re.compile(r"온천|스파|노천|온수|료칸|히노끼|자쿠지|월풀(?!빌라)|사우나|족욕|단풍|탕") if MON in (10, 11, 12, 1, 2, 3) else re.compile(r"수영장|풀빌라|오션|계곡|바다|워터")
HOOK = re.compile(r"한옥|료칸|일본|인피니티|오션|바다|계곡|독채|글램핑|카라반|낚시|동굴|섬|기차|루프탑|숲")
def score(x):
    s = " ".join(str(x.get(f) or "") for f in ("name", "area", "memo", "tags", "note"))
    v = (3 if WARM.search(s) else 0) + min(3, len(set(HOOK.findall(s)))) + signals(x.get("name"), x.get("slug"))[0]   # 여기어때 잘 팔림·검색량·오픈런·마이리얼트립·쿠팡 할인(yeogi_top.signals)
    city = (x.get("area") or "").split(" ")[-1]
    if city and any(city in a for a in recent_area): v -= 2
    v -= len(set(HOOK.findall(s)) & recent_words)
    return v
todo = [x for x in L if not x.get("kind") and x.get("slug") not in made and not str(x.get("done", "")).startswith(("쿠팡에 없음", "사진 부족"))]
rnd = random.Random("reel" + TODAY); rnd.shuffle(todo)
todo.sort(key=lambda x: -score(x))

if "--plan" in sys.argv:   # 앞으로 만들 영상 목록(2026-10-30 시온님 "앞으로 만들 영상 목록") → scripts/reel_plan.json
    days = int(sys.argv[sys.argv.index("--plan") + 1]) if len(sys.argv) > sys.argv.index("--plan") + 1 else 14
    try: old = json.load(open(os.path.join(ROOT, "scripts", "reel_plan.json"), encoding="utf-8")).get("plan", [])
    except Exception: old = []
    keep = {p_["date"]: p_ for p_ in old if p_.get("date", "") >= TODAY}   # 이미 정해 둔(시온님이 고친) 날짜는 그대로 두고 빈 날만 채운다
    taken = set(p_.get("name") for p_ in keep.values())
    pool = [x for x in todo if x["name"] not in taken]; plan = []
    d0 = datetime.datetime.now(KST)
    if d0.hour >= 17: d0 += datetime.timedelta(days=1)   # 오늘 17:07 작업이 이미 돌았으면 내일부터
    hist = [v for v in recent]
    for k in range(days):
        day = (d0 + datetime.timedelta(days=k)).strftime("%Y-%m-%d")
        if day in keep:
            plan.append(keep[day]); hist.append({"area": keep[day].get("area", ""), "words": keep[day].get("words", []), "name": keep[day].get("name", "")}); continue
        if not pool: break
        recent_area[:] = [v.get("area", "") for v in hist[-3:]]
        recent_words.clear(); recent_words.update(w for v in hist[-3:] for w in v.get("words", []))
        used = [h.get("name", "").split()[0] for h in hist if h.get("name")]
        def ps(x):   # 목록에서는 같은 꼴이 줄줄이 나오지 않게 더 세게 섞는다(료칸만 5일 연속 같은 것)
            s_ = " ".join(str(x.get(f) or "") for f in ("name", "area", "memo", "tags", "note"))
            w = set(HOOK.findall(s_)) | set(WARM.findall(s_))
            return score(x) - 3 * len(w & recent_words) - (4 if x["name"].split()[0] in used else 0)
        pool.sort(key=lambda x: -ps(x)); x = pool.pop(0)
        s_ = " ".join(str(x.get(f) or "") for f in ("name", "area", "memo", "tags", "note"))
        words = sorted(set(HOOK.findall(s_)) | set(WARM.findall(s_)))
        plan.append({"date": day, "name": x["name"], "area": x.get("area", ""), "slug": x.get("slug", ""), "words": words,
                     "score": score(x), "why": signals(x.get("name"), x.get("slug"))[1], "status": "예정"})
        hist.append({"area": x.get("area", ""), "words": words, "name": x["name"]})
    out = {"at": TODAY, "rule": "python3 scripts/pick_reel.py --plan 14 는 이미 정해 둔 날짜는 그대로 두고 빈 날만 채운다. 17:07 릴스 작업은 오늘 날짜 줄의 숙소로 만든다. 쿠팡트래블에 없거나 사진이 부족하면 status 에 이유를 적고 pick_reel.py 다음 후보로. 시온님이 순서·숙소를 바꾸면 이 파일을 고친다.", "plan": plan}
    json.dump(out, open(os.path.join(ROOT, "scripts", "reel_plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for p_ in plan: print(p_["date"], p_["name"], p_["area"], "·", ", ".join(p_["why"] + p_["words"]))
    sys.exit(0)
print(json.dumps([dict(x, score=score(x), why=signals(x.get("name"), x.get("slug"))[1]) for x in todo[:n]], ensure_ascii=False, indent=1))
ex = openrun_extra()
if ex: print("# 숙찾남 목록에 없는 여기어때 오픈런 숙소(감성숙소면 후보로 검토):", ", ".join(f"{x['name']} {x['start'][5:]}~{x['end'][5:]} {x.get('rate')}%" for x in ex), file=sys.stderr)
print(f"# 릴스 후보 {len(todo)}곳 (이미 만든 릴스 {len(made)}개 제외)", file=sys.stderr)
