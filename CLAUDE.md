# 다꾸 체험단 모음 작업 메모

- data.json(체험단 items, 토스 toss)을 바꾼 뒤에는 꼭 `python3 scripts/gen_share.py` 를 실행해서 s/(체험단 공유 페이지)와 t/(하루특가 공유 페이지)를 다시 만든 다음 함께 커밋한다. 공유 링크 미리보기 이미지가 여기서 나온다.
- sw.js 캐시 이름(dakku-vN)은 화면 코드를 바꿀 때 올린다.
- 쿠팡 파트너스 링크(배너 포함)는 시온님이 직접 만들어서 준다. Claude는 파트너스에서 링크를 생성하지 않는다. 받은 링크를 사이트에 넣는 것만 한다.
- 다이나믹 배너는 받은 코드의 id·trackingCode를 data.json 의 coupangBanner 에 넣으면 특가 탭 맨 위에 뜬다.
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
