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
