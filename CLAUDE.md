# 다꾸 체험단 모음 작업 메모

- data.json(체험단 items, 토스 toss)을 바꾼 뒤에는 꼭 `python3 scripts/gen_share.py` 를 실행해서 s/(체험단 공유 페이지)와 t/(하루특가 공유 페이지)를 다시 만든 다음 함께 커밋한다. 공유 링크 미리보기 이미지가 여기서 나온다.
- sw.js 캐시 이름(dakku-vN)은 화면 코드를 바꿀 때 올린다.
- 쿠팡 파트너스 링크(배너 포함)는 시온님이 직접 만들어서 준다. Claude는 파트너스에서 링크를 생성하지 않는다. 받은 링크를 사이트에 넣는 것만 한다.
- 다이나믹 배너는 받은 코드의 id·trackingCode를 data.json 의 coupangBanner 에 넣으면 특가 탭 맨 위("나를 위한 쿠팡 추천")에 뜬다. 지금 id 1039008 (고객 관심 기반, carousel). 폭은 화면에 맞춰 자동.
- 쿠팡 링크 자동화: 파트너스 공식 API를 GitHub Actions(.github/workflows/coupang.yml, scripts/coupang_api.py)로 돌린다. 키는 시온님이 저장소 Secrets(COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY)에 직접 넣는다. Claude는 키를 보거나 다루지 않는다.
- 새 체험단 등록 시: 숙소의 쿠팡 원본 주소를 item.cpUrl 에 넣고 viewUrl 은 비워 두면, push 후 Actions 가 파트너스 링크로 바꿔 viewUrl 에 채운다. 브라우저에서 파트너스 링크 생성 버튼을 누르지 않는다.
- 체험단 등록 절차 (매일):
  1. 내장 브라우저로 https://inflexer.net 을 열고, 같은 탭에서 fetch('https://inflexer.net:5000/search?query=키워드&media=BP_&media=BC_&media=IP_&media=IR_&media=YS_&media=YP_&type=VST&point=O&point=X&target=TOTAL') 로 키워드(펜션,호텔,리조트,풀빌라,글램핑,캠핑,숙박,한옥,스테이,독채,카라반,게스트하우스,민박,숙소,빌라)별 결과를 모은다(query= 빈 값은 결과가 앞부분만 잘려 나와서 숙박은 키워드로 모은다). category==='숙박' 이고 data.json 의 applyUrl 에 없는 것 중 apl_stt_dt 가 최근(어제~오늘)인 것만 후보.
  2. trip.coupang.com 탭에서 숨은 iframe 으로 /tp/search?q=숙소이름&productType=ACCOMMODATION... 를 열어 li.search-item 의 React props(product.productId, productName, path)를 읽는다. 이름과 지역(시·군)이 둘 다 맞을 때만 채택, 애매하면 버린다. 쿠팡에 없는 숙소는 등록하지 않는다.
  3. item: {id:"iYYYYMMDD-NNN", region(서울/경기/인천/강원/충청/전라/경상/부산/제주), name:"숙소이름 (시군)", benefit, start, end(apl_due_dt), image:"https:"+path, viewUrl:"", cpUrl:"https://trip.coupang.com/tp/products/{productId}", applyUrl, source(domain), coupangPid, cat:"stay", ch(BP_→blog, BC_→clip, YS_/YP_→youtube, IP_→insta, IR_→reels; 같은 숙소·제품의 다른 매체 캠페인도 찾아 ch 를 합친다), worth(제공내역에 "N만원 상당"이 있을 때만)}. 같은 coupangPid 가 이미 있으면 건너뛴다.
  4. gen_share.py → 커밋·push → Actions 가 viewUrl 을 채운다(1~2분). viewUrl 이 끝내 비면 다른 productId 로 바꿔 다시 push.
