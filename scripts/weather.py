#!/usr/bin/env python3
"""오늘 전국 날씨 요약 → data.json weather (날씨·계절 추천용, 2026-10-18 시온님 요청: 전국적인 비·장마·소나기·태풍일 때만 날씨 문구).
전국 8개 도시(서울·인천·강릉·대전·대구·광주·부산·제주) 07~22시 강수량·최대 풍속.
MET Norway Locationforecast(무료, 상업 이용 가능·출처 표시 CC BY 4.0, 식별 가능한 User-Agent 필요). 키 없음."""
import json, os, time, urllib.request
from datetime import datetime, timedelta, timezone
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KST = timezone(timedelta(hours=9))
CITIES = {"서울": (37.57, 126.98), "인천": (37.46, 126.71), "강릉": (37.75, 128.88), "대전": (36.35, 127.38),
          "대구": (35.87, 128.60), "광주": (35.16, 126.85), "부산": (35.18, 129.08), "제주": (33.50, 126.53)}
today = datetime.now(KST).date(); out = {}
for name, (lat, lon) in CITIES.items():
    try:
        req = urllib.request.Request(f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={lat}&lon={lon}",
                                     headers={"User-Agent": "dagguu.com weather/1.1 eun901002@gmail.com"})
        j = json.loads(urllib.request.urlopen(req, timeout=30).read().decode())
    except Exception as e:
        print("날씨 실패:", name, e); continue
    rain, wind = 0.0, 0.0
    for t in j["properties"]["timeseries"]:
        k = datetime.fromisoformat(t["time"].replace("Z", "+00:00")).astimezone(KST)
        if k.date() != today or not (7 <= k.hour <= 22): continue
        wind = max(wind, float(t["data"]["instant"]["details"].get("wind_speed") or 0))
        rain += float(((t["data"].get("next_1_hours") or {}).get("details") or {}).get("precipitation_amount") or 0)
    out[name] = {"rain": round(rain, 1), "wind": round(wind, 1)}
    time.sleep(1)
if len(out) < 5: print("도시가 너무 적어 건너뜀", out); raise SystemExit(0)
R = [v["rain"] for v in out.values()]; W = [v["wind"] for v in out.values()]
w = {"date": str(today), "n": len(out), "rainCities": sum(1 for r in R if r >= 1), "maxRain": max(R),
     "windCities": sum(1 for x in W if x >= 14), "maxWind": max(W), "cities": out, "src": "MET Norway"}
p = os.path.join(ROOT, "data.json"); d = json.load(open(p, encoding="utf-8")); d["weather"] = w
open(p, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
print("전국 날씨", {k: v for k, v in w.items() if k != "cities"})
