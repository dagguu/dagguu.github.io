# 다꾸 체험단 모음 작업 메모

- data.json(체험단 items, 토스 toss)을 바꾼 뒤에는 꼭 `python3 scripts/gen_share.py` 를 실행해서 s/(체험단 공유 페이지)와 t/(하루특가 공유 페이지)를 다시 만든 다음 함께 커밋한다. 공유 링크 미리보기 이미지가 여기서 나온다.
- sw.js 캐시 이름(dakku-vN)은 화면 코드를 바꿀 때 올린다.
- 쿠팡 파트너스 링크(배너 포함)는 시온님이 직접 만들어서 준다. Claude는 파트너스에서 링크를 생성하지 않는다. 받은 링크를 사이트에 넣는 것만 한다.
- 다이나믹 배너는 받은 코드의 id·trackingCode를 data.json 의 coupangBanner 에 넣으면 특가 탭 맨 위에 뜬다.
