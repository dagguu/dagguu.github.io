#!/usr/bin/env python3
"""MZ 스타일 스티커 꾸미기 (2026-10-30 시온님이 사진 꾸미기 앱 화면 6장 보여주며 "이런 mz 스타일 스티커도 꾸며 줄 수 있어?").
앱의 스티커 그림을 가져오지 않고 HTML·CSS·SVG 로 직접 그린다(손글씨·말풍선·생각 구름·라벨·뭉게 스티커·번쩍 말풍선·별·화살표·이모지).

사용: from cards.stickers import STICKER_HEAD, STICKER_CSS, stickers_html
  stickers_html([{"k":종류, "t":"글", "x":가로%, "y":세로%, "r":기울기, "s":크기배율, "c":색, "a":화살표}...])
  x·y = 스티커 가운데 위치(사진 폭·높이의 %). 줄바꿈은 \n.
종류 k:
  hand   손글씨(흰 글씨, 그림자). a: "dl"|"dr"|"ul"|"ur" 이면 그 방향 곱슬 화살표를 붙임
  cloud  생각 구름(흰 구름 + 작은 동그라미 꼬리)
  bubble 말풍선(흰 바탕 검은 테두리 + 꼬리, a: "l"|"r" 꼬리 방향)
  tag    네모 라벨(흰 바탕 검은 테두리, c 로 바탕색: "#e7f6c8" 연두 등)
  puffy  뭉게 스티커(굵은 글씨 + 흰 두꺼운 테두리 + 바깥 색 테두리, c = 바깥 색)
  burst  번쩍 말풍선(뾰족한 별 모양, 검은 테두리)
  star   손그림 별(☆ 선) / spark  반짝 세 줄 / emoji 큰 이모지(t 에 이모지)
글은 쉬운 반말·해요체 짧게, 사실만(사진에 보이는 것·숙소 json 에 있는 것). 무료·역대급·최저가·체험단·금액·댓글→DM 금지.
"""
import html, math

e = html.escape
# 손글씨 Gaegu, 둥근 굵은 글씨 Jua, 깔끔한 고딕은 Noto Sans KR (Google Fonts, OFL)
STICKER_HEAD = ("<link rel='preconnect' href='https://fonts.googleapis.com'>"
                "<link href='https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&family=Jua&family=Nanum+Pen+Script&display=block' rel='stylesheet'>")

STICKER_CSS = """
.stk{position:absolute;transform:translate(-50%,-50%) rotate(var(--r,0deg)) scale(var(--s,1));transform-origin:center;white-space:nowrap;line-height:1.15;text-align:center}
.stk.hand{font-family:'Nanum Pen Script','Gaegu',cursive;font-size:64px;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.45)}
.stk.hand svg{position:absolute;width:110px;height:110px;overflow:visible}
.stk.cloud{font-family:'Gaegu',cursive;font-weight:700;font-size:40px;color:#222;background:#fff;padding:26px 38px;border-radius:50% 50% 48% 52%/60% 60% 40% 40%;
 box-shadow:0 3px 10px rgba(0,0,0,.18)}
.stk.cloud:before,.stk.cloud:after{content:"";position:absolute;background:#fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.15)}
.stk.cloud:before{width:26px;height:26px;right:22%;bottom:-24px}.stk.cloud:after{width:14px;height:14px;right:16%;bottom:-46px}
.stk.bubble{font-family:'Noto Sans CJK KR','Noto Sans KR',sans-serif;font-weight:700;font-size:34px;color:#111;background:#fff;border:3px solid #111;border-radius:999px;padding:16px 30px}
.stk.bubble i{position:absolute;bottom:-20px;width:30px;height:24px;background:#fff;border-right:3px solid #111;border-bottom:3px solid #111;transform:skewX(35deg) rotate(10deg)}
.stk.bubble.l i{left:26%}.stk.bubble.r i{right:26%;transform:skewX(-35deg) rotate(-10deg);border-right:0;border-left:3px solid #111}
.stk.tag{font-family:'Noto Sans CJK KR','Noto Sans KR',sans-serif;font-weight:700;font-size:30px;color:#111;background:var(--c,#fff);border:3px solid #111;padding:8px 18px;box-shadow:3px 3px 0 rgba(0,0,0,.25)}
.stk.puffy{font-family:'Jua',sans-serif;font-size:72px;color:#1f2f7a;-webkit-text-stroke:16px #fff;paint-order:stroke fill;
 filter:drop-shadow(3px 0 0 var(--c,#2e8b3e)) drop-shadow(-3px 0 0 var(--c,#2e8b3e)) drop-shadow(0 3px 0 var(--c,#2e8b3e)) drop-shadow(0 -3px 0 var(--c,#2e8b3e)) drop-shadow(0 4px 6px rgba(0,0,0,.25))}
.stk.burst{width:330px;height:240px}.stk.burst svg{position:absolute;inset:0}
.stk.burst b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Jua',sans-serif;font-weight:400;font-size:44px;color:#111;line-height:1.15}
.stk.star,.stk.spark{width:90px;height:90px}.stk svg{display:block}
.stk.emoji{font-size:96px;filter:drop-shadow(0 3px 6px rgba(0,0,0,.25))}
"""

