"""숙소·티켓 체험단 지도 좌표 (2026-10-25 시온님 "숙소/티켓 지도").
data.json 모집 중 cat stay·etc → geo.json {"at": 시각, "p": {item id: [lat, lng, 정확도]}}
정확도 "s" = 숙소 자체 위치, "c" = 시·군 중심(숙소를 못 찾았을 때).
찾는 순서: 카카오 로컬 키워드 검색(Secrets KAKAO_REST_KEY 가 있을 때, 이름 + 시·군이 맞는 숙박·관광 장소만)
→ OpenStreetMap Nominatim(키 없음, 1초에 1번, 시·군 중심만). 한 번 찾은 좌표는 scripts/geo_cache.json 에 남겨 다시 묻지 않는다.
GitHub Actions(geo.yml)에서만 돈다(작업 컨테이너는 바깥 주소에 못 닿음)."""
import json, os, re, time, datetime, urllib.request, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))
CP = os.path.join(ROOT, "scripts", "geo_cache.json")
cache = json.load(open(CP, encoding="utf-8")) if os.path.exists(CP) else {}
KAKAO = os.environ.get("KAKAO_REST_KEY", "").strip()
UA = "dagguu-map/1.0 (https://www.dagguu.com; eun901002@gmail.com)"
KST = datetime.timezone(datetime.timedelta(hours=9))
TODAY = datetime.datetime.now(KST).strftime("%Y-%m-%d")
REG = {"서울": "서울특별시", "경기": "경기도", "인천": "인천광역시", "강원": "강원도", "부산": "부산광역시", "제주": "제주특별자치도"}  # 충청·전라·경상은 남·북도를 몰라서 시·군 이름만

def get(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))

def split(name):
    m = re.match(r"^(.*?)\s*\(([^)]+)\)\s*$", name or "")
    return (m.group(1).strip(), m.group(2).strip()) if m else ((name or "").strip(), "")

def city_q(city, region, place=""):
    c = re.split(r"[ ·,/]", city)[0] if city else ""
    if not c and place:  # "무안 애모시옹 풀빌라" 처럼 이름 앞에 시·군이 붙은 경우
        w = place.split()[0]
        if 2 <= len(w) <= 4 and not re.search(r"(펜션|호텔|풀빌라|리조트|스테이|글램핑|캠핑)", w): c = w
    if not c: return ""
    r = REG.get(region, "")
    return f"{c}, {r}, 대한민국" if r else f"{c}, 대한민국"

def kakao(place, city):
    if not KAKAO: return None
    q = (place + " " + city).strip()
    try:
        r = get("https://dapi.kakao.com/v2/local/search/keyword.json?" + urllib.parse.urlencode({"query": q, "size": 5}), {"Authorization": "KakaoAK " + KAKAO})
    except Exception as ex:
        print("kakao 실패", q, ex); return None
    key = re.sub(r"\s+", "", place)[:6]
    c0 = re.split(r"[ ·,/]", city)[0][:2] if city else ""
    for d in r.get("documents", []):
        nm = re.sub(r"\s+", "", d.get("place_name", ""))
        addr = d.get("address_name", "") + " " + d.get("road_address_name", "")
        if key and key[:4] in nm and (not c0 or c0 in addr):
            return [round(float(d["y"]), 5), round(float(d["x"]), 5), "s"]
    return None

RHINT = {"서울": ["서울"], "경기": ["경기"], "인천": ["인천"], "강원": ["강원"], "부산": ["부산"], "제주": ["제주"],
         "충청": ["충북", "충남", "대전", "세종"], "전라": ["전북", "전남", "광주"], "경상": ["경북", "경남", "대구", "울산"]}

def kakao_city(c, region):
    """시·군 중심 = 그 시청·군청·구청 위치(카카오, 권역이 맞을 때만). 2026-10-25: OSM 이 화천·강원 고성·대전을 엉뚱한 곳으로 찾아서."""
    if not KAKAO or not c: return None
    hints = RHINT.get(region, [])
    for suf in ("시청", "군청", "구청"):
        q = c + suf if not c.endswith(("시", "군", "구")) else c + "청"
        try:
            r = get("https://dapi.kakao.com/v2/local/search/keyword.json?" + urllib.parse.urlencode({"query": q, "size": 5}), {"Authorization": "KakaoAK " + KAKAO})
        except Exception as ex:
            print("kakao 시·군 실패", q, ex); continue
        for d in r.get("documents", []):
            addr = d.get("address_name", "")
            if (not hints or any(addr.startswith(h) for h in hints)) and q.replace(" ", "") in d.get("place_name", "").replace(" ", ""):
                return [round(float(d["y"]), 5), round(float(d["x"]), 5), "c"]
        if c.endswith(("시", "군", "구")): break
    return None

