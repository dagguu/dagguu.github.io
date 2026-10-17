#!/usr/bin/env python3
"""경쟁률(지원자/모집) 반영: scripts/ap_counts.json → data.json items[].ap, apAt

ap_counts.json 형식:
  {"at": "2026-10-18T03:10:00+09:00",
   "counts": {"reviewnote.co.kr#1486949": [59, 3], "revu.net#1420356": [61, 5], ...}}
키는 신청 주소(applyUrl)의 호스트(www. 뺌) + "#" + 주소 속 마지막 4자리 이상 숫자.
숫자는 각 체험단 사이트에서 직접 읽은 것만 넣는다(모아뷰·체험모아 숫자는 하루~열흘 늦어서 쓰지 않음).
이번 수집에 없는 체험단은 예전 숫자를 지운다(오래된 경쟁률을 보여주지 않으려고).
"""
import json, re, sys, os
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def key(u):
    try:
        x = urlparse(u or "")
    except Exception:
        return ""
    m = re.findall(r"\d{4,}", (x.query or "") + (x.path or ""))
    return x.netloc.replace("www.", "", 1) + "#" + (m[-1] if m else x.path)


def main():
    src = os.path.join(ROOT, "scripts", "ap_counts.json")
    ap = json.load(open(src, encoding="utf-8"))
    counts = ap.get("counts") or {}
    dp = os.path.join(ROOT, "data.json")
    d = json.load(open(dp, encoding="utf-8"))
    hit = 0
    for it in d.get("items", []):
        c = counts.get(key(it.get("applyUrl", "")))
        if c and len(c) >= 2 and int(c[1]) > 0:
            it["ap"] = [int(c[0]), int(c[1])]
            hit += 1
        elif "ap" in it:
            del it["ap"]
    d["apAt"] = ap.get("at", "")
    s = json.dumps(d, ensure_ascii=False, separators=(",", ":"))
    open(dp, "w", encoding="utf-8").write(s)
    print(f"경쟁률 반영 {hit}개 (기준 {d['apAt']})")


if __name__ == "__main__":
    sys.exit(main())
