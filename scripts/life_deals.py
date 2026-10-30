#!/usr/bin/env python3
"""오늘의 생활용품 핫딜(2026-10-20 시온님 요청): 골드박스 화면에서 읽은 상품 카드 중 생활용품만 골라 data.json lifeDeals 를 통째로 바꾼다.
입력: scripts/goldbox_cards.json = [{"pid","itemId","vendorItemId","name","rate","price","orig","img","sold"(판매됨 %, promotionClosingInfo.rate)}, ...]
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
    ga.append({"name": n, "cpUrl": cp, "u": oldg.get(cp, ""), "img": img, "rate": str(c.get("rate") or "").strip("% "), "price": pr(c.get("price")), "orig": pr(c.get("orig")) if c.get("rate") else "", "endAt": end, **({"sold": int(c["sold"])} if c.get("sold") not in (None, "") else {})})
d["goldAll"] = ga
if any("sold" in x for x in ga):
    from datetime import datetime as _dt, timedelta as _td, timezone as _tz
    d["goldSoldAt"] = _dt.now(_tz(_td(hours=9))).strftime("%H:%M")
# 골드박스 숙소·레저 티켓(2026-10-30 시온님 "쿠팡 골드박스 숙소나 레저 티켓 특가상품에 매일 같이"): 여행 상품은 /vp/products 주소로는 수익 링크가 안 만들어져서
# 쿠팡트래블 상품 주소로 goldTravel 에 따로 담는다 → coupang_api.py deeplink 가 u 를 채우고, 화면 여행 특가 카드(app.js tdList)가 함께 보여 준다.
TRAVEL = re.compile(r"리조트|호텔|펜션|풀빌라|글램핑|빌라|스테이|료칸|숙박|객실|1박|입장권|이용권|자유이용|티켓|워터파크|아쿠아리움|테마파크|월드|랜드|스파|온천|찜질")
NOT_T = re.compile(r"보호필름|피아노|매트|이불|베개|캐리어|가방|의자|침대|소파")
oldt = {x.get("cpUrl"): x.get("u") for x in d.get("goldTravel") or [] if x.get("u")}
def tclean(n):   # 판매자 문구(★오늘만…★·무료·후기·찬스 등)는 빼고 숙소·시설 이름만
    br = re.findall(r"\[([^\]]+)\]", n); area = br[0] if br and re.match(r"\s*\[", n) else ""
    if len(br) > 1 and not re.search(r"특가|골드박스|할로윈|가족|기획|한정|맞춤", br[1]): return br[1].strip(), area
    t = re.sub(r"★[^★]*★", " ", n); t = re.sub(r"\[[^\]]*\]", " ", t); t = t.split(",")[0]
    t = " ".join(w for w in t.split() if not re.search(r"무료|혜택|후기|추천|찬스|특가|최저가|만점|도보권|와우|오늘만|!", w))
    return t.strip(" ,·-"), area
gt, seen4 = [], set()
for c in cards:
    n = str(c.get("name") or "")
    if not c.get("pid") or not TRAVEL.search(n) or NOT_T.search(n) or not re.match(r"\s*\[", n) or n[:14] in seen4: continue
    seen4.add(n[:14]); nm, area = tclean(n)
    tix = bool(re.search(r"입장권|이용권|티켓|자유이용|워터파크|아쿠아리움|종일권", n)) and not re.search(r"호텔|리조트|스위트|펜션|풀빌라|레지던스|숙소|객실", nm)
    cp = f"https://trip.coupang.com/tp/products/{c['pid']}"
    img = str(c.get("img") or ""); img = ("https:" + img if img.startswith("//") else img).replace("230x230ex", "492x492ex")
    gt.append({"name": nm or n, "area": area, "kind": "레저 티켓" if tix else "숙소", "cpUrl": cp, "u": oldt.get(cp, ""), "img": img,
               "rate": str(c.get("rate") or "").strip("% "), "price": str(c.get("price") or ""), "orig": str(c.get("orig") or "") if c.get("rate") else "",
               "endAt": end, **({"sold": int(c["sold"])} if c.get("sold") not in (None, "") else {})})
d["goldTravel"] = gt
print("골드박스 숙소·티켓", len(gt), [x["name"] for x in gt])
import sys as _s, os as _o; _s.path.insert(0,_o.path.dirname(_o.path.abspath(__file__))); import cp_banned; print("제한 브랜드 뺌", cp_banned.clean(d))
open(p, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
print(f"생활용품 핫딜 {len(out)}개 · 골드박스 전체 {len(ga)}개 (카드 {len(cards)}개 중)")
