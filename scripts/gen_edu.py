#!/usr/bin/env python3
"""수익화 교육 검색광고용 정적 페이지 edu.html 만들기.
app.js eduView 의 섹션(포인트·누구나·모든 혜택·책·후기·환불 보장)을 그대로 잘라 와서
자바스크립트 없이도 읽히는 한 장짜리 페이지로 만든다(네이버 검색광고 검수 로봇용).
app.js 수익화 교육 문구를 바꾸면 python3 scripts/gen_edu.py 를 다시 돌린다(gen_share.py 도 부른다)."""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = open(os.path.join(ROOT, "app.js"), encoding="utf-8").read()
IDX = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()


def grab(start, end="</section>"):
    i = JS.find(start)
    if i < 0:
        return ""
    j = JS.index(end, i) + len(end)
    return JS[i:j].replace("\\'", "'")


def ga():
    m = re.search(r'<script>window\.dataLayer.*?</script>', IDX)
    return m.group(0) if m else ""


def footer():
    m = re.search(r'<footer class="sitebiz" id="sitebiz">.*?</footer>', IDX, re.S)
    return m.group(0) if m else ""


PICK = re.search(r'var EDU_PICK=(\[.*?\]);', JS).group(1)
PICK = re.findall(r'"([^"]+)"', PICK)
CUR = [
    ("🛠️", "블로그 셋팅 및 점검 · ✍️ 포스팅하는 법"),
    ("🎟️", "체험단 신청하는 방법 · 📝 당첨 후기 작성법"),
    ("🔝", "블로그 상단노출 방법 · 🎬 인스타그램 릴스·클립 체험단 100% 활용"),
    ("📰", "블로그 기자단 · 🤖 AI 글쓰기 <small>(최신 AI 프롬프트 제공)</small>"),
    ("💰", "블로그 수익화 비법"),
]
CHAT = "https://pf.kakao.com/_xkqEFX/chat"

pts = grab('<section class="edupts">')
why = grab('<section class="eduwhy">')
allb = grab('<section class="eduall">')
books = grab('<section class="edusec"><h2>📚')
rv = grab('<section class="edurv">')
guar = grab('<div class="eduguar">', "</div>")
way = re.search(r'<ul class="eduway">.*?</ul>', JS).group(0)

