/* 공유 페이지(s/)의 신청 팝업 + 이동 중 다꾸키즈 화면 (2026-11-18 시온님 "s/ 에서도 동일하게").
   앱(app.js applyPopup·apGoBtn·goWait)과 같은 모양. 쿠팡 버튼은 잠금·강제 이동 없이 두기만 한다(운영정책 4.1-2·4.1-8). */
(function(){
  var KU="https://dagguukids.com", KIDS=null;
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function ga(n,p){ try{ if(window.gtag) gtag("event",n,p||{}); }catch(e){} }
  function kgo(p){ return KU+p+(p.indexOf("?")>=0?"&":"?")+"utm_source=dagguu&utm_medium=site"; }
  function loadKids(cb){
    if(KIDS) return cb();
    fetch("https://dagguu.cafe24api.com/api/v2/products?display=T&selling=T&limit=12&sort=created_date&order=desc&fields=product_no,product_name,price,list_image",{headers:{"X-Cafe24-Client-Id":"JzTmuiBPItGvZ6KG8g3aPC"}})
      .then(function(r){ return r.json(); }).then(function(j){
        KIDS=(j.products||[]).filter(function(p){ return p.list_image&&+p.price>0; }).map(function(p){ return {no:p.product_no,name:p.product_name,img:p.list_image,price:(+p.price).toLocaleString("ko-KR")+"원"}; });
        cb();
      }).catch(function(){});
  }
  var LOGO='<svg width="40" height="40" viewBox="0 0 100 100" aria-hidden="true"><rect x="0.5" y="0.5" width="99" height="99" rx="23" fill="#6a3fc8"></rect><path fill="#ffffff" fill-rule="evenodd" d="M26 22H52C70 22 77 31.5 77 49.5C77 67.5 70 77 52 77H26Z M43 36H51.5C56 36 58 38 58 42.5V56.5C58 61 56 63 51.5 63H43Z"></path></svg>';
  function goWait(url,src,id){
    var w=document.createElement("div"); w.className="goint"; w.setAttribute("role","dialog");
    var done=false, tm, cd;
    function go(){ if(done) return; done=true; clearTimeout(tm); clearInterval(cd); w.remove(); location.href=url; }
    function kids(){
      var L=(KIDS||[]).slice(); if(L.length<3) return "";
      var o=(new Date().getMinutes())%L.length; L=L.slice(o).concat(L.slice(0,o)).slice(0,3);
      return '<div class="gik"><div class="gikh"><b>👕 다꾸키즈 오늘의 신상</b><small>다꾸체험단이 운영하는 아동복 쇼핑몰</small></div><div class="gikr">'+
        L.map(function(x){ return '<a data-gk href="'+esc(kgo("/product/detail.html?product_no="+x.no))+'" target="_blank" rel="noopener"><span><img src="'+esc(x.img)+'" alt="" referrerpolicy="no-referrer"></span><em>'+esc(x.name)+'</em><b>'+esc(x.price)+'</b></a>'; }).join("")+
        '</div><a class="gikm" data-gk href="'+esc(kgo("/"))+'" target="_blank" rel="noopener">다꾸키즈 구경가기 ›</a></div>';
    }
    w.innerHTML='<div class="gis"><div class="gil"><span class="gisp"></span><b>'+esc(src)+' 사이트로 이동 중이에요</b><small>잠시 후 신청 페이지가 열려요</small></div>'+
      '<div class="gibar"><i></i></div><div class="gikw">'+kids()+'</div><button class="b pri wide" data-gnow>건너뛰기 <span class="gicd">3</span></button></div>';
    w.addEventListener("click",function(e){
      if(e.target.closest("[data-gnow]")){ ga("apply_go",{item_id:id,how:"now",page:"share"}); return go(); }
      if(e.target.closest("[data-gk]")){ clearTimeout(tm); clearInterval(cd); ga("kids_click",{place:"apply_wait_share",item_id:id}); setTimeout(go,600); }
    });
    document.body.appendChild(w);
    loadKids(function(){ var k=w.querySelector(".gikw"); if(k&&!done) k.innerHTML=kids(); });
    var left=3; cd=setInterval(function(){ left--; var el=w.querySelector(".gicd"); if(el) el.textContent=left>0?left:""; if(left<=0) clearInterval(cd); },1000);
    ga("apply_wait",{item_id:id,source:src,page:"share"});
    tm=setTimeout(go,3000);
  }
  function popup(a){
    var d=a.dataset, url=a.getAttribute("href"), src=d.src||"체험단", cat=d.cat||"stay";
    var nm=cat==="stay"?"숙소":(cat==="etc"?"입장권":"제품"), t=cat==="stay"?"객실 사진 더 보기":(cat==="etc"?"입장권 정보 더 보기":"제품 사진 더 보기"), sub=cat==="stay"?"객실·위치·편의시설 정보":(cat==="etc"?"이용 안내·가격 정보":"상세 사진·구성 정보");
    var cp=d.view?'<a class="b wide apgo'+(d.img?' apph':'')+'" data-m="cp" href="'+esc(d.view)+'" target="_blank" rel="sponsored nofollow noopener">'+(d.img?'<span class="apst"><i></i><i></i><img src="'+esc(d.img)+'" alt="" referrerpolicy="no-referrer"></span>':'')+'<span class="aptx"><b>'+t+' ↗</b><small>'+nm+' 바로가기 · '+sub+'</small></span></a>':'';
    var w=document.createElement("div"); w.className="modal applym"; w.setAttribute("role","dialog"); w.setAttribute("aria-modal","true");
    w.innerHTML='<div class="sheet"><button class="mx" data-m="x" aria-label="닫기">✕</button><div class="mlogo">'+LOGO+'</div>'+
      '<h2>['+esc(src)+'] 홈페이지로<br>이동해요👀</h2><p>한번만 로그인 해두면<br>편하게 신청 가능해져요.</p>'+
      (d.pb==="1"?'<div class="paynote"><b>💳 선정 후 구매하는 페이백 상품이에요</b><span>['+esc(src)+']에서 당첨 후 안내에 따라 진행하세요. 선정 전에 먼저 구매하면 페이백을 받지 못할 수 있어요.</span></div>':'')+
      '<p class="apnote">✅ 신청하신 체험단은<br><a href="/#/my">다꾸체험단 마이페이지</a>에서 확인하실 수 있어요.</p>'+
      cp+'<a class="b pri wide" data-m="go" href="'+esc(url)+'">'+esc(src)+'에서 신청하기 ↗</a>'+
      '<button class="b sec wide" data-m="x" style="margin-top:8px">닫기</button></div>';
    function close(){ w.remove(); }
    w.addEventListener("click",function(e){
      if(e.target===w) return close();
      var b=e.target.closest("[data-m]"); if(!b) return;
      if(b.dataset.m==="cp"){ ga("coupang_click",{place:"apply_popup_share",item_id:d.id}); return; }
      if(b.dataset.m==="go"){ e.preventDefault(); try{ var A=JSON.parse(localStorage.getItem("dakku-applied")||"[]"); A=A.filter(function(x){ return x!==d.id; }); A.unshift(d.id); localStorage.setItem("dakku-applied",JSON.stringify(A.slice(0,50))); }catch(_){}
        close(); goWait(url,src,d.id); return; }
      if(b.dataset.m==="x") close();
    });
    document.body.appendChild(w);
    loadKids(function(){});
  }
  document.addEventListener("click",function(e){
    var a=e.target.closest("a[data-ap]"); if(!a) return;
    e.preventDefault(); ga("apply_open",{item_id:a.dataset.id,page:"share"}); popup(a);
  },true);
})();