- 육아 체험단 등록 절차 (매일, 숙박 다음에):
  1. inflexer API 를 query= (빈 값), type=SHP 로 호출하면 배송형 전체가 나온다. category==='육아' 이고 apl_due_dt>=오늘, data.json applyUrl 에 없는 것만 후보.
  2. 브랜드·제품명이 확실한 것만 쿠팡 일반 상품에서 찾는다(www.coupang.com 탭에서 숨은 iframe 으로 /np/search?q=브랜드+제품명, a[href*="/vp/products/"] 중 sourceType=search 인 링크의 productId·itemId·vendorItemId·이미지). 브랜드와 제품이 정확히 같은 것만 채택. 브랜드 없는 제품, 교육·세탁·사주 같은 서비스는 등록하지 않는다.
  3. item: cat:"baby", region:"", name(브랜드+제품명), benefit(제공내역), start:"", end, image(쿠팡 이미지), viewUrl:"", cpUrl:"https://www.coupang.com/vp/products/{pid}?itemId=..&vendorItemId=..", ch, ages(제공내역에 신생아/0개월/임산부/초등 등이 명시될 때만: "임신 중","0~6개월","7~12개월","13~24개월","3~4세","5~7세","8세 이상"), worth(원문에 "N만원 상당"이 있을 때만).
  4. push 후 Actions 가 viewUrl 을 못 채운 것은 itemId 없이 /vp/products/{pid} 로 한 번 재시도, 그래도 안 되면 같은 브랜드의 비슷한 상품(세트 등)으로 바꾸고, 그것도 없으면 cpUrl 을 쿠팡 검색 주소(https://www.coupang.com/np/search?q=브랜드+제품명)로 넣어 API 가 검색결과 수익링크로 바꾸게 한다.
- 스타일씨 육아 체험단 (육아 절차에 같이): 내장 브라우저로 https://www.stylec.co.kr 을 열고 같은 탭에서 fetch('https://api2.stylec.co.kr:6439/v1/trial?order=default&page=N&count=200&include_finish=false') 를 페이지 끝까지 읽는다(data.data, data.Total). tr_it_cate_id==105000(출산/유아동)만 후보. applyUrl=https://www.stylec.co.kr/trials/{wr_id}, end=tr_recruit_finish 날짜, source:"스타일씨". sns_type: naverblog→blog, instagram→insta, instagramreels→reels, tiktok→tiktok, 빈 값(구매평)→ch 에 넣지 않음. wr_type_label 에 페이백/구매평이 있으면 item.pay 에 "payback"/"review" 를 넣는다. 같은 제품의 여러 캠페인은 하나로 합치고 ch 를 합친다. 쿠팡 매칭 기준은 육아와 같다(브랜드·제품 정확히 일치만).
- 맘카페(네이버 카페 10094499 메뉴 151)는 내장 브라우저 안전 정책상 열리지 않는다. 시도하지 않는다.
- 페이백·구매평 표시: item.pay 배열(payback, review). 제공내역에 페이백/선결제/구매평 글자가 있으면 화면이 자동으로 배지를 붙이지만, 알 수 있으면 pay 를 직접 넣는다. 숏폼은 short 를 쓰지 않고 clip(네이버 클립)/reels/youtube/tiktok 으로 나눈다.
- 아기용품 핫딜 배너 (매일 오전 7시 골드박스 교체 후): 내장 브라우저로 https://www.coupang.com/np/goldbox 를 열고(읽기만), 페이지를 천천히 끝까지 스크롤하며 상품 카드(이미지·상품명·할인율·가격·원가·/vp/products/ 링크)를 모은다. 아기·유아 상품(물티슈, 기저귀, 분유, 이유식, 젖병, 빨대컵, 유아 샴푸·워시·로션, 아기 유산균, 유아 장난감·책, 카시트 등)만 골라 data.json babyDeals 를 통째로 바꾼다: {name, cpUrl:"https://www.coupang.com/vp/products/{pid}?itemId=..&vendorItemId=..", u:"", img(230x230ex→492x492ex), rate, price, orig, endAt: 다음날 07:00+09:00}. 아동 의류·성인용 제품은 넣지 않는다. push 하면 Actions 가 u 를 채운다. 1~2분 뒤 u 가 빈 것은 itemId 없이 한 번 재시도하고, 그래도 비면 뺀다. 화면은 u 가 있는 것만, 2개 이상일 때 홈(곧 마감 아래)과 체험단 목록 중간 배너(육아는 첫 배너)로 보여준다.
- 회원 기능: Supabase(로그인·DB) + 카카오 로그인. data.json 의 auth {url, key(publishable/anon 키만), naver(선택)} 가 있어야 로그인 버튼이 켜진다. service_role/secret 키는 절대 사이트나 저장소에 넣지 않는다. 테이블·보안 규칙·룰렛 spin() 함수는 supabase/schema.sql (시온님이 SQL Editor 에서 실행). 룰렛 확률을 바꾸면 app.js ROULETTE 와 schema.sql spin() 의 odds 를 함께 바꾼다. 개인정보처리방침은 #/privacy (data.json privacy {owner, email, date}).
- 쿠팡 검색 위젯: data.json coupangSearch (coupa.ng 주소, 시온님이 파트너스에서 만들어 줌). 특가 탭 다이나믹 배너 위에 뜬다.
- 채널 소식 초안: 매일 11:23 예약 작업이 newsletter/YYYY-MM-DD.txt 를 쓴다(규칙은 newsletter/README.md). 카카오 채널 발송은 시온님이 직접 한다.
- 📷 최저가 확인(#/price, 2026-10-14 시온님 요청으로 숨김 — 특가 탭 입구 카드 제거, 주소로만 열림. Supabase 함수·키 설정은 안 함): 바코드(html5-qrcode)→Open Food Facts 로 상품명→Supabase Edge Function coupang-search(쿠팡 파트너스 검색 API, 12시간 캐시 price_cache)→쿠팡 결과·단위가격·마트가 비교. 함수 코드는 supabase/functions/coupang-search/index.ts, 쿠팡 키는 Supabase Secrets 에만(시온님이 직접). 네이버 쇼핑 검색 API 는 2026-07-31 종료라 못 씀.
- 다음에 할 일(시온님 보류): 육아·생필품 50개 쿠팡 가격 기록 → 30일 최저가 배지·카톡 소식, 이후 회원 목표가 웹푸시 알림.
