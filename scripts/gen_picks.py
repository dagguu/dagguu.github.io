#!/usr/bin/env python3
"""검색광고(파워링크) 도착용 추천 모음 페이지(2026-10-20 시온님 요청).
입력: scripts/picks_<slug>.json (상품은 쿠팡 공식 검색 API 결과 scripts/match_results.json 에서 고른 것, url 은 API 가 준 파트너스 링크)
출력: p/<slug>.html — 고르는 기준 + 예산별 상품 + 모집 중 육아 체험단. gen_share.py 끝에서 매일 다시 만든다(체험단 목록 갱신).
지킬 것: 상품마다 '좋다/1위' 같은 근거 없는 말 쓰지 않기, 가격은 조회한 날짜 기준이라고 밝히기, 맨 위 대가성 문구.
"""
import json, os, re, glob, html, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://www.dagguu.com"
e = lambda s: html.escape(str(s or ""), quote=True)
GA = re.search(r"^GA = '(.*?)'  #", open(os.path.join(ROOT, "scripts", "gen_share.py"), encoding="utf-8").read(), re.M).group(1)
d = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))
TODAY = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%Y-%m-%d")

CSS = """*{box-sizing:border-box}body{margin:0;background:#fff;color:#16151c;font-family:Pretendard Variable,Pretendard,-apple-system,sans-serif;-webkit-text-size-adjust:100%;touch-action:manipulation}
a{color:inherit;text-decoration:none}.w{max-width:640px;margin:0 auto;padding:0 16px 60px}
.disc{margin:0 -16px;padding:7px 16px;background:#f6f6f8;color:#77768a;font-size:11.5px;line-height:1.5;text-align:center}
header{display:flex;justify-content:space-between;align-items:center;height:56px}.logo{font-weight:800;font-size:19px;letter-spacing:-.03em}.logo i{font-style:normal;color:#6a3fc8}
header .app{font-size:13px;font-weight:700;color:#6a3fc8;border:1px solid #e3dbf7;border-radius:999px;padding:7px 12px}
.hero{padding:22px 0 8px}.hero small{display:inline-block;font-size:12px;font-weight:700;color:#6a3fc8;background:#f4f0ff;border-radius:999px;padding:5px 10px}
h1{font-size:26px;line-height:1.3;letter-spacing:-.03em;margin:12px 0 8px}.lead{font-size:15px;line-height:1.7;color:#4a4958;margin:0}
.tips{margin:22px 0 6px;padding:18px;border:1px solid #ececf2;border-radius:16px;background:#fafafa}.tips h2{font-size:16px;margin:0 0 10px}
.tips ul{margin:0;padding:0;list-style:none}.tips li{font-size:14px;line-height:1.65;color:#3d3c4a;padding:5px 0}.tips li b{color:#16151c}
.toc{display:flex;gap:8px;overflow-x:auto;margin:18px 0 0;padding-bottom:4px}.toc a{flex:none;font-size:13px;font-weight:700;border:1px solid #e6e6ee;border-radius:999px;padding:8px 12px}
.sec{margin-top:34px}.sec h2{font-size:20px;letter-spacing:-.02em;margin:0 0 6px}.sec>p{font-size:14px;color:#5b5a6a;line-height:1.6;margin:0 0 14px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.pc{display:flex;flex-direction:column;border:1px solid #ececf2;border-radius:16px;overflow:hidden;background:#fff}
.pc .im{position:relative;aspect-ratio:1;background:#f4f4f7}.pc img{width:100%;height:100%;object-fit:cover;display:block}
.pc .rk{position:absolute;left:8px;top:8px;background:#fff;color:#1e6fff;font-size:11px;font-weight:800;border-radius:6px;padding:3px 6px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.pc .k{font-size:11.5px;color:#8a8994;margin:10px 10px 2px}.pc .n{font-size:13.5px;line-height:1.45;margin:0 10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:39px}
.pc .pr{font-size:16px;font-weight:800;margin:6px 10px 0}.pc .go{margin:10px;padding:10px 0;text-align:center;font-size:13px;font-weight:800;border-radius:10px;background:#f4f0ff;color:#5b2fc0}
.pc .go::after{content:" ↗"}
.note{font-size:12px;color:#8a8994;line-height:1.6;margin:12px 0 0}
.camp{margin-top:40px;padding:20px 18px;border-radius:18px;background:#f4f0ff}.camp h2{font-size:18px;margin:0 0 4px}.camp>p{font-size:13.5px;color:#5b5a6a;margin:0 0 12px;line-height:1.6}
.camp ul{list-style:none;margin:0;padding:0}.camp li a{display:flex;gap:12px;align-items:center;padding:10px 0;border-top:1px solid #e6defa}
.camp li img{width:56px;height:56px;border-radius:10px;object-fit:cover;flex:none;background:#fff}.camp li b{display:block;font-size:14px;line-height:1.4}.camp li span{font-size:12.5px;color:#6b6a7a}
.camp .more{display:block;text-align:center;margin-top:12px;padding:12px;border-radius:12px;background:#6a3fc8;color:#fff;font-weight:800;font-size:14px}
.faq{margin-top:36px}.faq h2{font-size:18px;margin:0 0 8px}.faq details{border-bottom:1px solid #eee;padding:12px 0}.faq summary{font-weight:700;font-size:14.5px;cursor:pointer}.faq p{font-size:14px;color:#4a4958;line-height:1.65;margin:8px 0 0}
footer{margin-top:40px;font-size:12px;color:#8a8994;line-height:1.7;text-align:center}footer a{color:#6a3fc8;font-weight:700}
"""

