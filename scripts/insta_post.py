"""인스타그램 공식 API(Instagram API with Instagram Login) 게시 — 2026-10-22 시온님 @dagguu.home 연결.
Secrets INSTA_TOKEN(시온님이 직접, 60일 장기 토큰). Claude 는 토큰을 보지 않는다.
--verify: 글 없이 연결만 확인 → scripts/insta_status.json
게시(나중에 붙임): scripts/insta_post_queue.json [{id,date,at,caption,imgs[]}] — 1장은 IMAGE, 여러 장은 CAROUSEL.
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
    print("게시 기능은 아직 꺼져 있음"); return 0
if __name__ == "__main__": sys.exit(main())
