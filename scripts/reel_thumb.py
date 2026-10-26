# 릴스 썸네일(표지) 만들기 (2026-10-26 시온님 "제목은 영상에 넣지 말고 썸네일을 만들어줘").
# 1080x1920, 사진 꽉 채움 + 위쪽 그늘 + 제목 2줄(윗줄 흰색·아랫줄 노란색, 굵은 글씨+검은 테두리·그림자).
# 글씨는 프로필 격자(가운데 3:4)에서도 잘리지 않게 y 300~700 안에 둔다.
# 사용: python3 scripts/reel_thumb.py <사진 또는 영상> <저장 경로> "윗줄" "아랫줄" [영상이면 초]
import sys, subprocess, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
src, out, l1, l2 = sys.argv[1:5]; sec = sys.argv[5] if len(sys.argv) > 5 else "0.6"
if src.lower().endswith((".mp4", ".mov")):
    tmp = out + ".frame.png"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", sec, "-i", src, "-frames:v", "1", tmp], check=True); src = tmp
im = Image.open(src).convert("RGB"); W, H = 1080, 1920
s = max(W / im.width, H / im.height); im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
im = im.crop(((im.width - W) // 2, (im.height - H) // 2, (im.width - W) // 2 + W, (im.height - H) // 2 + H))
if s > 1.2: im = im.filter(ImageFilter.UnsharpMask(radius=2, percent=90, threshold=2))
im = ImageEnhance.Brightness(im).enhance(1.04)
sh = Image.new("L", (W, H), 0); d = ImageDraw.Draw(sh)
for y in range(0, 900): d.line([(0, y), (W, y)], fill=int(120 * max(0, 1 - y / 900) ** 1.3))
im = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), im, sh)
JF = os.environ.get("REEL_FONT") or (os.path.expanduser("~/.fonts/Jalnan.ttf") if os.path.exists(os.path.expanduser("~/.fonts/Jalnan.ttf")) else "")
FP = JF or next((p for p in ("/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc", "/usr/share/fonts/noto-cjk/NotoSansCJK-Black.ttc") if os.path.exists(p)))
def font(sz): return ImageFont.truetype(FP, sz) if JF else ImageFont.truetype(FP, sz, index=1)  # 잘난체 / Noto(1 = KR)
def fit(t, sz, maxw=980):
    while sz > 60 and sum(font(sz).getlength(w) for w in t.split()) + sz * 0.28 * (len(t.split()) - 1) > maxw: sz -= 4
    return font(sz)
f1, f2 = fit(l1, 128), fit(l2, 112)
layer = Image.new("RGBA", (W, H), (0, 0, 0, 0)); dl = ImageDraw.Draw(layer)
y1 = 360; y2 = y1 + f1.size + 34
for (t, f, y, col) in ((l1, f1, y1, (255, 255, 255)), (l2, f2, y2, (255, 222, 40))):
    ws = t.split(); gap = f.size * 0.28  # 잘난체 웹폰트엔 띄어쓰기 글자가 없어 단어마다 따로 그림
    x = (W - sum(f.getlength(w) for w in ws) - gap * (len(ws) - 1)) / 2
    for w in ws:
        dl.text((x + 6, y + 8), w, font=f, fill=(0, 0, 0, 150))
        dl.text((x, y), w, font=f, fill=col, stroke_width=7, stroke_fill=(20, 20, 20)); x += f.getlength(w) + gap
SK = 0.2  # 기울임꼴 (2026-10-26 시온님): 글씨 층을 오른쪽으로 기울임
cy = (y1 + y2 + f2.size) / 2; layer = layer.transform((W, H), Image.AFFINE, (1, SK, -SK * cy, 0, 1, 0), resample=Image.BICUBIC)
shadow = layer.split()[3].filter(ImageFilter.GaussianBlur(10))
im = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), im, shadow.point(lambda v: int(v * 0.35)))
im.paste(layer, (0, 0), layer); im.save(out, quality=94)
print(out)
