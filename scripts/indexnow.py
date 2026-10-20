"""IndexNow: 새로 생긴 페이지 주소를 네이버(서치어드바이저)·빙 등에 바로 알린다.
- s/ (체험단 공유 페이지): 처음 보이는 주소만 한 번 보냄
- 그 밖(홈·c/·r/·g/·p/ 모아보기): 하루 한 번 다시 보냄(새 체험단 링크가 생겼다는 신호)
- 보낸 기록: scripts/indexnow_sent.json {url: 보낸 날짜}
- 사이트에 아직 안 올라간(404) 주소는 보내지 않고 다음 실행 때 다시 본다.
키는 공개용(사이트 루트 <key>.txt), 비밀이 아님."""
import json, os, re, time, glob, urllib.request, datetime

HOST = "www.dagguu.com"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = [os.path.basename(p)[:-4] for p in glob.glob(os.path.join(ROOT, "*.txt"))
       if re.fullmatch(r"[0-9a-f]{32}\.txt", os.path.basename(p))][0]
SENT = os.path.join(ROOT, "scripts", "indexnow_sent.json")
TODAY = (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).strftime("%Y-%m-%d")
ENDPOINTS = ["https://searchadvisor.naver.com/indexnow", "https://api.indexnow.org/indexnow"]

def live(u):
    try:
        req = urllib.request.Request(u + ("&" if "?" in u else "?") + "inx=" + str(int(time.time())), method="HEAD")
        return urllib.request.urlopen(req, timeout=20).status == 200
    except Exception:
        return False

def main():
    xml = open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8").read()
    locs = [l.replace("&amp;", "&") for l in re.findall(r"<loc>([^<]+)</loc>", xml)]
    sent = json.load(open(SENT)) if os.path.exists(SENT) else {}
    want = [u for u in locs if (u not in sent) if "/s/" in u] + \
           [u for u in locs if "/s/" not in u and sent.get(u) != TODAY]
    if not want:
        print("보낼 주소 없음"); return
    # 배포가 끝날 때까지 기다림(새 s/ 주소 하나로 확인, 최대 6분)
    probe = next((u for u in want if "/s/" in u), want[0])
    for _ in range(24):
        if live(probe): break
        time.sleep(15)
    ok = [u for u in want if "/s/" not in u or live(u)] if len(want) <= 60 else want
    if not live(probe):
        ok = [u for u in ok if "/s/" not in u]
    if not ok:
        print("아직 배포 전"); return
    body = json.dumps({"host": HOST, "key": KEY, "keyLocation": f"https://{HOST}/{KEY}.txt",
                       "urlList": ok[:10000]}).encode()
    good = False
    for ep in ENDPOINTS:
        try:
            r = urllib.request.urlopen(urllib.request.Request(ep, data=body, method="POST",
                headers={"Content-Type": "application/json; charset=utf-8"}), timeout=30)
            print(ep, r.status); good = good or r.status in (200, 202)
        except urllib.error.HTTPError as e:
            print(ep, e.code, e.read()[:200]); good = good or e.code in (200, 202)
        except Exception as e:
            print(ep, "error", e)
    if good:
        for u in ok: sent[u] = TODAY
        live_set = set(locs)
        sent = {u: d for u, d in sent.items() if u in live_set or d >= TODAY}  # 사이트맵에서 빠진 옛 주소 정리
        json.dump(sent, open(SENT, "w"), ensure_ascii=False, indent=0, sort_keys=True)
        print("보냄", len(ok), "개 (s/ 새 페이지", sum("/s/" in u for u in ok), ")")

if __name__ == "__main__":
    main()
