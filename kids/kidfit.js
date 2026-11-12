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
    var th = [].filter.call(document.querySelectorAll(".infoArea th"), function(t){ return t.textContent.trim() === "배송비"; })[0];
    var host = th && th.nextElementSibling; if (!host) return;
    var d = document.getElementById("dk-ship");
    if (!d) { d = document.createElement("div"); d.id = "dk-ship"; d.style.cssText = "margin:8px 0 2px;padding:10px 12px;border-radius:10px;background:#f6f2ff;font-size:12.5px;color:#333;line-height:1.5;max-width:340px"; host.appendChild(d); }
    var left = FREE - cart, pct = Math.min(100, Math.round(cart / FREE * 100)), msg;
    if (left <= 0) msg = "🚚 <b style='color:#6a3fc8'>무료배송 조건을 채웠어요!</b> <span style='color:#888'>(장바구니 " + won(cart) + ")</span>";
    else if (me && cart + me >= FREE) msg = "🚚 <b style='color:#6a3fc8'>이 상품을 담으면 무료배송이에요!</b>" + (cart ? " <span style='color:#888'>(장바구니 " + won(cart) + ")</span>" : "");
    else msg = "🚚 <b style='color:#6a3fc8'>" + won(left) + "</b> 더 담으면 무료배송" + (cart ? " <span style='color:#888'>(장바구니 " + won(cart) + ")</span>" : "");
    d.innerHTML = msg + "<div style='margin-top:6px;height:5px;border-radius:3px;background:#e4dbfa;overflow:hidden'><div style='height:100%;width:" + pct + "%;background:#6a3fc8;border-radius:3px'></div></div>";
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
    var act = document.querySelector(".infoArea .productAction"); if (!act) return;
    var holder = document.createElement("div"); holder.id = "dk-sim"; act.parentNode.insertBefore(holder, act.nextSibling);
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
        var c = { no: m[1], nm: t.trim(), per: ((li.querySelector(".period") || {}).textContent || "").trim(), min: minOf(t), all: 1 };
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
        var p = parseInt(d.getAttribute("ec-data-price") || "0", 10); if (!p) return;
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
      var off0 = Math.max(Math.floor(p * 0.05 / 10) * 10, 1000);
      box.innerHTML = "<div style='display:flex;justify-content:space-between;align-items:center'><b style='color:#e8312f'>🎟 가입 쿠폰 적용 시</b><b style='font-size:17px;color:#111'>" + won(p - off0) + "</b></div>" +
        "<div style='font-size:12px;color:#888;margin-top:2px'>회원가입하면 1,000원 쿠폰, 쇼핑정보 수신 동의하면 5% 쿠폰을 바로 드려요 (주문당 1장)</div>" +
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

  function run(){ consentNote(); cpPage(); cpList(); pcCss(); mypage(); cartBox(); cpCart(); if (document.getElementById("orderFixArea")) { lowest(); cpDetail(); recLine(); bubble(); shipBar(); if (momSet !== null) similar(); } }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
  setTimeout(run, 1200); setTimeout(run, 3000);
  document.addEventListener("change", function(e){ if (e.target && e.target.tagName === "SELECT") { setTimeout(recLine, 700); setTimeout(recLine, 1800); } }, true);
})();
