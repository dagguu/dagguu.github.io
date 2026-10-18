#!/usr/bin/env python3
"""오늘 서울 날씨 → data.json weather (날씨·계절 추천용, 2026-10-18).
MET Norway Locationforecast(무료, 상업 이용 가능·출처 표시 CC BY 4.0, 식별 가능한 User-Agent 필요). 키 없음."""
import json, os, urllib.request
from datetime import datetime, timedelta, timezone
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KST = timezone(timedelta(hours=9))
URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=37.57&lon=126.98"
req = urllib.request.Request(URL, headers={"User-Agent": "dagguu.com weather/1.0 eun901002@gmail.com"})
try:
    j = json.loads(urllib.request.urlopen(req, timeout=30).read().decode())
except Exception as e:
    print("날씨 가져오기 실패:", e); raise SystemExit(0)
today = datetime.now(KST).date(); T, H, P = [], [], 0.0
for t in j["properties"]["timeseries"]:
    k = datetime.fromisoformat(t["time"].replace("Z", "+00:00")).astimezone(KST)
    if k.date() != today or not (7 <= k.hour <= 22): continue
    det = t["data"]["instant"]["details"]; T.append(det.get("air_temperature")); H.append(det.get("relative_humidity"))
    n1 = (t["data"].get("next_1_hours") or {}).get("details") or {}
    P += float(n1.get("precipitation_amount") or 0)
if not T: print("오늘 날씨 없음"); raise SystemExit(0)
w = {"date": str(today), "city": "서울", "tmax": round(max(T)), "tmin": round(min(T)), "hum": round(sum(H) / len(H)), "rain": round(P, 1), "src": "MET Norway"}
p = os.path.join(ROOT, "data.json"); d = json.load(open(p, encoding="utf-8")); d["weather"] = w
open(p, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
print("날씨", w)
