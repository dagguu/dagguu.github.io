S=[("의상",[("유아 호박 의상 + 모자 세트",19500,1),("아기 박쥐 귀 보넷",14200,0),("호박 망토·모자 2세트",9980,0)]),
("사탕바구니",[("호박 사탕바구니 3종",7650,1)]),
("구디백 (사탕만 넣기 좀 그래서..)",[("귤 표정 스티커 70개",9500,0),("손가락 빔 라이트 12개",12900,0),("비눗방울 스틱 4종",10000,0)]),
("거실 포토존",[("할로윈 풍선 세트",13990,0),("박쥐 행잉 모빌",19800,0)]),
("비 오면 집에서 만들기",[("펠트 사탕가방 만들기",23000,0)])]
def it(n,p,c): return f'<li class="{"on" if c else ""}"><i>{"✓" if c else ""}</i><span>{n} <em>{p:,}</em></span></li>'
body="".join(f'<h3>{h}</h3><ul>{"".join(it(*x) for x in L)}</ul>' for h,L in S)
html=f'''<!doctype html><meta charset=utf-8><style>
*{{margin:0;padding:0;box-sizing:border-box}}body{{width:1080px;height:1780px;background:#fff;font-family:"Noto Sans CJK KR",sans-serif;color:#2b2b2b;position:relative}}
.bar{{height:170px;display:flex;align-items:center;justify-content:space-between;padding:40px 44px 0}}
.btn{{width:108px;height:108px;border-radius:54px;background:#f6f6f6;display:grid;place-items:center;font-size:52px;color:#222;box-shadow:0 6px 20px rgba(0,0,0,.06)}}
.r{{display:flex;gap:22px}}.pill{{height:108px;border-radius:54px;background:#f6f6f6;display:flex;align-items:center;gap:44px;padding:0 40px;font-size:46px;box-shadow:0 6px 20px rgba(0,0,0,.06)}}
.doc{{padding:46px 70px}}h1{{font-size:68px;font-weight:900;color:#3a3a3a;letter-spacing:-1px}}
.date{{font-size:30px;color:#9a9a9a;margin:14px 0 34px}}
h3{{font-size:38px;font-weight:800;margin:34px 0 10px;color:#333}}
li{{list-style:none;display:flex;align-items:center;gap:22px;font-size:38px;padding:9px 0;color:#3a3a3a}}
li i{{width:46px;height:46px;border-radius:50%;border:3px solid #c8c8c8;flex:none;display:grid;place-items:center;font-style:normal;font-size:28px;color:#fff;font-weight:900}}
li.on i{{background:#f5b800;border-color:#f5b800}}li.on span{{color:#a0a0a0;text-decoration:line-through}}
em{{font-style:normal;color:#8a8a8a;font-size:33px;margin-left:6px}}li.on em{{color:#b5b5b5}}
.end{{font-size:36px;margin-top:44px;color:#3a3a3a;line-height:1.6}}.end b{{color:#d97a00}}
</style>
<div class=bar><div class=btn>‹</div><div class=r><div class=btn>↶</div><div class=pill><span>⇪</span><span>⋯</span></div></div></div>
<div class=doc><h1>할로윈 준비하기 🎃</h1><p class=date>10/31 어린이집 할로윈 파티</p>{body}
<p class=end>나머지 다 모아둔 곳 👉 <b>dagguu.com</b><br><span style="font-size:26px;color:#aaa">(가격은 10/22 쿠팡 기준)</span></p></div>'''
open("memo.html","w").write(html)
