"""오픈 예정 알림받기 (2026-10-30 시온님: "알림받기를 누르면 카카오톡 알림받기로, 알림 날짜에 카카오톡 메시지에 넣어줘").
scripts/stay_signals.json openrun(여기어때 마케팅파트너 오픈런 안내, 매주 금요일 갱신) → data.json soon.
- 끝나지 않은 것만, 오픈 날짜 빠른 순 → 할인율 큰 순.
- 링크: data.json soonLinks[이름] (시온님이 여기어때 파트너센터에서 만든 그 상품 링크) → 없으면 여기어때 기본 파트너 링크(yeogi 의 '여기어때 보기').
- 오픈 시각은 안내 페이지에 없어서 날짜만 쓴다.
gen_share.py 맨 앞(prune_ended 다음)에서 돌린다."""
import json, os, datetime
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(R, "data.json")
d = json.load(open(D, encoding="utf-8"))
try: s = json.load(open(os.path.join(R, "scripts", "stay_signals.json"), encoding="utf-8")).get("openrun") or {}
except Exception: s = {}
today = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=9)).date().isoformat()
base = next((y.get("u") for y in (d.get("yeogi") or []) if "vim9vp86" in (y.get("u") or "")), "https://yeogi.onelink.me/SECZ/vim9vp86")
links = d.get("soonLinks") or {}
out = []
for x in s.get("items") or []:
    if not x.get("start") or (x.get("end") or x["start"]) < today: continue
    if "해외" in str(x.get("kind", "")) or "해외" in str(x.get("name", "")): continue   # 해외숙소는 빼고 국내숙소·레저티켓만 (2026-10-30 시온님)
    out.append({"name": x["name"], "kind": x.get("kind", ""), "start": x["start"], "end": x.get("end", x["start"]),
                "rate": x.get("rate", 0), "price": x.get("price", 0), "img": x.get("img", ""),
                "u": links.get(x["name"]) or base, "own": bool(links.get(x["name"])), "src": "여기어때 오픈런"})
out.sort(key=lambda x: (x["start"], -(x["rate"] or 0)))
new = {"at": s.get("at", ""), "items": out}
if d.get("soon") != new:
    d["soon"] = new
    json.dump(d, open(D, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("오픈 예정:", len(out))
