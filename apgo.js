/* 공유 페이지(s/)의 신청 팝업 + 이동 중 다꾸키즈 화면 (2026-11-18 시온님 "s/ 에서도 동일하게").
   앱(app.js applyPopup·apGoBtn·goWait)과 같은 모양. 쿠팡 버튼은 잠금·강제 이동 없이 두기만 한다(운영정책 4.1-2·4.1-8). */
(function(){
  if(!document.querySelector('link[href*="simple.css"]')){ var st=document.createElement('style'); st.textContent='.goint{position:fixed;inset:0;z-index:3000;background:rgba(20,16,40,.55);display:flex;align-items:center;justify-content:center;padding:16px}\n.goint .gis{background:#fff;border-radius:22px;width:min(100%,380px);padding:22px 18px 18px;box-sizing:border-box;text-align:center}\n.goint .gil b{display:block;font-size:18px;margin-top:10px}\n.goint .gil small{display:block;color:#888;font-size:13px;margin-top:4px}\n.goint .gisp{display:inline-block;width:28px;height:28px;border:3px solid #e6defb;border-top-color:#6a3fc8;border-radius:50%;animation:gisp .8s linear infinite}\n@keyframes gisp{to{transform:rotate(360deg)}}\n.goint .gibar{height:4px;background:#eee;border-radius:4px;margin:14px 0 4px;overflow:hidden}\n.goint .gibar i{display:block;height:100%;width:0;background:#6a3fc8;animation:gibar 5s linear forwards}\n@keyframes gibar{to{width:100%}}\n.goint .gik{margin:14px 0 12px;text-align:left}\n.goint .gikh b{font-size:15px}.goint .gikh small{display:block;color:#999;font-size:12px}\n.goint .gikr{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}\n.goint .gikr a{text-decoration:none;color:#222;font-size:12px;min-width:0}\n.goint .gikr span{display:block;aspect-ratio:4/5;border-radius:10px;overflow:hidden;background:#f4f4f4}\n.goint .gikr img{width:100%;height:100%;object-fit:cover;object-position:top}\n.goint .gikr em{display:block;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px}\n.goint .gikr b{display:block;font-size:13px}\n.goint .gikm{display:block;text-align:center;margin-top:10px;color:#6a3fc8;font-size:13px;font-weight:700;text-decoration:none}\n.goint .gicd{display:inline-block;min-width:1.2em;opacity:.75}\n.goint .gskip:disabled{background:#c9bdf0;opacity:1;cursor:default}\n.goint .gikr span{position:relative}\n.goint .kt{position:absolute;left:4px;top:4px;z-index:1;font-style:normal;font-size:10px;font-weight:800;padding:2px 6px;border-radius:6px;color:#fff;line-height:1.4}\n.goint .kt.ks{background:#ff3b5c}.goint .kt.kb{background:#ff8a00}.goint .kt.kn{background:#6a3fc8}\n.goint .gikr s{display:block;color:#aaa;font-size:11px;margin-top:2px}\n.goint .gikr b em{font-style:normal;color:#ff3b5c;margin-right:3px}\n.goint .gikr small{display:block;color:#999;font-size:10px}\n.goint .gikr{transition:opacity .25s}.goint .gikr.gfade{opacity:0}\n.goint .gis{position:relative}\n.goint .gix{position:absolute;right:10px;top:10px;width:32px;height:32px;border:0;background:transparent;color:#999;font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer}\n.goint .gix svg{width:20px;height:20px}\n.goint *{box-sizing:border-box;font-family:inherit}.goint .gis{font-family:Pretendard,system-ui,sans-serif;color:#222}'+'.goint .b.pri.wide{display:block;width:100%;height:50px;border:0;border-radius:14px;background:#6a3fc8;color:#fff;font-size:16px;font-weight:700;margin-top:8px}'; document.head.appendChild(st); }
  var KU="https://dagguukids.com", KIDS=null;
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function ga(n,p){ try{ if(window.gtag) gtag("event",n,p||{}); }catch(e){} }
  function kgo(p){ return KU+p+(p.indexOf("?")>=0?"&":"?")+"utm_source=dagguu&utm_medium=site"; }
  var KSALE={rate:10,days:3}, KBEST=null;  /* app.js KSALE 와 같이 바꾼다 */
  var H={headers:{"X-Cafe24-Client-Id":"JzTmuiBPItGvZ6KG8g3aPC"}};
  function loadKids(cb){
    if(KIDS&&KBEST) return cb();
    var a=fetch("https://dagguu.cafe24api.com/api/v2/products?display=T&selling=T&limit=12&sort=created_date&order=desc&fields=product_no,product_name,price,list_image,list_icon",H)
      .then(function(r){ return r.json(); }).then(function(j){
        KIDS=(j.products||[]).filter(function(p){ return p.list_image&&+p.price>0; }).map(function(p){ var m=String(p.list_image).match(/\/(20\d{6})\//); return {no:p.product_no,name:p.product_name,img:p.list_image,p:+p.price,price:(+p.price).toLocaleString("ko-KR")+"원",d:m?m[1]:"",nw:!!(p.list_icon&&p.list_icon.new_icon)}; });
      });
    var b=fetch("https://dagguu.cafe24api.com/api/v2/categories/55/products?display_group=1&limit=100",H).then(function(r){ return r.json(); }).then(function(j){ KBEST={}; (j.products||[]).forEach(function(p){ KBEST[p.product_no]=1; }); }).catch(function(){ KBEST={}; });
    Promise.all([a,b]).then(cb).catch(function(){ cb(); });
  }
  function kSale(x){ if(!x||!x.d) return false; var t=new Date(), d=new Date(+x.d.slice(0,4),+x.d.slice(4,6)-1,+x.d.slice(6,8)); return (t-d)>=0 && (t-d)/864e5 < KSALE.days; }
  function kCard(x){
    var sale=kSale(x), best=KBEST&&KBEST[x.no], tag=sale?'<i class="kt ks">신상 '+KSALE.rate+'%</i>':(best?'<i class="kt kb">BEST</i>':(x.nw?'<i class="kt kn">NEW</i>':''));
    var pr=sale?'<s>'+esc(x.price)+'</s><b><em>'+KSALE.rate+'%</em>'+Math.floor(x.p*(100-KSALE.rate)/100).toLocaleString("ko-KR")+'원</b><small>가입 회원가</small>':'<b>'+esc(x.price)+'</b>';
    return '<a data-gk href="'+esc(kgo("/product/detail.html?product_no="+x.no))+'" target="_blank" rel="noopener"><span>'+tag+'<img src="'+esc(x.img)+'" alt="" referrerpolicy="no-referrer"></span><em>'+esc(x.name)+'</em>'+pr+'</a>';
  }
  var LOGO='<svg width="40" height="40" viewBox="0 0 100 100" aria-hidden="true"><rect x="0.5" y="0.5" width="99" height="99" rx="23" fill="#6a3fc8"></rect><path fill="#ffffff" fill-rule="evenodd" d="M26 22H52C70 22 77 31.5 77 49.5C77 67.5 70 77 52 77H26Z M43 36H51.5C56 36 58 38 58 42.5V56.5C58 61 56 63 51.5 63H43Z"></path></svg>';
  function goWait(url,src,id,cp){
    var w=document.createElement("div"); w.className="goint"; w.setAttribute("role","dialog");
    var done=false, tm, cd;
    function go(){ if(done) return; done=true; clearTimeout(tm); clearInterval(cd); w.remove(); location.href=url; }
    function kids(){
      var L=(KIDS||[]).slice(); if(L.length<3) return "";
      var o=(new Date().getMinutes())%L.length; L=L.slice(o).concat(L.slice(0,o));
      L=L.filter(kSale).concat(L.filter(function(x){ return !kSale(x); }));
      var n=Math.floor(L.length/3)||1; var pg=(KPG||0)%n; L=L.slice(pg*3,pg*3+3);  /* 3초마다 다음 3개(2026-11-18 시온님) */
      return '<div class="gik"><div class="gikh"><b>👕 다꾸키즈 오늘의 신상</b><small>다꾸체험단이 운영하는 아동복 쇼핑몰</small></div><div class="gikr">'+
        L.map(kCard).join("")+
        '</div><a class="gikm" data-gk href="'+esc(kgo("/"))+'" target="_blank" rel="noopener">다꾸키즈 구경가기 ›</a></div>';
    }
    w.innerHTML='<div class="gis">'+(cp?'':'<button class="gix" data-gx aria-label="닫기">✕</button>')+'<div class="gil"><span class="gisp"></span><b>'+(cp?'쿠팡으로 이동 중이에요':esc(src)+' 사이트로 이동 중이에요')+'</b><small>'+(cp?'3초 뒤 상품 페이지가 열려요':'3초 뒤 신청 페이지가 자동으로 열려요')+'</small></div>'+
      '<div class="gibar"><i></i></div><div class="gikw">'+kids()+'</div>'+(cp?'':'<button class="b pri wide gskip" data-gnow><span class="gicd">3</span>초 후 이동 · 바로 가기 ›</button>')+'</div>';
    w.addEventListener("click",function(e){
      if(e.target.closest("[data-gx]")){ done=true; clearInterval(cd); w.remove(); ga("apply_wait_close",{item_id:id,page:"share"}); return; }
      var sk=e.target.closest("[data-gnow]"); if(sk){ if(sk.disabled) return; ga(cp?"coupang_go":"apply_go",{item_id:id,how:"now",page:"share"}); return go(); }
      if(e.target.closest("[data-gk]")) ga("kids_click",{place:"apply_wait_share",item_id:id});
    });
    document.body.appendChild(w);
    loadKids(function(){ var k=w.querySelector(".gikw"); if(k&&!done) k.innerHTML=kids(); });
    var KPG=0, rot=setInterval(function(){ if(done||!w.isConnected){ clearInterval(rot); return; } if(!KIDS||KIDS.length<6) return;
      KPG++; var r=w.querySelector(".gikr"); if(r){ r.classList.add("gfade"); setTimeout(function(){ var k=w.querySelector(".gikw"); if(k) k.innerHTML=kids(); var r2=w.querySelector(".gikr"); if(r2){ r2.classList.add("gfade"); requestAnimationFrame(function(){ requestAnimationFrame(function(){ r2.classList.remove("gfade"); }); }); } },250); } },3000);
    var left=3; cd=setInterval(function(){ left--; var el=w.querySelector(".gicd"), bt=w.querySelector(".gskip"); if(el) el.textContent=left;
      if(left<=0){ clearInterval(cd); if(bt) bt.innerHTML="이동 중…"; } },1000);
    ga(cp?"coupang_wait":"apply_wait",{item_id:id,source:src,page:"share"});
    tm=setTimeout(function(){ if(!done) ga(cp?"coupang_go":"apply_go",{item_id:id,how:"auto"}); go(); },3000);  /* 2026-11-24 시온님 "3초 후 바로 타사이트로": 신청도 3초 뒤 자동 이동(X 로 취소, 버튼은 바로 가기) */
  }
  function popup(a){
    var d=a.dataset, url=a.getAttribute("href"), src=d.src||"체험단", cat=d.cat||"stay";
    var t=cat==="stay"?"객실 사진 더 보기":(cat==="etc"?"입장권 가격 보기":"제품 상세 보기"), pr=+d.price||0, R=' href="'+esc(d.view)+'" target="_blank" rel="sponsored nofollow noopener"';
    var cp=d.view?'<a class="apcard" data-m="cp"'+R+'>'+(d.img?'<span class="apci"><i class="apad">AD</i><img src="'+esc(d.img)+'" alt="" referrerpolicy="no-referrer"></span>':'')+'<span class="apcn">'+esc(d.name||"")+'</span>'+(pr?'<span class="apcp"><b>'+pr.toLocaleString("ko-KR")+'원</b>'+(d.rocket==="1"?'<i class="aprk">로켓배송</i>':'')+'<small>쿠팡 판매가 · 등록할 때 가격이라 지금은 다를 수 있어요</small></span>':'')+'</a><a class="b wide apgo" data-m="cp"'+R+'>'+t+' ↗</a>':'';
    var w=document.createElement("div"); w.className="modal applym"; w.setAttribute("role","dialog"); w.setAttribute("aria-modal","true");
    w.innerHTML='<div class="sheet apsheet"><button class="mx" data-m="x" aria-label="닫기">✕</button>'+

      cp+'<a class="b pri wide" data-m="go" href="'+esc(url)+'">'+esc(src)+'에서 신청하기 ↗</a>'+
      '<button class="b sec wide" data-m="x" style="margin-top:8px">닫기</button></div>';
    function close(){ w.remove(); }
    w.addEventListener("click",function(e){
      if(e.target===w) return close();
      var b=e.target.closest("[data-m]"); if(!b) return;
      if(b.dataset.m==="cp"){ ga("coupang_click",{place:"apply_popup_share",item_id:d.id}); close(); return; }
      if(b.dataset.m==="go"){ e.preventDefault(); try{ var A=JSON.parse(localStorage.getItem("dakku-applied")||"[]"); A=A.filter(function(x){ return x!==d.id; }); A.unshift(d.id); localStorage.setItem("dakku-applied",JSON.stringify(A.slice(0,50))); }catch(_){}
        close(); goWait(url,src,d.id); return; }
      if(b.dataset.m==="x") close();
    });
    document.body.appendChild(w);
    loadKids(function(){});
  }
  document.addEventListener("click",function(e){
    var c=e.target.closest('.dbar a.dbl, a#go[href*="link.coupang.com"]'); if(c&&!e.ctrlKey&&!e.metaKey){ ga("coupang_click",{place:"detail_share"}); return; }  /* 쿠팡은 대기 화면 없이 바로(2026-11-23) */
  },true);
  document.addEventListener("click",function(e){
    var a=e.target.closest("a[data-ap]"); if(!a) return;
    e.preventDefault(); ga("apply_open",{item_id:a.dataset.id,page:"share"}); popup(a);
  },true);
})();
