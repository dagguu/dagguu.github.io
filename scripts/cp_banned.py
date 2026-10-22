"""쿠팡 파트너스 활동 제한 업체·브랜드(파트너스 공지, 2025-10-19 모니터링 시작) 거르기.
목록: scripts/cp_banned.json — 공지가 바뀌면 이 파일만 고친다."""
import json, os, re
_P = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cp_banned.json")
BANNED = json.load(open(_P, encoding="utf-8"))
_RX = re.compile("|".join(
    (r"(?<![가-힣A-Za-z])" + re.escape(b.strip()) + r"(?![가-힣A-Za-z])") if len(b.strip()) <= 2 or b.strip().isascii() else re.escape(b.strip())
    for b in BANNED), re.I)

def is_banned(text):
    return bool(text) and bool(_RX.search(str(text)))

DEAL_KEYS = ["goldbox", "moreDeals", "goldAll", "babyDeals", "lifeDeals", "toss"]

def clean(d):
    """data.json 의 특가 목록에서 제한 브랜드 상품을 뺀다. 뺀 개수를 돌려준다."""
    n = 0
    def f(L):
        nonlocal n
        if not isinstance(L, list): return L
        keep = [x for x in L if not (isinstance(x, dict) and is_banned(x.get("name") or x.get("t") or ""))]
        n += len(L) - len(keep); return keep
    for k in DEAL_KEYS:
        if k in d: d[k] = f(d[k])
    if isinstance(d.get("seasonDeals"), dict):
        for k in list(d["seasonDeals"]): d["seasonDeals"][k] = f(d["seasonDeals"][k])
    return n
