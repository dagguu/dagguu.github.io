#!/usr/bin/env python3
"""공구 탭 '엄마들 장바구니 · 선물 추천' 테마 랭킹 → rank.json (2026-10-23 시온님 "공구 페이지에 이거 넣어줘, 선물추천도")

진짜 데이터만 쓴다:
- 쿠팡 카테고리 베스트(data.json moreDeals, k=분류) 순서 = 쿠팡 공식 API 가 준 베스트 순서
- 골드박스(goldAll·babyDeals·lifeDeals), 계절 검색(seasonDeals)
- 선물 추천 = 다꾸 추천 모음(scripts/picks_*.json)에서 고른 상품
'N건 구매'·'N명 보는중'·순위 변동 같은 숫자는 데이터가 없어서 만들지 않는다(지어내면 표시광고법 위반).
제한 브랜드(cp_banned)는 뺀다.
"""
import json, os, re, sys, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
try:
    from cp_banned import is_banned
except Exception:
    def is_banned(n): return False

D = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))

def won(p):
    if isinstance(p, (int, float)): return "{:,}원".format(int(p))
    return p or ""

def item(x):
    u = x.get("u") or x.get("url") or ""
    if not u or not x.get("name") or is_banned(x["name"]): return None
    return {"n": x["name"], "u": u, "img": x.get("img", ""), "p": won(x.get("price")), "r": bool(x.get("rocket"))}

def pick(src, rx=None, ex=None, n=10):
    out, seen = [], set()
    for x in src:
        nm = x.get("name", "")
        if rx and not re.search(rx, nm): continue
        if ex and re.search(ex, nm): continue
        k = re.sub(r"\s+", "", nm)[:14]
        if k in seen: continue
        it = item(x)
        if not it: continue
        seen.add(k); out.append(it)
        if len(out) >= n: break
    return out

MD = D.get("moreDeals") or []
def cat(k): return [x for x in MD if x.get("k") == k]
GOLD = (D.get("babyDeals") or []) + (D.get("goldAll") or [])
SEA = D.get("seasonDeals") or {}

def picks(slug, idx=None):
    p = os.path.join(ROOT, "scripts", "picks_%s.json" % slug)
    if not os.path.exists(p): return []
    j = json.load(open(p, encoding="utf-8"))
    secs = j.get("sections", [])
    if idx is not None: secs = [secs[i] for i in idx if i < len(secs)]
    return [it for s in secs for it in s.get("items", [])]

SNACK = r"요거트|요구르트|우유|두유|치즈|젤리|과자|쌀과자|떡뻥|퓨레|주스|고구마|바나나|이유식|유아식|빵|쿠키|크래커|김|어린이"
T = []
def add(k, tab, head, em, src, items, more=""):
    if len(items) >= 4: T.append({"k": k, "tab": tab, "h": head, "em": em, "src": src, "items": items, "more": more})

add("snack", "뭐 먹이지?", "아이 간식·먹거리", "🍼", "쿠팡 출산/유아동·식품 베스트 순서",
    pick(cat("출산/유아동") + cat("식품") + GOLD, SNACK, r"강아지|고양이|반려|성인|다이어트|술|맥주|커피"))
add("gift", "출산선물 추천", "출산선물 · 예산별", "🎁", "다꾸 추천 모음에서 고른 상품",
    pick(picks("birth_gift")), "/p/birth-gift.html")
add("toy", "아이 선물", "아이 선물 · 장난감·책", "🧸", "쿠팡 출산/유아동 베스트 순서",
    pick(cat("출산/유아동") + GOLD, r"장난감|블록|인형|퍼즐|책|그림책|자석|놀이|미끄럼|자동차|키즈|레고|색칠|스티커|피규어", r"기저귀|물티슈|유산균|비타민|영양|분유|이유식|로션|샴푸"))
add("halloween", "할로윈 준비", "할로윈 의상·소품", "🎃", "다꾸 추천 모음에서 고른 상품",
    pick(picks("halloween_kids", [0, 1, 2])), "/p/halloween-kids.html")
add("wipe", "물티슈·기저귀", "물티슈·기저귀", "🧻", "쿠팡 골드박스·출산/유아동 베스트",
    pick(D.get("babyDeals", []) + cat("출산/유아동") + GOLD, r"물티슈|기저귀|팬티"))
add("grocery", "장바구니", "오늘 장보기", "🥬", "쿠팡 식품 베스트 순서",
    pick(cat("식품") + GOLD, r"로켓프레시|채소|버섯|배추|무|양파|대파|감자|고구마|사과|바나나|귤|계란|달걀|두부|우유|고기|돼지|소고기|닭|생선|쌀|김치", r"강아지|고양이|반려"))
add("life", "살림 또산템", "살림 또산템", "🧺", "쿠팡 골드박스·생활용품 베스트",
    pick((D.get("lifeDeals") or []) + cat("생활용품")))
add("winter", "겨울 준비", "포근한 겨울 준비", "🛏️", "쿠팡 검색 상품",
    pick([x for k in ("겨울이불", "극세사 이불", "전기요", "전기장판", "수면양말") for x in SEA.get(k, [])]))
add("mom", "엄마 선물", "엄마를 위한 작은 선물", "💝", "쿠팡 뷰티·헬스 베스트 순서",
    pick(cat("뷰티") + cat("헬스/건강식품"), None, r"남성|맨즈|옴므"))

out = {"at": time.strftime("%Y-%m-%d"), "themes": T}
json.dump(out, open(os.path.join(ROOT, "rank.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("랭킹 테마", len(T), [t["k"] + ":" + str(len(t["items"])) for t in T])
