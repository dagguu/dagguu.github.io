# 릴스 자막·썸네일 폰트 = 여기어때 잘난체 (2026-10-26 시온님). 재배포 금지라 저장소에 올리지 않고 실행할 때마다 받는다.
# woff → ttf 로 바꿔 ~/.fonts/Jalnan.ttf 에 두고, 글꼴 이름을 fonts_used.json 에 남긴다. 못 받으면 Noto 로 (fonts_used.json 에 error).
import os, io, json, subprocess, requests
from fontTools.ttLib import TTFont
URLS = ["https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_four@1.2/JalnanOTF00.woff",
        "https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_four@1.2/JalnanOTF00.woff",
        "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_four@1.2/Jalnan.woff",
        "https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_four@1.2/Jalnan.woff",
        "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_231029@1.1/Jalnan2.woff"]
out = {"error": []}; D = os.path.expanduser("~/.fonts"); os.makedirs(D, exist_ok=True)
for u in URLS:
    try:
        r = requests.get(u, timeout=60)
        if r.status_code != 200 or len(r.content) < 10000: out["error"].append(f"{u} {r.status_code}"); continue
        f = TTFont(io.BytesIO(r.content)); f.flavor = None; nm = f["name"]
        out["origName"] = str(nm.getBestFamilyName()); out["hasSpace"] = 32 in f.getBestCmap()
        for i, v in ((1, "Jalnan"), (2, "Regular"), (4, "Jalnan"), (6, "Jalnan"), (16, "Jalnan"), (17, "Regular")):
            nm.setName(v, i, 3, 1, 0x409); nm.setName(v, i, 1, 0, 0)  # 이름을 Jalnan 으로 통일 (libass·PIL 이 찾게)
        p = D + "/Jalnan.ttf"; f.save(p)
        out.update({"file": p, "family": "Jalnan", "src": u}); break
    except Exception as e: out["error"].append(f"{u} {e}"[:200])
subprocess.run(["fc-cache", "-f"], capture_output=True)
json.dump(out, open("fonts_used.json", "w"), ensure_ascii=False); print(out)
