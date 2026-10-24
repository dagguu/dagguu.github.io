# 국내숙소추천 매거진 (m/) 만드는 규칙 — 2026-10-24 시온님 요청

매일 숙소 1곳을 소개하는 글. 다꾸 매거진(#/mag?t=s)과 https://www.dagguu.com/m/ 에 올라간다.
같은 숙소를 그날 @dagguu.vlog 스레드 초안과 인스타 카드뉴스(정보성: 인기·신기한 숙소)에도 쓴다.

## 숙소 고르기
- 후보는 시온님이 보내 준 목록 scripts/stay_list.json [{name, area(알면), note, slug(쓰면 채움), done(날짜)}] 에서 위에서부터 done 이 없는 것.
  (출처 계정의 사진·글은 쓰지 않는다. 숙소 이름만 후보로 쓰고, 사진·사실은 쿠팡트래블에서.)
- 쿠팡트래블에 있는 숙소만: 이름 + 시·군이 둘 다 맞는 상품(trip.coupang.com/tp/products/{id}). 없거나 애매하면 done:"쿠팡에 없음" 으로 적고 다음 후보.
  쿠팡트래블 검색은 숨은 iframe 으로 하루 5곳 이내, 검색 사이 2~4초(차단 막기, CLAUDE.md 참고).
- 목록이 비면 그날은 쓰지 않고 시온님께 "숙소 목록이 비었어요" 알림.

## 사진 (가장 중요)
- 상품 페이지 HTML 의 hotel/<코드>/<uuid>.jpg 를 모두 모아 원본 주소 https://image.coupangcdn.com/image/travelConnect/hotel/... (안 열리면 .../image/travel_reactor/travelConnect/...)
- new Image() 로 크기 재서 폭 1080 이상만 → 격자로 전부 보고, "여기 어디야?" 싶은 컷만 고른다: 야경·노을·조명 켜진 수영장, 창밖 풍경 욕조, 햇살 드는 하얀 침구 객실, 숲·바다 뷰, 그 숙소만의 신기한 공간.
- photos 5~7장: [0] 표지(가장 강한 한 장) → 바깥 다른 컷 → 객실 1~2 → 욕실·스파·뷰 → 특별한 공간. 사람 얼굴·글씨·흐리거나 어두운 컷·주차장·안내판 제외. 계절에 어색한 컷(겨울에 낮 물놀이)은 표지로 쓰지 않는다.

## 글 (scripts/stays/<slug>.json)
- slug: 영문 소문자-하이픈(예: seongju-nemonamu). date: 올리는 날.
- 필드: slug, date, name(상품명에서 지역 접두어 뺀 이름), area("경북 성주"), region(9권역), type(펜션/풀빌라/한옥/호텔/리조트/글램핑…), theme("인기"|"신기한"|"감성"), pid,
  h1[두 줄, 각 14자 안팎], lead(2~3문장), photos[{src, cap}], points[[이모지, 굵은 말, 설명]] 3~4개, info[["주소",…],["입실·퇴실",…],["주변",…],["유형",…]],
  fit[어울리는 여행 3~4개], guide[{h, p[1~2문단]}] 1~2개(주변 즐길 거리·알아 둘 점), tags[검색어 5개: 지역+유형+추천 식, 예 "성주펜션" "가야산펜션" "히노끼탕펜션"].
- 사실은 쿠팡트래블 상품 페이지 JSON(introductions·facilities·landmarkDistance·address·productDetailType)에 있는 것만. 평점·순위·가격·"최고/1위/최저가/무료/역대급"·지어낸 후기 금지. 계절 운영(야외 수영장 하절기 등)은 그대로 밝힌다.
- 쉬운 존댓말(~해요). 매일 같은 문장을 쓰지 않는다.
- 쿠팡트래블 링크: data.json links["stay-<slug>"] = {"cpUrl": "https://trip.coupang.com/tp/products/{pid}"} → push 하면 coupang.yml 이 u 를 채운다(1~2분). u 가 생기면 글 아래 버튼이 뜬다.

## 마무리
- python3 scripts/gen_share.py (gen_stays.py 가 m/<slug>.html·m/index.html·m/list.json·sitemap 을 만든다) → ls s | wc -l 확인 → 커밋·push.
- scripts/stay_list.json 그 숙소에 slug·done 날짜 적기.
