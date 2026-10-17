# 경쟁률(지원자/모집) 수집 방법

2026-10-18에 확인한 결과: 모아뷰·체험모아에 나오는 지원자 수는 실제보다 하루에서 열흘 늦어서 쓰지 않는다.
- 예) 리뷰노트 지금광안리: 모아뷰 88, 체험모아 62, 실제 115 (모집 4)

그래서 **각 체험단 사이트에서 직접** 읽는다. 내장 브라우저로 각 사이트를 연 탭 안에서 fetch 한다(읽기만 한다).

## 0. 대상 목록 만들기
data.json 에서 모집 중(end ≥ 오늘)인 items 의 applyUrl 을 호스트별 id 목록으로 만든다.
- 키 규칙: `호스트(www. 뺌)#주소 속 마지막 4자리 이상 숫자` (scripts/apply_ap.py 의 key()와 같음)

```
python3 - <<'E'
import json,re
from urllib.parse import urlparse
d=json.load(open('data.json')); g={}
for i in d['items']:
  if (i.get('end') or '9999')<TODAY: continue
  x=urlparse(i.get('applyUrl','')); m=re.findall(r'\d{4,}',x.query+x.path)
  if m: g.setdefault(x.netloc.replace('www.','',1),[]).append(m[-1])
print(json.dumps({h:' '.join(v) for h,v in g.items()}))
E
```

## 1. 사이트별 읽는 법
결과는 모두 `id: "지원자/모집"` 형태로 모은다.

| 사이트(호스트) | 탭 | 방법 |
|---|---|---|
| 리뷰노트 reviewnote.co.kr | https://www.reviewnote.co.kr/campaigns | `/api/v2/campaigns?s=default&sort=VISIT&categoryId=d1910206-2676-433b-958f-6cb6e7385d1c&search=키워드&limit=100&page=N`. 숙박 키워드: 펜션·호텔·리조트·풀빌라·글램핑·캠핑·숙박·한옥·스테이·독채·카라반·게스트하우스·민박·숙소·빌라·모텔·하우스·캠프. 그리고 sort=VISIT/DELIVERY/PURCHASE/REPORTER 를 search 없이 읽는다(제품). 값은 `applicantCount / infNum`. status 가 SELECT 가 아니면(PROGRESS 등) 모집이 끝난 것이라 넣지 않는다. 상세 API 는 없다. |
| 포포몬 popomon.com | https://popomon.com/next/campaign/{아무 id} | `/api_p/campaignDetail/fetch_getCampaignData?contentIdx={id}` → `data.contentsData.C_volunteer_count / C_choice_count`, 0.25초 간격. 페이지 글자의 "신청 N / M명"은 위쪽 슬라이드에 다른 캠페인도 섞여 있어서 쓰지 않는다. |
| 스타일씨 stylec.co.kr | 아무 탭 | trial API(`count=200`, 페이지 끝까지) → `wr_id` 별 `tr_enroll_cnt / tr_recruit_max` (화면 "신청 N명 / M명"과 같음) |
| 강남맛집 xn--939au0g4vj8sq.net | 그 사이트 탭 | `fetch('/cp/?id={id}')` HTML 에서 태그를 지운 글자 속 `신청자 a / b`, 0.4초 간격 |
| 리뷰플레이스 reviewplace.co.kr | 그 사이트 탭 | `fetch('/pr/?id={id}')` HTML 의 `id='cmp_curr_num'>a/b`, 0.4초 간격 |
| 레뷰 revu.net | https://www.revu.net/campaign/{아무 id} | SPA 라서 숨은 iframe(`/campaign/{id}`)을 열고 innerText 의 `신청자 a / b명`을 읽는다(한 곳에 1~3초, 0.5초 쉼). 오래 걸리므로 `(async()=>{...})()` 로 페이지 안에서 돌리고 window 변수를 나중에 읽는다. api.weble.net 은 쓰지 않는다. |

그 밖의 작은 사이트(링블·뷰티의여왕 등)는 아직 읽지 않는다. 이런 곳은 경쟁률이 보이지 않을 뿐이다.

## 2. 반영
scripts/ap_counts.json 을 쓴다.

```
{"at": "2026-10-18T10:15:00+09:00",
 "counts": {"reviewnote.co.kr#1486949": [59, 3], ...}}
```

그다음 `python3 scripts/apply_ap.py` → `python3 scripts/gen_share.py` → 커밋·push 한다.
- apply_ap.py 는 이번에 못 읽은 체험단의 예전 숫자를 지운다(오래된 경쟁률을 보여 주지 않으려고).
- 숫자를 고치거나 지어내지 않는다. 읽지 못한 곳은 비워 둔다.