html = f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>블로그 수익화 1:1 코칭 · 다꾸 수익화 클래스 | 다꾸체험단</title>
<meta name="description" content="블로그 체험단 신청부터 상단노출, 애드포스트·협찬까지 5주 1:1로 배우는 블로그 수익화 코칭. 왕초보·직장인·육아맘·50대도 시작할 수 있어요. 끝난 뒤에도 1:1 코칭은 평생 무료.">
<link rel="canonical" href="https://www.dagguu.com/edu.html">
<meta property="og:title" content="다꾸 수익화 1:1 클래스 — 한번 배우면 평생 써먹는 블로그 수익화">
<meta property="og:description" content="5주 1:1 교육 · 평생 무료 코칭 · 블로그 관련 서적 · 당첨 안 되면 100% 환불(조건 있음)">
<meta property="og:image" content="https://www.dagguu.com/images/edu-coach.webp">
<link rel="icon" href="/icons/icon-192.png">
{ga()}
<style>
*{{box-sizing:border-box}}
body{{margin:0;background:#000;color:#fff;font-family:Pretendard,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;line-height:1.6}}
a{{color:inherit}}
.w{{max-width:560px;margin:0 auto;padding-bottom:90px}}
.disc{{margin:0;padding:8px 16px;background:#111;color:#999;font-size:11.5px;text-align:center}}
section{{padding:34px 16px}}
h1,h2{{letter-spacing:-.02em}}
.hero{{text-align:center;padding:40px 18px 44px;background:linear-gradient(180deg,#3a1670 0%,#8a3fd0 45%,#b558d6 72%,#000 100%)}}
.hero small{{display:inline-block;font-size:13px;font-weight:800;border:1px solid rgba(255,255,255,.4);border-radius:999px;padding:5px 12px}}
.hero .m{{display:block;margin:12px 0 0;font-size:16px;font-weight:800}}
.hero .f{{display:inline-block;margin-top:8px;padding:7px 16px;border-radius:999px;background:#fff;color:#9b3fd0;font-weight:900}}
.hero h1{{margin:14px 0 10px;font-size:28px;line-height:1.3}}.hero h1 span{{color:#ffe14d}}
.hero p{{margin:0;font-size:14.5px;color:rgba(255,255,255,.9)}}
.edupts{{text-align:center}}.edupts>small{{font-size:12px;font-weight:800;color:#d9c2ff;border-bottom:1px solid #d9c2ff}}
.edupts h2{{margin:10px 0 16px;font-size:22px;line-height:1.35}}.edupts h2 span{{color:#e9a6ff}}
.edupt{{margin:10px 0 0;padding:14px 12px;border-radius:16px;border:1px solid #ff9a6a;background:#0b0810}}
.edupt.p2{{border-color:#e46fc8}}.edupt.p3{{border-color:#a45cf0}}
.edupt i{{display:block;font-style:normal;font-size:12px;color:#ddd}}.edupt b{{display:block;margin:4px 0;font-size:17px}}
.edupt em{{font-style:normal;color:#ff9ad8}}.edupt p{{margin:0;font-size:13px;color:#cfcfd6}}
.eduwhy{{text-align:center}}.eduwhy>p{{margin:0;font-size:21px;font-weight:900;line-height:1.45}}
.eduwhy .hl{{display:inline-block;margin-top:18px;padding:12px 16px;background:linear-gradient(90deg,#8a3fd0,#d46fd8);font-size:20px;font-weight:900;line-height:1.4}}
.eduwhy .st{{margin-top:18px;font-size:14.5px;font-weight:700;color:#ddd}}.eduwhy .st s{{color:#8f8a99}}
.eduall h2,.sec h2,.edurv h2{{text-align:center;font-size:21px;margin:0 0 16px}}
.eagrid{{display:grid;grid-template-columns:repeat(3,1fr);gap:10px 8px}}
.ea{{position:relative;aspect-ratio:1/1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px 4px;border-radius:14px;border:2px solid transparent;background:linear-gradient(#141018,#141018) padding-box,linear-gradient(135deg,#c5ff4a,#8a3fd0 55%,#d46fd8) border-box;text-align:center}}
.ea i{{position:absolute;left:-6px;top:-8px;width:22px;height:22px;border-radius:50%;background:#2fd36b;font-style:normal;font-weight:900;line-height:21px}}
.ea .eae{{font-size:26px}}.ea b{{font-size:12.5px;margin-top:4px;line-height:1.3}}.ea small{{font-size:10.5px;color:#c9c4d3;line-height:1.3}}.ea em{{font-style:normal;font-size:12px;font-weight:900;color:#ffe14d;margin-top:3px}}
.chk,.cur,.eduway{{list-style:none;margin:0;padding:0;display:grid;gap:8px}}
.chk li,.cur li,.eduway li{{padding:12px 14px;border-radius:12px;background:#15101c;border:1px solid #2c2236;font-size:14.5px}}
.chk li::before{{content:"✓ ";color:#d46fd8;font-weight:900}}
.cur li b{{display:inline-block;margin-right:8px;padding:3px 9px;border-radius:999px;background:#9b3fd0;font-size:12.5px}}
.cur small{{color:#e9a6ff}}
.edubk50{{display:flex;gap:16px;align-items:center;padding:16px;border-radius:16px;background:linear-gradient(135deg,#2a1240,#4a1d63);margin-bottom:12px}}
.edubk50 img{{width:104px;height:156px;object-fit:cover;border-radius:6px;flex:none}}.edubk50 b{{font-size:21px;line-height:1.3}}.edubk50 p{{margin:8px 0 0;font-size:13.5px;color:#e3d4ef}}
.edubks{{display:flex;gap:10px;overflow-x:auto}}.edubks img{{width:76px;height:114px;object-fit:cover;border-radius:5px;flex:none}}
.edusec h2{{text-align:center;font-size:21px;margin:0 0 16px}}
.edurv>small{{display:block;text-align:center;font-size:12px;font-weight:800;letter-spacing:.1em;color:#2ee6f0}}
.edurvn{{text-align:center;font-size:12.5px;color:#bdbdc8}}.edurvs{{display:grid;gap:10px}}
.edurvc{{padding:16px;border-radius:18px 18px 18px 4px;background:#2a2a30}}
.edurvc .rvn{{display:inline-block;margin-bottom:8px;padding:3px 10px;border-radius:6px;background:#a8f046;color:#111;font-style:normal;font-size:11.5px;font-weight:900}}
.edurvc small{{display:block;font-size:12.5px}}.edurvc b{{display:block;margin:4px 0 8px;font-size:16px;color:#a8f046}}.edurvc p{{margin:0;font-size:13.5px;color:#e6e6ec}}
.edurvx{{text-align:center;font-size:11.5px;color:#8f8f9c}}
.price{{text-align:center}}
.box{{display:inline-block;margin-top:6px;padding:18px 22px;border-radius:8px;background:#fff;color:#111;border:3px solid #b558d6;box-shadow:0 0 24px rgba(138,63,208,.6)}}
.box small{{font-size:12.5px;font-weight:800}}.box b{{display:block;margin:6px 0;font-size:32px;font-weight:900;background:linear-gradient(transparent 62%,#c5ff4a 62%)}}.box em{{font-style:normal;font-size:11.5px;color:#666}}
.price .badge{{display:inline-block;margin-bottom:6px;padding:4px 12px;border-radius:999px;background:#e5322d;font-size:12px;font-weight:900}}
.eduguar{{margin:0 16px;padding:16px;border-radius:16px;background:linear-gradient(135deg,#3a1670,#8a3fd0)}}
.eduguar b{{display:block;font-size:18px;color:#ffe14d}}.eduguar p{{margin:6px 0 8px;font-size:13.5px}}.eduguar small{{font-size:11.5px;color:rgba(255,255,255,.75)}}
.cta{{text-align:center;background:radial-gradient(circle at 50% 60%,rgba(212,111,216,.35),transparent 65%),#000}}
.cta p{{margin:0;font-size:15px;font-weight:800;color:#e9a6ff}}.cta h2{{margin:8px 0 0;font-size:27px;line-height:1.35}}.cta h2 span{{color:#ffe14d}}
.btn{{display:inline-block;margin-top:16px;padding:14px 28px;border-radius:999px;background:linear-gradient(90deg,#8a3fd0,#d46fd8);color:#fff;font-weight:900;text-decoration:none}}
.note{{font-size:12px;color:#9a93a6;text-align:center;padding:0 16px}}.note a{{color:#e9a6ff}}
.bar{{position:fixed;left:0;right:0;bottom:0;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:#000;border-top:1px solid #222}}
.bar a{{display:block;max-width:528px;margin:0 auto;padding:14px;border-radius:14px;text-align:center;background:linear-gradient(90deg,#8a3fd0,#d46fd8);color:#fff;font-weight:900;text-decoration:none}}
.sitebiz{{padding:20px 16px 100px;font-size:12px;color:#888;background:#0a0a0a}}.sitebiz a{{color:#aaa;margin-right:8px}}.sitebiz nav b{{display:block;margin-bottom:4px}}
</style></head><body><div class="w">
<p class="disc">다꾸체험단은 쿠팡 파트너스 등 제휴 활동으로 일정액의 수수료를 받을 수 있습니다.</p>
<section class="hero"><small>다꾸 수익화</small><span class="m">⚡ 한 달이면 다 배워요</span><span class="f">50대에도 블로그 체험단 해요!</span>
<h1>한번 배우면 <span>평생 써먹는</span><br>블로그 수익화</h1>
<p>5주 1:1 교육으로 체험단 당첨부터 검색 노출, 수익화까지<br>끝난 뒤에도 1:1 코칭은 평생 무료예요</p></section>
{pts}
{why}
{allb}
<section class="sec"><h2>이런 분께 맞아요</h2><ul class="chk">{''.join(f'<li>{t}</li>' for t in PICK)}</ul></section>
<section class="sec"><h2>5주 커리큘럼</h2><ol class="cur">{''.join(f'<li><b>✨ {i+1}주차</b>{e} {t}</li>' for i,(e,t) in enumerate(CUR))}</ol></section>
{books}
{rv}
<section class="sec"><h2>진행 방식</h2>{way}</section>
<section class="price"><span class="badge">오픈 이벤트</span><br><div class="box"><small>5주 1:1 강의 + 전자책·강의자료</small><b>월 10만원대</b><em>*12개월 카드 할부 시 (할부 수수료는 카드사 기준)<br>정확한 수강료는 상담 때 안내해 드려요</em></div></section>
{guar}
<p class="note" style="margin-top:14px">코칭은 방법을 함께 찾는 과정이에요. 체험단 당첨, 검색 순위, 수익 금액을 약속하거나 보장하지 않아요. <a href="/refund.html">환불정책 보기</a></p>
<section class="cta"><p>아직 고민하는 분들께</p><h2>지금 시작하고<br><span>생활비 월 100</span> 아껴보세요!</h2><small style="display:block;margin-top:10px;font-size:11px;color:#8f8a99">*체험단 활용 정도에 따라 사람마다 달라요</small>
<a class="btn" href="/#/edu">1:1 상담 신청하기</a><br><a class="btn" style="background:#fee500;color:#191919" href="{CHAT}" target="_blank" rel="noopener">카카오톡으로 바로 문의</a></section>
{footer()}
</div>
<div class="bar"><a href="/#/edu">⚡ 1:1 상담 신청하기</a></div>
</body></html>
'''
open(os.path.join(ROOT, "edu.html"), "w", encoding="utf-8").write(html)
print("edu.html", len(html))