def nominatim(q):
    if not q: return None
    time.sleep(1.1)
    try:
        r = get("https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({"q": q, "format": "json", "limit": 1, "countrycodes": "kr", "accept-language": "ko"}))
    except Exception as ex:
        print("nominatim 실패", q, ex); return None
    return [round(float(r[0]["lat"]), 5), round(float(r[0]["lon"]), 5), "c"] if r else None

items = [it for it in D.get("items", []) if it.get("cat") in ("stay", "etc") and str(it.get("end") or "") >= TODAY and not it.get("closed")]
out, n_new = {}, 0
for it in items:
    place, city = split(it.get("name"))
    ck = "p:" + str(it.get("coupangPid") or it["id"])
    hit = cache.get(ck)
    if not hit or (hit[2] == "c" and KAKAO and not cache.get(ck + "#c2")):
        g = kakao(place, city)
        if KAKAO: cache[ck + "#k"] = 1; cache[ck + "#c2"] = 1
        if not g:
            cq = city_q(city, it.get("region", ""), place)
            c0 = cq.split(",")[0] if cq else ""
            kk = "kc:" + c0 + "|" + it.get("region", "")
            g = cache.get(kk) if KAKAO else None
            if not g and KAKAO and c0:
                g = kakao_city(c0, it.get("region", "")); cache[kk] = g or []
            if not g: g = cache.get("c:" + cq)
            if not g:
                g = nominatim(cq); cache["c:" + cq] = g or []
            g = g or None
        cache[ck] = g or []; hit = cache[ck]; n_new += 1
    if hit: out[it["id"]] = hit

# 감성숙소 추천 매거진(2026-10-25 시온님 "내가 추천하는 감성숙소 위치도 같이"): 공개된 글(date ≤ 오늘)만, 키 "m:<slug>"
import glob
for f in sorted(glob.glob(os.path.join(ROOT, "scripts", "stays", "*.json"))):
    try: P = json.load(open(f, encoding="utf-8"))
    except Exception: continue
    if str(P.get("date", "9999")) > TODAY: continue
    area = re.sub(r"\(.*?\)", "", P.get("area", "")).split()
    city = area[-1] if area else ""
    ck = "m:" + P["slug"]
    if P.get("geo"):   # 쿠팡트래블 상품 페이지 location(위도·경도)을 글 json 에 적어 둔 것이 가장 정확
        out[ck] = [P["geo"][0], P["geo"][1], "s"]; continue
    hit = cache.get(ck)
    if not hit or (hit[2] == "c" and KAKAO and not cache.get(ck + "#c2")):
        g = kakao(P["name"], city)
        if KAKAO: cache[ck + "#c2"] = 1
        if not g:
            reg = P.get("region", "")
            kk = "kc:" + city + "|" + reg
            g = cache.get(kk) if KAKAO else None
            if not g and KAKAO and city:
                g = kakao_city(city, reg); cache[kk] = g or []
            if not g:
                cq = city_q(city, reg); g = cache.get("c:" + cq) or nominatim(cq); cache["c:" + cq] = g or []
        cache[ck] = g or []; hit = cache[ck]; n_new += 1
    if hit: out[ck] = hit

json.dump(cache, open(CP, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
json.dump({"at": datetime.datetime.now(KST).isoformat(timespec="minutes"), "p": out}, open(os.path.join(ROOT, "geo.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
s = sum(1 for v in out.values() if v[2] == "s")
print(f"지도 좌표: 모집 중 {len(items)}곳 중 {len(out)}곳 (숙소 위치 {s} · 시·군 중심 {len(out)-s}), 새로 찾음 {n_new}, 카카오 키 {'있음' if KAKAO else '없음'}")
