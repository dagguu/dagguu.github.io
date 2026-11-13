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
    var ag = ageGet(), cate = ag ? AGE[ag][1] : 54;
    var sec = document.createElement("section"); sec.className = "dk-sec"; sec.id = "dk-all";
    sec.innerHTML = ag ? "<h2>" + AGE[ag][2] + " " + AGE[ag][0] + " <em>신상품</em></h2><p>" + AGE[ag][3] + " 아이옷만 모아 봤어요 · 내리면 계속 나와요</p><div class='ec-base-product'><ul class='" + cls + "'></ul></div>"
      : "<h2>🛍️ 다꾸키즈 <em>전체 상품</em></h2><p>내리면 상품이 계속 나와요</p><div class='ec-base-product'><ul class='" + cls + "'></ul></div>";
    if (ag) { secs[0].parentNode.insertBefore(sec, secs[0]); secs.forEach(function(x){ x.style.display = "none"; }); }
    else last.parentNode.insertBefore(sec, last.nextSibling);
    var ul = sec.querySelector("ul");
    var sen = document.createElement("div"); sen.style.cssText = "padding:24px 0 40px;text-align:center;font-size:13px;color:#999"; sen.textContent = "상품을 더 불러오는 중…";
    sec.appendChild(sen);
    var page = 1, busy = false, done = false, seen = {};
    function idOf(li){ var m = String(li.id || "").match(/([0-9]+)$/); if (m) return m[1]; var a = li.querySelector("a[href*='product_no='],a[href*='/product/']"); var h = a ? a.getAttribute("href") : ""; m = h.match(/product_no=([0-9]+)/) || h.match(/[/]([0-9]+)[/]category[/]/); return m ? m[1] : ""; }
    if (!ag) [].forEach.call(document.querySelectorAll(".dk-sec ul.prdList > li"), function(li){ var k = idOf(li); if (k) seen[k] = 1; });
    function load(){
      if (busy || done) return; busy = true;
      fetch("/product/list.html?cate_no=" + cate + "&page=" + page, { credentials: "include" }).then(function(r){ return r.text(); }).then(function(h){
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

  /* ---------- ⑫ 홈 새 구성 (2026-11-13 시온님이 바잇미 모바일 화면 6장 보여주며 "홈페이지 디자인 이렇게") ----------
     구성만 참고하고 그림·글은 다꾸키즈 것: ① 혜택 카드(로그인 전 = 가입 혜택, 로그인 후 = 친구 초대) ② 둥근 슬라이드 배너(다꾸 kids-cards.yml 이 매일 만드는 B1~B4)
     ③ 동그란 네모 아이콘 2줄(5칸) ④ "오늘의 신상 할인"(카페24 신상 3일 5% 혜택이 걸린 상품 = 목록 페이지의 할인 기간·최적할인가 그대로, 끝나는 시간 가까운 순 3개)
     ⑤ 휴대폰 아래 고정 탭(홈·카테고리·장바구니·관심·MY) ⑥ 카테고리 창(카테고리/브랜드 탭, 왼쪽 목록 + 이 카테고리 인기상품) ⑦ 홈 아래 팝업(오늘 하루 보지 않기).
     숫자는 카페24 화면 값만 쓰고 지어내지 않는다. */
  /* 아이콘 = 직접 그린 SVG(2026-11-13 시온님 "바잇미처럼"): 첫 줄은 진한 남보라 칸 + 형광 글자, 둘째 줄은 연한 칸 + 그림 */
  function bmTx(t, fs, c2){ return "<svg viewBox='0 0 64 64' width='100%' height='100%'><g fill='#d9ff3d' opacity='.85'><circle cx='12' cy='13' r='1.6'/><circle cx='53' cy='18' r='1.3'/><circle cx='49' cy='52' r='1.6'/><circle cx='14' cy='50' r='1.2'/></g><text x='32' y='" + (fs > 18 ? 40 : 38) + "' text-anchor='middle' font-family='Pretendard,Apple SD Gothic Neo,sans-serif' font-size='" + fs + "' font-weight='900' fill='" + (c2 || "#d9ff3d") + "' letter-spacing='-0.5'>" + t + "</text></svg>"; }
  var BM_SVGI = {
    tree: "<svg viewBox='0 0 64 64' width='78%' height='78%'><rect x='28' y='48' width='8' height='9' rx='2' fill='#9b6a43'/><path d='M32 14 14 34h9L11 48h42L41 34h9z' fill='#3fae5a'/><path d='M32 14 21 26.5h22z' fill='#57c46f'/><circle cx='26' cy='36' r='2.6' fill='#ff5a6e'/><circle cx='38' cy='41' r='2.6' fill='#ffd23f'/><circle cx='34' cy='29' r='2.2' fill='#ff5a6e'/><circle cx='22' cy='44' r='2.2' fill='#ffd23f'/><circle cx='43' cy='45' r='2.2' fill='#ff5a6e'/><path d='m32 5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L32 18.3l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z' fill='#ffcc2e'/></svg>",
    bottle: "<svg viewBox='0 0 64 64' width='78%' height='78%'><path d='M28 6c0-2 8-2 8 0l2 9H26z' fill='#ffc2a8'/><rect x='22' y='15' width='20' height='7' rx='3' fill='#6aa7ff'/><rect x='20' y='22' width='24' height='36' rx='9' fill='#e3efff' stroke='#6aa7ff' stroke-width='2.5'/><path d='M20 40h24v9a9 9 0 0 1-9 9h-6a9 9 0 0 1-9-9z' fill='#fff' opacity='.9'/><g stroke='#6aa7ff' stroke-width='2' stroke-linecap='round'><path d='M37 29h4M37 34h4M37 39h4'/></g></svg>",
    tee: "<svg viewBox='0 0 64 64' width='80%' height='80%'><path d='M23 10h18l4 4 12 6-5 11-6-3v26H18V28l-6 3-5-11 12-6z' fill='#ffb84d'/><path d='M26 10a6 6 0 0 0 12 0' fill='none' stroke='#e8962a' stroke-width='3'/><circle cx='32' cy='36' r='6' fill='#fff' opacity='.9'/><circle cx='30' cy='35' r='1' fill='#555'/><circle cx='34.5' cy='35' r='1' fill='#555'/><path d='M29.5 38.2q2.5 2 5 0' stroke='#555' stroke-width='1.3' fill='none' stroke-linecap='round'/></svg>",
    dress: "<svg viewBox='0 0 64 64' width='80%' height='80%'><path d='M25 6h3l4 6 4-6h3l1 10-4 6 12 32H16l12-32-4-6z' fill='#ff8db5'/><path d='M24 22h16' stroke='#e2628f' stroke-width='3'/><g fill='#fff' opacity='.85'><circle cx='26' cy='36' r='1.8'/><circle cx='36' cy='42' r='1.8'/><circle cx='31' cy='48' r='1.8'/><circle cx='40' cy='50' r='1.6'/><circle cx='22' cy='48' r='1.6'/></g></svg>",
    ruler: "<svg viewBox='0 0 64 64' width='80%' height='80%'><g transform='rotate(-35 32 32)'><rect x='6' y='23' width='52' height='18' rx='3' fill='#ffd84d' stroke='#e0b52a' stroke-width='2'/><g stroke='#8a6d1a' stroke-width='2' stroke-linecap='round'><path d='M13 23v7M20 23v5M27 23v7M34 23v5M41 23v7M48 23v5'/></g></g></svg>",
    cup: "<svg viewBox='0 0 64 64' width='80%' height='80%'><path d='M24 8q-3 4 0 8t0 8M33 8q-3 4 0 8t0 8' fill='none' stroke='#c9a98a' stroke-width='2.5' stroke-linecap='round'/><path d='M12 28h34v8a15 15 0 0 1-15 15h-4a15 15 0 0 1-15-15z' fill='#a8754d'/><path d='M46 31h4a6 6 0 0 1 0 12h-5' fill='none' stroke='#a8754d' stroke-width='4'/><rect x='8' y='52' width='42' height='5' rx='2.5' fill='#e3d2c2'/><path d='M23 36q4.5-5 9 0-4.5 6-9 0z' fill='#fff' opacity='.85'/></svg>"
  };
  var BM_ICONS = [
    [bmTx("NEW", 19), "신상품", "/product/list.html?cate_no=54", "#241a4a"],
    [bmTx("BEST", 17), "인기상품", "/product/list.html?cate_no=55", "#241a4a"],
    [bmTx("1+1", 22, "#ff8db5"), "1+1", "/product/search.html?keyword=1%2B1", "#241a4a"],
    [bmTx("SALE", 17, "#ffd84d"), "신상할인", "#dk-deal", "#241a4a"],
    [BM_SVGI.tree, "크리스마스", "/product/search.html?keyword=%ED%81%AC%EB%A6%AC%EC%8A%A4%EB%A7%88%EC%8A%A4", "#eaf6ec"],
    [BM_SVGI.bottle, "BABY", "/product/list.html?cate_no=52", "#eaf2ff"],
    [BM_SVGI.tee, "KIDS", "/product/list.html?cate_no=53", "#fff2df"],
    [BM_SVGI.dress, "MOM", "/product/list.html?cate_no=23", "#ffeaf2"],
    [BM_SVGI.ruler, "사이즈표", "/product/brand_size.html", "#fff8d9"],
    [BM_SVGI.cup, "이벤트", "/product/coffee.html", "#f5ede5"]
  ];
  var BM_BAN = [["1", "/product/list.html?cate_no=55"], ["2", "/product/list.html?cate_no=44"], ["3", "/product/list.html?cate_no=49"], ["4", "/product/list.html?cate_no=47"]];
  var BM_CATS = [
    ["신상품", 54], ["인기상품", 55], ["1+1", "q:1+1"], ["🎄크리스마스", "q:크리스마스"], ["BABY", 52], ["KIDS", 53], ["여아", 50], ["남아", 51], ["MOM", 23],
    ["아우터", 24], ["상의", 25], ["원피스", 26], ["하의", 27], ["잡화", 28], ["양말", "q:양말"], ["실내복", "q:실내복"]
  ];
  var BM_QBRANDS = ["콘", "보니토", "비비드아이", "비다이어리", "소이빈", "고유", "라라랜드", "미니로브", "아토메메", "디그린", "니니벨로", "테테코", "바코드", "몽베베", "오뜨베베", "소예"];
  function bmHome(){ var p = location.pathname; return p === "/" || p === "/index.html"; }
  function bmMobile(){ return !(window.matchMedia && matchMedia("(min-width:1025px)").matches); }
  function bmUrl(v){ return typeof v === "number" ? "/product/list.html?cate_no=" + v : "/product/search.html?keyword=" + encodeURIComponent(String(v).slice(2)); }
  function bmCss(){
    if (document.getElementById("dk-bm-css")) return;
    var st = document.createElement("style"); st.id = "dk-bm-css";
    st.textContent =
      "#dk-bm{max-width:1240px;margin:0 auto;padding:14px 16px 4px;box-sizing:border-box}#dk-bm *{box-sizing:border-box}" +
      "#dk-bm .bc{display:flex;align-items:center;gap:12px;background:#f7f2ff;border:1px solid #e6dbff;border-radius:14px;padding:12px 14px;text-decoration:none;color:#222}" +
      "#dk-bm .bc i{flex:0 0 44px;height:44px;border-radius:10px;background:#6a3fc8;color:#fff;font-style:normal;font-size:22px;display:flex;align-items:center;justify-content:center}" +
      "#dk-bm .bc b{display:block;font-size:15px;white-space:nowrap;font-weight:600;line-height:1.35}#dk-bm .bc span{display:block;font-size:12px;color:#777;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#dk-bm .bc em{margin-left:auto;flex:0 0 auto;font-style:normal;background:#6a3fc8;color:#fff;font-size:13px;font-weight:500;border-radius:8px;padding:8px 12px}" +
      "#dk-bm .bn{position:relative;margin-top:12px;border-radius:16px;overflow:hidden;background:#eee;aspect-ratio:8/5}#dk-bm .bnr{display:flex;height:100%;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}#dk-bm .bnr::-webkit-scrollbar{display:none}" +
      "#dk-bm .bnr a{flex:0 0 100%;height:100%;scroll-snap-align:start}#dk-bm .bnr img{width:100%;height:100%;object-fit:cover;display:block}" +
      "#dk-bm .bnc{position:absolute;right:12px;bottom:12px;background:rgba(0,0,0,.45);color:#fff;font-size:12px;font-weight:700;border-radius:999px;padding:4px 10px}" +
      "@media(min-width:1025px){#dk-bm .bn{aspect-ratio:16/6}}" +
      "#dk-bm .ic{display:grid;grid-template-columns:repeat(5,1fr);gap:14px 8px;margin:20px 0 6px}@media(min-width:1025px){#dk-bm .ic{grid-template-columns:repeat(10,1fr)}}" +
      "#dk-bm .ic a{display:flex;flex-direction:column;align-items:center;text-decoration:none;color:#222;font-size:13px;font-weight:400;text-align:center;line-height:1.3;word-break:keep-all}" +
      "#dk-bm .ic span{width:100%;max-width:72px;aspect-ratio:1;border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:7px;overflow:hidden}#dk-bm .ic span svg{display:block}" +
      "#dk-bm .dl{margin-top:22px}#dk-bm .hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}#dk-bm .hd h3{font-size:20px;font-weight:700;margin:0;color:#111}#dk-bm .hd a{font-size:20px;color:#bbb;text-decoration:none;line-height:1}" +
      "#dk-bm .dli{display:flex;flex-direction:column;gap:16px}@media(min-width:1025px){#dk-bm .dli{display:grid;grid-template-columns:repeat(3,1fr)}}" +
      "#dk-bm .di{display:flex;gap:14px;text-decoration:none;color:#222;align-items:flex-start}#dk-bm .di .im{flex:0 0 42%;max-width:220px;aspect-ratio:1;border-radius:6px;overflow:hidden;background:#f2f2f2;position:relative}#dk-bm .di .im img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block}" +
      "#dk-bm .di .im u{position:absolute;left:6px;bottom:6px;text-decoration:none;background:#6a3fc8;color:#fff;font-size:11px;font-weight:800;border-radius:6px;padding:3px 7px}" +
      "#dk-bm .di .tx{flex:1;min-width:0}#dk-bm .di .tm{display:inline-block;background:#f3f3f3;color:#e0513b;font-size:13px;font-weight:700;padding:3px 9px;border-radius:4px;font-variant-numeric:tabular-nums}" +
      "#dk-bm .di .pc{display:block;color:#e0513b;font-size:24px;font-weight:900;margin:6px 0 2px}#dk-bm .di .nm{font-size:14px;color:#444;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}" +
      "#dk-bm .di .pr{margin-top:6px;font-size:17px;font-weight:800}#dk-bm .di .pr s{font-size:13px;color:#aaa;font-weight:400;margin-left:5px}#dk-bm .di .tg{margin-top:7px;display:flex;gap:5px;flex-wrap:wrap}#dk-bm .di .tg b{font-size:11.5px;font-weight:700;border-radius:4px;padding:3px 7px;background:#f3effb;color:#6a3fc8}#dk-bm .di .tg b.r{background:#ffeef0;color:#e0245e}" +
      "#dk-tab{display:none}@media(max-width:1024px){#dk-tab{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:9990;background:#fff;border-top:1px solid #eee;padding:6px 0 max(6px,env(safe-area-inset-bottom))}" +
      "#dk-tab a{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;text-decoration:none;color:#555;font-size:11px;position:relative}#dk-tab a svg{width:24px;height:24px}#dk-tab a.on{color:#6a3fc8}" +
      "#dk-tab a i{position:absolute;top:-2px;left:calc(50% + 6px);min-width:16px;height:16px;border-radius:8px;background:#6a3fc8;color:#fff;font-size:10px;font-style:normal;font-weight:700;line-height:16px;text-align:center;padding:0 4px}" +
      "body.dk-hastab{padding-bottom:64px}body.dk-hastab #footer{padding-bottom:70px}}" +
      "#dk-cat{position:fixed;inset:0;z-index:100001;background:#fff;display:none;flex-direction:column}#dk-cat.on{display:flex}#dk-cat .ct{display:flex;align-items:center;border-bottom:1px solid #eee;padding:0 8px 0 18px;flex:0 0 auto}" +
      "#dk-cat .ct a{padding:16px 10px 14px;margin-right:14px;font-size:17px;font-weight:800;color:#999;text-decoration:none;border-bottom:3px solid transparent}#dk-cat .ct a.on{color:#6a3fc8;border-color:#6a3fc8}#dk-cat .ct .x{margin-left:auto;margin-right:0;font-size:24px;color:#333;border:0;font-weight:400}" +
      "#dk-cat .cb{flex:1;display:flex;min-height:0}#dk-cat .cl{flex:0 0 34%;max-width:170px;background:#f5f5f5;overflow-y:auto}#dk-cat .cl a{display:block;padding:15px 16px;font-size:15px;color:#555;text-decoration:none}#dk-cat .cl a.on{background:#fff;color:#6a3fc8;font-weight:800}" +
      "#dk-cat .cr{flex:1;overflow-y:auto;padding:6px 18px 90px}#dk-cat .ca{display:flex;justify-content:space-between;align-items:center;padding:16px 0;font-size:17px;font-weight:800;color:#222;text-decoration:none;border-bottom:1px solid #eee}" +
      "#dk-cat .cp h4{font-size:16px;font-weight:800;margin:20px 0 12px}#dk-cat .cg{display:grid;grid-template-columns:1fr 1fr;gap:14px 10px}#dk-cat .cg a{text-decoration:none;color:#222}#dk-cat .cg img{width:100%;aspect-ratio:1;object-fit:cover;object-position:center top;border-radius:4px;background:#f2f2f2;display:block}" +
      "#dk-cat .cg span{display:block;font-size:12.5px;line-height:1.4;margin-top:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}#dk-cat .cg b{display:block;font-size:13px;margin-top:3px}#dk-cat .cg b em{font-style:normal;color:#e0513b;margin-right:4px}" +
      "#dk-cat .cs{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}#dk-cat .cs a{padding:13px 0;font-size:15px;color:#333;text-decoration:none}" +
      "#dk-pop{position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center}#dk-pop .pw{width:100%;max-width:520px;background:#fff;border-radius:20px 20px 0 0;overflow:hidden}" +
      "#dk-pop .pa{display:block;text-decoration:none;color:#3b1f86;background:linear-gradient(160deg,#f1e9ff,#ffe9f3);padding:30px 26px 34px;position:relative}#dk-pop .pa small{display:block;font-size:14px;font-weight:800;color:#6a3fc8}" +
      "#dk-pop .pa b{display:block;font-size:30px;font-weight:900;line-height:1.3;margin:10px 0 12px;letter-spacing:-1px}#dk-pop .pa b em{font-style:normal;color:#e0245e}#dk-pop .pa span{display:block;font-size:13px;color:#6b5a99;line-height:1.6}" +
      "#dk-pop .pa i{position:absolute;right:20px;top:24px;font-size:56px;font-style:normal}#dk-pop .pa u{display:inline-block;margin-top:16px;text-decoration:none;background:#6a3fc8;color:#fff;font-size:14px;font-weight:800;border-radius:10px;padding:11px 18px}" +
      "#dk-pop .pf{display:flex;justify-content:space-between;padding:16px 22px max(16px,env(safe-area-inset-bottom))}#dk-pop .pf a{font-size:15px;color:#888;text-decoration:none}#dk-pop .pf a.c{color:#222;font-weight:700}" +
      "@media(min-width:1025px){#dk-pop{align-items:center}#dk-pop .pw{border-radius:20px}}";
    document.head.appendChild(st);
  }
  function bmTick(){
    if (window.dkBmT) return;
    window.dkBmT = setInterval(function(){
      [].forEach.call(document.querySelectorAll("#dk-bm [data-end]"), function(e){
        var s = Math.floor((+e.getAttribute("data-end") - Date.now()) / 1000);
        if (s <= 0) { var c = e.closest(".di"); if (c) c.parentNode.removeChild(c); return; }
        var d = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
        e.textContent = "남은시간 " + (d ? d + "일 " : "") + ("0" + hh).slice(-2) + ":" + ("0" + mm).slice(-2) + ":" + ("0" + ss).slice(-2);
      });
    }, 1000);
  }
  function bmName(t){ return String(t || "").replace(/ [0-9]{2}(봄|여름|가을|겨울) .*$/, "").trim(); }
  function bmDeals(box){
    fetch("/product/list.html?cate_no=54", { credentials: "include" }).then(function(r){ return r.text(); }).then(function(h){
      var d = new DOMParser().parseFromString(h, "text/html"), out = [];
      [].forEach.call(d.querySelectorAll(".xans-product-normalpackage ul.prdList > li"), function(li){
        var per = li.querySelector(".layerDiscountPeriod"); if (!per) return;
        var tx = per.textContent.replace(/ +/g, " ");
        var m = tx.match(/~ *([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2})/); if (!m) return;
        var end = kst(m[1]); if (!end || end < Date.now() + 60000) return;
        var a = li.querySelector(".name a"), img = li.querySelector(".thumbnail img, .prdImg img");
        var price = 0, sale = 0;
        [].forEach.call(li.querySelectorAll(".spec li"), function(x){ var t = x.textContent.replace(/ +/g, " "); if (/판매가/.test(t)) price = num(t.split(":")[1]); if (/최적할인가/.test(t)) sale = num(t.split(":")[1]); });
        if (!price || !sale || sale >= price || !a) return;
        var nm = a.textContent.replace(/상품명 *:/, "").trim();
        out.push({ u: a.getAttribute("href"), im: img ? (img.getAttribute("ec-data-src") || img.getAttribute("src")) : "", nm: bmName(nm), p: price, s: sale, end: end });
      });
      out.sort(function(x, y){ return x.end - y.end; });
      out = out.slice(0, bmMobile() ? 3 : 6);
      if (!out.length) { box.parentNode && box.parentNode.removeChild(box); return; }
      box.innerHTML = "<div class='hd'><h3>오늘의 신상 할인</h3><a href='/product/list.html?cate_no=54' aria-label='신상품 전체'>›</a></div><div class='dli'>" + out.map(function(x){
        var pc = Math.round((1 - x.s / x.p) * 100);
        return "<a class='di' href='" + x.u + "'><span class='im'><img src='" + x.im + "' alt='' loading='lazy'><u>NEW</u></span><span class='tx'><span class='tm' data-end='" + x.end + "'></span>" +
          "<span class='pc'>" + pc + "%</span><span class='nm'>" + esc(x.nm) + "</span><div class='pr'>" + won(x.s) + "<s>" + won(x.p).replace("원", "") + "</s></div><div class='tg'><b class='r'>신상할인</b><b>3일 한정</b></div></span></a>";
      }).join("") + "</div>";
      bmTick();
    }).catch(function(){ if (box.parentNode) box.parentNode.removeChild(box); });
  }
  function bmBuild(){
    if (!bmHome() || document.getElementById("dk-bm")) return;
    var wrap = document.querySelector(".dk-wrap"); if (!wrap) return;
    bmCss();
    var sec = document.createElement("section"); sec.id = "dk-bm";
    var logged = isLogged();
    var bc = logged
      ? "<a class='bc' href='/myshop/index.html#dk-invite'><i>💌</i><span style='min-width:0'><b>친구 초대하고 500원 적립</b><span>친구가 내 초대 링크로 가입하면 둘 다 적립금 500원</span></span><em>초대하기</em></a>"
      : "<a class='bc' href='/member/agreement.html'><i>🎁</i><span style='min-width:0'><b>가입하면 적립금 1,000원</b><span>수신 동의 시 5% 쿠폰도 함께</span></span><em>가입하기</em></a>";
    var day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10), sfx = bmMobile() ? "m" : "";
    var bn = "<div class='bn'><div class='bnr'>" + BM_BAN.map(function(b, i){ return "<a href='" + b[1] + "'><img src='https://www.dagguu.com/kids/banner/B" + b[0] + sfx + ".jpg?d=" + day + "v2' alt='' " + (i ? "loading='lazy'" : "") + "></a>"; }).join("") + "</div><span class='bnc'>1 / " + BM_BAN.length + "</span></div>";
    var ic = "<div class='ic'>" + BM_ICONS.map(function(x){ return "<a href='" + x[2] + "'><span style='background:" + x[3] + "'>" + x[0] + "</span>" + x[1] + "</a>"; }).join("") + "</div>";
    sec.innerHTML = bc + bn + ic + "<div class='dl' id='dk-deal'></div>";
    wrap.insertBefore(sec, wrap.firstChild);
    var r = sec.querySelector(".bnr"), cnt = sec.querySelector(".bnc"), n = BM_BAN.length;
    function cur(){ return Math.round(r.scrollLeft / Math.max(1, r.clientWidth)); }
    r.addEventListener("scroll", function(){ cnt.textContent = (cur() + 1) + " / " + n; }, { passive: true });
    var hold = false; r.addEventListener("touchstart", function(){ hold = true; }, { passive: true }); r.addEventListener("touchend", function(){ setTimeout(function(){ hold = false; }, 3000); });
    r.addEventListener("mouseenter", function(){ hold = true; }); r.addEventListener("mouseleave", function(){ hold = false; });
    setInterval(function(){ if (hold || document.hidden) return; var i = (cur() + 1) % n; r.scrollTo({ left: i * r.clientWidth, behavior: "smooth" }); }, 4000);
    var dk = sec.querySelector("a[href='#dk-deal']"); if (dk) dk.onclick = function(e){ e.preventDefault(); var t = document.getElementById("dk-deal"); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); };
    bmDeals(sec.querySelector("#dk-deal"));
  }
  var BM_SVG = {
    home: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z'/></svg>",
    cat: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><rect x='4' y='4' width='6.5' height='6.5' rx='1.5'/><rect x='13.5' y='4' width='6.5' height='6.5' rx='1.5'/><rect x='4' y='13.5' width='6.5' height='6.5' rx='1.5'/><rect x='13.5' y='13.5' width='6.5' height='6.5' rx='1.5'/></svg>",
    cart: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M3 4h2.5l2 11h10.5l2-8H6.5'/><circle cx='9' cy='19.5' r='1.4'/><circle cx='17' cy='19.5' r='1.4'/></svg>",
    wish: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z'/></svg>",
    my: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><circle cx='12' cy='8.5' r='4'/><path d='M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5'/></svg>"
  };
  function bmTab(){
    if (document.getElementById("dk-tab") || !document.body) return;
    bmCss();
    var p = location.pathname, on = function(k){ return (k === "home" && bmHome()) || (k === "cart" && /basket/.test(p)) || (k === "wish" && /wish/.test(p)) || (k === "my" && /myshop|member/.test(p) && !/wish/.test(p)) ? " class='on'" : ""; };
    var t = document.createElement("nav"); t.id = "dk-tab";
    t.innerHTML = "<a href='/'" + on("home") + ">" + BM_SVG.home + "홈</a><a href='#none' data-cat='1'>" + BM_SVG.cat + "카테고리</a><a href='/order/basket.html'" + on("cart") + ">" + BM_SVG.cart + "장바구니<i style='display:none'></i></a><a href='/myshop/wish_list.html'" + on("wish") + ">" + BM_SVG.wish + "관심</a><a href='/myshop/index.html'" + on("my") + ">" + BM_SVG.my + "MY</a>";
    document.body.appendChild(t); document.body.classList.add("dk-hastab");
    t.querySelector("[data-cat]").onclick = function(e){ e.preventDefault(); bmCat(); };
    function cnt(){ var c = document.querySelector(".xans-layout-orderbasketcount .count, .EC-Layout-Basket-count, #xans_myshop_basket_cnt"); var n = c ? num(c.textContent) : 0; var i = t.querySelector("i"); i.textContent = n; i.style.display = n ? "block" : "none"; }
    cnt(); setTimeout(cnt, 1500);
    /* 휴대폰 위 ☰ 도 같은 카테고리 창으로 (PC 는 원래 전체메뉴) */
    document.addEventListener("click", function(e){ var b = e.target.closest && e.target.closest(".eNavFold"); if (b && bmMobile()) { e.preventDefault(); e.stopPropagation(); bmCat(); } }, true);
  }
  function bmCat(){
    bmCss();
    var c = document.getElementById("dk-cat");
    if (!c) {
      c = document.createElement("div"); c.id = "dk-cat";
      c.innerHTML = "<div class='ct'><a href='#none' class='on' data-t='c'>카테고리</a><a href='#none' data-t='b'>브랜드</a><a href='#none' class='x' aria-label='닫기'>✕</a></div><div class='cb'><div class='cl'></div><div class='cr'></div></div>";
      document.body.appendChild(c);
      c.querySelector(".x").onclick = function(e){ e.preventDefault(); c.classList.remove("on"); document.documentElement.style.overflow = ""; };
      [].forEach.call(c.querySelectorAll("[data-t]"), function(a){ a.onclick = function(e){ e.preventDefault(); [].forEach.call(c.querySelectorAll("[data-t]"), function(x){ x.classList.toggle("on", x === a); }); bmCatTab(c, a.getAttribute("data-t")); }; });
      bmCatTab(c, "c");
    }
    c.classList.add("on"); document.documentElement.style.overflow = "hidden";
  }
  function bmCatTab(c, t){
    var L = c.querySelector(".cl"), R2 = c.querySelector(".cr");
    if (t === "c") {
      L.innerHTML = BM_CATS.map(function(x, i){ return "<a href='#none' data-i='" + i + "'" + (i ? "" : " class='on'") + ">" + x[0] + "</a>"; }).join("");
      [].forEach.call(L.querySelectorAll("a"), function(a){ a.onclick = function(e){ e.preventDefault(); [].forEach.call(L.querySelectorAll("a"), function(x){ x.classList.toggle("on", x === a); }); bmCatRight(R2, BM_CATS[+a.getAttribute("data-i")]); }; });
      bmCatRight(R2, BM_CATS[0]);
      return;
    }
    L.innerHTML = "<a href='#none' class='on'>전체 브랜드</a>";
    R2.innerHTML = "<a class='ca' href='/product/brand_size.html'>브랜드별 사이즈표 <span>›</span></a><div class='cs'></div>";
    var cs = R2.querySelector(".cs"), seen = {};
    function add(nm, url){ if (seen[nm]) return; seen[nm] = 1; var a = document.createElement("a"); a.href = url; a.textContent = nm; cs.appendChild(a); }
    fetch("https://dagguu.cafe24api.com/api/v2/categories?parent_category_no=42&limit=100&fields=category_no,category_name", { headers: { "X-Cafe24-Client-Id": CID } }).then(function(r){ return r.json(); })
      .then(function(j){ (j.categories || []).forEach(function(x){ add(x.category_name, "/product/list.html?cate_no=" + x.category_no); }); })
      .catch(function(){}).then(function(){ BM_QBRANDS.forEach(function(b){ add(b, "/product/search.html?keyword=" + encodeURIComponent(b)); }); });
  }
  function bmCatRight(R2, x){
    var url = bmUrl(x[1]);
    R2.innerHTML = "<a class='ca' href='" + url + "'>" + x[0] + " 전체보기 <span>›</span></a><div class='cp'><h4>이 카테고리 상품</h4><div class='cg'><span style='grid-column:1/-1;font-size:13px;color:#999'>불러오는 중…</span></div></div>";
    var g = R2.querySelector(".cg");
    fetch(url, { credentials: "include" }).then(function(r){ return r.text(); }).then(function(h){
      var d = new DOMParser().parseFromString(h, "text/html"), lis = d.querySelectorAll(".xans-product-normalpackage ul.prdList > li, .xans-product-listnormal ul.prdList > li, ul.prdList > li"), out = [];
      var sn = {};
      [].some.call(lis, function(li){
        var a = li.querySelector(".name a"), img = li.querySelector(".thumbnail img, .prdImg img"); if (!a || !img) return false;
        var hk = (a.getAttribute("href") || "").replace(/[/]category[/].*$/, ""); if (sn[hk]) return false; sn[hk] = 1;
        var price = 0, sale = 0;
        [].forEach.call(li.querySelectorAll(".spec li"), function(y){ var t = y.textContent.replace(/ +/g, " "); if (/판매가/.test(t)) price = num(t.split(":")[1]); if (/최적할인가/.test(t)) sale = num(t.split(":")[1]); });
        out.push("<a href='" + a.getAttribute("href") + "'><img src='" + (img.getAttribute("ec-data-src") || img.getAttribute("src")) + "' alt='' loading='lazy'><span>" + esc(bmName(a.textContent.replace(/상품명 *:/, ""))) + "</span><b>" +
          (sale && sale < price ? "<em>" + Math.round((1 - sale / price) * 100) + "%</em>" + won(sale) : won(price)) + "</b></a>");
        return out.length >= 6;
      });
      g.innerHTML = out.length ? out.join("") : "<span style='grid-column:1/-1;font-size:13px;color:#999'>상품을 준비하고 있어요</span>";
    }).catch(function(){ g.innerHTML = ""; });
  }
  function bmPop(){
    if (!bmHome() || document.getElementById("dk-pop") || window.dkBmPop) return;
    var day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    try { if (localStorage.getItem("dk_pop_hide") === day || sessionStorage.getItem("dk_pop_seen")) return; } catch(e){}
    window.dkBmPop = 1;
    setTimeout(function(){
      bmCss();
      var logged = isLogged();
      /* 2026-11-13 시온님(바잇미 팝업 보여주며 "배경은 어떻게든 사진을 깔아줘"): 사진 꽉 채운 슬라이드 + 스티커 + 흰 글씨, 1 / N, 자동 넘김.
         첫 장 = 가입 혜택(로그인 후 = 커피 이벤트), 다음 장 = 홈 배너(B1~B4, 다꾸 kids/banner, 매일 새로 만듦). 사진은 인기 브랜드 모델 컷(kids_banner_pick.json 과 같은 사진). */
      var PH1 = "https://ecimg.cafe24img.com/pg3599b80335735046/dagguu/web/upload/NNEditor/20261111/ad12ac6c63c584e8930f3661cb526942.jpg";
      var PH2 = "https://ecimg.cafe24img.com/pg3599b80335735046/dagguu/web/upload/NNEditor/20261111/9b57e1866ba44d2bf1be89f7bb018101.jpg";
      var first = logged
        ? "<a class='ps' href='/product/coffee.html' style='background-image:url(" + PH2 + ")'><i class='s1'>☕ 커피 이벤트</i><i class='s2'>매달 30명</i><span class='tx'><b>@dagguu.kids 태그하고<br>커피 받아가세요</b><small>우리 아이 코디 사진에 태그만 하면 돼요</small></span></a>"
        : "<a class='ps' href='/member/agreement.html' style='background-image:url(" + PH1 + ")'><i class='s1'>🎁 첫 가입 혜택</i><i class='s2'>바로 지급</i><span class='tx'><b>가입하면 적립금 1,000원<br>바로 드려요!</b><small>수신 동의 시 5% 할인 쿠폰도 함께</small></span></a>";
      var dd = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10).replace(/-/g, "");
      var bans = BM_BAN.map(function(x){ return "<a class='ps' href='" + x[1] + "' style='background-image:url(https://www.dagguu.com/kids/banner/B" + x[0] + "m.jpg?d=" + dd + "v2)'></a>"; }).join("");
      var n = 1 + BM_BAN.length;
      var p = document.createElement("div"); p.id = "dk-pop";
      if (!document.getElementById("dk-pop2-css")) { var st = document.createElement("style"); st.id = "dk-pop2-css";
        st.textContent = "#dk-pop .pr{position:relative}#dk-pop .pt{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}#dk-pop .pt::-webkit-scrollbar{display:none}" +
          "#dk-pop .ps{flex:0 0 100%;scroll-snap-align:start;aspect-ratio:8/5;background:#ddd center 22%/cover no-repeat;position:relative;display:block;text-decoration:none;overflow:hidden}" +
          "#dk-pop .ps:before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 72%,rgba(0,0,0,.45),rgba(0,0,0,0) 72%),linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.35))}" +
          "#dk-pop .ps[style*='kids/banner']:before{display:none}" +
          "#dk-pop .ps i{position:absolute;font-style:normal;font-size:13px;font-weight:700;border-radius:999px;padding:5px 12px;box-shadow:0 4px 12px rgba(0,0,0,.15)}#dk-pop .ps .s1{left:7%;top:36%;background:#6a3fc8;color:#fff}#dk-pop .ps .s2{right:7%;top:36%;background:#ffe94d;color:#2a1b55}" +
          "#dk-pop .ps .tx{position:absolute;left:0;right:0;bottom:9%;text-align:center;color:#fff;text-shadow:0 2px 4px rgba(0,0,0,.35),0 6px 20px rgba(0,0,0,.45)}#dk-pop .ps .tx b{display:block;font-size:clamp(20px,6vw,28px);font-weight:800;line-height:1.25;letter-spacing:-1px}#dk-pop .ps .tx small{display:block;margin-top:6px;font-size:12.5px;font-weight:500;opacity:.95}" +
          "#dk-pop .pc{position:absolute;right:12px;top:12px;background:rgba(0,0,0,.45);color:#fff;font-size:12px;font-weight:600;border-radius:999px;padding:4px 10px;pointer-events:none}";
        document.head.appendChild(st); }
      p.innerHTML = "<div class='pw'><div class='pr'><div class='pt'>" + first + bans + "</div><span class='pc'>1 / " + n + "</span></div><div class='pf'><a href='#none' class='h'>오늘 하루 보지 않기</a><a href='#none' class='c'>닫기</a></div></div>";
      document.body.appendChild(p);
      try { sessionStorage.setItem("dk_pop_seen", "1"); } catch(e){}
      var tr = p.querySelector(".pt"), pc = p.querySelector(".pc"), hold = false, tm;
      function cur(){ return Math.round(tr.scrollLeft / Math.max(1, tr.clientWidth)); }
      tr.addEventListener("scroll", function(){ pc.textContent = (cur() + 1) + " / " + n; }, { passive: true });
      tr.addEventListener("touchstart", function(){ hold = true; }, { passive: true });
      tm = setInterval(function(){ if (hold || !p.parentNode) return; tr.scrollTo({ left: ((cur() + 1) % n) * tr.clientWidth, behavior: "smooth" }); }, 3500);
      function close(){ clearInterval(tm); if (p.parentNode) p.parentNode.removeChild(p); }
      p.querySelector(".c").onclick = function(e){ e.preventDefault(); close(); };
      p.querySelector(".h").onclick = function(e){ e.preventDefault(); try { localStorage.setItem("dk_pop_hide", day); } catch(x){} close(); };
      p.onclick = function(e){ if (e.target === p) close(); };
    }, 1500);
  }
  function homeBM(){ try { bmBuild(); } catch(e){} try { bmTab(); } catch(e){} try { bmPop(); } catch(e){} }

  /* 로그인 화면 PC: 위로 옮긴 카카오 로그인 칸이 왼쪽에 붙던 것(2026-11-13 시온님) → 아이디 칸과 같은 폭으로 가운데 */
  function loginFix(){ var s = document.querySelector(".xans-member-login .login__sns.dk-top"); if (!s) return; ["max-width:400px", "margin-left:auto", "margin-right:auto"].forEach(function(x){ var k = x.split(":"); s.style.setProperty(k[0], k[1], "important"); }); }
  /* ---------- ⑬ 바잇미 느낌 전체 손질 (2026-11-13 시온님 "응 그렇게해줘") ----------
     맨 위 띠배너 밝은 노랑 + ✕(오늘 하루 숨김), 상단 글자 메뉴 굵고 크게·고른 칸 밑줄, 상품 카드 사진 정사각형·이름 2줄(상품명 뒤 검색어 꼬리는 화면에서만 뗌)·가격 크게,
     상세·장바구니 버튼 보라 둥글게. 카페24 상품명(검색용)은 그대로 둔다. */
  function bmStyle(){
    if (!document.getElementById("dk-bms-css")) {
      var st = document.createElement("style"); st.id = "dk-bms-css";
      st.textContent =
        ".main_top_banner{background:#fff35c!important}.main_top_banner .top_banner_text a{color:#5b2fc0!important;font-weight:500!important}.main_top_banner{position:relative}" +
        ".main_top_banner .top_banner_close{display:none!important}#dk-tbx{position:absolute;right:12px;top:50%;transform:translateY(-50%);width:28px;height:28px;border:0;background:none;font-size:20px;line-height:28px;color:#333;cursor:pointer;padding:0;z-index:2}" +
        ".dk-mnav{border-bottom:1px solid #eee!important}.dk-mnav a{font-size:15.5px!important;font-weight:400!important;color:#222!important;padding:12px 4px 11px!important;border-bottom:3px solid transparent}.dk-mnav a.dk-n{font-weight:600!important;color:#6a3fc8!important;border-bottom-color:#6a3fc8}" +
        "@media(min-width:1025px){.top_category>ul>li>a{font-size:15px!important;font-weight:500!important;color:#222}}" +
        "ul.prdList>li .thumbnail{position:relative;overflow:hidden;border-radius:6px;background:#f4f4f4}ul.prdList>li .thumbnail>a{display:block;aspect-ratio:1/1}ul.prdList>li .thumbnail>a img{width:100%!important;height:100%!important;object-fit:cover;object-position:center top}" +
        "ul.prdList>li .description .name{margin-top:9px!important}ul.prdList>li .description .name a span:not(.title){font-size:14px!important;color:#444!important;line-height:1.45!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}" +
        "ul.prdList>li .description .spec li.dk-ns span{font-size:17px!important}ul.prdList>li .description .spec li>span[style*='font-weight:bold']{font-size:16px!important}ul.prdList>li .description .spec li>span[style*='line-through']{font-size:13px!important}" +
        ".xans-product-action .btnSubmit,.xans-product-action #btnBuy,.infoArea .productAction .btnSubmit{background:#6a3fc8!important;border-color:#6a3fc8!important;border-radius:8px!important}.infoArea .productAction .btnNormal,.infoArea .productAction .btnBasic{border-radius:8px!important}" +
        ".xans-order-totalorder .btnSubmit,.xans-order-basketpackage .btnSubmit{background:#6a3fc8!important;border-color:#6a3fc8!important;border-radius:8px!important}";
      document.head.appendChild(st);
    }
    var tb = document.querySelector(".main_top_banner"), day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    if (tb) {
      try { if (localStorage.getItem("dk_tb_hide") === day) tb.style.setProperty("display", "none", "important"); } catch(e){}
      if (!document.getElementById("dk-tbx")) { var b = document.createElement("button"); b.id = "dk-tbx"; b.type = "button"; b.setAttribute("aria-label", "오늘 하루 닫기"); b.textContent = "✕"; b.onclick = function(){ tb.style.setProperty("display", "none", "important"); try { localStorage.setItem("dk_tb_hide", day); } catch(e){} setTimeout(function(){ window.dispatchEvent(new Event("resize")); }, 50); }; tb.appendChild(b); }
    }
    var mn = document.querySelector(".dk-mnav"); if (mn && !mn.querySelector(".dk-n")) { var f = mn.querySelector("a"); if (f) f.classList.add("dk-n"); }
    bmNames();
  }
  function bmNames(){
    [].forEach.call(document.querySelectorAll("ul.prdList>li .description .name a span:not(.title), #dk-cat .cg span"), function(sp){
      if (sp.getAttribute("data-dkn")) return; var t = sp.textContent, n = bmName(t); if (n && n !== t) { sp.setAttribute("title", t); sp.textContent = n; } sp.setAttribute("data-dkn", "1");
    });
  }
  (function(){ var tm; try { new MutationObserver(function(){ clearTimeout(tm); tm = setTimeout(bmNames, 200); }).observe(document.documentElement, { childList: true, subtree: true }); } catch(e){} })();

  /* ---------- ⑮ 상품 공유 (2026-11-13 시온님이 바잇미 상품 화면·공유 창 보여주며 "공유 모양 저 위치, 말풍선, 클릭하면 저렇게") ----------
     상품 이름 위 줄: 왼쪽 브랜드 ›, 오른쪽 공유 아이콘 + 위에 말풍선 "상품 링크 공유하고 최대 3% 포인트 받기".
     누르면 아래에서 올라오는 "제품 공유하기" 창: 포인트 카드(링크 칸 + 복사) · 링크 복사하기 · 카카오톡 공유하기(휴대폰 공유 창).
     파트너 기기(localStorage dk_dpme, 다꾸파트너스 #/dp 에서 켬)면 내 수익 링크(&pt=코드), 아니면 상품 링크 + 다꾸파트너스 가입 안내.
     예전 보라 "공유하기" 큰 버튼(footer dp_track.js #dk-dpshare)은 숨김. 포인트 = 다꾸키즈 적립금(상품 금액 3%). */
  var SHARE_SVG = "<svg viewBox='0 0 24 24' width='26' height='26' fill='none' stroke='#9a9a9a' stroke-width='1.6' stroke-linecap='round'><circle cx='18' cy='5' r='2.6'/><circle cx='6' cy='12' r='2.6'/><circle cx='18' cy='19' r='2.6'/><path d='M8.3 10.8l7.4-4.4M8.3 13.2l7.4 4.4'/></svg>";
  function shCss(){
    if (document.getElementById("dk-sh-css")) return;
    var st = document.createElement("style"); st.id = "dk-sh-css";
    st.textContent = "#dk-dpshare{display:none!important}" +
      ".dk-shrow{display:flex;align-items:center;justify-content:space-between;margin:2px 0 6px;position:relative}.dk-shrow .br{font-size:14px;color:#666;text-decoration:none}.dk-shrow .br:after{content:' ›';color:#aaa}" +
      ".dk-shbtn{position:relative;border:0;background:none;padding:4px;cursor:pointer;line-height:0}" +
      ".dk-shtip{position:absolute;right:-4px;bottom:calc(100% + 10px);background:#6a3fc8;color:#fff;font-size:13.5px;font-weight:500;line-height:1.4;border-radius:10px;padding:9px 13px;white-space:nowrap;text-align:left;box-shadow:0 6px 16px rgba(106,63,200,.28);animation:dkshb 1.8s ease-in-out infinite;pointer-events:none;z-index:5}.dk-shtip:after{content:'';position:absolute;right:14px;top:100%;border:7px solid transparent;border-top-color:#6a3fc8}@keyframes dkshb{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}" +
      "#dk-shs{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center}#dk-shs .sh{width:100%;max-width:560px;background:#fff;border-radius:22px 22px 0 0;padding:22px 22px calc(26px + env(safe-area-inset-bottom));animation:dkshup .25s ease-out}@keyframes dkshup{from{transform:translateY(100%)}to{transform:none}}" +
      "#dk-shs .tt{position:relative;text-align:center;font-size:18px;font-weight:700;color:#111;margin-bottom:18px}#dk-shs .tt button{position:absolute;right:-4px;top:-4px;border:0;background:none;font-size:26px;line-height:1;color:#333;cursor:pointer;padding:4px}" +
      "#dk-shs .cd{background:#f4f4f6;border-radius:16px;padding:18px 18px 16px}#dk-shs .cd .hd{display:flex;align-items:center;gap:8px;margin-bottom:12px}#dk-shs .cd .hd i{font-style:normal;background:#6a3fc8;color:#fff;font-size:13px;font-weight:500;border-radius:999px;padding:4px 12px}#dk-shs .cd .hd b{color:#6a3fc8;font-size:16px;font-weight:700}" +
      "#dk-shs .cd .ln{display:flex;gap:8px}#dk-shs .cd .ln input{flex:1;min-width:0;border:1px solid #ddd;border-radius:10px;background:#fff;padding:11px 12px;font-size:14px;color:#888}#dk-shs .cd .ln button{flex:0 0 46px;border:1px solid #ddd;border-radius:10px;background:#fff;cursor:pointer;font-size:18px;color:#333}" +
      "#dk-shs .cd p{margin:10px 0 0;font-size:13px;color:#666}#dk-shs .cd p a{color:#6a3fc8;font-weight:600;text-decoration:underline}" +
      "#dk-shs .rw{display:flex;align-items:center;gap:16px;width:100%;border:0;border-bottom:1px solid #eee;background:none;padding:18px 4px;font-size:16px;font-weight:600;color:#111;cursor:pointer;text-align:left}#dk-shs .rw span{width:26px;text-align:center;font-size:20px}" +
      "#dk-shtoast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:100001;background:#222;color:#fff;font-size:14px;border-radius:999px;padding:10px 18px}";
    document.head.appendChild(st);
  }
  function shToast(t){ var o = document.getElementById("dk-shtoast"); if (o) o.remove(); o = document.createElement("div"); o.id = "dk-shtoast"; o.textContent = t; document.body.appendChild(o); setTimeout(function(){ o.remove(); }, 1800); }
  function shInfo(){
    var n = (location.search.match(/product_no=([0-9]+)/) || [])[1] || (location.pathname.match(/[/]([0-9]+)[/]category[/]/) || [])[1] || "";
    var me = ""; try { me = localStorage.getItem("dk_dpme") || ""; } catch(e){}
    if (!/^[a-z0-9_]{3,20}$/.test(me)) me = "";
    var plain = location.origin + "/product/detail.html?product_no=" + n;
    return { n: n, me: me, link: me ? plain + "&pt=" + me : plain, title: (document.querySelector("meta[property='og:title']") || {}).content || document.title };
  }
  function shCopy(u){ var ok = function(){ shToast("링크를 복사했어요"); }; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(ok, function(){ prompt("아래 링크를 복사해 주세요", u); }); else prompt("아래 링크를 복사해 주세요", u); }
  function shOpen(){
    shCss(); var f = shInfo(); if (!f.n) return;
    var o = document.createElement("div"); o.id = "dk-shs";
    o.innerHTML = "<div class='sh'><div class='tt'>제품 공유하기<button type='button' aria-label='닫기'>×</button></div>" +
      "<div class='cd'><div class='hd'><i>포인트</i><b>" + (f.me ? "3% 적립 제공중" : "최대 3% 적립") + "</b></div>" +
      "<div class='ln'><input readonly value='" + f.link + "'><button type='button' class='cp' aria-label='링크 복사'>⧉</button></div>" +
      (f.me ? "<p>이 링크로 친구가 구매하면 포인트를 받을 수 있어요!</p>" : "<p>다꾸파트너스에 1분 가입하면 내 링크로 공유하고 3% 포인트를 받아요. <a href='https://partners.dagguu.com/#/dp' target='_blank' rel='noopener'>가입하기 ›</a></p>") +
      "</div><button type='button' class='rw cp'><span>🔗</span>링크 복사하기</button><button type='button' class='rw ka'><span>💬</span>카카오톡 공유하기</button></div>";
    document.body.appendChild(o);
    var close = function(){ o.remove(); };
    o.addEventListener("click", function(e){ if (e.target === o) close(); });
    o.querySelector(".tt button").onclick = close;
    [].forEach.call(o.querySelectorAll(".cp"), function(b){ b.onclick = function(){ shCopy(f.link); }; });
    o.querySelector(".ka").onclick = function(){ if (navigator.share) navigator.share({ title: f.title, text: f.title, url: f.link }).catch(function(){}); else { shCopy(f.link); shToast("링크를 복사했어요. 카카오톡에 붙여넣어 주세요"); } };
    try { if (window.gtag) gtag("event", "share_open", { partner: f.me ? 1 : 0 }); } catch(e){}
  }
  function shareRow(){
    var h = document.querySelector(".infoArea .headingArea"); if (!h || h.querySelector(".dk-shrow")) return;
    shCss();
    var nm = ((h.querySelector("h1,h2") || {}).textContent || "").trim(); var br = nm.split(/\s+/)[0] || "";
    var r = document.createElement("div"); r.className = "dk-shrow";
    r.innerHTML = (br ? "<a class='br' href='/product/search.html?keyword=" + encodeURIComponent(br) + "'>" + br + "</a>" : "<span></span>") +
      "<button type='button' class='dk-shbtn' aria-label='공유하기'>" + SHARE_SVG + "<span class='dk-shtip'>상품 링크 공유하고<br>최대 3% 포인트 받기</span></button>";
    h.insertBefore(r, h.firstChild);
    r.querySelector(".dk-shbtn").onclick = function(e){ e.preventDefault(); shOpen(); };
  }
  (function(){ var tm2; try { new MutationObserver(function(){ clearTimeout(tm2); tm2 = setTimeout(function(){ try { shareRow(); } catch(e){} }, 80); }).observe(document.documentElement, { childList: true, subtree: true }); } catch(e){} })();

  /* ---------- ⑭ 베베·키즈 고르기 (2026-11-13 시온님이 바잇미 로고 옆 "강아지 ⌄ / 고양이" 보여주며 "베베, 키즈 따로") ----------
     로고 오른쪽 "전체 ⌄" → 베베(0~2세)·키즈(3세~)·전체. 이 기기 localStorage dk_age. 고르면 홈의 상품 목록이 그 분류(52 BABY / 53 KIDS) 상품으로
     바뀌고(위 신상·아우터 등 전체 상품 칸은 숨김), 모바일 글자 메뉴 첫 칸 "신상품"도 그 분류로 간다. */
  var AGE = { baby: ["베베", 52, "👶", "0~2세"], kids: ["키즈", 53, "🧒", "3세~"] };
  function ageGet(){ try { var v = localStorage.getItem("dk_age") || ""; return AGE[v] ? v : ""; } catch(e){ return ""; } }
  function ageSel(){
    var lg = document.querySelector(".top_logo"); if (!lg || document.getElementById("dk-age")) return;
    if (!document.getElementById("dk-age-css")) { var st = document.createElement("style"); st.id = "dk-age-css";
      st.textContent = "#dk-age{position:relative;display:inline-flex;align-items:center;vertical-align:middle;margin-left:8px;z-index:1200}#dk-age>button{border:0;background:none;padding:4px 2px;color:#6a3fc8;font-size:15px!important;font-weight:500!important;letter-spacing:-.2px;cursor:pointer;display:flex;align-items:center;gap:4px;font-family:inherit}#dk-age>button i{display:inline-flex;width:15px;height:15px;border:1.2px solid #6a3fc8;border-radius:50%;align-items:center;justify-content:center;font-style:normal;font-size:10px;line-height:1;transition:transform .2s}#dk-age.on>button i{transform:rotate(180deg)}#dk-age ul{display:none;position:absolute;left:50%;top:100%;transform:translateX(-50%);margin:6px 0 0;padding:0;list-style:none;background:#fff;border:1px solid #e6e1f3;border-radius:14px;box-shadow:0 10px 24px rgba(0,0,0,.12);min-width:118px;overflow:hidden}#dk-age.on ul{display:block}#dk-age li a{display:block!important;padding:11px 16px;font-size:15px!important;font-weight:400!important;line-height:1.3!important;letter-spacing:0!important;color:#999!important;text-decoration:none;text-align:center;white-space:nowrap;border-top:1px solid #f1f1f1}#dk-age li:first-child a{border-top:0}#dk-age li a.cur{color:#6a3fc8!important;font-weight:600!important}#dk-age li a small{display:block!important;font-size:11px!important;font-weight:400!important;color:#aaa!important;margin-top:1px}" +
        ".top_nav_box .top_logo{display:inline-flex!important;align-items:center;overflow:visible!important}@media(max-width:1024px){.top_nav_box .top_logo{justify-content:flex-start!important;text-align:left!important;padding-left:2px!important}.top_nav_box .top_logo>a{margin:0!important}}";
      document.head.appendChild(st); }
    var cur = ageGet();
    var w = document.createElement("span"); w.id = "dk-age";
    var li = function(k, t, sub){ return "<li><a href='#' data-age='" + k + "' class='" + (cur === k ? "cur" : "") + "'>" + t + (sub ? "<small>" + sub + "</small>" : "") + "</a></li>"; };
    w.innerHTML = "<button type='button'>" + (cur ? AGE[cur][0] : "전체") + " <i>⌄</i></button><ul>" + li("baby", "베베", "0~2세") + li("kids", "키즈", "3세~") + li("", "전체", "") + "</ul>";
    lg.appendChild(w);
    w.querySelector("button").addEventListener("click", function(e){ e.preventDefault(); e.stopPropagation(); w.classList.toggle("on"); });
    [].forEach.call(w.querySelectorAll("a[data-age]"), function(a){ a.addEventListener("click", function(e){
      e.preventDefault(); e.stopPropagation();
      try { localStorage.setItem("dk_age", a.getAttribute("data-age")); } catch(x){}
      var p = location.pathname; location.href = (p === "/" || p === "/index.html") ? "/?age=" + (a.getAttribute("data-age") || "all") : "/";
    }); });
    document.addEventListener("click", function(){ w.classList.remove("on"); });
    if (cur) { var mn = document.querySelector(".dk-mnav a"); if (mn) { mn.setAttribute("href", "/product/list.html?cate_no=" + AGE[cur][1]); mn.textContent = AGE[cur][2] + AGE[cur][0] + " 신상"; } }
  }

  function run(){ try { bmStyle(); } catch(e){} try { ageSel(); } catch(e){} loginFix(); homeBM(); kwAlways(); try{ inviteTop(); }catch(e){} infList(); homeVideos(); homeInf(); searchSug(); consentNote(); cpPage(); cpList(); pcCss(); mypage(); try{ inviteTop(); }catch(e){} cartBox(); cpCart(); if (document.getElementById("orderFixArea")) { lowest(); cpDetail(); recLine(); bubble(); shipBar(); if (momSet !== null) similar(); } }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
  setTimeout(run, 1200); setTimeout(run, 3000);
  document.addEventListener("change", function(e){ if (e.target && e.target.tagName === "SELECT") { setTimeout(recLine, 700); setTimeout(recLine, 1800); } }, true);
})();
