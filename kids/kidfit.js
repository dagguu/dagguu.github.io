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

  /* ---------- ④ 최저가 보장제 (2026-11-12 시온님: 판가 기준·구매 후 7일·카톡 캡처·차액 환불) ---------- */
  function lowest(){
    var sp = document.getElementById("span_product_price_text"); if (!sp || document.getElementById("dk-low")) return;
    var an = sp.closest("table") || sp.closest(".xans-product-detaildesign") || sp.parentNode; if (!an || !an.parentNode) return;
    var d = document.createElement("div"); d.id = "dk-low";
    d.style.cssText = "margin:12px 0;padding:12px 14px;border:1px solid #e3dbfb;border-radius:12px;background:#fff;font-size:13px;color:#333;line-height:1.6";
    d.innerHTML = "<a href='#none' id='dk-low-t' style='display:flex;justify-content:space-between;align-items:center;text-decoration:none;color:#333'><span>🏷️ <b style='color:#6a3fc8'>최저가 보장제</b> · 더 싼 곳이 있으면 <b>차액 환불</b></span><span style='font-size:12px;color:#999'>자세히 ▾</span></a>" +
      "<div id='dk-low-b' style='display:none;margin-top:8px;padding-top:8px;border-top:1px dashed #e3dbfb;font-size:12.5px;color:#555'>" +
      "다꾸키즈는 최저가 보장제를 운영해요. 같은 상품(같은 브랜드·상품·옵션)을 다른 온라인몰에서 판매가 기준으로 더 싸게 팔고 있으면 차액을 돌려드려요." +
      "<ul style='margin:6px 0 0;padding-left:16px'>" +
      "<li>비교 기준: 판매가 (쿠폰·적립금·카드 할인·배송비, 회원 전용가·품절·중고·해외 상품은 제외)</li>" +
      "<li>신청 기간: 구매 후 7일 안</li>" +
      "<li>신청 방법: 카카오톡 채널 <a href='https://pf.kakao.com/_xhihNX' target='_blank' style='color:#6a3fc8;font-weight:700'>다꾸키즈</a>로 주문번호와 다른 몰 상품 화면 캡처 보내기</li>" +
      "<li>돌려드리는 것: 판매가 차액</li></ul></div>";
    an.parentNode.insertBefore(d, an.nextSibling);
    document.getElementById("dk-low-t").onclick = function(e){ e.preventDefault(); var b = document.getElementById("dk-low-b"); b.style.display = b.style.display === "none" ? "block" : "none"; };
  }

  /* ---------- ⑤ 무료배송까지 남은 금액 + 비슷한 상품 (2026-11-12 시온님, 알파업셀 참고·직접 만듦, "AI" 라고 부르지 않음) ---------- */
  var FREE = 50000, CID = "JzTmuiBPItGvZ6KG8g3aPC";
  function num(t){ return parseInt(String(t || "").replace(/[^0-9]/g, ""), 10) || 0; }
  function myNo(){ var m = location.search.match(/product_no=([0-9]+)/) || location.pathname.match(/\/([0-9]+)\/(category|display|$)/); return m ? m[1] : ""; }
  function shipBar(){
    var act = document.querySelector(".infoArea .productAction"); if (!act) return;
    var bp = document.getElementById("xans_myshop_basket_price");
    var cart = bp ? num(bp.textContent) : 0;
    var sp = document.getElementById("span_product_price_text"); var me = sp ? num(sp.textContent) : 0;
    var low = document.getElementById("dk-low"); if (!low || !low.parentNode) return;
    /* 2026-11-12: id 를 dk-freebar 로(배송 안내 칸 shipnotice 가 dk-ship 을 써서 겹쳐 덮어쓰던 것 고침), 최저가 보장제 바로 위에 작게 */
    var d = document.getElementById("dk-freebar");
    if (!d) { d = document.createElement("div"); d.id = "dk-freebar"; d.style.cssText = "margin:0 0 8px;padding:8px 12px;border-radius:10px;background:#f6f2ff;font-size:12px;color:#333;line-height:1.45"; }
    if (d.nextSibling !== low) low.parentNode.insertBefore(d, low);
    var left = FREE - cart, pct = Math.min(100, Math.round(cart / FREE * 100)), msg;
    if (left <= 0) msg = "🚚 <b style='color:#6a3fc8'>무료배송 조건을 채웠어요!</b> <span style='color:#888'>(장바구니 " + won(cart) + ")</span>";
    else if (me && cart + me >= FREE) msg = "🚚 <b style='color:#6a3fc8'>이 상품을 담으면 무료배송이에요!</b>" + (cart ? " <span style='color:#888'>(장바구니 " + won(cart) + ")</span>" : "");
    else msg = "🚚 <b style='color:#6a3fc8'>" + won(left) + "</b> 더 담으면 무료배송" + (cart ? " <span style='color:#888'>(장바구니 " + won(cart) + ")</span>" : "");
    d.innerHTML = msg + "<div style='margin-top:5px;height:4px;border-radius:2px;background:#e4dbfa;overflow:hidden'><div style='height:100%;width:" + pct + "%;background:#6a3fc8;border-radius:3px'></div></div>";
  }
  var TY = [
    ["dress", ["원피스", "점프슈트", "롬퍼", "바디수트"]],
    ["acc", ["양말", "모자", "비니", "신발", "운동화", "부츠", "가방", "머리띠", "헤어", "장갑", "목도리", "넥워머", "바라클라바", "턱받이", "스카프"]],
    ["inner", ["실내복", "내복", "잠옷", "파자마", "홈웨어"]],
    ["bottom", ["바지", "팬츠", "레깅스", "스커트", "치마", "조거", "데님", "청바지", "슬랙스", "멜빵"]],
    ["outer", ["점퍼", "자켓", "재킷", "집업", "가디건", "코트", "패딩", "베스트", "조끼", "아노락", "바람막이", "무스탕", "후리스", "플리스"]],
    ["top", ["티셔츠", "맨투맨", "후드티", "니트", "블라우스", "셔츠", "탑", "티", "폴라", "나시"]]
  ];
  function typ(n){ for (var i = 0; i < TY.length; i++) for (var j = 0; j < TY[i][1].length; j++) if (n.indexOf(TY[i][1][j]) >= 0) return TY[i][0]; return "etc"; }
  function prods(cb){
    try { var c = JSON.parse(sessionStorage.getItem("dk_prods") || "null"); if (c && Date.now() - c.t < 1800000 && c.l && c.l.length) return cb(c.l); } catch(e){}
    var all = [];
    function page(off){
      fetch("https://dagguu.cafe24api.com/api/v2/products?display=T&selling=T&limit=100&offset=" + off + "&fields=product_no,product_name,price,list_image,sold_out", { headers: { "X-Cafe24-Client-Id": CID } })
        .then(function(r){ return r.json(); }).then(function(j){
          var ps = j.products || [];
          all = all.concat(ps.map(function(x){ return { n: x.product_no, nm: x.product_name, p: Math.round(parseFloat(x.price) || 0), im: x.list_image, so: x.sold_out }; }));
          if (ps.length === 100 && off < 900) { setTimeout(function(){ page(off + 100); }, 400); return; }
          try { sessionStorage.setItem("dk_prods", JSON.stringify({ t: Date.now(), l: all })); } catch(e){}
          cb(all);
        }).catch(function(){ if (all.length) cb(all); });
    }
    page(0);
  }
  function pcCss(){
    if (document.getElementById("dk-pc-css")) return;
    var st = document.createElement("style"); st.id = "dk-pc-css";
    st.textContent = ".dk-pc{display:block!important;position:relative;overflow:hidden;border-radius:10px;background:#f2f2f2;border:1px solid #eee;box-sizing:border-box}.dk-pc img{position:absolute!important;left:0;top:0;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:cover!important;object-position:center top;margin:0!important}";
    document.head.appendChild(st);
  }
  function similar(){
    if (document.getElementById("dk-sim")) return;
    var no = pno(); if (!no) return;
    var top = document.getElementById("tabProduct") || document.getElementById("prdDetail"); if (!top || !top.parentNode) return;
    var holder = document.createElement("div"); holder.id = "dk-sim"; holder.style.cssText = "max-width:1200px;margin:24px auto 8px;padding:0 16px"; top.parentNode.insertBefore(holder, top);
    prods(function(l){
      var me = l.filter(function(x){ return String(x.n) === no; })[0];
      var sp = document.getElementById("span_product_price_text");
      var nm = me ? me.nm : ((document.querySelector('meta[property="og:title"]') || {}).content || "");
      var p = me ? me.p : (sp ? num(sp.textContent) : 0), t = typ(nm), mm = isMom();
      var c = l.filter(function(x){ return String(x.n) !== no && x.so !== "T" && x.p > 0 && typ(x.nm) === t && (momSet.indexOf(String(x.n)) >= 0) === mm; });
      c.sort(function(a, b){ return Math.abs(a.p - p) - Math.abs(b.p - p); });
      c = c.slice(0, 8); if (c.length < 2) { holder.parentNode.removeChild(holder); return; }
      var h = "<div style='margin:16px 0 0;padding:14px 0 4px;border-top:1px solid #eee'><div style='font-size:14px;font-weight:800;color:#222;margin-bottom:10px'>보고 있는 상품과 비슷한 상품이에요</div>" +
        "<div style='display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;-webkit-overflow-scrolling:touch'>";
      c.forEach(function(x){
        h += "<a href='/product/detail.html?product_no=" + x.n + "' style='flex:0 0 108px;text-decoration:none;color:#222'>" +
          "<span class='dk-pc' style='width:108px;height:135px'><img src='" + x.im + "' alt='' loading='lazy'></span>" +
          "<div style='font-size:12px;line-height:1.35;margin-top:6px;height:32px;overflow:hidden'>" + String(x.nm).replace(/</g, "&lt;") + "</div>" +
          "<div style='font-size:13px;font-weight:800;margin-top:2px'>" + won(x.p) + "</div>" +
          "<div style='margin-top:6px;padding:6px 0;border:1px solid #ddd;border-radius:8px;text-align:center;font-size:12px;color:#555'>보러가기</div></a>";
      });
      holder.innerHTML = h + "</div></div>";
    });
  }

  /* ---------- ⑥ 장바구니: 무료배송 게이지 + 남은 금액만큼 채울 상품 (2026-11-12 시온님, 알파업셀 '프로모션' 참고) ---------- */
  function cartBox(){
    if (location.pathname.indexOf("/order/basket") < 0 || document.getElementById("dk-cartfree")) return;
    var pk = document.querySelector(".xans-order-basketpackage"); if (!pk) return;
    var bp = document.getElementById("xans_myshop_basket_price"); var cart = bp ? num(bp.textContent) : 0;
    if (!cart) return;
    var inCart = {}; [].forEach.call(pk.querySelectorAll('a[href*="product_no="]'), function(a){ var m = a.href.match(/product_no=([0-9]+)/); if (m) inCart[m[1]] = 1; });
    var left = FREE - cart, pct = Math.min(100, Math.round(cart / FREE * 100));
    var box = document.createElement("div"); box.id = "dk-cartfree";
    box.style.cssText = "margin:0 0 20px;padding:18px 18px 14px;border:1px solid #ece6fb;border-radius:16px;background:#fff;box-shadow:0 4px 16px rgba(106,63,200,.08);color:#222";
    var head = left > 0
      ? "💜 <b style='font-size:16px'>" + won(left) + "</b> 더 담으면 <b style='color:#6a3fc8'>무료배송!</b>"
      : "💜 <b style='color:#6a3fc8'>무료배송 조건을 채웠어요!</b> 배송비 없이 받아 보세요";
    box.innerHTML = "<div style='font-size:14px'>" + head + "</div>" +
      "<div style='margin-top:10px;height:8px;border-radius:4px;background:#ece6fb;overflow:hidden'><div style='height:100%;width:" + pct + "%;background:#6a3fc8;border-radius:4px;transition:width .6s'></div></div>" +
      "<div style='display:flex;justify-content:space-between;margin-top:5px;font-size:11px;color:#999'><span>장바구니 " + won(cart) + "</span><span>" + won(FREE) + " 이상 무료배송</span></div>" +
      "<div id='dk-cartrec'></div>";
    var tab = pk.querySelector(".xans-order-tabinfo");
    if (tab && tab.nextSibling) pk.insertBefore(box, tab.nextSibling); else pk.insertBefore(box, pk.firstChild);
    if (left <= 0) return;
    prods(function(l){
      var c = l.filter(function(x){ return !inCart[String(x.n)] && x.so !== "T" && x.p >= left; });
      c.sort(function(a, b){ return a.p - b.p; });
      c = c.slice(0, 10); if (c.length < 2) return;
      var h = "<div style='margin-top:14px;font-size:13px;font-weight:800'>이 상품 하나만 더 담으면 무료배송이에요</div>" +
        "<div style='display:flex;gap:10px;overflow-x:auto;padding:10px 0 4px;-webkit-overflow-scrolling:touch'>";
      c.forEach(function(x){
        h += "<a href='/product/detail.html?product_no=" + x.n + "' style='flex:0 0 112px;text-decoration:none;color:#222'>" +
          "<span class='dk-pc' style='width:112px;height:140px'><img src='" + x.im + "' alt='' loading='lazy'></span>" +
          "<div style='font-size:12px;line-height:1.35;margin-top:6px;height:32px;overflow:hidden'>" + String(x.nm).replace(/</g, "&lt;") + "</div>" +
          "<div style='font-size:13px;font-weight:800;margin-top:2px'>" + won(x.p) + "</div></a>";
      });
      document.getElementById("dk-cartrec").innerHTML = h + "</div>";
    });
  }

  /* ---------- ⑦ 쇼핑정보 수신 동의 옆 "동의하면 매달 할인쿠폰" (2026-11-12 시온님) ---------- */
  function consentNote(){
    if (document.getElementById("dk-mkt")) return;
    var at = document.querySelector('label[for="sMarketingAgreeAllChecked"].check');
    if (!at) { var sms = document.querySelector('input[name="is_sms"]'); if (!sms) return; at = document.querySelector('label.check[for="' + sms.id + '"]') || sms.parentNode; }
    var b = document.createElement("span"); b.id = "dk-mkt";
    b.style.cssText = "display:inline-block;margin-left:8px;padding:3px 10px;border-radius:999px;background:#6a3fc8;color:#fff;font-size:12px;font-weight:700;vertical-align:middle;line-height:1.6";
    b.textContent = "🎁 동의하면 매달 할인쿠폰";
    at.parentNode.insertBefore(b, at.nextSibling);
  }

  /* ---------- ⑧ 쿠폰: 예상 최저가(목록·상세)·장바구니 쿠폰 혜택·내 쿠폰함 (2026-11-12 시온님, 1초쿠폰 참고·직접 만듦) ----------
     내 쿠폰 = /myshop/coupon/coupon.html 표를 읽음(로그인). 받을 수 있는 쿠폰 = 상품 상세의 쿠폰 다운로드 칸을 읽음.
     주문당 쿠폰 1장 → 가장 큰 1장만 계산. 신상 할인 중인 상품은 쿠폰을 같이 못 써서(혜택 '모든 쿠폰 사용제한') 쿠폰가를 붙이지 않음. */
  function isLogged(){ var a = document.querySelectorAll("a"); for (var i = 0; i < a.length; i++) { var t = (a[i].textContent || "").trim(); if (t === "로그아웃" || t === "LOGOUT") return true; } return false; }
  function kst(s){ var m = String(s || "").match(/([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 9, +m[5]) : 0; }
  function minOf(t){ t = String(t || "").replace(/\s/g, ""); var m = t.match(/([0-9]+)만원이상/); if (m) return +m[1] * 10000; m = t.match(/([0-9,]+)원이상/); return m ? num(m[1]) : 0; }
  function cpOff(c, p){ return c.pct ? Math.floor(p * c.pct / 100 / 10) * 10 : Math.min(c.amt || 0, p); }
  function myCps(cb){
    if (!isLogged()) return cb([]);
    try { var c = JSON.parse(sessionStorage.getItem("dk_mycp") || "null"); if (c && Date.now() - c.t < 300000) return cb(c.l); } catch(e){}
    fetch("/myshop/coupon/coupon.html", { credentials: "include" }).then(function(r){ return r.text(); }).then(function(h){
      var d = new DOMParser().parseFromString(h, "text/html"), out = [];
      [].forEach.call(d.querySelectorAll(".xans-myshop-couponlist tbody"), function(tb){
        var nmEl = tb.querySelector("td.coupon_name"); if (!nmEl) return;
        var f = {}; [].forEach.call(tb.querySelectorAll("li"), function(li){ var s = li.querySelector("strong"), v = li.querySelector(".content"); if (s && v) f[s.textContent.trim()] = v.textContent.replace(/\s+/g, " ").trim(); });
        var dc = f["할인액(률)"] || "", c = { nm: nmEl.textContent.replace("쿠폰명", "").trim(), own: 1 };
        if (/%/.test(dc)) c.pct = parseFloat(dc); else if (/원/.test(dc)) c.amt = num(dc); else return;
        c.min = /제한/.test(f["구매금액"] || "제한") ? 0 : minOf(f["구매금액"]) || num(f["구매금액"]);
        var per = (f["사용가능 기간"] || "").split("~"); c.end = kst(per[1]);
        c.all = /전체/.test(f["쿠폰적용상품"] || "전체");
        if (c.all && (!c.end || c.end > Date.now())) out.push(c);
      });
      try { sessionStorage.setItem("dk_mycp", JSON.stringify({ t: Date.now(), l: out })); } catch(e){}
      cb(out);
    }).catch(function(){ cb([]); });
  }
  function dlCps(cb){
    try { var c = JSON.parse(sessionStorage.getItem("dk_dlcp") || "null"); if (c && Date.now() - c.t < 600000) return cb(c.l); } catch(e){}
    function parse(root){
      var out = [];
      [].forEach.call(root.querySelectorAll(".xans-coupon-productdetailajax .couponSkinArea li, .couponSkinArea li"), function(li){
        var a = li.querySelector('a[href*="IssueDownload"]'); if (!a) return;
        var m = a.getAttribute("href").match(/coupon_no=([0-9]+)/); if (!m) return;
        var t = (li.querySelector(".title") || {}).textContent || "", dc = (li.querySelector(".discount") || {}).textContent || "";
        var c = { no: m[1], nm: t.replace(/\s*\.\.\.\s*$/, "").trim(), per: ((li.querySelector(".period") || {}).textContent || "").trim(), min: minOf(t), all: 1 };
        if (/%/.test(dc)) c.pct = parseFloat(dc); else if (/원/.test(dc)) c.amt = num(dc); else return;
        if (!out.some(function(x){ return x.no === c.no; })) out.push(c);
      });
      return out;
    }
    var here = document.querySelector(".xans-coupon-productdetailajax");
    if (here && here.querySelector('a[href*="IssueDownload"]')) { var l0 = parse(document); try { sessionStorage.setItem("dk_dlcp", JSON.stringify({ t: Date.now(), l: l0 })); } catch(e){} return cb(l0); }
    prods(function(l){
      var no = (l[0] || {}).n; if (!no) return cb([]);
      fetch("/product/detail.html?product_no=" + no).then(function(r){ return r.text(); }).then(function(h){
        var l1 = parse(new DOMParser().parseFromString(h, "text/html"));
        try { sessionStorage.setItem("dk_dlcp", JSON.stringify({ t: Date.now(), l: l1 })); } catch(e){}
        cb(l1);
      }).catch(function(){ cb([]); });
    });
  }
  function allCps(cb){ myCps(function(my){ dlCps(function(dl){
    var own = my.map(function(x){ return x.nm.replace(/\s|\.\.\./g, ""); });
    var rest = dl.filter(function(d){ var k = d.nm.replace(/\s|\.\.\./g, ""); return !own.some(function(o){ return o.indexOf(k) === 0 || k.indexOf(o) === 0; }); });
    cb(my, rest);
  }); }); }
  function bestCp(p, list){ var b = null; list.forEach(function(c){ if (c.min && c.min > p) return; var o = cpOff(c, p); if (o > 0 && (!b || o > b.off)) b = { off: o, c: c }; }); return b; }
  function basePrice(p){ var g = grp(); return GP[g] ? Math.floor(p * GP[g] / 10) * 10 : p; }
  function saleRow(){ var trs = document.querySelectorAll("tr"); for (var i = 0; i < trs.length; i++) { var th = trs[i].querySelector("th"); if (th && /할인 기간/.test(th.textContent || "")) return window.dkNewSale ? window.dkNewSale(trs[i]) : trs[i]; } return null; }
  function cpList(){
    if (!isLogged()) return;
    var items = document.querySelectorAll(".prdList li .description"); if (!items.length) return;
    allCps(function(my, dl){
      var L = my.concat(dl); if (!L.length) return;
      [].forEach.call(items, function(d){
        if (d.getAttribute("data-dkcp2")) return;
        var p = parseInt((d.getAttribute("ec-data-price") || "0").split(",").join(""), 10); if (!p) return;
        var lis = d.querySelectorAll("ul.spec > li"), priceLi = null, sale = false;
        for (var j = 0; j < lis.length; j++) { var tt = (lis[j].querySelector(".title") || {}).textContent || ""; if (/판매가/.test(tt) && !priceLi) priceLi = lis[j]; if (/할인 ?기간/.test(tt) && (!window.dkNewSale || window.dkNewSale(lis[j]))) sale = true; }
        if (d.querySelector("li.dk-ns")) sale = true;
        if (!priceLi || sale) return;
        var bp = basePrice(p), b = bestCp(bp, L); if (!b) return;
        d.setAttribute("data-dkcp2", "1");
        var li = document.createElement("li"); li.className = "dk-cp2";
        li.innerHTML = '<span style="display:inline-block;margin-top:3px;font-size:12px;font-weight:800;color:#e8312f">🎟 예상 최저가 ' + won(bp - b.off) + '</span>';
        var after = d.querySelector("li.dk-gp") || priceLi; after.parentNode.insertBefore(li, after.nextSibling);
      });
    });
  }
  function cpDetail(){
    var sp = document.getElementById("span_product_price_text"); if (!sp) return;
    var old = document.getElementById("dk-cpd");
    if (saleRow() || document.querySelector(".dk-nsd")) { if (old) old.parentNode.removeChild(old); return; }
    if (old) return;
    var p = num(sp.textContent); if (!p) return;
    var an = document.getElementById("dk-low") || sp.closest("table"); if (!an || !an.parentNode) return;
    var box = document.createElement("div"); box.id = "dk-cpd";
    box.style.cssText = "margin:12px 0;padding:14px 16px;border:1px solid #f1d4d2;border-radius:12px;background:#fff;font-size:13px;color:#333;line-height:1.6";
    an.parentNode.insertBefore(box, an);
    if (!isLogged()) {
      var off0 = Math.floor(p * 0.05 / 10) * 10;  /* 2026-11-12 1,000원 가입 쿠폰 삭제 → 수신동의 5% 쿠폰만 */
      box.innerHTML = "<div style='display:flex;justify-content:space-between;align-items:center'><b style='color:#e8312f'>🎟 가입 쿠폰 적용 시</b><b style='font-size:17px;color:#111'>" + won(p - off0) + "</b></div>" +
        "<div style='font-size:12px;color:#888;margin-top:2px'>쇼핑정보 수신에 동의하고 가입하면 5% 쿠폰, 가입 적립금 1,000원도 바로 드려요</div>" +
        "<a href='/member/agreement.html' style='display:block;margin-top:8px;padding:9px;border-radius:8px;background:#e8312f;color:#fff;text-align:center;font-weight:800;text-decoration:none'>회원가입하고 쿠폰 받기</a>";
      return;
    }
    allCps(function(my, dl){
      var bp = basePrice(p), b = bestCp(bp, my.concat(dl));
      if (!b) { box.parentNode.removeChild(box); return; }
      var fin = bp - b.off, g = grp(), r = R[g] || R[1], pt = (!r[1] || fin >= r[1]) ? Math.floor(fin * r[0] / 100 / 10) * 10 : 0;
      box.innerHTML = "<div style='display:flex;justify-content:space-between;align-items:center'><b style='color:#e8312f'>🎟 내 쿠폰 혜택</b><span style='font-size:11px;color:#fff;background:#e8312f;border-radius:999px;padding:1px 8px'>" + (b.c.own ? "보유 쿠폰" : "받을 수 있는 쿠폰") + "</span></div>" +
        "<div style='display:flex;justify-content:space-between;align-items:baseline;margin-top:6px'><span>예상 최저가</span><b style='font-size:18px;color:#111'>" + won(fin) + "</b></div>" +
        "<div style='display:flex;justify-content:space-between;color:#666'><span>최대 할인 쿠폰 · " + String(b.c.nm).replace(/</g, "&lt;") + "</span><span style='color:#e8312f'>-" + won(b.off) + "</span></div>" +
        (pt ? "<div style='display:flex;justify-content:space-between;color:#666'><span>결제 시 적립금</span><span>" + won(pt) + "</span></div>" : "") +
        (b.c.own ? "" : "<a href='/exec/front/newcoupon/IssueDownload?coupon_no=" + b.c.no + "&opener_url=" + encodeURIComponent(location.href) + "' style='display:block;margin-top:8px;padding:9px;border-radius:8px;background:#e8312f;color:#fff;text-align:center;font-weight:800;text-decoration:none'>쿠폰 받고 이 가격에 사기</a>") +
        "<div style='font-size:11px;color:#999;margin-top:4px'>주문당 쿠폰 1장 기준 예상 금액이에요. 쿠폰 조건·옵션 금액에 따라 달라질 수 있어요.</div>";
    });
  }
  function cpCart(){
    var box = document.getElementById("dk-cartfree"); if (!box || document.getElementById("dk-cartcp")) return;
    var bp = document.getElementById("xans_myshop_basket_price"); var cart = basePrice(bp ? num(bp.textContent) : 0); if (!cart) return;
    var w = document.createElement("div"); w.id = "dk-cartcp"; box.appendChild(w);
    allCps(function(my, dl){
      var L = my.concat(dl), b = bestCp(cart, L), next = null;
      L.forEach(function(c){ if (c.min > cart) { var o = cpOff(c, c.min); if (!next || c.min < next.c.min) next = { c: c, off: o }; } });
      var h = "";
      if (next) h += "<div style='margin-top:12px;padding:10px 12px;border-radius:10px;background:#fff6f5;font-size:13px'>🎟 <b>" + won(next.c.min) + " 이상 쿠폰</b>까지 <b style='color:#e8312f'>" + won(next.c.min - cart) + "</b> 남았어요 · 담으면 " + (next.c.pct ? next.c.pct + "% 할인" : won(next.c.amt) + " 할인") + (next.c.own ? "" : " <a href='/exec/front/newcoupon/IssueDownload?coupon_no=" + next.c.no + "&opener_url=" + encodeURIComponent(location.href) + "' style='color:#e8312f;font-weight:800'>쿠폰 받기 ›</a>") + "</div>";
      if (b) h += "<div style='margin-top:10px;border:1px solid #f1d4d2;border-radius:10px;overflow:hidden'><div style='background:#e8312f;color:#fff;font-weight:800;padding:7px 12px;font-size:13px'>🎟 내 쿠폰 혜택</div>" +
        "<div style='padding:10px 12px;font-size:13px;line-height:1.8'><div style='display:flex;justify-content:space-between'><span>상품 금액" + (GP[grp()] ? " (회원가)" : "") + "</span><span>" + won(cart) + "</span></div>" +
        "<div style='display:flex;justify-content:space-between'><span>최대 할인 쿠폰</span><span style='color:#e8312f'>" + String(b.c.nm).replace(/</g, "&lt;") + " -" + won(b.off) + "</span></div>" +
        "<div style='display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid #eee;margin-top:4px;padding-top:6px'><b>예상 결제 금액</b><b style='font-size:18px;color:#e8312f'>" + won(cart - b.off) + "</b></div>" +
        "<div style='font-size:11px;color:#999'>배송비는 주문서에서 따로 계산돼요. 신상 할인 상품은 쿠폰이 적용되지 않아요." + (b.c.own ? "" : " 쿠폰을 먼저 받아 주세요.") + "</div>" +
        (b.c.own ? "" : "<a href='/exec/front/newcoupon/IssueDownload?coupon_no=" + b.c.no + "&opener_url=" + encodeURIComponent(location.href) + "' style='display:block;margin-top:6px;padding:8px;border-radius:8px;background:#e8312f;color:#fff;text-align:center;font-weight:800;text-decoration:none'>쿠폰 받기</a>") + "</div></div>";
      w.innerHTML = h;
    });
  }
  function cpPage(){
    if (location.pathname.indexOf("/myshop/coupon/coupon") < 0 || document.getElementById("dk-cpz")) return;
    var list = document.querySelector(".xans-myshop-couponlist"); if (!list) return;
    var z = document.createElement("div"); z.id = "dk-cpz"; z.style.cssText = "max-width:720px;margin:0 auto 24px;color:#222";
    list.parentNode.insertBefore(z, list);
    try { sessionStorage.removeItem("dk_mycp"); } catch(e){}
    allCps(function(my, dl){
      var now = Date.now(), soon = my.filter(function(c){ return c.end && c.end - now < 3 * 86400000; }).sort(function(a, b){ return a.end - b.end; });
      var rest = my.filter(function(c){ return soon.indexOf(c) < 0; }).sort(function(a, b){ return (a.end || 9e15) - (b.end || 9e15); });
      function card(c, btn){
        var left = c.end ? c.end - now : 0, dd = Math.ceil(left / 86400000), dt = c.end ? new Date(c.end + 9 * 3600000) : null;
        var when = !c.end ? (c.per || "") : (left < 3 * 86400000 ? "<span data-dkend='" + c.end + "' style='color:#e8312f;font-weight:800'></span> 남음" : (dt.getUTCMonth() + 1) + "/" + dt.getUTCDate() + "까지 (D-" + dd + ")");
        return "<div style='display:flex;align-items:center;gap:12px;padding:14px 16px;margin:0 0 10px;border:1px solid #eee;border-radius:12px;background:#fff'>" +
          "<div style='flex:1;min-width:0'><div style='font-size:18px;font-weight:900'><span style='color:#e8312f'>" + (c.pct ? c.pct + "%" : won(c.amt)) + "</span> 쿠폰</div>" +
          "<div style='font-size:12px;color:#666;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>" + String(c.nm).replace(/</g, "&lt;") + (c.min ? " · " + won(c.min) + " 이상" : "") + "</div>" +
          "<div style='font-size:12px;color:#888;margin-top:2px'>⏱ " + when + "</div></div>" + btn + "</div>";
      }
      var go = "<a href='/product/list.html?cate_no=54' style='flex:0 0 auto;padding:8px 12px;border-radius:999px;background:#111;color:#fff;font-size:12px;font-weight:700;text-decoration:none'>쓰러 가기 ›</a>";
      var h = "<div style='padding:18px 18px 16px;border-radius:14px;background:#151515;color:#fff;margin-bottom:16px'><div style='font-size:20px;font-weight:900'>🎟 내 쿠폰함</div><div style='font-size:13px;color:#bbb;margin-top:4px'>기한 지나기 전에 쿠폰을 확인하세요 · 주문당 1장 사용</div></div>";
      if (soon.length) h += "<div style='font-size:14px;font-weight:800;margin:6px 0 8px'>3일 안에 써야 해요 " + soon.length + "장</div>" + soon.map(function(c){ return card(c, go); }).join("");
      h += "<div style='font-size:14px;font-weight:800;margin:14px 0 8px'>보유 쿠폰 " + rest.length + "장</div>" + (rest.length ? rest.map(function(c){ return card(c, go); }).join("") : "<div style='padding:14px;color:#999;font-size:13px'>" + (soon.length ? "다른 쿠폰은 없어요." : "아직 받은 쿠폰이 없어요.") + "</div>");
      if (dl.length) h += "<div style='font-size:14px;font-weight:800;margin:14px 0 8px'>받을 수 있는 쿠폰 " + dl.length + "장 <span style='color:#e8312f'>●</span></div>" + dl.map(function(c){
        return card(c, "<a href='/exec/front/newcoupon/IssueDownload?coupon_no=" + c.no + "&opener_url=" + encodeURIComponent(location.href) + "' style='flex:0 0 auto;padding:8px 12px;border-radius:999px;background:#e8312f;color:#fff;font-size:12px;font-weight:700;text-decoration:none'>받기 ⤓</a>");
      }).join("");
      z.innerHTML = h;
      list.style.display = "none"; var pg = document.querySelector(".xans-myshop-couponlistpaging"); if (pg) pg.style.display = "none";
      if (window.dkTick) window.dkTick();
    });
  }

  /* ---------- ⑨ 오타·한영·초성·비슷한 말 검색 (2026-11-12 시온님) ----------
     검색창에 치는 동안 아래에 상품을 바로 보여 줌. rkelrjs → 가디건(한영 전환), ㄱㄷㄱ(초성), 바지=팬츠(비슷한 말).
     상품 목록은 prods()(공개 API, 30분 캐시). Enter 때 원래 글자로 찾을 게 없고 한영 전환 글자로 있으면 바꿔서 검색. */
  var KM = { q:"ㅂ",w:"ㅈ",e:"ㄷ",r:"ㄱ",t:"ㅅ",y:"ㅛ",u:"ㅕ",i:"ㅑ",o:"ㅐ",p:"ㅔ",a:"ㅁ",s:"ㄴ",d:"ㅇ",f:"ㄹ",g:"ㅎ",h:"ㅗ",j:"ㅓ",k:"ㅏ",l:"ㅣ",z:"ㅋ",x:"ㅌ",c:"ㅊ",v:"ㅍ",b:"ㅠ",n:"ㅜ",m:"ㅡ",Q:"ㅃ",W:"ㅉ",E:"ㄸ",R:"ㄲ",T:"ㅆ",O:"ㅒ",P:"ㅖ" };
  var CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ", JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ", JONG = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";
  var VV = { "ㅗㅏ":"ㅘ","ㅗㅐ":"ㅙ","ㅗㅣ":"ㅚ","ㅜㅓ":"ㅝ","ㅜㅔ":"ㅞ","ㅜㅣ":"ㅟ","ㅡㅣ":"ㅢ" };
  var CC = { "ㄱㅅ":"ㄳ","ㄴㅈ":"ㄵ","ㄴㅎ":"ㄶ","ㄹㄱ":"ㄺ","ㄹㅁ":"ㄻ","ㄹㅂ":"ㄼ","ㄹㅅ":"ㄽ","ㄹㅌ":"ㄾ","ㄹㅍ":"ㄿ","ㄹㅎ":"ㅀ","ㅂㅅ":"ㅄ" };
  function isV(j){ return JUNG.indexOf(j) >= 0; }
  function eng2kor(s){
    var js = [], out = "", i;
    for (i = 0; i < s.length; i++) { var c = s[i], k = KM[c] || KM[c.toLowerCase()]; js.push(k || c); }
    var cho = "", jung = "", jong = "";
    function flush(){ if (cho && jung) out += String.fromCharCode(0xAC00 + (CHO.indexOf(cho) * 21 + JUNG.indexOf(jung)) * 28 + JONG.indexOf(jong || " ")); else out += cho + jung + jong; cho = jung = jong = ""; }
    for (i = 0; i < js.length; i++) {
      var j = js[i];
      if (!/[ㄱ-ㅣ]/.test(j)) { flush(); out += j; continue; }
      if (isV(j)) {
        if (jong) { var last = jong, keep = ""; for (var k2 in CC) if (CC[k2] === jong) { keep = k2[0]; last = k2[1]; }
          if (keep) { jong = keep; flush(); cho = last; jung = j; } else { jong = ""; flush(); cho = last; jung = j; } }
        else if (cho && jung) { if (VV[jung + j]) jung = VV[jung + j]; else { flush(); jung = j; } }
        else if (cho) jung = j;
        else { if (jung && VV[jung + j]) jung = VV[jung + j]; else { flush(); jung = j; } }
      } else {
        if (cho && jung) {
          if (!jong) { if (JONG.indexOf(j) > 0) jong = j; else { flush(); cho = j; } }
          else if (CC[jong + j]) jong = CC[jong + j];
          else { flush(); cho = j; }
        } else { flush(); cho = j; }
      }
    }
    flush(); return out;
  }
  function chosung(s){ var o = ""; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i) - 0xAC00; o += (c >= 0 && c < 11172) ? CHO[Math.floor(c / 588)] : s[i]; } return o; }
  var SYN = [["후드","후디","후드티"],["바지","팬츠"],["트레이닝","츄리닝","추리닝"],["레깅스","쫄바지"],["맨투맨","스웨트셔츠","mtm"],["점퍼","잠바","자켓","재킷"],["패딩","덕다운","구스"],["원피스","드레스"],["실내복","내복","잠옷","파자마","홈웨어"],["가디건","카디건"],["조끼","베스트"],["양말","삭스"],["모자","비니","캡"],["니트","스웨터"],["후리스","플리스"],["셔츠","남방"],["치마","스커트"],["기모","융털"],["상하복","세트","셋업"]];
  function sKey(s){ return String(s || "").toLowerCase().replace(/\s+/g, ""); }
  function sTerms(q){
    var raw = sKey(q), t = [{ w: raw, why: "" }];
    if (/[a-z]/i.test(q) && !/[가-힣]/.test(q)) { var k = sKey(eng2kor(q.trim())); if (/[가-힣]/.test(k)) t.push({ w: k, why: "kor" }); }
    t.slice().forEach(function(x){ SYN.forEach(function(g){ g.forEach(function(a){ if (x.w.indexOf(a) >= 0) g.forEach(function(b){ if (b !== a) t.push({ w: x.w.replace(a, b), why: x.why || "syn", from: a, to: b }); }); }); }); });
    return t;
  }
  function sMatch(l, q){
    var terms = sTerms(q), raw = sKey(q), out = [], used = {};
    var onlyCho = /^[ㄱ-ㅎ]+$/.test(raw);
    l.forEach(function(x){
      if (x.so === "T") return;
      var n = sKey(x.nm), hit = null;
      for (var i = 0; i < terms.length && !hit; i++) if (terms[i].w.length && n.indexOf(terms[i].w) >= 0) hit = terms[i];
      if (!hit && onlyCho && raw.length >= 2 && chosung(n).indexOf(raw) >= 0) hit = { w: raw, why: "cho" };
      if (hit) { out.push({ x: x, h: hit }); used[hit.why] = hit; }
    });
    out.sort(function(a, b){ return (a.h.why ? 1 : 0) - (b.h.why ? 1 : 0); });
    return { list: out, used: used, kor: terms.filter(function(t){ return t.why === "kor"; })[0] };
  }
  function sBox(inp){
    if (inp.getAttribute("data-dksr")) return; inp.setAttribute("data-dksr", "1");
    var host = inp.parentNode; if (getComputedStyle(host).position === "static") host.style.position = "relative";
    var d = document.createElement("div"); d.className = "dk-sug";
    d.style.cssText = "display:none;position:absolute;left:0;right:0;top:100%;z-index:10000;margin-top:6px;background:#fff;border:1px solid #e5e5e5;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.12);padding:10px 0;text-align:left;min-width:280px;max-height:70vh;overflow:auto";
    host.appendChild(d);
    var timer = null, last = null;
    function draw(){
      var q = inp.value.trim(); if (!q) { d.style.display = "none"; return; }
      prods(function(l){
        if (inp.value.trim() !== q) return;
        var r = sMatch(l, q); last = r;
        var h = "";
        if (r.kor && r.used.kor) h += "<div style='margin:0 12px 8px;padding:10px 12px;border-radius:10px;background:#f3efff;font-size:13px'><span style='color:#aaa;text-decoration:line-through'>" + q.replace(/</g, "&lt;") + "</span> → <b>" + r.kor.w + "</b><div style='font-size:11px;color:#6a3fc8;margin-top:2px'>한영 전환으로 찾았어요</div></div>";
        else if (r.used.cho) h += "<div style='margin:0 12px 8px;font-size:12px;color:#6a3fc8'>초성으로 찾았어요</div>";
        else if (r.used.syn) h += "<div style='margin:0 12px 8px;font-size:12px;color:#6a3fc8'>'" + r.used.syn.from + "' 비슷한 말 '" + r.used.syn.to + "'도 같이 찾았어요</div>";
        if (!r.list.length) h += "<div style='padding:6px 14px;font-size:13px;color:#999'>찾는 상품이 없어요. 다른 말로 검색해 보세요.</div>";
        else {
          h += "<div style='padding:0 14px 4px;font-size:12px;font-weight:800;color:#999'>상품 " + r.list.length + "개</div>";
          r.list.slice(0, 6).forEach(function(o){ var x = o.x;
            h += "<a href='/product/detail.html?product_no=" + x.n + "' style='display:flex;gap:10px;align-items:center;padding:7px 14px;text-decoration:none;color:#222'>" +
              "<span class='dk-pc' style='flex:0 0 48px;width:48px;height:60px;border-radius:8px'><img src='" + x.im + "' alt=''></span>" +
              "<span style='flex:1;min-width:0'><span style='display:block;font-size:13px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>" + String(x.nm).replace(/</g, "&lt;") + "</span>" +
              "<b style='font-size:13px'>" + won(x.p) + "</b>" + (o.h.why ? " <span style='font-size:10px;color:#888;border:1px solid #ddd;border-radius:4px;padding:0 4px;margin-left:4px'>" + ({ kor: "한영 전환", cho: "초성", syn: "비슷한 말" })[o.h.why] + "</span>" : "") + "</span></a>";
          });
          if (r.list.length > 6) h += "<a href='#none' class='dk-sug-all' style='display:block;margin:6px 14px 0;padding:8px;border-radius:8px;background:#f5f5f5;text-align:center;font-size:12px;color:#333;text-decoration:none'>검색 결과 전체 보기 ›</a>";
        }
        d.innerHTML = h; d.style.display = "block";
      });
    }
    function target(){ var q = inp.value.trim(); if (last && last.kor && last.used.kor && !last.list.some(function(o){ return !o.h.why; })) return last.kor.w; return q; }
    inp.addEventListener("input", function(){ clearTimeout(timer); timer = setTimeout(draw, 180); });
    inp.addEventListener("focus", function(){ if (inp.value.trim()) draw(); });
    inp.addEventListener("blur", function(){ setTimeout(function(){ d.style.display = "none"; }, 200); });
    d.addEventListener("mousedown", function(e){ var a = e.target.closest("a"); if (!a) return; e.preventDefault(); if (a.className === "dk-sug-all") location.href = "/product/search.html?keyword=" + encodeURIComponent(target()); else location.href = a.getAttribute("href"); });
    var f = inp.form;
    if (f) f.addEventListener("submit", function(){ var t = target(); if (t && t !== inp.value.trim()) inp.value = t; }, true);
    inp.addEventListener("keydown", function(e){ if (e.key === "Enter") { var t = target(); if (t && t !== inp.value.trim()) inp.value = t; } });
  }
  function searchSug(){ pcCss(); [].forEach.call(document.querySelectorAll("input[name=keyword]"), sBox); }

  /* ---------- ⑩ 홈 숏폼 영상 칸 + 영상 속 상품 (2026-11-12 시온님) ----------
     영상 = 다꾸 저장소 kids-video.yml 이 상품 사진으로 만든 kids/v/*.mp4 (list.json). 홈 브랜드 칸 아래 가로 카드(보이면 소리 없이 재생),
     누르면 전체 화면 세로 피드(위아래로 넘김) + 아래 상품 카드(사진·이름·가격·바로가기). */
  var HV = "https://www.dagguu.com/kids/v/list.json";
  function homeVideos(){
    var p = location.pathname; if (!(p === "/" || p === "/index.html")) return;
    if (document.getElementById("dk-hv")) return;
    /* 2026-11-12 시온님 "shorts pick 을 맨 위로": 홈 맨 위 신상 칸(#dk-new) 바로 앞에 */
    var top = document.getElementById("dk-new");
    var at = document.getElementById("dk-brands") || document.querySelector(".dk-brands") || document.querySelector(".dk-hdbox");
    if (!(top && top.parentNode) && !(at && at.parentNode)) return;
    var sec = document.createElement("section"); sec.id = "dk-hv";
    if (top && top.parentNode) top.parentNode.insertBefore(sec, top);
    else if (at.classList && at.classList.contains("dk-hdbox")) at.parentNode.insertBefore(sec, at); else at.parentNode.insertBefore(sec, at.nextSibling);
    fetch(HV + "?d=" + new Date().toISOString().slice(0, 13)).then(function(r){ return r.json(); }).then(function(l){
      l = (l || []).slice(0, 12); if (!l.length) { sec.parentNode.removeChild(sec); return; }
      /* 2026-11-12 시온님 "깔끔한 느낌으로"(CREATOR PICK 참고): 가운데 카드 크게, 양옆 살짝 보이게, 아래 '상품 보기' */
      var st = "<style>#dk-hv{background:#f6f3ee;margin:0 0 10px;padding:28px 0 26px;text-align:center}" +
        "#dk-hv .hh{font-size:22px;letter-spacing:3px;font-weight:600;color:#111;margin:0}#dk-hv .hs{font-size:13px;color:#888;margin:6px 0 18px}" +
        "#dk-hv .hvr{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px calc(50% - min(31vw,150px)) 6px;-webkit-overflow-scrolling:touch;scrollbar-width:none}#dk-hv .hvr::-webkit-scrollbar{display:none}" +
        "#dk-hv .hvc{flex:0 0 min(62vw,300px);width:min(62vw,300px);scroll-snap-align:center;cursor:pointer;text-decoration:none;color:#222;transition:opacity .35s;opacity:.75}" +
        "#dk-hv .hvb{display:none!important}#dk-hv .hvc.on{opacity:1}#dk-hv .hvc,#dk-hv .hvv{box-sizing:border-box}#dk-hv .hvc{min-width:0;overflow:hidden}#dk-hv .hvm>span{flex:1;min-width:0;overflow:hidden}#dk-hv .hvv{height:auto}" +
        "@media(min-width:1025px){#dk-hv .hvr{max-width:1240px;margin:0 auto;padding:4px 20px 6px;scroll-snap-type:x proximity}#dk-hv .hvc{flex:0 0 calc((100% - 56px)/5);width:calc((100% - 56px)/5);max-width:calc((100% - 56px)/5);scroll-snap-align:start;opacity:1}}" +
        "#dk-hv .hvv{display:block;position:relative;width:100%;aspect-ratio:9/16;border-radius:16px;overflow:hidden;background:#e9e4dc}#dk-hv .hvv video{width:100%;height:100%;object-fit:cover;display:block}" +
        "#dk-hv .hvb{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);background:rgba(20,20,20,.72);color:#fff;font-size:12px;font-weight:700;border-radius:999px;padding:7px 14px;white-space:nowrap}" +
        "#dk-hv .hvm{display:flex;align-items:center;gap:8px;margin:10px 4px 0;text-align:left}#dk-hv .hvm img{width:30px;height:30px;border-radius:50%;object-fit:cover;flex:0 0 auto;background:#ddd}" +
        "#dk-hv .hvm b{font-size:13px;font-weight:700}#dk-hv .hvm span{display:block;font-size:12px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
        "#dk-hvf{position:fixed;inset:0;z-index:100000;background:#000;display:none}#dk-hvf .fs{height:100%;overflow-y:auto;scroll-snap-type:y mandatory}#dk-hvf .fs::-webkit-scrollbar{display:none}" +
        "#dk-hvf .sl{position:relative;height:100%;scroll-snap-align:start;display:flex;align-items:center;justify-content:center}#dk-hvf video{max-width:100%;max-height:100%;width:auto;height:100%;object-fit:contain}" +
        "#dk-hvf .pc{position:absolute;left:12px;right:12px;bottom:max(16px,env(safe-area-inset-bottom));max-width:480px;margin:0 auto;display:flex;gap:10px;align-items:center;background:#fff;border-radius:12px;padding:10px;text-decoration:none;color:#222}" +
        "#dk-hvf .bw{position:absolute;left:0;right:0;bottom:max(14px,env(safe-area-inset-bottom));max-width:520px;margin:0 auto;padding:0 12px}#dk-hvf .bt{display:flex;justify-content:space-between;align-items:center;color:#fff;font-size:13px;margin-bottom:8px;text-shadow:0 1px 4px rgba(0,0,0,.6)}#dk-hvf .bt a{background:#fff;color:#111;font-size:12px;font-weight:800;border-radius:999px;padding:6px 12px;text-decoration:none;text-shadow:none}#dk-hvf .bl{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none}#dk-hvf .bl::-webkit-scrollbar{display:none}#dk-hvf .bi{flex:0 0 108px;background:#fff;border-radius:10px;padding:6px;text-decoration:none;color:#222;border:2px solid transparent;transition:border-color .2s}#dk-hvf .bi.on{border-color:#6a3fc8}#dk-hvf .bi img{width:100%;height:110px;object-fit:cover;border-radius:6px;display:block}#dk-hvf .bi span{display:block;font-size:11px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#dk-hvf .bi b{font-size:12px}" +
        "#dk-hvf .tb{position:absolute;top:max(12px,env(safe-area-inset-top));left:0;right:0;display:flex;justify-content:space-between;padding:0 14px;z-index:2}#dk-hvf .tb a{color:#fff;font-size:26px;text-decoration:none;line-height:1;text-shadow:0 1px 4px rgba(0,0,0,.6)}</style>";
      var h = st + "<h3 class='hh'>SHORTS PICK</h3><p class='hs'>다꾸키즈가 직접 보고 고른 이번 주 신상</p><div class='hvr'>";
      l.forEach(function(x, i){ h += "<a class='hvc' data-i='" + i + "'><span class='hvv'><video muted playsinline loop preload='none' poster='" + x.poster + "' data-src='" + x.video + "'></video><span class='hvb'>" + (x.type === "brand" ? "브랜드 바로가기" : "상품 보기") + "</span></span>" +
        "<span class='hvm'><img src='" + x.img + "' alt=''><span style='min-width:0'><b>" + String(x.brand || "").replace(/</g, "") + "</b><span>" + (x.type === "brand" ? "신상 " + x.items.length + "종 · " + won(x.price) + "~" : String(x.name).replace(/</g, "&lt;") + " · " + won(x.price)) + "</span></span></span></a>"; });
      sec.innerHTML = h + "</div>";
      /* 2026-11-12 시온님: PC 는 스와이프가 안 돼서 양쪽 화살표 + 4초마다 자동으로 한 칸씩(마우스 올리면 멈춤) */
      if (window.matchMedia && matchMedia("(min-width:1025px)").matches) {
        var wr = document.createElement("div"); wr.style.cssText = "position:relative;max-width:1240px;margin:0 auto";
        var rw = sec.querySelector(".hvr"); rw.parentNode.insertBefore(wr, rw); wr.appendChild(rw);
        var ab = "position:absolute;top:38%;z-index:3;width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.95);box-shadow:0 2px 10px rgba(0,0,0,.15);font-size:22px;color:#222;cursor:pointer;line-height:44px;padding:0";
        var bl = document.createElement("button"); bl.type = "button"; bl.textContent = "‹"; bl.setAttribute("aria-label", "이전"); bl.style.cssText = ab + ";left:4px";
        var br = document.createElement("button"); br.type = "button"; br.textContent = "›"; br.setAttribute("aria-label", "다음"); br.style.cssText = ab + ";right:4px";
        wr.appendChild(bl); wr.appendChild(br);
        function step(d){ var c = rw.querySelector(".hvc"); var w = c ? c.getBoundingClientRect().width + 14 : 260; var max = rw.scrollWidth - rw.clientWidth - 4;
          if (d > 0 && rw.scrollLeft >= max) rw.scrollTo({ left: 0, behavior: "smooth" }); else if (d < 0 && rw.scrollLeft <= 4) rw.scrollTo({ left: max + 4, behavior: "smooth" }); else rw.scrollBy({ left: d * w, behavior: "smooth" }); }
        bl.onclick = function(){ step(-1); }; br.onclick = function(){ step(1); };
        var hov = false; wr.addEventListener("mouseenter", function(){ hov = true; }); wr.addEventListener("mouseleave", function(){ hov = false; });
        setInterval(function(){ var ff = document.getElementById("dk-hvf"); if (!hov && !document.hidden && !(ff && ff.style.display === "block")) step(1); }, 4000);
      }
      var row = sec.querySelector(".hvr"), cards = sec.querySelectorAll(".hvc"), cur = -1, vis = false;
      var PC = window.matchMedia && matchMedia("(min-width:1025px)").matches;
      function pick(){
        if (PC) { var rr = row.getBoundingClientRect(); [].forEach.call(cards, function(c){ var r = c.getBoundingClientRect(), v = c.querySelector("video"), inV = vis && r.left >= rr.left - 10 && r.right <= rr.right + 10; c.classList.add("on"); if (inV) { if (!v.src) v.src = v.getAttribute("data-src"); var pr = v.play(); if (pr && pr.catch) pr.catch(function(){}); } else v.pause(); }); cur = -2; return; }
        var rc = row.getBoundingClientRect(), mid = rc.left + rc.width / 2, best = 0, bd = 1e9;
        [].forEach.call(cards, function(c, i){ var r = c.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = i; } });
        [].forEach.call(cards, function(c, i){ var v = c.querySelector("video"); if (i === best) { c.classList.add("on"); if (vis) { if (!v.src) v.src = v.getAttribute("data-src"); var pr = v.play(); if (pr && pr.catch) pr.catch(function(){}); } else v.pause(); } else { c.classList.remove("on"); v.pause(); } });
        cur = best;
      }
      var t; row.addEventListener("scroll", function(){ clearTimeout(t); t = setTimeout(pick, 90); });
      try { new IntersectionObserver(function(es){ vis = es[0].isIntersecting; pick(); }, { threshold: 0.4 }).observe(row); } catch(e){ vis = true; }
      setTimeout(pick, 50);
      [].forEach.call(cards, function(a, i){ a.onclick = function(e){ e.preventDefault(); if (cur !== -2 && i !== cur) { a.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); return; } hvOpen(l, i); }; });
    }).catch(function(){ if (sec.parentNode) sec.parentNode.removeChild(sec); });
  }
  function hvOpen(l, start){
    var f = document.getElementById("dk-hvf");
    if (!f) { f = document.createElement("div"); f.id = "dk-hvf"; document.body.appendChild(f); }
    var h = "<div class='tb'><a href='#none' class='mu'>🔇</a><a href='#none' class='x'>✕</a></div><div class='fs'>";
    l.forEach(function(x){
      if (x.type === "brand") {
        h += "<div class='sl'><video playsinline loop muted preload='none' poster='" + x.poster + "' data-src='" + x.video + "' data-seg='" + (x.seg || 1.32) + "'></video>" +
          "<div class='bw'><div class='bt'><b>" + String(x.brand).replace(/</g, "") + " · 영상 속 상품 " + x.items.length + "</b><a href='" + x.url + "'>브랜드 바로가기 ›</a></div><div class='bl'>" +
          x.items.map(function(it, j){ return "<a class='bi' data-j='" + j + "' href='" + it.url + "'><img src='" + it.img + "' alt=''><span>" + String(it.name).replace(/</g, "&lt;") + "</span><b>" + won(it.price) + "</b></a>"; }).join("") + "</div></div></div>";
        return;
      }
      h += "<div class='sl'><video playsinline loop muted preload='none' poster='" + x.poster + "' data-src='" + x.video + "'></video>" +
      "<a class='pc' href='" + x.url + "'><img src='" + x.img + "' alt='' style='width:52px;height:64px;object-fit:cover;border-radius:8px;flex:0 0 auto'><span style='flex:1;min-width:0'><span style='display:block;font-size:11px;color:#888'>영상 속 상품</span><span style='display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>" + String(x.name).replace(/</g, "&lt;") + "</span><b style='font-size:15px'>" + won(x.price) + "</b></span><span style='flex:0 0 auto;background:#111;color:#fff;font-size:12px;font-weight:700;border-radius:8px;padding:8px 12px'>바로가기</span></a></div>"; });
    f.innerHTML = h + "</div>"; f.style.display = "block"; document.documentElement.style.overflow = "hidden";
    var fs = f.querySelector(".fs"), vs = f.querySelectorAll("video"), muted = true;
    function playVis(){ [].forEach.call(vs, function(v){ var r = v.parentNode.getBoundingClientRect(); if (Math.abs(r.top) < r.height / 2) { if (!v.src) v.src = v.getAttribute("data-src"); v.muted = muted; var p = v.play(); if (p && p.catch) p.catch(function(){ v.muted = true; v.play(); }); } else v.pause(); }); }
    fs.scrollTop = start * fs.clientHeight; setTimeout(playVis, 60);
    [].forEach.call(vs, function(v){ var seg = parseFloat(v.getAttribute("data-seg") || "0"); if (!seg) return; var last = -1, bis = v.parentNode.querySelectorAll(".bi");
      v.addEventListener("timeupdate", function(){ var j = Math.min(bis.length - 1, Math.floor(v.currentTime / seg)); if (j === last) return; last = j;
        [].forEach.call(bis, function(b, k){ b.classList.toggle("on", k === j); }); var b = bis[j]; if (b) { var bl = b.parentNode; bl.scrollTo({ left: b.offsetLeft - bl.clientWidth / 2 + b.clientWidth / 2, behavior: "smooth" }); } }); });
    var t; fs.addEventListener("scroll", function(){ clearTimeout(t); t = setTimeout(playVis, 120); });
    f.querySelector(".x").onclick = function(e){ e.preventDefault(); [].forEach.call(vs, function(v){ v.pause(); }); f.style.display = "none"; document.documentElement.style.overflow = ""; };
    f.querySelector(".mu").onclick = function(e){ e.preventDefault(); muted = !muted; this.textContent = muted ? "🔇" : "🔊"; playVis(); };
  }

  /* ---------- ⑪ 검색창 인기 검색어 바로 보이기 (2026-11-12 시온님 "서치에서 바로 확인할 수 있게") ---------- */
  var KW2 = ["아오스타", "피피", "제니베이직", "데일리베베", "가디건", "원피스", "기모", "후리스", "바지", "실내복"];
  /* 2026-11-12 시온님: 홈 친구 초대 배너 → 마이페이지 맨 위(우리 아이 정보 위)에 초대 칸 */
  function inviteTop(){
    if (location.pathname.indexOf("/myshop/index.html") !== 0 && location.pathname !== "/myshop/") return;
    var kb = document.getElementById("dk-kidbox"); if (!kb || document.getElementById("dk-invite")) return;
    var iv = [].filter.call(document.querySelectorAll("div.invite"), function(x){ return x.offsetParent && x.querySelector("input"); })[0]; if (!iv) return;
    iv.id = "dk-invite"; iv.style.cssText += ";max-width:720px;margin:16px auto 20px;padding:18px 16px;border:2px solid #e3d8ff;border-radius:14px;background:#faf7ff;box-sizing:border-box";
    var hd = document.createElement("div"); hd.style.cssText = "font-size:16px;font-weight:900;color:#6a3fc8;margin-bottom:8px;text-align:center"; hd.textContent = "🎁 친구 초대 이벤트 · 친구도 나도 500원 적립";
    iv.insertBefore(hd, iv.firstChild);
    kb.parentNode.insertBefore(iv, kb);
    if (location.hash === "#dk-invite") setTimeout(function(){ window.scrollTo({ top: iv.getBoundingClientRect().top + window.pageYOffset - 140, behavior: "smooth" }); }, 300);
  }
  var MENU_KW = ["양말", "실내복", "1+1", "크리스마스"];
  function kwAlways(){
    if (!document.getElementById("dk-kw2-css")) { var st = document.createElement("style"); st.id = "dk-kw2-css"; st.textContent = ".dk-kw{display:none!important}.xans-layout-searchheader{background:#fff!important;height:auto!important;max-height:100vh;overflow-y:auto;padding-bottom:40px!important;box-shadow:0 8px 20px rgba(0,0,0,.08)}"; document.head.appendChild(st); }
    /* 2026-11-12 시온님: 상단 메뉴(양말·실내복)로 들어온 검색 결과 화면에는 '상품검색' 칸을 숨김 */
    if (location.pathname.indexOf("/product/search.html") === 0) {
      var q = ""; try { q = new URLSearchParams(location.search).get("keyword") || ""; } catch(e){}
      if (MENU_KW.indexOf(q.trim()) >= 0 && !document.documentElement.getAttribute("data-dkmenu")) { document.documentElement.setAttribute("data-dkmenu", "1"); var sf = document.querySelector("form.searchField"); if (sf) sf.style.display = "none"; var h2 = document.querySelector(".titleArea h2"); if (h2) h2.textContent = q.trim(); }
    }
    [].forEach.call(document.querySelectorAll(".dk-kw2"), function(d){ if (!d.closest(".xans-layout-searchheader")) d.parentNode.removeChild(d); });
    var lay = document.querySelector(".xans-layout-searchheader"); if (!lay) return;
    var inp = lay.querySelector("input[name=keyword]"); if (!inp || lay.querySelector(".dk-kw2")) return;
    var d = document.createElement("div"); d.className = "dk-kw2";
    d.style.cssText = "max-width:650px;margin:22px auto 0;padding:0 4px;text-align:left";
    var h = "<div style='font-size:14px;font-weight:800;color:#222;margin-bottom:12px'>🔥 인기 검색어</div><div style='display:grid;grid-template-columns:1fr 1fr;gap:8px 18px'>";
    KW2.forEach(function(k, i){ h += "<a href='/product/search.html?keyword=" + encodeURIComponent(k) + "' style='display:flex;gap:10px;align-items:center;font-size:14px;color:#333;text-decoration:none;padding:4px 0'><b style='width:18px;color:" + (i < 3 ? "#6a3fc8" : "#aaa") + "'>" + (i + 1) + "</b>" + k + "</a>"; });
    d.innerHTML = h + "</div>";
    var fs = inp.closest("fieldset"); if (fs && fs.parentNode === lay) lay.insertBefore(d, fs.nextSibling); else lay.appendChild(d);
    var v0 = inp.value;
    function upd(){ d.style.display = inp.value.trim() && inp.value !== v0 ? "none" : "block"; }
    inp.addEventListener("input", upd); upd();
  }
  /* ---------- ⑫ 상품 목록 끝없이 이어 보기 (2026-11-12 시온님 "페이지 안 넘겨도 계속 스크롤하면 상품") ---------- */
  function infList(){
    if (window.dkInf) return;
    var pg = document.querySelector(".xans-product-normalpaging, .xans-search-paging");
    var ul = document.querySelector(".xans-product-normalpackage ul.prdList, .xans-search-result ul.prdList");
    if (!pg || !ul) return;
    function nextOf(root){ var a = [].filter.call(root.querySelectorAll("a"), function(x){ return /다음 페이지/.test(x.textContent); })[0]; var href = a && a.getAttribute("href"); if (!href || href === "#none") return null; var u = new URL(href, location.href); return u.href; }
    var next = nextOf(pg); if (!next) return;
    window.dkInf = 1;
    var curPage = (location.search.match(/[?&]page=([0-9]+)/) || [0, 1])[1];
    pg.style.display = "none";
    var sen = document.createElement("div"); sen.id = "dk-inf"; sen.style.cssText = "padding:24px 0 40px;text-align:center;font-size:13px;color:#999";
    sen.textContent = "상품을 더 불러오는 중…";
    pg.parentNode.insertBefore(sen, pg.nextSibling);
    var busy = false;
    function load(){
      if (busy || !next) return; busy = true;
      fetch(next, { credentials: "include" }).then(function(r){ return r.text(); }).then(function(h){
        var d = new DOMParser().parseFromString(h, "text/html");
        var lis = d.querySelectorAll(".xans-product-normalpackage ul.prdList > li, .xans-search-result ul.prdList > li");
        var seen = {}; [].forEach.call(ul.querySelectorAll(":scope > li[id]"), function(li){ seen[li.id] = 1; });
        [].forEach.call(lis, function(li){ if (li.id && seen[li.id]) return; ul.appendChild(document.importNode(li, true)); });
        var p2 = d.querySelector(".xans-product-normalpaging, .xans-search-paging");
        next = p2 ? nextOf(p2) : null;
        busy = false;
        if (!next) sen.textContent = "모든 상품을 다 봤어요 💜";
        try { cpList(); } catch(e){}
        if (next && sen.getBoundingClientRect().top < innerHeight + 900) load();
      }).catch(function(){ busy = false; sen.innerHTML = "<a href='" + next + "' style='color:#6a3fc8'>다음 상품 보기 ›</a>"; next = null; });
    }
    function near(){ if (sen.getBoundingClientRect().top < innerHeight + 900) load(); }
    try { new IntersectionObserver(function(es){ if (es[0].isIntersecting) load(); }, { rootMargin: "900px 0px" }).observe(sen); } catch(e){}
    addEventListener("scroll", function(){ clearTimeout(window.dkInfT); window.dkInfT = setTimeout(near, 120); }, { passive: true });
    setTimeout(near, 800);
  }

  /* ---------- ⑪ 홈 끝없는 상품 목록 (2026-11-12 시온님 "홈화면에서 스크롤이 멈추지 않도록 상품을 계속") ----------
     홈 마지막 상품 칸 아래에 "전체 상품" 칸을 만들고, 신상품 분류(54) 목록 페이지를 차례로 읽어 카드를 이어 붙임. 홈에 이미 있는 상품은 건너뜀. */
  function homeInf(){
    var p = location.pathname; if (!(p === "/" || p === "/index.html") || document.getElementById("dk-all")) return;
    var secs = [].filter.call(document.querySelectorAll(".dk-sec"), function(s){ return s.querySelector("ul.prdList"); });
    if (!secs.length) return;
    var last = secs[secs.length - 1], cls = (last.querySelector("ul.prdList").className || "prdList grid4");
    var sec = document.createElement("section"); sec.className = "dk-sec"; sec.id = "dk-all";
    sec.innerHTML = "<h2>🛍️ 다꾸키즈 <em>전체 상품</em></h2><p>내리면 상품이 계속 나와요</p><div class='ec-base-product'><ul class='" + cls + "'></ul></div>";
    last.parentNode.insertBefore(sec, last.nextSibling);
    var ul = sec.querySelector("ul");
    var sen = document.createElement("div"); sen.style.cssText = "padding:24px 0 40px;text-align:center;font-size:13px;color:#999"; sen.textContent = "상품을 더 불러오는 중…";
    sec.appendChild(sen);
    var page = 1, busy = false, done = false, seen = {};
    function idOf(li){ var m = String(li.id || "").match(/([0-9]+)$/); if (m) return m[1]; var a = li.querySelector("a[href*='product_no='],a[href*='/product/']"); var h = a ? a.getAttribute("href") : ""; m = h.match(/product_no=([0-9]+)/) || h.match(/[/]([0-9]+)[/]category[/]/); return m ? m[1] : ""; }
    [].forEach.call(document.querySelectorAll(".dk-sec ul.prdList > li"), function(li){ var k = idOf(li); if (k) seen[k] = 1; });
    function load(){
      if (busy || done) return; busy = true;
      fetch("/product/list.html?cate_no=54&page=" + page, { credentials: "include" }).then(function(r){ return r.text(); }).then(function(h){
        var d = new DOMParser().parseFromString(h, "text/html");
        var lis = d.querySelectorAll(".xans-product-normalpackage ul.prdList > li");
        var add = 0;
        [].forEach.call(lis, function(li){ var k = idOf(li); if (!k || seen[k]) return; seen[k] = 1; ul.appendChild(document.importNode(li, true)); add++; });
        page++; busy = false;
        if (!lis.length || page > 60) { done = true; sen.textContent = "모든 상품을 다 봤어요 💜"; return; }
        try { cpList(); } catch(e){}
        if (sen.getBoundingClientRect().top < innerHeight + 1200) load();
      }).catch(function(){ busy = false; done = true; sen.innerHTML = "<a href='/product/list.html?cate_no=54' style='color:#6a3fc8'>전체 상품 보러가기 ›</a>"; });
    }
    function near(){ if (sen.getBoundingClientRect().top < innerHeight + 1200) load(); }
    try { new IntersectionObserver(function(es){ if (es[0].isIntersecting) load(); }, { rootMargin: "1200px 0px" }).observe(sen); } catch(e){}
    addEventListener("scroll", function(){ clearTimeout(window.dkHiT); window.dkHiT = setTimeout(near, 120); }, { passive: true });
    setTimeout(near, 600);
  }

  function run(){ kwAlways(); try{ inviteTop(); }catch(e){} infList(); homeVideos(); homeInf(); searchSug(); consentNote(); cpPage(); cpList(); pcCss(); mypage(); try{ inviteTop(); }catch(e){} cartBox(); cpCart(); if (document.getElementById("orderFixArea")) { lowest(); cpDetail(); recLine(); bubble(); shipBar(); if (momSet !== null) similar(); } }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
  setTimeout(run, 1200); setTimeout(run, 3000);
  document.addEventListener("change", function(e){ if (e.target && e.target.tagName === "SELECT") { setTimeout(recLine, 700); setTimeout(recLine, 1800); } }, true);
})();
