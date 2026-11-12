/* 우리 아이 정보 → 추천 사이즈·옵션 자동 선택 + 적립 말풍선 (2026-11-12 시온님). footer.html 끝. 역슬래시·body 닫는 태그 글자 쓰지 말 것.
   ① 마이쇼핑(/myshop/index.html) 혜택 칸 아래 "우리 아이 정보"(아이 여러 명, + 아이 추가) → 이 기기 localStorage dk_kids(배열)·dk_kid_i(고른 아이). 서버 저장 아님.
   ② 상품 상세: 옵션 아래 "OO 추천 사이즈 M"(아이가 둘 이상이면 이름 칩으로 바꿈). 사이즈 옵션이 열리면(색상 고른 뒤) 아직 안 골랐을 때 추천 사이즈를 한 번 자동으로 고름.
      브랜드 몸무게표(KG, design/sizekg.js 와 같음)가 있으면 몸무게로, 없으면 평균 사이즈표(S, design/sizecalc.js 와 같음)로 호수·숫자·문자 옵션을 맞춤.
   ③ 구매 버튼 위에 둥둥 뜨는 말풍선 "지금 구매하면 N원 적립! (1%)" — 등급별 적립률(R), 가족·지인은 회원가 기준. 등급 적립률을 바꾸면 R 도 같이. */
