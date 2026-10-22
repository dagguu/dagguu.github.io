#!/usr/bin/env python3
"""오늘의 생활용품 핫딜(2026-10-20 시온님 요청): 골드박스 화면에서 읽은 상품 카드 중 생활용품만 골라 data.json lifeDeals 를 통째로 바꾼다.
입력: scripts/goldbox_cards.json = [{"pid","itemId","vendorItemId","name","rate","price","orig","img"}, ...]
  (07:23 아기용품 핫딜 작업이 골드박스 페이지 Vue 데이터 productsInfo 에서 품절 아닌 카드 전부를 저장)
사용: python3 scripts/life_deals.py   → push 하면 coupang.yml 이 cpUrl 로 u(수익 링크)를 채운다.
"""
import json, os, re, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIFE = re.compile(r"세제|섬유유연제|유연제|향기부스터|키친타올|화장지|휴지|수세미|클리너|크리너|물티슈|지퍼백|위생백|위생장갑|니트릴장갑|고무장갑|드라이시트|디퓨저|캔들|방향제|탈취제|배수관|락스|표백제|과탄산|탄산소다|베이킹소다|구연산|울샴푸|샴푸|린스|바디워시|핸드워시|치약|칫솔|면봉|화장솜|건전지|방풍|밀폐용기|청소포|밀대|걸레|건조대|리빙박스|쓰레기봉투|페이스타올|생리대|팬티라이너|핫팩|제습제|세탁망|도마")
NOT = re.compile(r"유아|아기|베이비|어린이|아동|키즈|기저귀|신생아|강아지|고양이|반려|펫|차량용|자동차|세차|탈모")
cards = json.load(open(os.path.join(ROOT, "scripts", "goldbox_cards.json"), encoding="utf-8"))
kst = datetime.timezone(datetime.timedelta(hours=9)); now = datetime.datetime.now(kst)
end = (now + datetime.timedelta(days=1 if now.hour >= 7 else 0)).strftime("%Y-%m-%dT07:00:00+09:00")
pick, seen = [], set()
for c in cards:
    n = str(c.get("name") or "")
    if not c.get("pid") or not LIFE.search(n) or NOT.search(n) or n[:14] in seen: continue
    seen.add(n[:14]); pick.append(c)
pick.sort(key=lambda c: -int(re.sub(r"\D", "", str(c.get("rate") or "0")) or 0))
p = os.path.join(ROOT, "data.json"); d = json.load(open(p, encoding="utf-8"))
old = {x.get("cpUrl"): x.get("u") for x in d.get("lifeDeals") or []}
out = []
for c in pick[:12]:
    cp = f"https://www.coupang.com/vp/products/{c['pid']}" + (f"?itemId={c['itemId']}&vendorItemId={c['vendorItemId']}" if c.get("itemId") and c.get("vendorItemId") else "")
    img = str(c.get("img") or ""); img = ("https:" + img if img.startswith("//") else img).replace("230x230ex", "492x492ex")
    pr = lambda v: (str(v) + "원") if v and not str(v).endswith("원") else (v or "")
    out.append({"name": c.get("name"), "cpUrl": cp, "u": old.get(cp, ""), "img": img, "rate": str(c.get("rate") or "").strip("% "), "price": pr(c.get("price")), "orig": pr(c.get("orig")) if c.get("rate") else "", "endAt": end})
d["lifeDeals"] = out
# 골드박스 전체(2026-10-22 시온님 "오늘이 제일 싸요 10개만 나와"): 화면의 품절 아닌 골드박스 카드 전부 → goldAll, push 후 coupang.yml 이 u 를 20개씩 채운다
oldg = {x.get("cpUrl"): x.get("u") for x in (d.get("goldAll") or []) + (d.get("lifeDeals") or []) + (d.get("babyDeals") or []) if x.get("u")}
ga, seen3 = [], set()
for c in cards:
    n = str(c.get("name") or "")
    if not c.get("pid") or n[:14] in seen3: continue
    seen3.add(n[:14])
    cp = f"https://www.coupang.com/vp/products/{c['pid']}" + (f"?itemId={c['itemId']}&vendorItemId={c['vendorItemId']}" if c.get("itemId") and c.get("vendorItemId") else "")
    img = str(c.get("img") or ""); img = ("https:" + img if img.startswith("//") else img).replace("230x230ex", "492x492ex")
    pr = lambda v: (str(v) + "원") if v and not str(v).endswith("원") else (v or "")
    ga.append({"name": n, "cpUrl": cp, "u": oldg.get(cp, ""), "img": img, "rate": str(c.get("rate") or "").strip("% "), "price": pr(c.get("price")), "orig": pr(c.get("orig")) if c.get("rate") else "", "endAt": end})
d["goldAll"] = ga
import sys as _s, os as _o; _s.path.insert(0,_o.path.dirname(_o.path.abspath(__file__))); import cp_banned; print("제한 브랜드 뺌", cp_banned.clean(d))
open(p, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
print(f"생활용품 핫딜 {len(out)}개 · 골드박스 전체 {len(ga)}개 (카드 {len(cards)}개 중)")
