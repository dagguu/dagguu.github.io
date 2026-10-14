#!/usr/bin/env python3
"""쿠팡 파트너스 공식 API로 data.json 을 갱신한다 (GitHub Actions 에서 실행).

키는 저장소 Secrets 의 COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 에서만 읽는다.
  1) goldbox : 오늘의 골드박스 상품 10개 (여행·숙소 상품 우선) → data.json 의 goldbox
  2) deeplink: 체험단(items) 중 cpUrl(쿠팡 원본 주소)만 있고 viewUrl 이 비어 있는 것 → 파트너스 링크로 변환
요청 사이 3초 이상 쉰다.
"""
import hmac, hashlib, json, os, sys, time, urllib.request
from datetime import datetime, timedelta, timezone

HOST = "https://api-gateway.coupang.com"
BASE = "/v2/providers/affiliate_open_api/apis/openapi"
AK, SK = os.environ.get("COUPANG_ACCESS_KEY", ""), os.environ.get("COUPANG_SECRET_KEY", "")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KST = timezone(timedelta(hours=9))

def call(method, path, query="", body=None):
    signed = time.strftime("%y%m%dT%H%M%SZ", time.gmtime())
    msg = signed + method + path + query
    sig = hmac.new(SK.encode(), msg.encode(), hashlib.sha256).hexdigest()
    auth = f"CEA algorithm=HmacSHA256, access-key={AK}, signed-date={signed}, signature={sig}"
    url = HOST + path + (("?" + query) if query else "")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"Authorization": auth, "Content-Type": "application/json;charset=UTF-8"})
    with urllib.request.urlopen(req, timeout=30) as r:
        out = json.loads(r.read().decode())
    time.sleep(3.2)
    if str(out.get("rCode")) not in ("0", "None") and out.get("rCode") is not None:
        raise RuntimeError(f"API 오류: {out.get('rCode')} {out.get('rMessage')}")
    return out.get("data")

def trip_title(pid):
    """쿠팡트래블 상품 페이지 제목(숙소 이름)을 읽는다. 실패하면 빈 문자열."""
    import re, html as H
    try:
        req = urllib.request.Request(f"https://trip.coupang.com/tp/products/{int(pid)}", headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", "Accept-Language": "ko-KR,ko;q=0.9"})
        with urllib.request.urlopen(req, timeout=20) as r:
            body = r.read(400000).decode("utf-8", "ignore")
        time.sleep(3.2)
        m = re.search(r'<meta[^>]+property="og:title"[^>]+content="([^"]+)"', body) or re.search(r"<title>([^<]+)</title>", body)
        t = H.unescape(m.group(1)).strip() if m else ""
        return "" if (not t or t.startswith("쿠팡")) else t
    except Exception as e:
        print("숙소 이름 읽기 실패", pid, e); return ""

def dbg_fetch(gb):
    out = []
    for g in gb[:12]:
        if "AFFTDP" in str(g.get("productUrl", "")):
            try:
                req = urllib.request.Request(f"https://trip.coupang.com/tp/products/{int(g['productId'])}", headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"})
                with urllib.request.urlopen(req, timeout=20) as r:
                    out.append(f"{g['productId']} {r.status} {r.read(3000)[:300]!r}")
            except Exception as e:
                out.append(f"{g['productId']} ERR {e}")
            break
    return "\n".join(out)

def won(n):
    try: return f"{int(n):,}원"
    except Exception: return ""

def next7():
    n = datetime.now(KST); t = n.replace(hour=7, minute=0, second=0, microsecond=0)
    if t <= n: t += timedelta(days=1)
    return t.isoformat()

def main():
    if not AK or not SK:
        print("COUPANG 키가 Secrets 에 없어서 건너뜀"); return 0
    p = os.path.join(ROOT, "data.json")
    d = json.load(open(p, encoding="utf-8"))
    changed = False

    if "goldbox" in sys.argv[1:] or len(sys.argv) == 1:
        gb = call("GET", BASE + "/products/goldbox", "subId=dagguu") or []
        if os.environ.get("CP_DEBUG"):
            open(os.path.join(ROOT, "debug_gb.json"), "w", encoding="utf-8").write(json.dumps([{k: v for k, v in g.items() if k != "productUrl"} for g in gb[:12]], ensure_ascii=False, indent=1))
            open(os.path.join(ROOT, "debug_title.txt"), "w", encoding="utf-8").write(dbg_fetch(gb))
        travel = [g for g in gb if "AFFTDP" in str(g.get("productUrl", "")) or "여행" in str(g.get("categoryName", "")) or str(g.get("productName", "")).startswith("[")]
        rest = [g for g in gb if g not in travel]
        pick = (travel + rest)[:10]
        end = next7()
        for g in pick:
            if "AFFTDP" in str(g.get("productUrl", "")) and g.get("productId"):
                t = trip_title(g["productId"])
                g["productName"] = t if t else "쿠팡트래블 골드박스 특가 · " + str(g.get("productName", ""))
        d["goldbox"] = [{
            "name": g.get("productName", ""), "u": g.get("productUrl", ""), "img": g.get("productImage", ""),
            "rate": (f"{g['discountRate']}%" if g.get("discountRate") else ""), "rocket": bool(g.get("isRocket")), "price": won(g.get("productPrice")),
            "endAt": end} for g in pick if g.get("productUrl")]
        d["goldboxUpdated"] = datetime.now(KST).strftime("%H:%M")
        changed = True
        print(f"골드박스 {len(d['goldbox'])}개 갱신")

    if "deeplink" in sys.argv[1:] or len(sys.argv) == 1:
        todo = [it for it in d.get("items", []) if it.get("cpUrl") and not it.get("viewUrl")]
        for i in range(0, len(todo), 20):
            chunk = todo[i:i + 20]
            res = call("POST", BASE + "/v1/deeplink", body={"coupangUrls": [it["cpUrl"] for it in chunk]}) or []
            by = {r.get("originalUrl"): r.get("shortenUrl") for r in res}
            for it in chunk:
                if by.get(it["cpUrl"]):
                    it["viewUrl"] = by[it["cpUrl"]]; changed = True
        print(f"체험단 링크 변환 {sum(1 for it in todo if it.get('viewUrl'))}/{len(todo)}개")

    if changed:
        open(p, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
    return 0

if __name__ == "__main__":
    sys.exit(main())