(function(){
  var KG = {
    "피피": { XXS: 9, XS: 10, S: 12, M: 13 },
    "아오스타": { S: 10, M: 12, L: 15, XL: 18, XXL: 24 },
    "아오스타|니트": { S: 10, M: 15, L: 24 },
    "데일리베베": { "3호": 10, "5호": 13, "7호": 17, "9호": 20, "11호": 22, "13호": 27, "15호": 31, "17호": 35, XS: 10, S: 13, M: 17, L: 20, XL: 22, JS: 27, JM: 31, JL: 35 }
  };
  var S = [["베베","12M","70",65,75,9],["3호","XS","80",75,85,12],["5호","S","90",85,95,14],["7호","M","100",95,105,17],["9호","L","110",105,115,20],["11호","XL","120",115,125,24],["13호","JS","130",125,135,29],["15호","JM","140",135,145,35],["17호","JL","150",145,155,42]];
  var AVG = { b: [50,76,87,96,103,110,116,122,128,133,139,145,151], g: [49,74,86,95,102,109,115,121,127,133,139,145,151] };
  var R = { 1: [1, 30000], 4: [5, 30000], 2: [7, 30000], 3: [10, 30000], 5: [1, 0], 6: [1, 0] };
  var GP = { 5: 0.8125, 6: 0.875 };
  function won(n){ return String(n).replace(/(?=(?:[0-9]{3})+$)(?!^)/g, ",") + "원"; }
  function esc(s){ return String(s || "").replace(/[&<>"']/g, ""); }
  function kids(){
    try {
      var a = JSON.parse(localStorage.getItem("dk_kids") || "null");
      if (!a) { var o = JSON.parse(localStorage.getItem("dk_kid") || "null"); a = o ? [o] : []; }
      return a.filter(function(k){ return k && (k.h || k.w || k.birth); });
    } catch(e){ return []; }
  }
  function idx(){ try { return parseInt(localStorage.getItem("dk_kid_i") || "0", 10) || 0; } catch(e){ return 0; } }
  function kid(){ var a = kids(); if (!a.length) return null; return a[Math.min(idx(), a.length - 1)]; }
  function months(k){
    if (!k || !k.birth) return 0; var p = k.birth.split("-"), d = new Date();
    return Math.max(0, (d.getFullYear() - (+p[0])) * 12 + (d.getMonth() + 1 - (+p[1])));
  }
  function ageTxt(m){ return m < 24 ? m + "개월" : Math.floor(m / 12) + "살"; }
  function momInfo(){ try { return JSON.parse(localStorage.getItem("dk_mom") || "null"); } catch(e){ return null; } }
  var MS = [["44","XS",45],["55","S",50],["66","M",57],["77","L",64],["88","XL",72]]; // 엄마 사이즈: 숫자·문자·몸무게 위
  function momPick(m, opts){
    var up = opts.map(function(o){ return o.toUpperCase(); });
    for (var f = 0; f < up.length; f++) if (up[f] === "FREE" || up[f] === "F" || up[f] === "ONE") return opts[f];
    var i = -1;
    if (m.top) for (var a = 0; a < MS.length; a++) if (MS[a][0] === m.top) i = a;
    if (i < 0 && m.w) { i = MS.length - 1; for (var b = 0; b < MS.length; b++) if (m.w <= MS[b][2]) { i = b; break; } }
    if (i < 0) return null;
    for (var c = 0; c < up.length; c++) if (up[c] === MS[i][0] || up[c] === MS[i][1]) return opts[c];
    return null;
  }
  function pno(){ var m = location.href.match(/product_no=([0-9]+)/) || location.pathname.match(/[/]([0-9]+)[/]category[/]/) || location.pathname.match(/[/]([0-9]+)[/]?$/); return m ? m[1] : ""; }
  var MOMCAT = 23, momSet = null;
  function loadMom(cb){
    try { var c = JSON.parse(sessionStorage.getItem("dk_momset") || "null"); if (c && Date.now() - c.t < 1800000) { momSet = c.n; cb(); return; } } catch(e){}
    fetch("https://dagguu.cafe24api.com/api/v2/categories/" + MOMCAT + "/products?display_group=1&limit=100&fields=product_no", { headers: { "X-Cafe24-Client-Id": "JzTmuiBPItGvZ6KG8g3aPC" } })
      .then(function(r){ return r.json(); }).then(function(j){
        momSet = (j.products || []).map(function(x){ return String(x.product_no); });
        try { sessionStorage.setItem("dk_momset", JSON.stringify({ t: Date.now(), n: momSet })); } catch(e){}
        cb();
      }).catch(function(){ momSet = []; cb(); });
  }
  function isMom(){ return !!(momSet && momSet.indexOf(pno()) >= 0); }

  /* ---------- ① 마이쇼핑 아이 정보 ---------- */
  var INP = "padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;width:100%;box-sizing:border-box;background:#fff;margin-top:4px";
  function kidRow(k, i){
    k = k || {};
    return "<div class='dkk-row' style='position:relative;margin-top:12px;padding:14px;border:1px solid #ece6fb;border-radius:12px;background:#fff'>" +
      "<div style='font-size:13px;font-weight:800;color:#6a3fc8'>아이 " + (i + 1) + "</div>" +
      "<button type='button' class='dkk-del' style='position:absolute;right:10px;top:10px;border:0;background:none;font-size:13px;color:#aaa;cursor:pointer'>삭제 ✕</button>" +
      "<div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-top:8px'>" +
        "<label style='font-size:12px;color:#555'>이름(선택)<input class='dkk-n' style='" + INP + "' placeholder='예: 하린' value='" + esc(k.name) + "'></label>" +
        "<label style='font-size:12px;color:#555'>성별<select class='dkk-s' style='" + INP + "'><option value='g'" + (k.sex === "b" ? "" : " selected") + ">여아</option><option value='b'" + (k.sex === "b" ? " selected" : "") + ">남아</option></select></label>" +
        "<label style='font-size:12px;color:#555'>태어난 달<input class='dkk-b' type='month' style='" + INP + "' value='" + esc(k.birth) + "'></label>" +
        "<label style='font-size:12px;color:#555'>키(cm)<input class='dkk-h' type='number' inputmode='decimal' style='" + INP + "' value='" + (k.h || "") + "'></label>" +
        "<label style='font-size:12px;color:#555'>몸무게(kg)<input class='dkk-w' type='number' inputmode='decimal' style='" + INP + "' value='" + (k.w || "") + "'></label>" +
      "</div></div>";
  }
  function mypage(){
    if (!/myshop.index/.test(location.pathname) || document.getElementById("dk-kidbox")) return;
    var host = document.querySelector(".section.benefit") || document.querySelector("#contents");
    if (!host) return;
    var d = document.createElement("div"); d.id = "dk-kidbox";
    d.style.cssText = "max-width:720px;margin:20px auto;padding:20px;border:1px solid #eee;border-radius:16px;background:#faf8ff;font-family:inherit;box-sizing:border-box";
    host.parentNode.insertBefore(d, host.nextSibling);
    function draw(list){
      var h = "<div style='font-size:16px;font-weight:800;color:#222'>👶 우리 아이 · 엄마 사이즈</div>" +
        "<div style='margin-top:4px;font-size:12px;color:#888;line-height:1.5'>저장해 두면 상품마다 추천 사이즈를 알려 드리고 사이즈 옵션을 미리 골라 드려요. (이 기기에만 저장돼요)</div><div class='dkk-list'>";
      for (var i = 0; i < list.length; i++) h += kidRow(list[i], i);
      var mm = momInfo() || {};
      var tops = "<option value=''>모름</option>"; for (var t = 0; t < MS.length; t++) tops += "<option value='" + MS[t][0] + "'" + (mm.top === MS[t][0] ? " selected" : "") + ">" + MS[t][0] + " (" + MS[t][1] + ")</option>";
      var momBox = "<div style='margin-top:18px;padding:14px;border:1px solid #ece6fb;border-radius:12px;background:#fff'><div style='font-size:13px;font-weight:800;color:#6a3fc8'>👩 엄마 사이즈</div>" +
        "<div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-top:8px'>" +
        "<label style='font-size:12px;color:#555'>키(cm)<input id='dkm-h' type='number' inputmode='decimal' style='" + INP + "' value='" + (mm.h || "") + "'></label>" +
        "<label style='font-size:12px;color:#555'>몸무게(kg)<input id='dkm-w' type='number' inputmode='decimal' style='" + INP + "' value='" + (mm.w || "") + "'></label>" +
        "<label style='font-size:12px;color:#555'>평소 상의 사이즈<select id='dkm-t' style='" + INP + "'>" + tops + "</select></label>" +
        "</div></div>";
      h += "</div><button type='button' id='dkk-add' style='margin-top:12px;width:100%;padding:12px 0;border:1px dashed #b9a5ec;border-radius:12px;background:#fff;color:#6a3fc8;font-size:14px;font-weight:800;cursor:pointer'>＋ 아이 추가</button>" +
        momBox + "<div style='margin-top:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap'><button type='button' id='dkk-save' style='padding:12px 26px;border:0;border-radius:10px;background:#6a3fc8;color:#fff;font-size:14px;font-weight:800;cursor:pointer'>저장하기</button><span id='dkk-msg' style='font-size:13px;color:#6a3fc8'></span></div>";
      d.innerHTML = h;
      var dels = d.querySelectorAll(".dkk-del");
      for (var j = 0; j < dels.length; j++) (function(n){ dels[n].onclick = function(){ var c = read(); c.splice(n, 1); if (!c.length) c.push({}); draw(c); }; })(j);
      document.getElementById("dkk-add").onclick = function(){ var c = read(); c.push({}); draw(c); };
      document.getElementById("dkk-save").onclick = function(){
        var c = read().filter(function(k){ return k.h || k.w || k.birth; });
        var mo = { h: parseFloat(document.getElementById("dkm-h").value) || 0, w: parseFloat(document.getElementById("dkm-w").value) || 0, top: document.getElementById("dkm-t").value };
        try { if (mo.h || mo.w || mo.top) localStorage.setItem("dk_mom", JSON.stringify(mo)); else localStorage.removeItem("dk_mom"); } catch(e){}
        try { localStorage.setItem("dk_kids", JSON.stringify(c)); localStorage.removeItem("dk_kid"); if (idx() >= c.length) localStorage.setItem("dk_kid_i", "0"); } catch(e){}
        document.getElementById("dkk-msg").textContent = (c.length || mo.h || mo.w || mo.top) ? "저장했어요 💜 상품 화면에서 추천 사이즈가 보여요" : "키·몸무게·태어난 달 중 하나는 넣어 주세요";
      };
    }
    function read(){
      var rows = d.querySelectorAll(".dkk-row"), out = [];
      for (var i = 0; i < rows.length; i++) {
        var q = function(c){ return rows[i].querySelector(c).value; };
        out.push({ name: q(".dkk-n").trim().slice(0, 10), sex: q(".dkk-s"), birth: q(".dkk-b"), h: parseFloat(q(".dkk-h")) || 0, w: parseFloat(q(".dkk-w")) || 0 });
      }
      return out;
    }
    var start = kids(); if (!start.length) start = [{}];
    draw(start);
    if (location.hash === "#dk-kid") d.scrollIntoView({ block: "center" });
  }

  /* ---------- ② 추천 사이즈 ---------- */
  function brandT(){
    var nm = ((document.querySelector('meta[property="og:title"]') || {}).content || document.title || "").split(" - ")[0].replace(/^다꾸키즈 [|] /, "");
    var b = nm.split(" ")[0];
    if (KG[b + "|니트"] && nm.indexOf("니트") >= 0) return KG[b + "|니트"];
    return KG[b] || null;
  }
  function recGeneric(k){
    var h = k.h, m = months(k);
    if (!h && m) { var a = m / 12, t = AVG[k.sex === "b" ? "b" : "g"], i = Math.min(Math.floor(a), t.length - 2); h = t[i] + (t[i + 1] - t[i]) * (Math.min(a, t.length - 1) - i); }
    var bi = -1;
    if (h) { for (var j = 0; j < S.length; j++) if (h <= S[j][4]) { bi = j; break; } if (bi < 0) bi = S.length - 1; var r = (h - S[bi][3]) / (S[bi][4] - S[bi][3]); if (r >= 0.5) bi = Math.min(bi + 1, S.length - 1); }
    if (k.w) { var wi = S.length - 1; for (var q = 0; q < S.length; q++) if (k.w <= S[q][5]) { wi = q; break; } if (wi > bi) bi = bi < 0 ? wi : Math.min(wi, bi + 1); }
    return bi;
  }
  function sizeOf(t){ var m = t.split(" (")[0].split("-"); return m[m.length - 1].trim(); }
  function pick(k, opts){
    var T = brandT();
    if (T && k.w) {
      var best = null, bk = 999;
      for (var i = 0; i < opts.length; i++) { var u = T[opts[i]]; if (u && u >= k.w && u < bk) { bk = u; best = opts[i]; } }
      if (best) return best;
    }
    var gi = recGeneric(k); if (gi < 0) return null;
    var names = [S[gi][0], S[gi][1], S[gi][2]];
    for (var x = 0; x < opts.length; x++) if (names.indexOf(opts[x]) >= 0) return opts[x];
    return null;
  }
  function sizeSelect(){
    var ss = document.querySelectorAll("select[option_title]");
    for (var i = 0; i < ss.length; i++) if (/사이즈|size|호/i.test(ss[i].getAttribute("option_title") || "")) return ss[i];
    return null;
  }
  function recLine(){
    var area = document.getElementById("orderFixArea"); if (!area) return;
    var line = document.getElementById("dk-rec");
    if (!line) { line = document.createElement("div"); line.id = "dk-rec"; line.style.cssText = "margin:10px 0;padding:11px 14px;border-radius:10px;background:#f6f2ff;font-size:13px;color:#333;line-height:1.6"; var an = document.getElementById("totalProducts") || document.querySelector(".infoArea .productAction") || area; an.parentNode.insertBefore(line, an); }
    if (momSet === null) { loadMom(recLine); return; }
    if (isMom()) { momLine(line); return; }
    var all = kids(), k = kid();
    if (!k) { line.innerHTML = "👶 아이 키·몸무게를 저장하면 추천 사이즈를 알려 드려요 <a href='/myshop/index.html#dk-kid' style='color:#6a3fc8;font-weight:800;text-decoration:underline'>저장하러 가기 ›</a>"; return; }
    var s = sizeSelect(), opts = [];
    if (s) for (var i = 0; i < s.options.length; i++) { var v = s.options[i].value; if (v && v.charAt(0) !== "*") opts.push(sizeOf(s.options[i].textContent)); }
    var rec = opts.length ? pick(k, opts) : null;
    var chips = "";
    if (all.length > 1) {
      var cur = Math.min(idx(), all.length - 1);
      for (var c = 0; c < all.length; c++) chips += "<a href='#none' data-dkk='" + c + "' style='display:inline-block;margin:0 6px 6px 0;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;text-decoration:none;" + (c === cur ? "background:#6a3fc8;color:#fff" : "background:#fff;color:#6a3fc8;border:1px solid #d9cdf7") + "'>" + esc(all[c].name || "아이 " + (c + 1)) + "</a>";
      chips = "<div>" + chips + "</div>";
    }
    var who = esc(k.name || "우리 아이") + " (" + [k.h ? k.h + "cm" : "", k.w ? k.w + "kg" : "", months(k) ? ageTxt(months(k)) : ""].filter(Boolean).join(" · ") + ")";
    line.innerHTML = chips + "👶 " + who + " 추천 사이즈 " + (rec ? "<b style='color:#6a3fc8;font-size:15px'>" + rec + "</b>" : (opts.length ? "<b>맞는 사이즈 없음</b> · 사이즈표를 확인해 주세요" : "<span style='color:#888'>· 색상을 고르면 알려 드려요</span>")) +
      " <a href='/myshop/index.html#dk-kid' style='margin-left:6px;font-size:12px;color:#999;text-decoration:underline'>바꾸기</a>";
    var cs = line.querySelectorAll("a[data-dkk]");
    for (var z = 0; z < cs.length; z++) cs[z].onclick = function(e){ e.preventDefault(); try { localStorage.setItem("dk_kid_i", this.getAttribute("data-dkk")); } catch(x){} recLine(); };
    if (s && rec && s.value.charAt(0) === "*" && s.getAttribute("data-dkauto") !== s.options.length + ":" + rec) {
      s.setAttribute("data-dkauto", s.options.length + ":" + rec);
      for (var j = 0; j < s.options.length; j++) if (sizeOf(s.options[j].textContent) === rec) {
        s.value = s.options[j].value;
        if (window.jQuery) jQuery(s).trigger("change"); else s.dispatchEvent(new Event("change", { bubbles: true }));
        break;
      }
    }
  }

  function autoPick(s, rec){
    if (!s || !rec || s.value.charAt(0) !== "*" || s.getAttribute("data-dkauto") === s.options.length + ":" + rec) return;
    s.setAttribute("data-dkauto", s.options.length + ":" + rec);
    for (var j = 0; j < s.options.length; j++) if (sizeOf(s.options[j].textContent) === rec) {
      s.value = s.options[j].value;
      if (window.jQuery) jQuery(s).trigger("change"); else s.dispatchEvent(new Event("change", { bubbles: true }));
      break;
    }
  }
  function momLine(line){
    var m = momInfo();
    if (!m) { line.innerHTML = "👩 엄마 키·몸무게·평소 사이즈를 저장하면 추천 사이즈를 알려 드려요 <a href='/myshop/index.html#dk-kid' style='color:#6a3fc8;font-weight:800;text-decoration:underline'>저장하러 가기 ›</a>"; return; }
    var s = sizeSelect(), opts = [];
    if (s) for (var i = 0; i < s.options.length; i++) { var v = s.options[i].value; if (v && v.charAt(0) !== "*") opts.push(sizeOf(s.options[i].textContent)); }
    var rec = opts.length ? momPick(m, opts) : null;
    var who = "엄마 (" + [m.h ? m.h + "cm" : "", m.w ? m.w + "kg" : "", m.top ? "평소 " + m.top : ""].filter(Boolean).join(" · ") + ")";
    line.innerHTML = "👩 " + who + " 추천 사이즈 " + (rec ? "<b style='color:#6a3fc8;font-size:15px'>" + rec + "</b>" : (opts.length ? "<b>맞는 사이즈 없음</b> · 상세 실측을 확인해 주세요" : "<span style='color:#888'>· 색상을 고르면 알려 드려요</span>")) +
      " <a href='/myshop/index.html#dk-kid' style='margin-left:6px;font-size:12px;color:#999;text-decoration:underline'>바꾸기</a>";
    autoPick(s, rec);
  }

  /* ---------- ③ 적립 말풍선 ---------- */
  function grp(){ try { var c = JSON.parse(sessionStorage.getItem("dk_grp") || "null"); return c && c.no ? c.no : 0; } catch(e){ return 0; } }
  function bubble(){
    var act = document.querySelector(".infoArea .productAction"); if (!act) return;
    var sp = document.getElementById("span_product_price_text"); if (!sp) return;
    var p = parseInt((sp.textContent || "").replace(/[^0-9]/g, ""), 10); if (!p) return;
    var logged = false, as = document.querySelectorAll("a"); for (var i = 0; i < as.length; i++) { var x = (as[i].textContent || "").trim(); if (x === "로그아웃") { logged = true; break; } }
    var g = grp(), html;
    if (logged && R[g]) {
      var price = GP[g] ? Math.floor(p * GP[g] / 10) * 10 : p;
      var nd = document.querySelector(".dk-nsd span:nth-child(2)"); if (!GP[g] && nd) { var q = parseInt(nd.textContent.replace(/[^0-9]/g, ""), 10); if (q) price = q; }
      var pt = Math.floor(price * R[g][0] / 100 / 10) * 10;
      html = "지금 구매하면 <b>" + won(pt) + " 적립!</b> (" + R[g][0] + "%)" + (R[g][1] ? " <span style='font-size:11px;opacity:.85;font-weight:500'>· 3만원 이상 주문 시</span>" : "");
    } else if (!logged) {
      html = "회원가입하고 3만원 이상 구매하면 <b>1% 적립!</b>";
    } else return;
    if (!document.getElementById("dk-pt-css")) {
      var st = document.createElement("style"); st.id = "dk-pt-css";
      st.textContent = "@keyframes dkbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}#dk-pt{animation:dkbob 1.6s ease-in-out infinite}";
      document.head.appendChild(st);
    }
    if (getComputedStyle(act).position === "static") act.style.position = "relative";
    if (!act.style.marginTop) act.style.marginTop = "46px";
    var b = document.getElementById("dk-pt");
    if (!b) { b = document.createElement("div"); b.id = "dk-pt"; b.style.cssText = "position:absolute;left:0;top:-44px;z-index:5;white-space:nowrap;padding:8px 14px;border-radius:12px;background:#6a3fc8;color:#fff;font-size:13px;line-height:1.4;box-shadow:0 6px 14px rgba(106,63,200,.3);pointer-events:none"; act.insertBefore(b, act.firstChild); }
    b.innerHTML = html + "<i style='position:absolute;left:24px;bottom:-6px;width:12px;height:12px;background:#6a3fc8;transform:rotate(45deg)'></i>";
  }

  function run(){ mypage(); if (document.getElementById("orderFixArea")) { recLine(); bubble(); } }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
  setTimeout(run, 1200); setTimeout(run, 3000);
  document.addEventListener("change", function(e){ if (e.target && e.target.tagName === "SELECT") { setTimeout(recLine, 700); setTimeout(recLine, 1800); } }, true);
})();
