#!/usr/bin/env python3
"""쿠팡 파트너스 실적 리포트(최근 30일 클릭·주문·수익)를 공식 API 로 받아 시온님 네이버 메일로 보낸다.

저장소가 공개라서 금액·주문 상세는 저장소·Actions 로그에 남기지 않는다(메일로만).
저장소에는 많이 팔린 분류 이름 순위만 scripts/buy_trends.json 에 남긴다(숫자 없음) — 사이트 특가·알림 고를 때 참고.
비밀값: COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY (쿠팡), NAVER_MAIL_ID / NAVER_MAIL_PW (메일). Claude 는 보지 않는다.
"""
import os, sys, json, smtplib, collections
from datetime import datetime, timedelta
from email.message import EmailMessage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import coupang_api as C

ROOT = C.ROOT
now = datetime.now(C.KST)
end = (now - timedelta(days=1)).strftime("%Y%m%d")
start = (now - timedelta(days=30)).strftime("%Y%m%d")


def rows(kind):
    out, page = [], 0
    while page < 30:
        q = f"startDate={start}&endDate={end}&page={page}"
        try:
            d = C.call("GET", f"{C.BASE}/v1/reports/{kind}", q)
        except Exception as e:
            print(f"::warning::{kind} 리포트 실패 {getattr(e, 'code', '')} {str(e)[:80]}")
            return out
        if isinstance(d, dict):
            d = d.get("data") or d.get("content") or d.get("list") or []
        if not d:
            break
        out += d
        if len(d) < 100:
            break
        page += 1
    return out


def num(x):
    try: return float(str(x).replace(",", ""))
    except Exception: return 0.0


def g(r, *keys):
    for k in keys:
        if k in r and r[k] not in (None, ""): return r[k]
    return ""


clicks, orders, comm = rows("clicks"), rows("orders"), rows("commission")
tot_click = sum(num(g(r, "click", "clicks", "clickCount")) for r in clicks)
by_sub = collections.defaultdict(lambda: {"click": 0, "order": 0, "gmv": 0, "fee": 0})
for r in clicks:
    by_sub[g(r, "subId") or "(없음)"]["click"] += num(g(r, "click", "clicks", "clickCount"))
cat = collections.Counter(); prod = collections.Counter(); fee_total = gmv_total = 0
for r in orders:
    s = by_sub[g(r, "subId") or "(없음)"]
    gm, fe = num(g(r, "gmv", "orderAmount", "amount")), num(g(r, "commission", "commissionAmount"))
    s["order"] += 1; s["gmv"] += gm; s["fee"] += fe; gmv_total += gm; fee_total += fe
    cat[g(r, "categoryName", "category") or "기타"] += 1
    prod[(g(r, "productName", "itemName") or "")[:40]] += 1

json.dump({"updated": now.strftime("%Y-%m-%d"), "period": f"{start}-{end}", "categories": [c for c, _ in cat.most_common(15)]},
          open(os.path.join(ROOT, "scripts", "buy_trends.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

w = lambda n: f"{int(n):,}"
lines = [f"기간 {start} ~ {end} (최근 30일)", "",
         f"클릭 {w(tot_click)}회 · 주문 {len(orders)}건 · 주문금액 {w(gmv_total)}원 · 수익 {w(fee_total)}원",
         (f"클릭 → 주문 전환율 {len(orders) / tot_click * 100:.1f}%" if tot_click else ""), "",
         "■ 경로별 (subId: dagguu=사이트, dagguuchat=단톡방)"]
for k, s in sorted(by_sub.items(), key=lambda x: -x[1]["click"]):
    lines.append(f"- {k}: 클릭 {w(s['click'])} · 주문 {s['order']} · 수익 {w(s['fee'])}원")
lines += ["", "■ 많이 산 분류"] + [f"- {c}: {n}건" for c, n in cat.most_common(10)]
lines += ["", "■ 많이 산 상품"] + [f"- {p}: {n}건" for p, n in prod.most_common(15)]
if comm:
    lines += ["", "■ 일별 수익(최근 7일)"] + [f"- {g(r,'date')}: {w(num(g(r,'commission','commissionAmount')))}원" for r in comm[-7:]]
body = "\n".join(l for l in lines if l is not None)

uid, pw = os.environ.get("NAVER_MAIL_ID", "").strip(), os.environ.get("NAVER_MAIL_PW", "").strip()
if not uid or not pw:
    print("메일 비밀값이 없어 건너뜀"); sys.exit(0)
addr = uid if "@" in uid else uid + "@naver.com"
m = EmailMessage(); m["Subject"] = f"[다꾸] 쿠팡 실적 리포트 {now.strftime('%m/%d')}"; m["From"] = addr; m["To"] = addr
m.set_content(body)
with smtplib.SMTP_SSL("smtp.naver.com", 465) as s:
    s.login(uid.split("@")[0], pw); s.send_message(m)
print(f"메일 보냄 (클릭 리포트 {len(clicks)}줄, 주문 {len(orders)}줄)")
