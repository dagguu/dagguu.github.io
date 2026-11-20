# 다꾸키즈 선물 카드 그림 6종 (2026-11-20 시온님 "카드를 선택할 수 있게") → kids/gift/<k>.svg·.png(800x800, 카톡 카드용)
# 직접 그린 도형만(캐릭터·남의 그림 X). 고치면: python3 scripts/cards/gift_cards.py
import os
from playwright.sync_api import sync_playwright
OUT = os.path.join(os.path.dirname(__file__), "../../kids/gift")
F = "font-family='Noto Sans CJK KR' font-weight='900'"
def dots(c, pts): return "".join(f"<circle cx='{x}' cy='{y}' r='{r}' fill='{c}' opacity='.55'/>" for x, y, r in pts)
def heart(x, y, s, c): return f"<path transform='translate({x} {y}) scale({s})' d='M0 12C-14-6-36 4-24 22L0 46L24 22C36 4 14-6 0 12Z' fill='{c}'/>"
def star(x, y, s, c): return f"<path transform='translate({x} {y}) scale({s})' d='M0-20L6-6L21-6L9 3L13 18L0 9L-13 18L-9 3L-21-6L-6-6Z' fill='{c}'/>"
def gift(x, y, s, box, rib):
    return (f"<g transform='translate({x} {y}) scale({s})'><rect x='-90' y='-30' width='180' height='130' rx='14' fill='{box}'/>"
            f"<rect x='-104' y='-62' width='208' height='44' rx='12' fill='{box}' stroke='#fff' stroke-opacity='.35' stroke-width='4'/>"
            f"<rect x='-16' y='-62' width='32' height='162' fill='{rib}'/>"
            f"<path d='M0-62C-30-110-90-96-62-66C-50-56-20-62 0-62ZM0-62C30-110 90-96 62-66C50-56 20-62 0-62Z' fill='{rib}'/></g>")
CARDS = {
 "birth": ("#f6cfe1", "출산 축하해요", "#fff", lambda: dots("#fff", [(110,170,26),(690,150,18),(650,640,30),(130,610,20)]) +
     "<g transform='translate(400 470)'><rect x='-60' y='-40' width='120' height='170' rx='40' fill='#fff'/><rect x='-60' y='-10' width='120' height='18' fill='#f3a6c8'/>"
     "<rect x='-38' y='-90' width='76' height='54' rx='14' fill='#ffd6e7'/><path d='M-22-90Q0-150 22-90Z' fill='#f3a6c8'/>"
     "<line x1='-40' y1='40' x2='40' y2='40' stroke='#f3a6c8' stroke-width='6'/><line x1='-40' y1='75' x2='40' y2='75' stroke='#f3a6c8' stroke-width='6'/></g>" +
     heart(230, 420, 1.6, "#ff8fbf") + heart(575, 520, 1.2, "#fff") + star(600, 330, 1.6, "#fff")),
 "bday": ("#ffe08a", "생일 축하해요", "#6a3fc8", lambda: dots("#fff", [(120,160,22),(680,190,28),(660,650,20),(140,640,26)]) +
     "<g transform='translate(400 520)'><rect x='-170' y='-20' width='340' height='130' rx='20' fill='#ff9fb8'/><rect x='-170' y='-20' width='340' height='38' rx='18' fill='#fff'/>"
     "<path d='M-170 10q28 30 56 0t56 0t56 0t56 0t56 0t56 0' fill='#fff'/>"
     + "".join(f"<rect x='{x-9}' y='-110' width='18' height='90' rx='6' fill='#8fd3ff'/><path d='M{x}-150q14 18 0 34q-14-16 0-34z' fill='#ff8a3d'/>" for x in (-90,0,90)) + "</g>" +
     star(170, 330, 1.4, "#fff") + star(640, 360, 1.1, "#ff8fbf")),
 "thanks": ("#cdeedc", "고마워요", "#2f7a55", lambda: dots("#fff", [(120,170,24),(690,170,20),(670,650,28),(120,640,22)]) +
     "".join(f"<g transform='translate({x} {y})'>" + "".join(f"<circle cx='{dx}' cy='{dy}' r='34' fill='{c}'/>" for dx, dy in ((0,-38),(36,-12),(22,30),(-22,30),(-36,-12))) +
             "<circle r='26' fill='#ffe08a'/></g>" for x, y, c in ((330,430,"#ff9fb8"),(470,410,"#fff"),(400,330,"#ffc3d6"))) +
     "<path d='M330 470L400 650L470 450' stroke='#3f9a6b' stroke-width='12' fill='none'/><path d='M330 600h140l-20 70h-100z' fill='#fff'/>"),
 "love": ("#e3d5fb", "사랑해요", "#6a3fc8", lambda: dots("#fff", [(130,170,24),(680,160,20),(660,660,26),(130,640,22)]) +
     heart(400, 330, 5.4, "#9b6cf0") + heart(400, 380, 3.0, "#fff") + heart(210, 560, 1.3, "#ff8fbf") + heart(600, 300, 1.1, "#fff") + star(620, 620, 1.3, "#fff")),
 "cheer": ("#cfe6fb", "응원해요", "#2f6fe4", lambda: dots("#fff", [(120,180,22),(680,170,26),(660,650,22),(130,650,26)]) +
     star(400, 470, 7.5, "#ffd34d") + star(220, 360, 2.0, "#fff") + star(600, 330, 1.6, "#fff") + star(590, 610, 1.4, "#ff8fbf") +
     "<circle cx='375' cy='470' r='10' fill='#6b4a12'/><circle cx='425' cy='470' r='10' fill='#6b4a12'/><path d='M372 500q28 26 56 0' stroke='#6b4a12' stroke-width='8' fill='none' stroke-linecap='round'/>"),
 "basic": ("#f7f4fd", "선물이 도착했어요", "#6a3fc8", lambda: dots("#d9ccf5", [(120,170,22),(690,170,26),(670,660,22),(120,650,26)]) +
     gift(400, 470, 1.35, "#8a5be0", "#ffd34d") + star(200, 380, 1.4, "#ffd34d") + star(620, 340, 1.2, "#ff8fbf")),
}
def svg(k):
    bg, t, tc, art = CARDS[k]
    return (f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800' width='800' height='800'><rect width='800' height='800' fill='{bg}'/>"
            f"{art()}<text x='400' y='170' text-anchor='middle' {F} font-size='76' fill='{tc}'>{t}</text></svg>")
os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 800, "height": 800})
    for k in CARDS:
        s = svg(k); open(f"{OUT}/{k}.svg", "w").write(s)
        pg.set_content(f"<html><body style='margin:0'>{s}</body></html>"); pg.screenshot(path=f"{OUT}/{k}.png")
    b.close()
print("ok", list(CARDS))
