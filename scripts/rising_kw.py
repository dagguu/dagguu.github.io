#!/usr/bin/env python3
"""떡상 키워드(2026-10-22 시온님 "주제는 네이버 인기검색어로, 떡상키워드"): 육아·살림·리빙 상품 키워드 후보를
네이버 검색어트렌드 API(데이터랩)로 최근 7일 평균 ÷ 그전 28일 평균(jump)을 재고, 검색광고 키워드도구로 월간 검색 수(vol)를 붙여
scripts/rising_kw.json 에 jump 큰 순으로 남긴다. 스레드 글·추천 모음 페이지 주제 고를 때 쓴다(vol 3,000 이상·jump 1.2 이상 우선).
키는 datalab.yml 과 같은 Secrets(시온님이 직접). 후보 단어는 POOL 에 추가."""
import json, os, sys
from datetime import datetime, timedelta
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import datalab_trend as D
POOL = {
 "육아": "아기띠 유모차 휴대용유모차 카시트 젖병 분유포트 아기물티슈 기저귀 이유식 이유식마스터기 아기욕조 아기세제 아기로션 아기샴푸 수면조끼 아기내복 아기이불 범퍼침대 아기침대 유아식탁의자 빨대컵 치발기 아기장난감 쏘서 점퍼루 아기체육관 유아칫솔 아기가습기 아기선크림 기저귀가방 역류방지쿠션 수유쿠션 아기모빌 콧물흡입기 귀체온계 아기손톱깎이 놀이매트 유아방한화 유아패딩 아기양말 돌선물 출산선물 백일선물 유아책상 아기수면등 유아변기 아기뮤직박스 유아블럭 자석블럭",
 "살림": "무드등 가습기 제습기 전기요 온수매트 전기장판 극세사이불 수면양말 핫팩 난방텐트 문풍지 뽁뽁이 단열시트 전기히터 온풍기 서큘레이터 공기청정기 로봇청소기 무선청소기 침구청소기 건조기시트 캡슐세제 섬유유연제 섬유탈취제 디퓨저 수세미 행주 키친타올 밀폐용기 지퍼백 김장매트 김장비닐 에어프라이어 전기밥솥 커피머신 텀블러 보온병 도시락통 냄비세트 프라이팬 리빙박스 빨래건조대 욕실화 규조토발매트 샤워기필터 크리스마스트리 크리스마스장식 트리전구 극세사담요 전기주전자 손난로 패딩세탁 옷걸이 정리함 화장지 생수 라면",
}
def main():
    K = []
    for v in POOL.values():
        for k in v.split():
            if k not in K: K.append(k)
    vol, _ = D.sa_all(K)
    if not (D.CID and D.CSEC): print("::error::NAVER_CLIENT_ID/SECRET 없음"); return
    now = datetime.now(D.KST).date(); end = now - timedelta(days=1); start = end - timedelta(days=34); cut = end - timedelta(days=6)
    res, fails = {}, 0
    for i in range(0, len(K), 5):
        grp = K[i:i + 5]
        try: data = D.call(grp, start.isoformat(), end.isoformat())
        except Exception as e:
            fails += 1; print(f"::warning::데이터랩 실패 {getattr(e,'code','')}")
            if fails >= 3: break
            continue
        for k in grp:
            pts = data.get(k) or []
            a = [p["ratio"] for p in pts if p["period"] >= cut.isoformat()]; b = [p["ratio"] for p in pts if p["period"] < cut.isoformat()]
            if not a or not b: continue
            aa, bb = sum(a) / len(a), sum(b) / len(b)
            res[k] = {"jump": round(aa / bb, 2) if bb else None}
    cat = {k: c for c, v in POOL.items() for k in v.split()}
    rows = []
    for k, r in res.items():
        v = (vol.get(k) or {}).get("vol")
        rows.append({"kw": k, "cat": cat.get(k), "jump": r["jump"], "vol": v})
    rows.sort(key=lambda r: -(r["jump"] or 0))
    out = {"updated": datetime.now(D.KST).strftime("%Y-%m-%d %H:%M"), "period": f"최근7일({cut}~{end}) ÷ 그전28일", "rows": rows}
    json.dump(out, open(os.path.join(D.ROOT, "scripts", "rising_kw.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    top = [r for r in rows if (r["vol"] or 0) >= 3000][:5]
    print("::notice::떡상 상위", ", ".join(f"{r['kw']}×{r['jump']}" for r in top))
if __name__ == "__main__": main()
