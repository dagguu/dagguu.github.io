"""여기어때 마케팅파트너 '잘 팔리는 상품'(scripts/yeogi_top.json, 매월 시온님이 준 페이지에서 갱신)에 있는 숙소인지.
2026-10-30 시온님이 보여준 10월 목록(9월 매출 기준). pick_stay.py·pick_reel.py 가 이 숙소를 조금 먼저 고른다."""
import json, os, re
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_CITY = r"^(서울|부산|인천|제주|강릉|가평|태안|여수|경주|포항|속초|고성|양양|홍천|포천|영덕|대천|안면도|영흥도|대부도|제천|남해|거제)"
def _k(s):
    s = re.sub(r"\(.*?\)", "", str(s or "").lower())
    s = re.sub(r"[^가-힣a-z0-9]|앤|and", "", s)
    return re.sub(_CITY, "", s) or s
try:
    _T = json.load(open(os.path.join(_ROOT, "scripts", "yeogi_top.json"), encoding="utf-8"))
    TOP = [_k(x) for x in _T.get("pension", []) + _T.get("hotel", [])]
except Exception:
    TOP = []
def is_top(name):
    a = _k(name)
    return len(a) >= 3 and any(len(t) >= 3 and (a in t or t in a) for t in TOP)

# 네이버 숙소 검색량(scripts/stay_kw.json, stay-kw.yml 매일 07:05): 숙소 이름 → (월간 검색 수, 7일 상승 배수)
try:
    _S = json.load(open(os.path.join(_ROOT, "scripts", "stay_kw.json"), encoding="utf-8")).get("stays", [])
    _SK = {r["name"]: (r.get("vol") or 0, r.get("jump") or 0) for r in _S}
except Exception:
    _SK = {}
def search_of(name):
    return _SK.get(name, (0, 0))
def search_bonus(name):
    v, j = search_of(name)
    return (2 if v >= 10000 else 1 if v >= 2000 else 0) + (2 if j >= 1.3 and v >= 500 else 0)

# ---- 숙소 고르기 신호 모음(2026-10-30 시온님 "여기어때 잘 팔리는 숙소·숙찾남 목록·네이버 검색 트렌드·여기어때 오픈런·마이리얼트립 프로모션·쿠팡 특가까지 확인해서 골라줘") ----
import datetime as _dt
_TODAY = _dt.datetime.now(_dt.timezone(_dt.timedelta(hours=9))).strftime("%Y-%m-%d")
def _load(p, d):
    try: return json.load(open(os.path.join(_ROOT, "scripts", p), encoding="utf-8"))
    except Exception: return d
_SIG = _load("stay_signals.json", {})
_OR = [x for x in (_SIG.get("openrun") or {}).get("items", []) if x.get("kind", "국내숙소") == "국내숙소"
       and str(x.get("end", "9999")) >= _TODAY and str(x.get("start", "")) <= (_dt.date.fromisoformat(_TODAY) + _dt.timedelta(days=10)).isoformat()]
_CP = (_SIG.get("coupang") or {}).get("items", {})
_MC = (_load("stay_mrt_cand.json", {}) or {}).get("items", {})
_MS = _load("stay_mrt.json", {})
def _same(a, b):
    a, b = _k(a), _k(b)
    return len(a) >= 3 and len(b) >= 3 and (a in b or b in a)
def signals(name, slug=None):
    """(점수, [이유]) — 릴스·매거진 숙소 고를 때 더하는 점수. 숙찾남 목록(stay_list.json)은 후보 자체라 점수 없음."""
    s, why = 0, []
    if is_top(name): s += 2; why.append("여기어때 잘 팔리는 숙소")
    v, j = search_of(name)
    if v >= 10000: s += 2; why.append(f"네이버 월 {v:,}회")
    elif v >= 2000: s += 1; why.append(f"네이버 월 {v:,}회")
    if j >= 1.3 and v >= 500: s += 2; why.append(f"검색 {j}배↑")
    o = next((x for x in _OR if _same(name, x["name"])), None)
    if o: s += 3; why.append(f"여기어때 오픈런 {o['start'][5:]}~{o['end'][5:]} {o.get('rate')}%")
    m = _MC.get(name) or (_MS.get(slug) if slug else None)
    if m and m.get("rate", 0) >= 15: s += 2 if m["rate"] >= 30 else 1; why.append(f"마이리얼트립 {m['rate']}% 할인")
    c = _CP.get(name)
    if c and c.get("rate", 0) >= 15 and str(c.get("at", "")) >= (_dt.date.fromisoformat(_TODAY) - _dt.timedelta(days=3)).isoformat():
        s += 2 if c["rate"] >= 30 else 1; why.append(f"쿠팡트래블 {c['rate']}% 할인")
    return s, why
def openrun_extra():
    """오픈런 국내숙소 중 숙찾남 목록(stay_list.json)에 없는 곳 — 릴스·매거진 후보로 따로 볼 수 있게."""
    L = _load("stay_list.json", [])
    L = L if isinstance(L, list) else (L.get("list") or L.get("items") or [])
    names = [x.get("name") for x in L if isinstance(x, dict)]
    return [x for x in _OR if not any(_same(x["name"], n) for n in names)]
