"""data.json → data-live.json(모집 중 + 어제 마감까지, 화면 첫 로딩용) + data-past.json(그 전에 마감된 체험단).
2026-10-27 시온님 "로딩이 너무 느려" — data.json 이 2MB(마감 74%)라 휴대폰 첫 화면이 늦었다.
앱은 live 를 먼저 그리고 past 는 뒤에서 받아 붙인다. data.json 은 그대로 원본(스크립트·예약 작업은 계속 data.json 을 읽고 쓴다).
gen_share.py 끝에서 부르고, split.yml 이 data.json push 때 한 번 더 확인한다."""
import json, os
from datetime import datetime, timedelta, timezone
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))
cut = (datetime.now(timezone(timedelta(hours=9))) - timedelta(days=1)).strftime("%Y-%m-%d")
items = d.get("items") or []
live = [x for x in items if not x.get("end") or x["end"] >= cut]
past = [x for x in items if not (not x.get("end") or x["end"] >= cut)]
L = dict(d); L["items"] = live; L["pastN"] = len(past)
def w(name, obj):
    p = os.path.join(ROOT, name); s = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    old = open(p, encoding="utf-8").read() if os.path.exists(p) else None
    if old != s: open(p, "w", encoding="utf-8").write(s)
w("data-live.json", L); w("data-past.json", {"items": past})
print(f"data-live {len(live)} · data-past {len(past)}")
