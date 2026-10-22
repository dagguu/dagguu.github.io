"""인스타그램 공식 API(Instagram API with Instagram Login) 게시 — 2026-10-22 시온님 @dagguu.home 연결.
Secrets INSTA_TOKEN(시온님이 직접, 60일 장기 토큰). Claude 는 토큰을 보지 않는다.
--verify: 글 없이 연결만 확인 → scripts/insta_status.json
게시: scripts/home_queue.json 중 date+at 이 지났고 아직 안 올린(scripts/insta_home_done.json) 가장 이른 1개를
  insta 브랜치 home/<id>/1~3.jpg (gen_home.py 가 만든 감성 카드)로 CAROUSEL 게시. 그림이 아직 없으면 건너뜀.
댓글·좋아요·팔로우·DM 자동화는 하지 않는다."""
import json, os, sys, time, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone
HERE = os.path.dirname(os.path.abspath(__file__))
API = "https://graph.instagram.com/v21.0/"
KST = timezone(timedelta(hours=9))
def now(): return datetime.now(KST).strftime("%Y-%m-%d %H:%M")
def get(path, tok):
    with urllib.request.urlopen(API + path + ("&" if "?" in path else "?") + "access_token=" + urllib.parse.quote(tok), timeout=30) as r: return json.loads(r.read())
def main():
    tok = os.environ.get("INSTA_TOKEN")
    sp = os.path.join(HERE, "insta_status.json")
    if not tok:
        json.dump({"ok": False, "code": "no-token", "at": now()}, open(sp, "w")); print("INSTA_TOKEN 없음"); return 0
    if "--verify" in sys.argv:
        try:
            u = get("me?fields=user_id,username,account_type,media_count", tok)
            st = {"ok": True, "user": u.get("username"), "type": u.get("account_type"), "media": u.get("media_count")}
            try:
                lim = get(f"{u.get('user_id') or 'me'}/content_publishing_limit?fields=quota_usage,config", tok)
                st["limit"] = lim.get("data", [{}])[0]
            except Exception as e: st["limit_err"] = getattr(e, "code", str(e)[:80])
        except Exception as e:
            body = ""
            try: body = e.read().decode()[:300]
            except Exception: pass
            st = {"ok": False, "code": getattr(e, "code", ""), "msg": body.replace(tok, "***")}
        st["at"] = now(); json.dump(st, open(sp, "w"), ensure_ascii=False); print(st.get("ok"), st.get("user")); return 0
    return post(tok)

RAW = "https://raw.githubusercontent.com/dagguu/dagguu.github.io/insta/home/"
def call(path, tok, data):
    data = dict(data, access_token=tok)
    req = urllib.request.Request(API + path, data=urllib.parse.urlencode(data).encode(), method="POST")
    with urllib.request.urlopen(req, timeout=60) as r: return json.loads(r.read())
def exists(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u, method="HEAD"), timeout=20) as r: return r.status == 200
    except Exception: return False
def post(tok):
    dp = os.path.join(HERE, "insta_home_done.json")
    done = json.load(open(dp)) if os.path.exists(dp) else []
    ids = {x["id"] for x in done}
    q = json.load(open(os.path.join(HERE, "home_queue.json"), encoding="utf-8"))
    todo = sorted([x for x in q if x["id"] not in ids and (x["date"] + " " + x.get("at", "21:00")) <= now()], key=lambda x: (x["date"], x.get("at", "")))
    if not todo: print("올릴 글 없음"); return 0
    x = todo[0]
    imgs = [f"{RAW}{x['id']}/{n}.jpg" for n in (1, 2, 3)]
    imgs = [u for u in imgs if exists(u)]
    if not imgs: print("그림이 아직 없음:", x["id"]); return 0
    try:
        me = get("me?fields=user_id", tok).get("user_id") or "me"
        if len(imgs) == 1:
            cid = call(f"{me}/media", tok, {"image_url": imgs[0], "caption": x["caption"]})["id"]
        else:
            kids = [call(f"{me}/media", tok, {"image_url": u, "is_carousel_item": "true"})["id"] for u in imgs]
            cid = call(f"{me}/media", tok, {"media_type": "CAROUSEL", "children": ",".join(kids), "caption": x["caption"]})["id"]
        for _ in range(20):
            st = get(f"{cid}?fields=status_code", tok).get("status_code")
            if st == "FINISHED": break
            if st == "ERROR": raise RuntimeError("container ERROR")
            time.sleep(6)
        mid = call(f"{me}/media_publish", tok, {"creation_id": cid})["id"]
        done.append({"id": x["id"], "media": mid, "at": now(), "n": len(imgs)})
        print("올림", x["id"], mid)
    except Exception as e:
        body = ""
        try: body = e.read().decode()[:300]
        except Exception: pass
        done.append({"id": x["id"], "fail": str(getattr(e, "code", e))[:80], "msg": body.replace(tok, "***"), "at": now()})
        print("실패", x["id"], body or e)
    json.dump(done, open(dp, "w"), ensure_ascii=False, indent=1); return 0
if __name__ == "__main__": sys.exit(main())
