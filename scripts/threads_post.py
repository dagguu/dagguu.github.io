"""스레드(Threads) 예약 글 올리기 — 2026-10-22 시온님.
scripts/threads_queue.json: [{id, date(YYYY-MM-DD, 이 날짜 이후 첫 실행에 올림), text, img(공개 이미지 주소, 선택), link(선택)}]
올린 것은 scripts/threads_done.json 에 {id: 게시물 id} 로 남긴다.
Secrets(시온님이 직접): THREADS_TOKEN(장기 액세스 토큰, 60일마다 갱신), THREADS_USER_ID(없으면 me).
글 검사: 쿠팡 링크를 직접 넣은 글만 대가성 문구 필수(다꾸 페이지 링크만이면 안 씀, 2026-10-22 시온님), 쿠팡 파트너스 제한 브랜드·과장 문구 금지, 500자 이내."""
import json, os, re, sys, time, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import cp_banned
API = "https://graph.threads.net/v1.0/"
KST = timezone(timedelta(hours=9)); TODAY = datetime.now(KST).strftime("%Y-%m-%d")
HYPE = re.compile(r"역대급|미쳤|미친|가격\s*오류|최저가|제일\s*싸|오늘만|마지막\s*기회|서둘러|서두르|빨리|지금\s*달려|담아|안\s*사면\s*후회|품절되기|쿠팡\s*(실수|사고)|무조건")

def check(t):
    errs = []
    if len(t) > 500: errs.append(f"500자 넘음({len(t)})")
    if re.search(r"coupang\.com|coupa\.ng", t) and not re.search(r"\(광고\)|#광고|파트너스", t): errs.append("쿠팡 링크가 있는데 대가성 문구 없음")  # 2026-10-22 시온님: 다꾸 페이지 링크만 있는 글은 문구 안 씀
    if cp_banned.is_banned(t): errs.append("쿠팡 파트너스 제한 브랜드")
    m = HYPE.search(t)
    if m: errs.append("과장·긴급 문구: " + m.group(0))
    return errs

def call(path, params):
    req = urllib.request.Request(API + path, data=urllib.parse.urlencode(params).encode(), method="POST")
    with urllib.request.urlopen(req, timeout=60) as r: return json.loads(r.read())

def main():
    q = json.load(open(os.path.join(HERE, "threads_queue.json"), encoding="utf-8"))
    dp = os.path.join(HERE, "threads_done.json")
    done = json.load(open(dp, encoding="utf-8")) if os.path.exists(dp) else {}
    todo = [x for x in q if x["id"] not in done and x.get("date", "9999") <= TODAY]
    if "--check" in sys.argv:
        bad = 0
        for x in q:
            e = check(x["text"]); print(x["id"], "OK" if not e else e); bad += bool(e)
        return 1 if bad else 0
    tok = os.environ.get("THREADS_TOKEN"); uid = os.environ.get("THREADS_USER_ID") or "me"
    if not tok: print("THREADS_TOKEN 없음 — 건너뜀"); return 0
    if "--verify" in sys.argv:  # 글은 안 올리고 토큰·계정만 확인
        try:
            with urllib.request.urlopen(API + f"{uid}?fields=username&access_token=" + urllib.parse.quote(tok), timeout=30) as r:
                print("연결 확인:", json.loads(r.read()).get("username"))
        except Exception as e:
            print("연결 실패:", getattr(e, "code", ""), str(e)[:200])
        return 0
    for x in todo[:1]:  # 한 번에 1개만(같은 시간 여러 개 올리지 않음)
        e = check(x["text"])
        if e: print("올리지 않음", x["id"], e); continue
        p = {"text": x["text"], "access_token": tok}
        if x.get("img"): p.update(media_type="IMAGE", image_url=x["img"])
        else:
            p["media_type"] = "TEXT"
            if x.get("link"): p["link_attachment"] = x["link"]
        c = call(f"{uid}/threads", p)
        time.sleep(35)  # 이미지 처리 기다림(공식 안내 약 30초)
        r = call(f"{uid}/threads_publish", {"creation_id": c["id"], "access_token": tok})
        done[x["id"]] = r.get("id", ""); print("올림", x["id"], r.get("id"))
    json.dump(done, open(dp, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    return 0

if __name__ == "__main__":
    sys.exit(main())
