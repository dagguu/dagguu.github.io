"""매거진 글·목록 페이지에 조회수 스크립트(/mv.js) 붙이기 (2026-10-25). gen_share.py 맨 끝에서 부른다."""
import os, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAG = '<script src="/mv.js" defer></script>'
n = 0
for d in ("m", "g", "p"):
    for f in glob.glob(os.path.join(ROOT, d, "*.html")):
        s = open(f, encoding="utf-8").read()
        if "/mv.js" in s or "</body>" not in s: continue
        i = s.rfind("</body>")
        open(f, "w", encoding="utf-8").write(s[:i] + TAG + s[i:]); n += 1
print("조회수 스크립트 붙임:", n)
