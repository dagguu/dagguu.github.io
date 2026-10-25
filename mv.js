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
