# 국내숙소추천 매거진 (m/) 만드는 규칙 — 2026-10-24 시온님 요청

매일 숙소 1곳을 소개하는 글. 다꾸 매거진(#/mag?t=s)과 https://www.dagguu.com/m/ 에 올라간다.
같은 숙소를 그날 @dagguu.vlog 스레드 초안과 인스타 카드뉴스(정보성: 인기·신기한 숙소)에도 쓴다.

## 숙소 고르기
- 미리 써 둔 글(2026-10-25 시온님 "5개 정도 미리 써 줘"): scripts/stays/ 에 date 가 오늘인 글이 이미 있으면 그날은 새로 쓰지 않는다 — gen_share.py 만 돌려 공개하고(gen_stays 는 date<=오늘만 공개), 링크 u·화면을 확인한다. 미래 날짜 글이 다 떨어진 날부터 다시 하루 1개씩 쓴다.
- 후보는 시온님이 보내 준 목록 scripts/stay_list.json [{name, area, addr, note, slug, done}] 중 kind 가 없는(국내 숙소) 것·done 이 없는 것.
  순서(2026-10-25 시온님 "순서는 랜덤, 체험단 모집중인 숙소가 있다면 그 숙소를 먼저"): python3 scripts/pick_stay.py 가 고른다 —
  ① data.json 에 지금 모집 중인 숙박 체험단과 이름이 맞는 숙소(마감 가까운 순, 오늘 마감은 뒤로; 출력의 pid = 그 체험단 coupangPid 라 쿠팡트래블 검색 없이 바로 씀) → ② 나머지는 무작위.
  1번 후보가 쿠팡트래블에 없으면 done:"쿠팡에 없음" 적고 다음 후보.
  kind "overseas"(해외)·"ticket"(입장권)·"skip"(유스호스텔·게스트하우스)는 글로 쓰지 않는다.
- 글 json 의 pid 는 그 숙소 쿠팡트래블 상품번호. gen_stays.py 가 data.json 숙박 체험단 중 같은 coupangPid 를 찾아 글 위쪽(lead 아래)에
  모집 중이면 "✨ 이 숙소 체험단 모집 중이에요"(→ /s/<id>.html), 모집이 끝났으면 "🔔 알림받기 (카카오톡 채널 추가)"(data.json kakao 친구추가 주소) 상자를 자동으로 붙인다(2026-10-25 시온님). 체험단이 없던 숙소엔 안 붙는다.
  (출처 계정의 사진·글은 쓰지 않는다. 숙소 이름만 후보로 쓰고, 사진·사실은 쿠팡트래블에서.)
- 쿠팡트래블에 있는 숙소만: 이름 + 시·군이 둘 다 맞는 상품(trip.coupang.com/tp/products/{id}). 없거나 애매하면 done:"쿠팡에 없음" 으로 적고 다음 후보.
  쿠팡트래블 검색은 숨은 iframe 으로 하루 5곳 이내, 검색 사이 2~4초(차단 막기, CLAUDE.md 참고).
- 목록을 받으면(2026-10-24 시온님 "내가 리스트를 보내주면 그 숙소들의 특징을 파악하고 그 이후에는 알아서 숙소를 선택해줘"):
  목록 숙소들을 쿠팡트래블에서 보고(유형·지역·시설·사진 분위기) 공통 특징을 scripts/stay_style.json 에 정리한다:
  {from:[목록 숙소 이름], types:{유형:개수}, regions:{권역:개수}, features:[자주 나오는 시설·공간 예 "개별 수영장","통창 뷰","노천탕","독채","한옥","글램핑 텐트"],
   mood:[사진 분위기 예 "야경 조명","숲속","오션뷰","미니멀 화이트"], keywords:[쿠팡트래블 검색에 쓸 말 10~20개 예 "가평 풀빌라","제주 독채"], avoid:[안 맞는 유형]}.
- 목록이 다 떨어지면 시온님께 묻지 않고 알아서 고른다: stay_style.json 에 맞는 숙소를
  ① data.json items 의 cat "stay"(coupangPid 가 있는 곳, 모집이 끝난 곳 포함) 중 features·mood 에 맞는 곳 →
  ② 모자라면 stay_style.keywords 로 쿠팡트래블 검색(하루 5곳 이내).
  이미 쓴 숙소(scripts/stays/*.json 의 pid)·같은 지역 사흘 연속·같은 유형 사흘 연속은 피하고, 사진을 보고 style 과 가장 비슷한 곳 1곳.
  stay_list.json 에 {name, area, auto:true, slug, done} 으로 기록해 출처를 구분한다.
- 목록도 stay_style.json 도 없으면 그날은 쓰지 않고 시온님께 "숙소 목록을 보내 주세요" 알림.

## 사진 (가장 중요)
- 상품 페이지 HTML 의 hotel/<코드>/<uuid>.jpg 를 모두 모아 원본 주소 https://image.coupangcdn.com/image/travelConnect/hotel/... (안 열리면 .../image/travel_reactor/travelConnect/...)
- new Image() 로 크기 재서 폭 1080 이상만 → 격자로 전부 보고, "여기 어디야?" 싶은 컷만 고른다: 야경·노을·조명 켜진 수영장, 창밖 풍경 욕조, 햇살 드는 하얀 침구 객실, 숲·바다 뷰, 그 숙소만의 신기한 공간.
- photos 5~7장: [0] 표지(가장 강한 한 장) → 바깥 다른 컷 → 객실 1~2 → 욕실·스파·뷰 → 특별한 공간. 사람 얼굴·글씨·흐리거나 어두운 컷·주차장·안내판 제외. 계절에 어색한 컷(겨울에 낮 물놀이)은 표지로 쓰지 않는다.

## 글 (scripts/stays/<slug>.json)
- no: 글 번호(2026-10-25 시온님 "인포크링크처럼 번호로 검색") = scripts/stays/*.json 의 가장 큰 no + 1. 올라가는 날짜 순서대로 1, 2, 3… 이미 쓴 번호는 바꾸지 않는다. 표지·제목(No.N)·목록·검색에 쓰인다.
- slug: 영문 소문자-하이픈(예: seongju-nemonamu). date: 올리는 날.
- 필드: slug, date, name(상품명에서 지역 접두어 뺀 이름), area("경북 성주"), region(9권역), type(펜션/풀빌라/한옥/호텔/리조트/글램핑…), theme("인기"|"신기한"|"감성"), pid,
  h1[두 줄, 각 14자 안팎], lead(2~3문장), photos[{src, cap}], points[[이모지, 굵은 말, 설명]] 3~4개, info[["주소",…],["입실·퇴실",…],["주변",…],["유형",…]],
  fit[어울리는 여행 3~4개], guide[{h, p[1~2문단]}] 1~2개(주변 즐길 거리·알아 둘 점), tags[검색어 5개: 지역+유형+추천 식, 예 "성주펜션" "가야산펜션" "히노끼탕펜션"].
- 사실은 쿠팡트래블 상품 페이지 JSON(introductions·facilities·landmarkDistance·address·productDetailType)에 있는 것만. 평점·순위·가격·"최고/1위/최저가/무료/역대급"·지어낸 후기 금지. 계절 운영(야외 수영장 하절기 등)은 그대로 밝힌다.
- 쉬운 존댓말(~해요). 매일 같은 문장을 쓰지 않는다.
- 쿠팡트래블 링크: data.json links["stay-<slug>"] = {"cpUrl": "https://trip.coupang.com/tp/products/{pid}"} → push 하면 coupang.yml 이 u 를 채운다(1~2분). u 가 생기면 글 아래 "객실·가격 보기" 버튼이 뜬다(버튼에 "쿠팡트래블에서" 쓰지 않음, 2026-10-24 시온님).

## 마무리
- python3 scripts/gen_share.py (gen_stays.py 가 m/<slug>.html·m/index.html·m/list.json·sitemap 을 만든다) → ls s | wc -l 확인 → 커밋·push.
- scripts/stay_list.json 그 숙소에 slug·done 날짜 적기.

## 인플루언서 링크
- 시온님이 미리 준 인플루언서 링크는 scripts/stay_list.json 그 숙소 항목의 pid·infUrl 에 있다(2026-10-25 11곳). 그 숙소로 글을 쓸 때 data.json links["stay-<slug>"].infUrl 에도 같은 주소를 넣는다(gen_stays.py 는 pid 로도 찾아 쓴다).
- 같은 숙소의 체험단(data.json items, coupangPid 같음)에도 item.infUrl 이 들어가 있다.

- (2026-10-27 01:31 시온님 "입실이 저녁 6시가 아닌데?") 숙소 사실(입실·퇴실 시간, 수영장·부대시설 운영 여부·기간, 오픈 시기, 역까지 거리)은 쿠팡트래블 한 곳만 보지 말고 여기어때 숙소 페이지(WebFetch 가능) 등 두 번째 출처로 꼭 확인한다. 다르면 숙소 공식 안내 쪽을 쓰고 "상품마다 다를 수 있어요"를 붙인다. 운영이 멈춘 시설(예: 마티에 51층 수영장 2026-09-01~ 중단)은 대본·제목·표지에서 앞세우지 않는다.
