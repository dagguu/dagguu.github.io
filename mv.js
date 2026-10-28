/* 다꾸 매거진 조회수 (2026-10-25 시온님 "매거진 글 목록에서 몇명이 봤는지 조회수")
   글 페이지(/m/·/g/·/p/<slug>.html): 같은 창에서 처음 열 때 1 올림 (?me=1 기기 = 시온님·확인용 브라우저는 안 셈)
   목록(/m/ 등): [data-mv="m:slug"] 자리에 "👀 조회 N" 표시. 숫자는 Supabase mag_views 에 실제로 쌓인 값만 쓴다. */
(function(){
  var U="https://nytoxoupvaozgjpnmmdh.supabase.co/rest/v1/rpc/", K="sb_publishable_i57GJzzp-hE1tNUaLGmMqA_Lw0jSJvD";
  function rpc(f,b){ return fetch(U+f,{method:"POST",headers:{apikey:K,Authorization:"Bearer "+K,"Content-Type":"application/json"},body:JSON.stringify(b||{})}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }); }
  function fmt(n){ return n>=10000?(Math.round(n/1000)/10)+"만":String(n).replace(/\B(?=(\d{3})+(?!\d))/g,","); }
  var me=false; try{ if(/[?&]me=1/.test(location.search)) localStorage.setItem("dakku-me","1"); me=localStorage.getItem("dakku-me")==="1"; }catch(e){}
  var m=location.pathname.match(/^\/([mgp])\/([a-z0-9_-]+)\.html$/);
  if(m&&!me){ var k=m[1]+":"+m[2]; try{ if(!sessionStorage.getItem("mv-"+k)){ sessionStorage.setItem("mv-"+k,"1"); rpc("mag_view",{p_k:k}); } }catch(e){ rpc("mag_view",{p_k:k}); } }
  window.dkMagCounts=function(cb){ if(window._mvc) return cb(window._mvc); rpc("mag_counts").then(function(L){ var o={}; (L||[]).forEach(function(x){ o[x.k]=+x.n||0; }); window._mvc=o; cb(o); }); };
  window.dkMagPaint=function(root){ var els=(root||document).querySelectorAll("[data-mv]"); if(!els.length) return; window.dkMagCounts(function(o){ [].forEach.call(els,function(el){ var n=o[el.getAttribute("data-mv")]; if(n>0){ el.textContent="👀 조회 "+fmt(n); el.hidden=false; } }); }); };
  if(document.readyState!=="loading") window.dkMagPaint(); else document.addEventListener("DOMContentLoaded",function(){ window.dkMagPaint(); });
})();

/* 매거진 글 공유하기 버튼 (2026-10-28 시온님 "메거진 글마다 공유하기 버튼") — /m/·/g/·/p/<slug>.html 글 제목 아래.
   휴대폰은 기기 공유 창(카톡·문자 등), 안 되면 링크 복사. */
(function(){
  if(!/^\/[mgp]\/[a-z0-9_-]+\.html$/.test(location.pathname)) return;
  function go(){
    if(document.getElementById("dkshare")) return;
    var a=document.querySelector("section.cov"), at="after";
    if(!a){ a=document.querySelector("p.meta"); }
    if(!a){ a=document.querySelector("section.hero p.lead"); }
    if(!a){ a=document.querySelector("h1"); }
    if(!a) return;
    var st=document.createElement("style");
    st.textContent="#dkshare{display:flex;justify-content:flex-end;align-items:center;gap:8px;margin:12px 0 4px}#dkshare button{display:inline-flex;align-items:center;gap:6px;font:600 14px/1 inherit;font-family:inherit;color:#5b3fd6;background:#fff;border:1px solid #d9d1f7;border-radius:999px;padding:9px 15px;cursor:pointer}#dkshare button:active{background:#f4f0ff}#dkshare svg{width:16px;height:16px}#dkshare .dklist{margin-right:auto;font-size:14px;font-weight:600;color:#444;text-decoration:none;border:1px solid #e5e5e8;border-radius:999px;padding:9px 15px;background:#fff}#dktop{position:fixed;right:16px;bottom:22px;width:52px;height:52px;border-radius:50%;border:0;background:#6a3fc8;color:#fff;font-size:13px;font-weight:900;box-shadow:0 6px 18px rgba(106,63,200,.45);opacity:0;pointer-events:none;transition:opacity .2s;z-index:50;cursor:pointer}#dktop.on{opacity:1;pointer-events:auto}#dktoast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#222;color:#fff;font-size:14px;padding:10px 16px;border-radius:999px;z-index:9999;opacity:0;transition:opacity .2s;pointer-events:none}#dktoast.on{opacity:.92}";
    document.head.appendChild(st);
    var d=document.createElement("div"); d.id="dkshare";
    var sec=location.pathname.charAt(1), LN={m:"감성숙소 목록",g:"가이드 목록",p:"추천 모음 목록"}[sec];
    d.innerHTML=(document.querySelector(".gnav")?'':'<a class="dklist" href="/'+sec+'/">☰ '+LN+'</a>')+'<button type="button" aria-label="이 글 공유하기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>공유하기</button>';
    if(a.classList&&a.classList.contains("cov")){ d.style.padding="0 16px"; }
    a.parentNode.insertBefore(d,a.nextSibling);
    var url=location.origin+location.pathname, h=document.querySelector("h1"), t=(document.querySelector('meta[property="og:title"]')||{}).content||(h?h.textContent:document.title);
    function toast(m){ var x=document.getElementById("dktoast"); if(!x){ x=document.createElement("div"); x.id="dktoast"; document.body.appendChild(x); } x.textContent=m; x.classList.add("on"); clearTimeout(x._t); x._t=setTimeout(function(){ x.classList.remove("on"); },1800); }
    function copy(){ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(function(){ toast("링크를 복사했어요"); },function(){ prompt("링크를 복사해 주세요",url); }); } else prompt("링크를 복사해 주세요",url); }
    if(!document.getElementById("totop")){
      var tb=document.createElement("button"); tb.id="dktop"; tb.type="button"; tb.setAttribute("aria-label","맨 위로"); tb.textContent="TOP"; document.body.appendChild(tb);
      var bar=document.querySelector(".bar"); if(bar) tb.style.bottom=(bar.offsetHeight+14)+"px";
      tb.addEventListener("click",function(){ window.scrollTo({top:0,behavior:"smooth"}); });
      var chk=function(){ tb.classList.toggle("on",window.scrollY>window.innerHeight*1.2); }; window.addEventListener("scroll",chk,{passive:true}); chk();
    }
    d.querySelector("button").addEventListener("click",function(){
      try{ if(window.gtag) gtag("event","share",{method:navigator.share?"native":"copy",item_id:location.pathname,place:"magazine"}); }catch(e){}
      if(navigator.share){ navigator.share({title:t,url:url}).catch(function(e){ if(e&&e.name!=="AbortError") copy(); }); } else copy();
    });
  }
  if(document.readyState!=="loading") go(); else document.addEventListener("DOMContentLoaded",go);
})();
