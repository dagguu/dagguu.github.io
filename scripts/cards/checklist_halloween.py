G=[("👗","의상",[("유아 호박 의상 + 모자",19500),("아기 박쥐 귀 보넷",14200),("호박 망토·모자 2세트",9980),("별무늬 마법사 망토",9970),("야광 해골 실내복",17900)]),
("🧺","사탕바구니·소품",[("호박 사탕바구니 3종",7650),("캐릭터 머리띠 토퍼",11900),("불 들어오는 반지",13700)]),
("🎁","구디백 (사탕 말고)",[("귤 표정 스티커 70개",9500),("손가락 빔 라이트 12개",12900),("비눗방울 스틱 4종",10000),("캐릭터 도장",9500)]),
("📸","포토존",[("풍선 포토존 세트",13990),("입체 현수막 3종",15500),("박쥐 행잉 모빌",19800)]),
("✂️","엄마표 만들기",[("펠트 사탕가방 10개",23000),("가면 만들기 3종",2800),("LED 호박등 6개",13300)])]
def blk(e,t,items):
  li="".join(f'<li><i></i><span class=n>{n}</span><span class=d></span><span class=p>{p:,}원</span></li>' for n,p in items)
  return f'<section><h3><b>{e}</b>{t}</h3><ul>{li}</ul></section>'
L=[G[0],G[3]]; R=[G[1],G[2]]; L.append(G[4])
html=f'''<!doctype html><meta charset=utf-8><style>
*{{margin:0;padding:0;box-sizing:border-box}}body{{width:1080px;height:1350px;font-family:"Noto Sans CJK KR",sans-serif;background:radial-gradient(circle at 85% 8%,#5a2aa8 0,#2b1257 45%,#1b0b3a 100%);color:#fff;padding:60px 54px;position:relative;overflow:hidden}}
.moon{{position:absolute;right:-60px;top:-60px;width:300px;height:300px;border-radius:50%;background:#ff9a3c;opacity:.95;box-shadow:0 0 120px #ff9a3c88}}
.k{{display:inline-block;background:#ff9a3c;color:#2b1257;font-weight:900;font-size:26px;padding:8px 18px;border-radius:40px}}
h1{{font-size:70px;line-height:1.15;font-weight:900;letter-spacing:-2px;margin:22px 0 10px}}h1 em{{font-style:normal;color:#ffb066}}
.sub{{font-size:27px;color:#d9ccf5}}
.wrap{{display:flex;gap:26px;margin-top:40px}}.col{{flex:1;display:flex;flex-direction:column;gap:22px}}
section{{background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.14);border-radius:26px;padding:22px 24px}}
h3{{font-size:29px;font-weight:900;margin-bottom:12px;display:flex;align-items:center;gap:10px}}h3 b{{font-size:30px}}
li{{list-style:none;display:flex;align-items:center;gap:12px;font-size:24px;padding:8px 0}}
li i{{width:24px;height:24px;border:3px solid #ffb066;border-radius:6px;flex:none}}.n{{font-weight:700;white-space:nowrap}}.d{{flex:1;border-bottom:2px dotted rgba(255,255,255,.3);margin:0 2px 6px}}.p{{color:#ffcf9e;font-weight:800;white-space:nowrap}}
.ft{{position:absolute;left:54px;right:54px;bottom:50px;display:flex;justify-content:space-between;align-items:flex-end}}
.nt{{font-size:25px;color:#e7dcff;padding:18px 8px;line-height:1.5;font-weight:700}}.nt span{{font-size:20px;color:#b9a8e0;font-weight:400}}.ft .u{{background:#fff;color:#2b1257;font-weight:900;font-size:30px;padding:16px 28px;border-radius:50px}}.ft small{{font-size:19px;color:#b9a8e0;line-height:1.5}}
</style><div class=moon></div>
<span class=k>🎃 10/31 어린이집·유치원 할로윈</span>
<h1>할로윈 파티<br><em>준비물 체크리스트</em></h1><p class=sub>의상부터 구디백·포토존까지 칸별로 정리했어요</p>
<div class=wrap><div class=col>{"".join(blk(*g) for g in L)}</div><div class=col>{"".join(blk(*g) for g in R)}<p class=nt>✓ 체크하면서 하나씩 준비해 보세요<br><br><span>* 가격은 10/22 쿠팡 기준이라 바뀔 수 있어요</span></p></div></div>
<div class=ft><small></small><span class=u>dagguu.com 🎃</span></div>'''
open("card2.html","w").write(html)
