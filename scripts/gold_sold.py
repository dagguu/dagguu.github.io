"""골드박스 '판매됨 %'(쿠팡 골드박스 화면 promotionClosingInfo.rate)를 data.json goldAll 에 붙인다.
사용: python3 scripts/gold_sold.py "pid:rate,pid:rate,..."  (2026-10-28 시온님 "마감임박 그래프 똑같이, 마감임박 상위로")
브라우저(pages.coupang.com/p/121237)에서:
  P=document.querySelector('.discount-product-unit').__vue__.$parent.$parent.$parent.productsInfo
  P.filter(x=>x.promotionClosingInfo&&x.promotionClosingInfo.isActive).map(x=>x.productId+':'+x.promotionClosingInfo.rate).join(',')
"""
import json, os, re, sys
from datetime import datetime, timedelta, timezone
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, "data.json")
m = dict(x.split(":") for x in sys.argv[1].split(",") if ":" in x)
d = json.load(open(p, encoding="utf-8"))
n = 0
for x in d.get("goldAll") or []:
    r = re.search(r"products/(\d+)", x.get("cpUrl") or "")
    if r and r.group(1) in m:
        x["sold"] = int(m[r.group(1)]); n += 1
    else:
        x.pop("sold", None)
d["goldSoldAt"] = datetime.now(timezone(timedelta(hours=9))).strftime("%H:%M")
open(p, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
print(f"판매율 {n}개 붙임 ({d['goldSoldAt']})")
