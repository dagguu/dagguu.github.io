"""릴스 전환 효과 (2026-10-31 시온님 "휩팬 전환·문 통과 돌진 테스트")

- whip(A끝, B앞): 옆으로 휙 — 앞 화면이 왼쪽으로 밀려나며 가로로 번지고, 다음 화면이 오른쪽에서 번지며 들어옴(0.2초 안팎)
- rush(A끝, B앞, cx, cy): 돌진 — 앞 화면이 (cx,cy) 지점으로 확 확대되며 번지고(줌 블러), 다음 화면이 확대된 채 시작해 풀림
- ramp(frames): 속도 곡선 — 앞부분 빠르게(2.2배) → 원래 속도

프레임은 numpy BGR 배열 목록. 크레딧 안 듦(편집만).
쓰는 법(시험): python3 scripts/reel_fx.py test <클립폴더> <출력.mp4>
"""
import sys, os, subprocess
import cv2
import numpy as np

FPS = 30


def load(path, start=0.0, dur=None, fps=FPS, speed=1.0):
    cap = cv2.VideoCapture(path)
    src = cap.get(cv2.CAP_PROP_FPS) or 24
    fr = []
    while True:
        ok, f = cap.read()
        if not ok: break
        fr.append(f)
    cap.release()
    total = len(fr) / src
    if dur is None: dur = total - start
    out = []
    n = int(round(dur * fps))
    for k in range(n):
        t = start + k / fps * speed
        i = min(len(fr) - 1, int(t * src))
        out.append(fr[i])
    return out


def ease(x):  # 0→1 빨라졌다 느려짐
    return x * x * (3 - 2 * x)


def hblur(img, k):
    k = int(k)
    if k < 3: return img
    ker = np.ones((1, k), np.float32) / k
    return cv2.filter2D(img, -1, ker, borderType=cv2.BORDER_REFLECT)


def shift(img, dx):
    h, w = img.shape[:2]
    M = np.float32([[1, 0, dx], [0, 1, 0]])
    return cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_REFLECT)


def whip(A, B, n=4):
    """A 마지막 n장과 B 처음 n장을 바꿔서 붙인 전체 목록을 돌려줌"""
    h, w = A[0].shape[:2]
    a, b = A[:-n], B[n:]
    mid = []
    for k in range(n):  # 앞 화면: 0 → 왼쪽으로 반 화면, 번짐 커짐
        x = ease((k + 1) / n)
        mid.append(hblur(shift(A[-n + k], -0.55 * w * x), w * 0.35 * x))
    for k in range(n):  # 다음 화면: 오른쪽 반 화면 → 0, 번짐 줄어듦
        x = 1 - ease((k + 1) / n)
        mid.append(hblur(shift(B[k], 0.55 * w * x), w * 0.35 * x))
    return a + mid + b


def zoom(img, s, cx, cy):
    h, w = img.shape[:2]
    M = np.float32([[s, 0, cx * (1 - s)], [0, s, cy * (1 - s)]])
    return cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_REFLECT)


def zblur(img, s, cx, cy, amt):
    """s 배로 확대 + (cx,cy) 쪽으로 빨려 드는 줌 블러(amt 0~1)"""
    if amt < 0.05: return zoom(img, s, cx, cy)
    acc = np.zeros(img.shape, np.float32)
    N = 8
    for i in range(N):
        acc += zoom(img, s * (1 + amt * 0.35 * i / N), cx, cy).astype(np.float32)
    return (acc / N).astype(np.uint8)


def rush(A, B, cx=None, cy=None, n_out=7, n_in=8):
    h, w = A[0].shape[:2]
    cx = w / 2 if cx is None else cx * w
    cy = h / 2 if cy is None else cy * h
    a, b = A[:-n_out], B[n_in:]
    mid = []
    for k in range(n_out):  # 앞 화면: 1 → 3배, 번짐 커짐
        x = ease((k + 1) / n_out) ** 1.6
        mid.append(zblur(A[-n_out + k], 1 + 2.0 * x, cx, cy, x))
    for k in range(n_in):  # 다음 화면: 1.8배 → 1, 번짐 줄어듦 (가운데 기준)
        x = 1 - ease((k + 1) / n_in)
        mid.append(zblur(B[k], 1 + 0.8 * x, w / 2, h / 2, x * 0.8))
    return a + mid + b


def ramp(fr, fast=2.2, fast_part=0.35):
    """앞 fast_part 구간은 fast 배속, 그 뒤 원래 속도로 부드럽게"""
    out, t, n = [], 0.0, len(fr)
    while t < n - 1:
        p = t / n
        sp = fast if p < fast_part * 0.6 else (1 + (fast - 1) * max(0, 1 - (p - fast_part * 0.6) / (fast_part * 0.4)) if p < fast_part else 1)
        out.append(fr[int(t)])
        t += sp
    return out


def write(frames, path, fps=FPS):
    h, w = frames[0].shape[:2]
    tmp = path + ".raw.mp4"
    vw = cv2.VideoWriter(tmp, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
    for f in frames: vw.write(f)
    vw.release()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", path], check=True)
    os.remove(tmp)


def test(d, out):
    c = lambda i, s, du, sp=1.0: load(os.path.join(d, f"clip_ai{i}.mp4"), s, du, speed=sp)
    seq = c(1, 0.3, 1.5)                       # 숲 위 하늘
    seq = whip(seq, c(2, 0.2, 1.4))             # 휩 → A자 객실들
    seq = whip(seq, c(3, 0.3, 1.5))             # 휩 → 테라스 외관
    seq = rush(seq, ramp(c(5, 0.0, 2.2)), cx=0.5, cy=0.45)  # 돌진 → 삼각 창 실내(빠르게 → 느리게)
    seq = seq + c(6, 0.3, 1.2)                  # 그냥 컷 → 복층
    seq = whip(seq, c(7, 0.3, 1.3))             # 휩 → 침실
    seq = rush(seq, ramp(c(8, 0.0, 2.0)), cx=0.5, cy=0.4)   # 돌진 → 수영장
    seq = seq + c(9, 0.3, 1.3)                  # 컷 → 밤 수영장
    seq = whip(seq, c(1, 0.3, 1.0))             # 휩 → 처음 장면(무한 반복)
    write(seq, out)
    print(out, len(seq) / FPS, "초")


if __name__ == "__main__":
    if sys.argv[1] == "test": test(sys.argv[2], sys.argv[3])