def _arrow(d):
    # 곱슬 화살표(손으로 그린 느낌). d = 화살표가 향하는 쪽
    path = "M10 10 C 60 0, 70 60, 40 55 C 15 50, 30 20, 60 40 S 95 90, 95 95"
    head = "M80 92 L96 96 L92 78"
    pos = {"dr": "left:60%;top:85%", "dl": "right:60%;top:85%;transform:scaleX(-1)",
           "ur": "left:60%;bottom:85%;transform:scaleY(-1)", "ul": "right:60%;bottom:85%;transform:scale(-1,-1)"}.get(d, "left:60%;top:85%")
    return (f"<svg viewBox='0 0 100 100' style='{pos}'><path d='{path}' fill='none' stroke='#fff' stroke-width='4' stroke-linecap='round'/>"
            f"<path d='{head}' fill='none' stroke='#fff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/></svg>")

def _star(color="#fff"):
    pts = []
    for i in range(10):
        a = math.pi / 2 + i * math.pi / 5
        rr = 42 if i % 2 == 0 else 18
        pts.append(f"{50 + rr * math.cos(a):.1f},{50 - rr * math.sin(a):.1f}")
    return f"<svg viewBox='0 0 100 100'><polygon points='{' '.join(pts)}' fill='none' stroke='{color}' stroke-width='5' stroke-linejoin='round'/></svg>"

def _spark(color="#fff"):
    return (f"<svg viewBox='0 0 100 100'><g stroke='{color}' stroke-width='6' stroke-linecap='round'>"
            "<line x1='20' y1='35' x2='8' y2='12'/><line x1='50' y1='28' x2='50' y2='4'/><line x1='78' y1='35' x2='92' y2='14'/></g></svg>")

def _burst():
    pts = []
    n = 14
    for i in range(n * 2):
        a = i * math.pi / n
        rx, ry = (160, 118) if i % 2 == 0 else (118, 84)
        pts.append(f"{165 + rx * math.cos(a):.1f},{120 + ry * math.sin(a):.1f}")
    return f"<svg viewBox='0 0 330 240'><polygon points='{' '.join(pts)}' fill='#fff' stroke='#111' stroke-width='5' stroke-linejoin='round'/></svg>"

def stickers_html(items):
    out = []
    for it in items or []:
        k = it.get("k", "hand")
        t = e(it.get("t", "")).replace("\n", "<br>")
        st = f"left:{it.get('x', 50)}%;top:{it.get('y', 50)}%;--r:{it.get('r', 0)}deg;--s:{it.get('s', 1)};"
        if it.get("c"): st += f"--c:{it['c']};"
        cls = f"stk {k}"
        if k == "hand":
            inner = t + (_arrow(it["a"]) if it.get("a") else "")
        elif k == "bubble":
            cls += " " + it.get("a", "l"); inner = t + "<i></i>"
        elif k == "burst":
            inner = _burst() + f"<b>{t}</b>"
        elif k == "star":
            inner = _star(it.get("c", "#fff"))
        elif k == "spark":
            inner = _spark(it.get("c", "#fff"))
        else:
            inner = t
        out.append(f"<div class='{cls}' style='{st}'>{inner}</div>")
    return "".join(out)