def open_baby(n=6):
    def worth(it):
        m = re.search(r"(\d+)\s*만", str(it.get("worth") or "")); return int(m.group(1)) * 10000 if m else int(it.get("cpPrice") or 0)
    L = [it for it in d.get("items", []) if it.get("cat") == "baby" and str(it.get("end") or "") >= TODAY]
    L.sort(key=lambda it: -worth(it))
    return L[:n]

def card(x):
    img = x["img"]
    return (f'<a class="pc" href="{e(x["url"])}" target="_blank" rel="noopener noreferrer sponsored" data-k="{e(x["kind"])}">'
            f'<span class="im"><img src="{e(img)}" alt="{e(x["name"])}" loading="lazy" referrerpolicy="no-referrer">{"<i class=rk>로켓배송</i>" if x.get("rocket") else ""}</span>'
            f'<span class="k">{e(x["kind"])}</span><span class="n">{e(x["name"])}</span><span class="pr">{x["price"]:,}원</span><span class="go">쿠팡에서 보기</span></a>')

def build(path):
    P = json.load(open(path, encoding="utf-8"))
    slug, date = P["slug"], P["date"]
    mm, dd = int(date[5:7]), int(date[8:10])
    title = "출산선물 추천 · 예산별 신생아 선물 고르는 법 | 다꾸체험단"
    desc = "3만원 이하 손수건·속싸개부터 젖병소독기·분유포트까지, 예산별로 출산선물·신생아선물 고르는 기준과 상품을 모았어요."
    canon = f"{SITE}/p/{slug}.html"
    secs = P["sections"]
    toc = "".join(f'<a href="#s{i}">{e(s["t"].split(" · ")[0])}</a>' for i, s in enumerate(secs))
    body = "".join(f'<section class="sec" id="s{i}"><h2>{e(s["t"])}</h2><p>{e(s["d"])}</p><div class="grid">{"".join(card(x) for x in s["items"])}</div></section>' for i, s in enumerate(secs))
    B = open_baby()
    camp = ""
    if B:
        lis = "".join(f'<li><a href="/s/{e(it["id"])}.html"><img src="{e(it.get("image") or "")}" alt="" loading="lazy" referrerpolicy="no-referrer"><span><b>{e(it["name"])}</b><span>{e(it.get("benefit") or "")[:40]}</span></span></a></li>' for it in B)
        camp = (f'<section class="camp"><h2>육아템, 체험단으로 먼저 써 보기</h2><p>후기를 남기는 조건으로 제품을 받아 보는 육아 체험단도 있어요. 지금 모집 중인 곳이에요.</p><ul>{lis}</ul>'
                f'<a class="more" href="/#/list?cat=baby">육아 체험단 더 보기</a></section>')
    faq = [("출산선물은 언제 보내면 좋을까요?", "산모가 조리원에 있는 동안은 짐을 줄이고 싶어 하는 경우가 많아요. 집으로 돌아온 뒤 받을 수 있게 주소와 날짜를 먼저 물어보면 좋아요."),
           ("옷을 선물할 때 사이즈는 어떻게 하나요?", "신생아 옷은 입는 기간이 짧아서, 한두 단계 큰 사이즈나 계절이 맞는 옷을 고르는 경우가 많아요."),
           ("겹치지 않게 고르려면요?", "가까운 사이라면 받고 싶은 것을 직접 물어보는 게 가장 확실해요. 어렵다면 손수건·속싸개처럼 여러 개 있어도 잘 쓰는 소모품이 무난해요."),
           ("가격은 정확한가요?", f"이 페이지의 가격은 {mm}월 {dd}일 쿠팡 검색 기준이에요. 할인·품절에 따라 바뀌니 구매 전에 쿠팡 화면에서 꼭 확인해 주세요.")]
    faqh = '<section class="faq"><h2>자주 묻는 질문</h2>' + "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in faq) + "</section>"
    ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}
    out = f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8">{GA}
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>{e(title)}</title><meta name="description" content="{e(desc)}"><meta name="robots" content="index,follow"><link rel="canonical" href="{e(canon)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="다꾸체험단"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:url" content="{e(canon)}"><meta property="og:image" content="{e(secs[0]["items"][0]["img"])}">
<link rel="icon" href="/icons/icon-192.png"><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>{CSS}</style><script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head><body><div class="w">
<p class="disc">이 페이지는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>
<header><a class="logo" href="/">다꾸<i>체험단</i></a><a class="app" href="/">체험단 보러가기 ›</a></header>
<section class="hero"><small>{mm}월 업데이트</small><h1>출산선물 추천<br>예산별로 고르는 신생아 선물</h1>
<p class="lead">받는 사람과의 사이, 예산, 이미 준비한 육아용품에 따라 고르면 실패가 적어요. 고르는 기준을 먼저 보고, 예산별로 모아 둔 상품을 둘러보세요.</p>
<div class="toc">{toc}</div></section>
<section class="tips"><h2>고르기 전에 확인할 것</h2><ul>
<li>✅ <b>겹치지 않게</b> · 가까운 사이라면 필요한 것을 직접 물어보는 게 가장 확실해요.</li>
<li>👕 <b>옷은 한두 단계 크게</b> · 신생아 옷은 입는 기간이 짧아요.</li>
<li>🧼 <b>소모품은 여러 개 있어도 좋아요</b> · 손수건·속싸개·내복은 자주 갈아입혀요.</li>
<li>🔌 <b>육아 가전은 미리 상의</b> · 젖병소독기·분유포트·가습기는 부피가 커서 겹치면 곤란해요.</li>
<li>🏷️ <b>KC 인증 확인</b> · 아기가 쓰는 제품은 상세 페이지에서 인증 표시를 확인하세요.</li>
</ul></section>
{body}
<p class="note">상품은 {mm}월 {dd}일 쿠팡 검색 결과에서 분류별로 골랐어요. 순위나 품질 평가가 아니며, 가격·배송은 쿠팡 화면을 기준으로 해 주세요.</p>
{camp}
{faqh}
<footer>다꾸체험단 · 전국 체험단을 한눈에<br><a href="/">www.dagguu.com</a></footer>
</div>
<script>document.addEventListener("click",function(ev){{var a=ev.target.closest(".pc");if(a&&window.gtag)gtag("event","coupang_click",{{place:"picks_{slug}",item_name:a.dataset.k||""}});}});</script>
</body></html>
'''
    os.makedirs(os.path.join(ROOT, "p"), exist_ok=True)
    open(os.path.join(ROOT, "p", slug + ".html"), "w", encoding="utf-8").write(out)
    return slug

if __name__ == "__main__":
    done = [build(f) for f in sorted(glob.glob(os.path.join(ROOT, "scripts", "picks_*.json")))]
    print("추천 모음 페이지:", ", ".join(done))
