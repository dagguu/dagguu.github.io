(function(){
"use strict";
/* =========================================================
   다꾸 체험단 모음 — 앱 스타일 (홈 · 체험단 · 찜 · 혜택 · 특가)
   데이터: data.json (items, categories, upcoming, deals, ads, kakao, partners, features)
   ========================================================= */
var SITE = "다꾸 체험단 모음";
var REGIONS = ["서울","경기","인천","강원","충청","전라","경상","부산","제주"];
/* 분야 순서와 아이콘. data.json 의 categories(열린 분야) / upcoming(곧 오픈) 으로 상태가 정해져요. */
var CAT_ORDER = [
  {k:"stay",  t:"숙박", em:"🏨", icon:"M3 18V8m0 6h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5a1.5 1.5 0 1 0 0-.01"},
  {k:"baby",  t:"육아", em:"👶", icon:"M9 3h6M10 3v3l-2 2.5V20a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8.5L14 6V3M8 12h8"},
  {k:"life",  t:"생활", em:"🧺", icon:"M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5"},
  {k:"beauty",t:"뷰티", em:"💄", icon:"M9 21h6V11H9ZM10 11V6l4-3v8"},
  {k:"elec",  t:"가전", em:"🔌", icon:"M4 5h16v11H4ZM9 20h6M12 16v4"},
  {k:"etc",   t:"기타", em:"🎁", icon:"M6 12h.01M12 12h.01M18 12h.01"}
];
var CATS = [{k:"stay",t:"숙박",region:true,unit:"숙소",view:"숙소보기",pick:["풀빌라"]}];
var UPCOMING = [], ADS = [], DEALS = [], seed = {items:[]};
var PREFS = [
  {k:"pool",  t:"풀빌라",            re:/풀빌라|풀 ?빌라/},
  {k:"kids",  t:"키즈 펜션 · 아기랑", re:/키즈|아기|아이|베이비|패밀리/},
  {k:"pet",   t:"애견 동반",          re:/애견|반려|펫|독채/},
  {k:"glamp", t:"글램핑 · 캠핑",      re:/글램핑|캠핑|카라반/},
  {k:"hotel", t:"호텔 · 리조트",      re:/호텔|리조트|스테이/},
  {k:"hanok", t:"한옥 스테이",        re:/한옥/}
];

var state = { tab:"home", cat:"stay", region:"전체", status:"open", q:"", view:"2", loading:true };
function ls(k,v){ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); }catch(e){ return null; } }
state.view = ls("dakku-view") || "2";
try{ var su=JSON.parse(sessionStorage.getItem("dakku-ui")||"{}"); if(su.cat) state.cat=su.cat; if(su.region) state.region=su.region; if(su.status) state.status=su.status; }catch(e){}
function saveUi(){ try{ sessionStorage.setItem("dakku-ui",JSON.stringify({cat:state.cat,region:state.region,status:state.status})); }catch(e){} }
var FAV=[]; try{ FAV=JSON.parse(ls("dakku-fav")||"[]")||[]; }catch(e){ FAV=[]; }
function isFav(id){ return FAV.indexOf(id)>=0; }
function toggleFav(id){ var i=FAV.indexOf(id); if(i>=0) FAV.splice(i,1); else FAV.push(id); ls("dakku-fav",JSON.stringify(FAV)); }
var PREF = ls("dakku-pref") || "";

/* ---------- 로고: 클래식 D + 기념일 로고 ---------- */
var D_PATH="M26 22H52C70 22 77 31.5 77 49.5C77 67.5 70 77 52 77H26Z M43 36H51.5C56 36 58 38 58 42.5V56.5C58 61 56 63 51.5 63H43Z";
var LOGO_BASE={bg:"#6a3fc8",fg:"#ffffff",deco:"",name:""};
var LOGO_EVENTS=[
  {m1:1,d1:1,m2:1,d2:3,bg:"#111111",fg:"#ffd84d",deco:"spark",name:"Happy New Year ✨"},
  {m1:2,d1:14,m2:2,d2:14,bg:"#8b4513",fg:"#ffffff",deco:"heart",name:"발렌타인데이 🍫"},
  {m1:3,d1:14,m2:3,d2:14,bg:"#ffffff",fg:"#e8508a",deco:"heart",name:"화이트데이 🍬"},
  {m1:5,d1:5,m2:5,d2:5,bg:"#ffd84d",fg:"#1d4ed8",deco:"balloon",name:"어린이날 🎈"},
  {m1:10,d1:25,m2:10,d2:31,bg:"#ff7a1a",fg:"#1a1a1a",deco:"pumpkin",name:"Happy Halloween 🎃"},
  {m1:11,d1:11,m2:11,d2:11,bg:"#7b4a2a",fg:"#f5d7a1",deco:"stick",name:"빼빼로데이 🍫"},
  {m1:12,d1:18,m2:12,d2:25,bg:"#c62828",fg:"#ffffff",deco:"snow",name:"Merry Christmas 🎄"}
];
function pickLogo(){
  var t=today(), md=(t.getMonth()+1)*100+t.getDate(), td=ymd(t), list=LOGO_EVENTS.concat(Array.isArray(seed.logoEvents)?seed.logoEvents:[]), hit=null;
  list.forEach(function(e){
    if(e.from&&e.to){ if(td>=e.from&&td<=e.to) hit=e; return; }
    var a=e.m1*100+e.d1, b=e.m2*100+e.d2;
    if(a<=b ? (md>=a&&md<=b) : (md>=a||md<=b)) hit=e;
  });
  var o={}; for(var k in LOGO_BASE) o[k]=LOGO_BASE[k]; if(hit) for(var k2 in hit) o[k2]=hit[k2]; return o;
}
var DECO={
  spark:function(c){ return '<path fill="'+c+'" d="M83 10C83.8 15.5 85 17 90 18C85 19 83.8 20.5 83 26C82.2 20.5 81 19 76 18C81 17 82.2 15.5 83 10Z"/><circle cx="14" cy="84" r="3" fill="'+c+'"/>'; },
  heart:function(c){ return '<path fill="'+c+'" d="M82 30C76 26 72 22 72 18C72 15 74.5 13 77 13C79 13 80.8 14.2 82 16C83.2 14.2 85 13 87 13C89.5 13 92 15 92 18C92 22 88 26 82 30Z"/>'; },
  balloon:function(c){ return '<ellipse cx="84" cy="17" rx="7" ry="8.5" fill="#ef4444"/><path d="M84 25.5C83 29 86 31 84 35" stroke="'+c+'" stroke-width="1.4" fill="none" stroke-linecap="round"/>'; },
  pumpkin:function(){ return '<path d="M47 22C47 16 50 12 55 11" stroke="#2f6b2f" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M55 13C60 10 65 12 66 16C61 17 57 16 55 13Z" fill="#3f8f3f"/>'; },
  stick:function(){ return '<rect x="80" y="8" width="5" height="40" rx="2.5" fill="#e8c38a" transform="rotate(18 82 28)"/><rect x="80" y="8" width="5" height="24" rx="2.5" fill="#4a2615" transform="rotate(18 82 28)"/>'; },
  snow:function(){ return '<path fill="#ffffff" d="M24 25C24 17 33 13 41 15C47 9 58 10 62 16C70 15 78 19 78 26C70 28 34 29 24 25Z"/><circle cx="20" cy="84" r="2.6" fill="#ffffff" opacity=".9"/><circle cx="88" cy="82" r="2" fill="#ffffff" opacity=".85"/><circle cx="86" cy="14" r="2.4" fill="#ffffff" opacity=".9"/>'; }
};
var LOGO=LOGO_BASE;
function logoSvg(size){
  var L=LOGO, deco=(L.deco&&DECO[L.deco])?DECO[L.deco](L.fg):"";
  var border=(String(L.bg).toLowerCase()==="#ffffff")?' stroke="#e5e5e5"':'';
  return '<svg class="logo-mark" width="'+size+'" height="'+size+'" viewBox="0 0 100 100" aria-hidden="true"><rect x="0.5" y="0.5" width="99" height="99" rx="23" fill="'+L.bg+'"'+border+'/><path fill="'+L.fg+'" fill-rule="evenodd" d="'+D_PATH+'"/>'+deco+'</svg>';
}
function setFavicon(){
  try{ var href="data:image/svg+xml,"+encodeURIComponent(logoSvg(64).replace(' class="logo-mark"','').replace('aria-hidden="true"','xmlns="http://www.w3.org/2000/svg"'));
    var l=document.querySelector('link[rel="icon"]'); if(l) l.href=href; }catch(e){}
}

/* ---------- 날짜 · 상태 ---------- */
function today(){ var d=new Date(); d.setHours(0,0,0,0); return d; }
function parseDate(s){ if(!s) return null; var p=String(s).split("-"); if(p.length<3) return null; var d=new Date(+p[0],+p[1]-1,+p[2]); d.setHours(0,0,0,0); return isNaN(d)?null:d; }
function ymd(d){ return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2); }
function fmt(s){ var d=parseDate(s); if(!d) return "-"; return (d.getMonth()+1)+"."+d.getDate(); }
function daysLeft(it){ var en=parseDate(it.end); return en?Math.round((en-today())/864e5):999; }
function statusOf(it){
  var t=today(), st=parseDate(it.start), en=parseDate(it.end);
  if(it.closed || (en && t>en)) return {key:"closed",dday:"마감",hot:false};
  if(st && t<st){ return {key:"soon",dday:"오픈 D-"+Math.round((st-t)/864e5),hot:false}; }
  if(en){ var left=Math.round((en-t)/864e5); return {key:"open",dday:left===0?"오늘 마감":"D-"+left,hot:left<=1}; }
  return {key:"open",dday:"상시",hot:false};
}
function catOf(it){ return it.cat||"stay"; }
function catInfo(k){ for(var i=0;i<CATS.length;i++) if(CATS[i].k===k) return CATS[i]; return null; }
function catMeta(k){ for(var i=0;i<CAT_ORDER.length;i++) if(CAT_ORDER[i].k===k) return CAT_ORDER[i]; return {k:k,t:k,icon:CAT_ORDER[5].icon}; }
function isOpenCat(k){ return !!catInfo(k); }
function isPick(it){ if(it.pick===true) return true; var c=catInfo(catOf(it)); var kw=(c&&c.pick)||[]; for(var i=0;i<kw.length;i++) if(String(it.name||"").indexOf(kw[i])>=0) return true; return false; }
function prefOf(k){ for(var i=0;i<PREFS.length;i++) if(PREFS[i].k===k) return PREFS[i]; return null; }
function prefHit(it){ var p=prefOf(PREF); return !!(p && p.re.test(String(it.name||"")+" "+String(it.benefit||""))); }
function byDeadline(a,b){
  var pa=prefHit(a), pb=prefHit(b); if(pa!==pb) return pa?-1:1;
  return daysLeft(a)-daysLeft(b) || (b.createdAt||0)-(a.createdAt||0);
}

/* ---------- 도우미 ---------- */
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
function safeUrl(u){ u=String(u||"").trim(); if(!u) return ""; if(/^https?:\/\//i.test(u)) return u; if(/^images\/[\w.-]+$/.test(u)) return u; return ""; }
function ext(u){ return 'href="'+esc(u)+'" target="_blank" rel="noopener noreferrer sponsored"'; }
function ico(d,cls){ return '<svg class="'+(cls||"i")+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+d+'"/></svg>'; }
var I={
  chev:"m9 6 6 6-6 6", back:"M15 5 8 12l7 7", search:"M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM16 16l4.5 4.5",
  heart:"M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  gift:"M3.5 8h17v12.5h-17ZM2.5 8h19M12 8v12.5M12 8S10.5 3.5 8 4.2 8.5 8 12 8Zm0 0s1.5-4.5 4-3.8S15.5 8 12 8Z",
  home:"M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z",
  ticket:"M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 0 0 5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.5a2.5 2.5 0 0 0 0-5Z",
  check:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8.5 12.5 11 15l4.5-5.5",
  share:"M18 3a2.8 2.8 0 1 0 0 5.6A2.8 2.8 0 0 0 18 3ZM6 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6ZM18 15.4a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6ZM8.5 10.7l7-3.9M8.5 13.3l7 3.9",
  bell:"M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9ZM10 20a2.2 2.2 0 0 0 4 0",
  flame:"M12 2c1 3.5 5 5.5 5 11a5 5 0 0 1-10 0c0-2.4 1-3.9 2-5 .2 1.6 1 2.6 2 3 0-3.4-.5-6 1-9Z",
  x:"M6 6l12 12M18 6 6 18", trend:"M4 17l5-5 4 4 7-8M15 8h5v5",
  quiz:"M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17.5h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
  wheel:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0v9l6.4 6.4M12 12 3.5 9"
};

/* ---------- 셸 ---------- */
var app=document.getElementById("app");
var TABS=[["home","홈",I.home],["list","체험단",I.ticket],["fav","찜",I.heart],["benefit","혜택",I.check],["deals","특가",I.gift]];
function shell(){
  app.innerHTML=
    '<div class="disclose">이 사이트는 쿠팡 파트너스, 여기어때, 마이리얼트립, 트립닷컴 등 제휴 활동의 일환으로 일정액의 수수료를 제공받을 수 있습니다.</div>'+
    '<div class="frame">'+
      '<header class="appbar"><a class="logo" href="#/" id="logo"></a><a class="iconbtn" href="#/list" data-focus="q" aria-label="체험단 검색">'+ico(I.search)+'</a></header>'+
      '<main id="view" class="view"></main>'+
      '<footer class="foot"><a class="flink" href="#/contact">광고주 마케팅 상담 문의</a><br><a '+ext(safeUrl(seed.kakao)||"http://pf.kakao.com/_xkqEFX/friend")+'>💬 카카오톡 채널 ‘다꾸 체험단’</a><p>'+SITE+' · 체험단 모집 정보는 각 모집처의 공지를 기준으로 하며, 신청 조건과 일정은 바뀔 수 있어요.</p></footer>'+
    '</div>'+
    '<nav class="tabbar" aria-label="하단 메뉴">'+TABS.map(function(t){ return '<a href="#/'+(t[0]==="home"?"":t[0])+'" data-tab="'+t[0]+'">'+ico(t[2],"ti")+'<span>'+t[1]+'</span></a>'; }).join("")+'</nav>';
  app.addEventListener("click",onClick);
  app.addEventListener("submit",function(e){ if(e.target.id==="cform"){ e.preventDefault(); submitContact(e.target); } });
  app.addEventListener("input",function(e){ if(e.target.dataset&&e.target.dataset.etc){ var r=e.target.parentNode.querySelector("input[type=radio]"); if(r) r.checked=true; } if(e.target.id==="q"){ state.q=e.target.value; renderListGrid(); } });
  app.addEventListener("change",function(e){ if(e.target.id==="region"){ state.region=e.target.value; saveUi(); renderListGrid(); } });
}
function paintLogo(){ var l=document.getElementById("logo"); if(l) l.innerHTML=logoSvg(30)+'<b>'+SITE+'</b>'+(LOGO.name?'<em class="logo-ev">'+esc(LOGO.name)+'</em>':''); }

function route(){
  var h=(location.hash||"").replace(/^#\/?/,""), parts=h.split("?"), tab=parts[0]||"home", qs={};
  (parts[1]||"").split("&").forEach(function(p){ var kv=p.split("="); if(kv[0]) qs[decodeURIComponent(kv[0])]=decodeURIComponent(kv[1]||""); });
  if(!/^(home|list|fav|benefit|deals|reporter|contact)$/.test(tab)) tab="home";
  state.tab=tab;
  if(tab==="list"){ if(qs.cat) state.cat=qs.cat; if(qs.s) state.status=qs.s; saveUi(); }
  render(); window.scrollTo(0,0);
}
function render(){
  [].forEach.call(document.querySelectorAll(".tabbar a"),function(a){ var on=a.dataset.tab===state.tab; a.classList.toggle("on",on); if(on) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current"); });
  var v=document.getElementById("view");
  if(state.loading){ v.innerHTML='<div class="empty">불러오는 중…</div>'; return; }
  if(state.tab==="home") v.innerHTML=homeView();
  else if(state.tab==="list"){ v.innerHTML=listView(); renderListGrid(); }
  else if(state.tab==="fav") v.innerHTML=favView();
  else if(state.tab==="benefit") v.innerHTML=benefitView();
  else if(state.tab==="deals") v.innerHTML=dealsView();
  else if(state.tab==="reporter") v.innerHTML=reporterView();
  else if(state.tab==="contact") v.innerHTML=contactView();
  tick(); startSliders();
}

/* ---------- 공통 카드 ---------- */
function thumb(it,cls){
  var s=statusOf(it), img=safeUrl(it.image), view=safeUrl(it.viewUrl);
  return '<div class="th '+(cls||"")+'">'+
    (view?'<a '+ext(view)+' aria-label="'+esc(it.name)+' 보기">':'<div>')+
      '<span class="ph">'+esc(it.region||"")+'</span>'+(img?'<img src="'+esc(img)+'" alt="'+esc(it.name)+'" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">':'')+
    (view?'</a>':'</div>')+
    '<span class="dd '+(s.key==="closed"?"off":(s.hot?"hot":""))+'">'+esc(s.dday)+'</span>'+
    '<button class="fv'+(isFav(it.id)?" on":"")+'" data-fav="'+esc(it.id)+'" aria-label="찜하기" aria-pressed="'+isFav(it.id)+'">'+ico(I.heart)+'</button>'+
  '</div>';
}
function miniCard(it,btns){
  var act='';
  if(btns){ var s=statusOf(it), view=safeUrl(it.viewUrl), apply=safeUrl(it.applyUrl), c=catInfo(catOf(it))||{};
    act='<div class="act3">'+(view?'<a class="b pri" '+ext(view)+'>'+esc(c.view||"보기")+'</a>':'')+(s.key==="closed"?'<span class="b dis">마감</span>':(apply?'<a class="b sec" href="'+esc(apply)+'" target="_blank" rel="noopener noreferrer">신청</a>':''))+'</div>'; }
  return '<article class="mini">'+thumb(it)+'<p class="rg">📍 '+esc(it.region)+'</p><h3>'+esc(it.name)+'</h3><p class="bn">🎁 '+esc(it.benefit)+'</p>'+act+'</article>';
}
function fullCard(it){
  var s=statusOf(it), view=safeUrl(it.viewUrl), apply=safeUrl(it.applyUrl), c=catInfo(catOf(it))||{};
  var closed=s.key==="closed";
  return '<article class="card'+(closed?" closed":"")+'">'+thumb(it)+
    '<div class="body"><p class="rg">📍 '+esc(it.region)+(isPick(it)?' <span class="pk">💜 추천</span>':'')+'</p><h3>'+esc(it.name)+'</h3><p class="bn">🎁 '+esc(it.benefit)+'</p>'+
    '<p class="pd">🗓️ '+(it.start?fmt(it.start)+' ':'')+'~ '+fmt(it.end)+' 모집 · '+esc(it.source||"")+'</p>'+
    '<div class="act">'+(view?'<a class="b pri" '+ext(view)+'>'+(catOf(it)==="stay"?"🏨 ":"🛒 ")+esc(c.view||"보기")+'</a>':'')+
      (closed?'<span class="b dis">🔒 마감</span>':(apply?'<a class="b sec" href="'+esc(apply)+'" target="_blank" rel="noopener noreferrer">✍️ 신청</a>':''))+'</div></div></article>';
}
function adWide(a){
  return '<a class="adw" style="background:'+esc(a.c||"#f4f0ff")+';border-color:'+esc(a.k||"#e6dcff")+'" '+ext(safeUrl(a.u))+'><span class="ae">'+esc(a.e||"🎁")+'</span><span class="at"><b>'+esc(a.t)+'</b><small>'+esc(a.d||"")+'</small></span><span class="ag">'+esc(a.b||"보러가기")+' ›</span></a>';
}
function banner(b){
  return '<a class="bnr" href="'+esc(b.href)+'"'+(b.ext?' target="_blank" rel="noopener noreferrer sponsored"':'')+' style="--bg:'+b.bg+';--tile:'+b.tile+';--ink:'+b.ink+'"><span class="bt">'+(b.em?'<span class="bem">'+b.em+'</span>':ico(b.icon))+'</span><span class="bx"><small>'+esc(b.kicker)+'</small><b>'+esc(b.title)+'</b></span>'+ico(I.chev,"bc")+'</a>';
}
function openItems(k){ return seed.items.filter(function(it){ return catOf(it)===k && statusOf(it).key==="open"; }); }
function kakaoUrl(){ return safeUrl(seed.kakao)||"http://pf.kakao.com/_xkqEFX/friend"; }

/* ---------- 홈 ---------- */
function featureBanners(){
  var f=seed.features||{}, out=[];
  out.push({href:"#/deals",em:"🎁",kicker:"하루만 이 가격",title:"오늘의 특가 보기 🔥",bg:"#fff0f0",tile:"#e5484d",ink:"#b42318",icon:I.gift});
  if(f.roulette) out.push({href:"#/benefit",em:"🎡",kicker:"하루 한 번 무료",title:"룰렛 돌리고 선물 받아가기 🎉",bg:"#f4f0ff",tile:"#6a3fc8",ink:"#4b2a9e",icon:I.wheel});
  if(f.quiz) out.push({href:"#/benefit",em:"🤔",kicker:"하루 한 문제",title:"인기상품 가격 맞히기",bg:"#fff3e6",tile:"#e0782a",ink:"#9a4a0e",icon:I.quiz});
  if(f.search) out.push({href:"#/benefit",em:"📈",kicker:"요즘 많이 찾는 숙소",title:"인기 검색어 보기",bg:"#eef3ff",tile:"#2f6bff",ink:"#1d4ed8",icon:I.trend});
  out.push({href:"#/list?s=closing",em:"⏰",kicker:"3일 안에 끝나요",title:"마감 임박 체험단 보기 🏃",bg:"#eef8f3",tile:"#1f7a5a",ink:"#14573f",icon:I.flame});
  return out;
}
function homeView(){
  var td=ymd(today());
  var closingToday=seed.items.filter(function(it){ return it.end===td && statusOf(it).key==="open"; }).sort(byDeadline);
  var h='';
  if(closingToday.length){
    var f=closingToday[0], img=safeUrl(f.image);
    h+='<a class="strip" href="#/list?s=todayClose">'+(img?'<img src="'+esc(img)+'" alt="">':'')+'<b>🚨 오늘 마감 '+closingToday.length+'곳! 자정 전에 신청하세요 ⏰</b>'+ico(I.chev)+'</a>';
  }
  h+=slideBanners(false);
  var banners=featureBanners(), bi=0, adi=0;
  CAT_ORDER.forEach(function(m){
    if(isOpenCat(m.k)){
      var list=openItems(m.k).sort(byDeadline), p=prefOf(PREF);
      h+='<section class="sec"><div class="sh"><h2><span class="ci em">'+m.em+'</span>'+esc(m.t)+' 체험단 <em>'+list.length+'</em></h2><a class="more" href="#/list?cat='+m.k+'&s=open">더보기'+ico(I.chev)+'</a></div>'+
        (p?'<p class="prefnote">'+esc(p.t)+' 먼저 보여드리는 중 · <button data-pref-clear>해제</button></p>':'')+
        '<div class="hs">'+list.slice(0,12).map(miniCard).join("")+'<a class="minimore" href="#/list?cat='+m.k+'&s=open">'+ico(I.chev)+'<span>전체 보기</span></a></div></section>';
    } else if(UPCOMING.some(function(u){ return u.k===m.k || u.t===m.t; })){
      h+='<section class="sec"><div class="sh"><h2><span class="ci em">'+m.em+'</span>'+esc(m.t)+' 체험단 <em class="soon">곧 오픈 ✨</em></h2></div>'+
        '<a class="soonbox" '+ext(kakaoUrl())+'><span>🛠️ 지금 체험단을 모으고 있어요</span><b>🔔 오픈 알림</b></a></section>';
    } else return;
    if(bi<banners.length){ h+='<div class="bwrap">'+banner(banners[bi++])+'</div>'; }
    else if(ADS.length){ h+='<div class="bwrap">'+adWide(ADS[adi++%ADS.length])+'</div>'; }
  });
  h+=contactBanner();
  h+='<a class="kakaobox" '+ext(kakaoUrl())+'><span><small>다꾸 <i>×</i> 카카오톡</small><b>☀️ 매일 아침 새 체험단<br><em>카톡으로 먼저 받기 💬</em></b></span><span class="kg">채널 추가</span></a>';
  return h;
}

/* ---------- 체험단 목록 ---------- */
var STATUSES=[["open","🔥 모집중"],["todayOpen","🆕 오늘 오픈"],["todayClose","🚨 오늘 마감"],["closing","⏰ 마감 임박"],["pick","💜 추천"],["closed","🔒 마감"]];
function listView(){
  var c=catInfo(state.cat);
  return '<div class="lv">'+
    '<label class="search">'+ico(I.search)+'<input id="q" type="search" placeholder="지역·숙소 이름 검색" value="'+esc(state.q)+'" autocomplete="off" aria-label="체험단 검색"></label>'+
    '<div class="catrow">'+CAT_ORDER.map(function(m){ var on=m.k===state.cat; return '<button class="cat'+(on?" on":"")+'" data-cat="'+m.k+'" aria-pressed="'+on+'"><span class="em">'+m.em+'</span>'+esc(m.t)+'</button>'; }).join("")+'</div>'+
    (c?'<div class="chips hs">'+STATUSES.map(function(s){ return '<button class="chip'+(s[0]===state.status?" on":"")+'" data-status="'+s[0]+'">'+s[1]+'</button>'; }).join("")+'</div>'+
      '<div class="tools"><span id="count" class="count"></span><span class="tr">'+
        (c.region?'<label class="sel"><span class="sr">지역</span><select id="region">'+["전체"].concat(REGIONS).map(function(r){ return '<option'+(r===state.region?" selected":"")+'>'+r+'</option>'; }).join("")+'</select></label>':'')+
        '<button class="viewbtn" data-view aria-label="보기 방식 바꾸기 (지금 '+state.view+'단)">'+viewIcon()+'</button></span></div>'+
      (PREF&&prefOf(PREF)?'<p class="prefnote">'+esc(prefOf(PREF).t)+' 먼저 보여드리는 중 · <button data-pref-clear>해제</button></p>':'')+
      '<div id="grid" class="grid v'+state.view+'"></div>'
    : soonView(catMeta(state.cat)))+
  '</div>';
}
function viewIcon(){
  if(state.view==="1") return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="4" rx="1.4"/><rect x="3" y="10" width="18" height="4" rx="1.4"/><rect x="3" y="16" width="18" height="4" rx="1.4"/></svg>';
  if(state.view==="3") return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="5" height="5" rx="1.3"/><rect x="9.5" y="3" width="5" height="5" rx="1.3"/><rect x="16" y="3" width="5" height="5" rx="1.3"/><rect x="3" y="9.5" width="5" height="5" rx="1.3"/><rect x="9.5" y="9.5" width="5" height="5" rx="1.3"/><rect x="16" y="9.5" width="5" height="5" rx="1.3"/><rect x="3" y="16" width="5" height="5" rx="1.3"/><rect x="9.5" y="16" width="5" height="5" rx="1.3"/><rect x="16" y="16" width="5" height="5" rx="1.3"/></svg>';
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>';
}
function soonView(m){
  return '<div class="soonbig"><span class="ci big em">'+m.em+'</span><b>'+esc(m.t)+' 체험단을 준비하고 있어요</b><p>열리는 날 카톡으로 가장 먼저 알려드릴게요.</p><a class="b kakao" '+ext(kakaoUrl())+'>💬 카톡으로 오픈 알림 받기</a></div>';
}
function filtered(){
  var q=state.q.trim().toLowerCase(), td=ymd(today()), c=catInfo(state.cat);
  return seed.items.filter(function(it){
    if(catOf(it)!==state.cat) return false;
    if(c&&c.region && state.region!=="전체" && it.region!==state.region) return false;
    var s=statusOf(it).key;
    if(state.status==="open" && s!=="open") return false;
    if(state.status==="closed" && s!=="closed") return false;
    if(state.status==="todayOpen" && !(it.start===td && s!=="closed")) return false;
    if(state.status==="pick" && !(isPick(it) && s!=="closed")) return false;
    if(state.status==="todayClose" && !(it.end===td && s==="open")) return false;
    if(state.status==="closing" && !(s==="open" && daysLeft(it)<=3)) return false;
    if(q){ var hay=(it.name+" "+it.region+" "+it.benefit).toLowerCase(); if(hay.indexOf(q)<0) return false; }
    return true;
  }).sort(state.status==="closed"?function(a,b){ return (b.createdAt||0)-(a.createdAt||0); }:byDeadline);
}
function renderListGrid(){
  var g=document.getElementById("grid"); if(!g) return;
  var list=filtered(), n=0, out=[];
  var cnt=document.getElementById("count"); if(cnt) cnt.innerHTML='<b>'+list.length+'</b>곳';
  list.forEach(function(it,i){
    out.push(state.view==="3"?miniCard(it,true):fullCard(it));
    var every=state.view==="3"?9:(state.view==="1"?5:6);
    if((i+1)%every===0 && ADS.length) out.push('<div class="span">'+adWide(ADS[n++%ADS.length])+'</div>');
  });
  g.innerHTML=list.length?out.join(""):'<div class="empty span"><b>🥲 조건에 맞는 체험단이 없어요</b>다른 지역이나 상태를 골라 보세요.</div>';
}


/* ---------- 맞춤 추천 (이 브라우저 안에서만 계산, 서버로 보내지 않음) ---------- */
var SEEN=[]; try{ SEEN=JSON.parse(ls("dakku-seen")||"[]")||[]; }catch(e){ SEEN=[]; }
function markSeen(id){ if(!id) return; var i=SEEN.indexOf(id); if(i>=0) SEEN.splice(i,1); SEEN.unshift(id); SEEN=SEEN.slice(0,30); ls("dakku-seen",JSON.stringify(SEEN)); }
function typesOf(it){ var t=String(it.name||"")+" "+String(it.benefit||""); return PREFS.filter(function(p){ return p.re.test(t); }).map(function(p){ return p.k; }); }
function recommend(limit){
  var byId={}; seed.items.forEach(function(it){ byId[it.id]=it; });
  var signal=FAV.concat(SEEN).map(function(id){ return byId[id]; }).filter(Boolean);
  var reg={}, typ={};
  signal.forEach(function(it){ reg[it.region]=(reg[it.region]||0)+1; typesOf(it).forEach(function(k){ typ[k]=(typ[k]||0)+1; }); });
  if(PREF) typ[PREF]=(typ[PREF]||0)+3;
  var topReg=Object.keys(reg).sort(function(x,y){ return reg[y]-reg[x]; })[0];
  var topTyp=Object.keys(typ).sort(function(x,y){ return typ[y]-typ[x]; })[0];
  var personal=!!(topReg||topTyp);
  var pool=seed.items.filter(function(it){ return statusOf(it).key==="open" && !isFav(it.id); });
  pool.forEach(function(it){
    var s=0, why="";
    var tt=typesOf(it);
    if(topTyp && tt.indexOf(topTyp)>=0){ s+=5; why=(prefOf(topTyp)||{}).t.split(" ·")[0]+" 취향 맞춤"; }
    if(topReg && it.region===topReg){ s+=3; if(!why) why=topReg+" 체험단을 자주 보셔서"; }
    tt.forEach(function(k){ if(typ[k]) s+=Math.min(typ[k],3); });
    if(isPick(it)){ s+=1.5; if(!why) why="다꾸 추천"; }
    var d=daysLeft(it); if(d<=3){ s+=1; if(!why) why="곧 마감돼요"; }
    if(SEEN.indexOf(it.id)>=0) s-=2;
    it._score=s; it._why=why||"지금 모집중";
  });
  pool.sort(function(x,y){ return y._score-x._score || daysLeft(x)-daysLeft(y); });
  return {personal:personal, list:pool.slice(0,limit||6)};
}
function recoSection(title){
  var r=recommend(6); if(!r.list.length) return '';
  return '<section class="reco"><h2>'+esc(title||(r.personal?"💜 이런 체험단은 어때요?":"💜 다꾸가 추천하는 체험단"))+'</h2><p class="recosub">'+(r.personal?'찜하고 둘러본 체험단을 바탕으로 골랐어요':'지금 인기 있는 체험단과 곧 마감되는 곳을 골랐어요')+'</p>'+
    '<div class="grid v2">'+r.list.map(function(it){ return '<div class="recocard"><span class="why">'+esc(it._why)+'</span>'+fullCard(it)+'</div>'; }).join("")+'</div></section>';
}

/* ---------- 찜 ---------- */
function favView(){
  var list=seed.items.filter(function(it){ return isFav(it.id); }).sort(function(a,b){ var sa=statusOf(a).key==="closed", sb=statusOf(b).key==="closed"; if(sa!==sb) return sa?1:-1; return daysLeft(a)-daysLeft(b); });
  var soon=list.filter(function(it){ return statusOf(it).key==="open" && daysLeft(it)<=3; }).length;
  return '<div class="pg"><h1>찜 ❤️</h1>'+(soon?'<p class="note">⏰ 찜한 체험단 중 <b>'+soon+'곳</b>이 3일 안에 마감돼요</p>':'')+
    (list.length?'<div class="grid v1">'+list.map(fullCard).join("")+'</div>'+recoSection("💜 찜한 곳과 비슷한 체험단"):'<div class="empty sm"><b>🤍 아직 찜한 체험단이 없어요</b>마음에 드는 체험단의 하트를 눌러 보세요.</div>'+recoSection())+'</div>';
}

/* ---------- 혜택 ---------- */
function benefitView(){
  var gold=null; DEALS.forEach(function(d){ if(!gold && /골드박스/.test(d.t||"")) gold=d; }); gold=gold||DEALS[0];
  var rows=[];
  if(gold&&safeUrl(gold.u)) rows.push({u:safeUrl(gold.u),tag:"🔥",bg:"#fff3c4",ink:"#7a5a00",sub:"매일 바뀌는 생활 특가",t:"오늘의 특가상품 보기"});
  (Array.isArray(seed.partners)?seed.partners:[]).forEach(function(p){ if(safeUrl(p.u)) rows.push({u:safeUrl(p.u),tag:p.tag||"특가",bg:p.bg||"#f4f0ff",ink:p.ink||"#4b2a9e",sub:p.sub||"",t:p.t}); });
  var h='<div class="pg"><h1>혜택 🎁</h1>'+slideBanners(true);
  if(rows.length) h+='<div class="pane"><h2>⚡ 오늘의 특가 바로가기</h2>'+rows.map(function(r){ return '<a class="lrow" '+ext(r.u)+'><span class="tg" style="background:'+esc(r.bg)+';color:'+esc(r.ink)+'">'+esc(r.tag)+'</span><span class="lt"><small>'+esc(r.sub)+'</small><b>'+esc(r.t)+'</b></span><span class="go">보기</span></a>'; }).join("")+'</div>';
  if((seed.features||{}).roulette) h+=rouletteHtml();
  var GOLD=(Array.isArray(seed.goldbox)?seed.goldbox:[]).filter(function(x){ return safeUrl(x.u); });
  if(GOLD.length) h+='<section class="sec tossec"><div class="sh"><h2>⏰ 오늘의 골드박스</h2>'+(seed.goldboxUpdated?'<span class="upd">'+esc(seed.goldboxUpdated)+' 기준</span>':'')+'</div><p class="tdis">이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p><div class="tgrid">'+GOLD.map(tossCard).join("")+'</div><p class="fine">가격과 할인은 판매처 사정에 따라 바뀔 수 있어요.</p></section>';
  var TOSS=(Array.isArray(seed.toss)?seed.toss:[]).filter(function(x){ return safeUrl(x.u); });
  if(TOSS.length) h+='<section class="sec tossec"><div class="sh"><h2>🛒 오늘의 하루특가</h2>'+(seed.tossUpdated?'<span class="upd">'+esc(fmt(seed.tossUpdated))+' 기준</span>':'')+'</div><p class="tdis">[광고] 이 콘텐츠는 토스쇼핑 쉐어링크 활동의 일환으로, 링크를 통한 구매가 발생하면 일정 수수료를 지급받습니다.</p><div class="tgrid">'+TOSS.slice(0,10).map(tossCard).join("")+'</div><p class="fine">가격과 할인은 판매처 사정에 따라 바뀔 수 있어요.</p></section>';
  h+='<div class="duo"><a class="bigbtn" href="#/deals"><span class="gb">'+ico(I.gift)+'</span><span><b>더 큰 혜택 바로가기 🎉</b><small>하루만 열리는 특가 모음</small></span></a>'+
     '<button class="sharebtn" data-share>'+ico(I.share)+'<span>친구에게 공유하기</span></button></div>';
  h+='<div class="pane soonpane"><h2>🎈 곧 열리는 놀거리</h2>'+
     ((seed.features||{}).roulette?[]:[["행운 룰렛","하루 한 번 돌리고 간식 쿠폰 받기",I.wheel]]).concat([["🤔 숙소 가격 맞히기","하루 한 문제, 가격 감각 테스트",I.quiz],["📈 요즘 뜨는 검색어","많이 찾는 숙소 검색어 모아보기",I.trend]]).map(function(x){ return '<div class="srow"><span class="si">'+ico(x[2])+'</span><span class="lt"><b>'+x[0]+'</b><small>'+x[1]+'</small></span><span class="pill">준비 중</span></div>'; }).join("")+
     '<a class="b kakao" '+ext(kakaoUrl())+'>💬 열리면 카톡으로 알림 받기</a></div>';
  return h+'</div>';
}

function tossCard(x){
  var img=safeUrl(x.img);
  return '<a class="tcard'+(img?'':' noimg')+'" '+ext(safeUrl(x.u))+'><span class="tim">'+(img?'<img src="'+esc(img)+'" alt="'+esc(x.name)+'" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">':'<span class="tno">'+ico(I.gift)+'</span>')+(x.badge?'<em>'+esc(x.badge)+'</em>':'')+'</span>'+
    '<span class="tn">'+esc(x.name)+'</span>'+(x.price?'<span class="tp">'+(x.rate?'<i>'+esc(x.rate)+'</i> ':'')+esc(x.price)+'</span>':'<span class="tgo">특가 확인하기 ›</span>')+(x.ship?'<span class="tch">'+esc(x.ship)+'</span>':'')+'</a>';
}

/* ---------- 간식 룰렛 (하루 1회, 하루 경품 총 1개 · 선착순 코드) ---------- */
var WHEEL_SVG="<svg class=\"wheel\" id=\"wheel\" viewBox=\"0 0 300 300\" role=\"img\" aria-label=\"간식 룰렛: 아메리카노, 츄파춥스, 딸기우유, 카페라떼, 새콤달콤, 초코우유, 다음 기회에 2칸\"><circle cx=\"150\" cy=\"150\" r=\"148\" fill=\"#6a3fc8\"/><path d=\"M150 150L150.0 14.0A136 136 0 0 1 246.2 53.8Z\" fill=\"#f4f0ff\"/><g transform=\"rotate(22.5 150 150)\"><text x=\"150\" y=\"42\" text-anchor=\"middle\" font-size=\"12\" font-weight=\"700\" fill=\"#4b2a9e\">아메리카노</text><g transform=\"translate(150 80)\"><path d=\"M3 -31 L1 -17\" stroke=\"#e5484d\" stroke-width=\"2.6\" stroke-linecap=\"round\"/><path d=\"M-13 -16 H13 L10 21 H-10Z\" fill=\"#ffffff\" stroke=\"#c9b8f5\" stroke-width=\"1.2\"/><path d=\"M-12.2 -7 H12.2 L10 21 H-10Z\" fill=\"#4a2a14\"/><rect x=\"-8\" y=\"-4\" width=\"7\" height=\"7\" rx=\"1.6\" fill=\"#ffffff\" fill-opacity=\"0.5\"/><rect x=\"1.5\" y=\"1\" width=\"6.5\" height=\"6.5\" rx=\"1.6\" fill=\"#ffffff\" fill-opacity=\"0.4\"/><path d=\"M-15 -20 H15 V-16 H-15Z\" fill=\"#e6e0f5\"/></g></g><path d=\"M150 150L246.2 53.8A136 136 0 0 1 286.0 150.0Z\" fill=\"#ffffff\"/><g transform=\"rotate(67.5 150 150)\"><text x=\"150\" y=\"42\" text-anchor=\"middle\" font-size=\"12\" font-weight=\"700\" fill=\"#4b2a9e\">츄파춥스</text><g transform=\"translate(150 80)\"><path d=\"M0 4 V25\" stroke=\"#d8d0c0\" stroke-width=\"3.2\" stroke-linecap=\"round\"/><circle cx=\"0\" cy=\"-8\" r=\"14\" fill=\"#ff7a3d\"/><path d=\"M0 -8 m-10 0 a10 10 0 0 1 20 0 a6.5 6.5 0 0 1 -13 0 a3.2 3.2 0 0 1 6.4 0\" fill=\"none\" stroke=\"#ffd85a\" stroke-width=\"2.6\" stroke-linecap=\"round\"/><circle cx=\"-6\" cy=\"-15\" r=\"3\" fill=\"#ffffff\" fill-opacity=\"0.55\"/></g></g><path d=\"M150 150L286.0 150.0A136 136 0 0 1 246.2 246.2Z\" fill=\"#f2f2f5\"/><g transform=\"rotate(112.5 150 150)\"><text x=\"150\" y=\"42\" text-anchor=\"middle\" font-size=\"12\" font-weight=\"700\" fill=\"#9a98a6\">다음 기회에</text><g transform=\"translate(150 80)\"><rect x=\"-14\" y=\"-5\" width=\"28\" height=\"22\" rx=\"3\" fill=\"#dedce6\"/><rect x=\"-16\" y=\"-12\" width=\"32\" height=\"8\" rx=\"2\" fill=\"#cfccd9\"/><rect x=\"-2.5\" y=\"-12\" width=\"5\" height=\"29\" fill=\"#a9a6b4\"/></g></g><path d=\"M150 150L246.2 246.2A136 136 0 0 1 150.0 286.0Z\" fill=\"#ffffff\"/><g transform=\"rotate(157.5 150 150)\"><text x=\"150\" y=\"42\" text-anchor=\"middle\" font-size=\"12\" font-weight=\"700\" fill=\"#4b2a9e\">딸기우유</text><g transform=\"translate(150 80)\"><path d=\"M-11 -11 L-6 -21 H6 L11 -11Z\" fill=\"#ffd6e0\"/><rect x=\"-11\" y=\"-11\" width=\"22\" height=\"32\" rx=\"2\" fill=\"#ff9fb8\"/><rect x=\"-11\" y=\"-2\" width=\"22\" height=\"16\" fill=\"#ffffff\"/><path d=\"M0 1 c4 0 6 3 4 8 c-1 3 -3 4 -4 4 c-1 0 -3 -1 -4 -4 c-2 -5 0 -8 4 -8Z\" fill=\"#e5484d\"/><path d=\"M-3 1 L0 3 L3 1 L0 -1Z\" fill=\"#2f9e5a\"/></g></g><path d=\"M150 150L150.0 286.0A136 136 0 0 1 53.8 246.2Z\" fill=\"#f4f0ff\"/><g transform=\"rotate(202.5 150 150)\"><text x=\"150\" y=\"42\" text-anchor=\"middle\" font-size=\"12\" font-weight=\"700\" fill=\"#4b2a9e\">카페라떼</text><g transform=\"translate(150 80)\"><path d=\"M-13 -14 H13 L10 21 H-10Z\" fill=\"#ffffff\" stroke=\"#d9cffb\" stroke-width=\"1.2\"/><path d=\"M-12 -1 H12 L11 11 H-11Z\" fill=\"#b07a4a\"/><path d=\"M-16 -20 H16 L14 -14 H-14Z\" fill=\"#5b3b27\"/><rect x=\"-9\" y=\"-24\" width=\"18\" height=\"4.5\" rx=\"2\" fill=\"#5b3b27\"/></g></g><path d=\"M150 150L53.8 246.2A136 136 0 0 1 14.0 150.0Z\" fill=\"#ffffff\"/><g transform=\"rotate(247.5 150 150)\"><text x=\"150\" y=\"42\" text-anchor=\"middle\" font-size=\"12\" font-weight=\"700\" fill=\"#4b2a9e\">새콤달콤</text><g transform=\"translate(150 80)\"><path d=\"M-9 -22 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 V22 l-3 -3 l-3 3 l-3 -3 l-3 3 l-3 -3 l-3 3Z\" fill=\"#ffe14d\"/><rect x=\"-9\" y=\"-7\" width=\"18\" height=\"14\" fill=\"#ff5a7a\"/><circle cx=\"0\" cy=\"0\" r=\"4\" fill=\"#ffffff\"/></g></g><path d=\"M150 150L14.0 150.0A136 136 0 0 1 53.8 53.8Z\" fill=\"#f2f2f5\"/><g transform=\"rotate(292.5 150 150)\"><text x=\"150\" y=\"42\" text-anchor=\"middle\" font-size=\"12\" font-weight=\"700\" fill=\"#9a98a6\">다음 기회에</text><g transform=\"translate(150 80)\"><rect x=\"-14\" y=\"-5\" width=\"28\" height=\"22\" rx=\"3\" fill=\"#dedce6\"/><rect x=\"-16\" y=\"-12\" width=\"32\" height=\"8\" rx=\"2\" fill=\"#cfccd9\"/><rect x=\"-2.5\" y=\"-12\" width=\"5\" height=\"29\" fill=\"#a9a6b4\"/></g></g><path d=\"M150 150L53.8 53.8A136 136 0 0 1 150.0 14.0Z\" fill=\"#ffffff\"/><g transform=\"rotate(337.5 150 150)\"><text x=\"150\" y=\"42\" text-anchor=\"middle\" font-size=\"12\" font-weight=\"700\" fill=\"#4b2a9e\">초코우유</text><g transform=\"translate(150 80)\"><path d=\"M-11 -11 L-6 -21 H6 L11 -11Z\" fill=\"#c9a07e\"/><rect x=\"-11\" y=\"-11\" width=\"22\" height=\"32\" rx=\"2\" fill=\"#7a4a2c\"/><rect x=\"-11\" y=\"-2\" width=\"22\" height=\"16\" fill=\"#f6ead9\"/><path d=\"M0 0 c3 4 5 6 5 8 a5 5 0 0 1 -10 0 c0 -2 2 -4 5 -8Z\" fill=\"#7a4a2c\"/></g></g><circle cx=\"150.0\" cy=\"8.0\" r=\"2.6\" fill=\"#ffffff\"/><circle cx=\"204.3\" cy=\"18.8\" r=\"2.6\" fill=\"#ffffff\"/><circle cx=\"250.4\" cy=\"49.6\" r=\"2.6\" fill=\"#ffffff\"/><circle cx=\"281.2\" cy=\"95.7\" r=\"2.6\" fill=\"#ffffff\"/><circle cx=\"292.0\" cy=\"150.0\" r=\"2.6\" fill=\"#ffffff\"/><circle cx=\"281.2\" cy=\"204.3\" r=\"2.6\" fill=\"#ffffff\"/><circle cx=\"250.4\" cy=\"250.4\" r=\"2.6\" fill=\"#ffffff\"/><circle cx=\"204.3\" cy=\"281.2\" r=\"2.6\" fill=\"#ffffff\"/><circle cx=\"150.0\" cy=\"292.0\" r=\"2.6\" fill=\"#ffffff\"/><circle cx=\"95.7\" cy=\"281.2\" r=\"2.6\" fill=\"#ffffff\"/><circle cx=\"49.6\" cy=\"250.4\" r=\"2.6\" fill=\"#ffffff\"/><circle cx=\"18.8\" cy=\"204.3\" r=\"2.6\" fill=\"#ffffff\"/><circle cx=\"8.0\" cy=\"150.0\" r=\"2.6\" fill=\"#ffffff\"/><circle cx=\"18.8\" cy=\"95.7\" r=\"2.6\" fill=\"#ffffff\"/><circle cx=\"49.6\" cy=\"49.6\" r=\"2.6\" fill=\"#ffffff\"/><circle cx=\"95.7\" cy=\"18.8\" r=\"2.6\" fill=\"#ffffff\"/></svg>";
var ROULETTE=[
  {t:"아메리카노",c:"A",p:0.2},{t:"츄파춥스",c:"C",p:0.4},{t:"다음 기회에",c:"",p:0},{t:"딸기우유",c:"B",p:0.4},
  {t:"카페라떼",c:"L",p:0.2},{t:"새콤달콤",c:"S",p:0.4},{t:"다음 기회에",c:"",p:0},{t:"초코우유",c:"H",p:0.4}
];
function spinState(){ try{ var s=JSON.parse(ls("dakku-spin")||"null"); if(s&&s.d===ymd(today())) return s; }catch(e){} return null; }
function ym(d){ return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2); }
function wonThisMonth(){ try{ var w=JSON.parse(ls("dakku-win")||"null"); if(w&&w.m===ym(today())) return w; }catch(e){} return null; }
function nextMonthLabel(){ var t=today(); return ((t.getMonth()+1)%12+1)+"월 1일"; }
function oddsList(){ var o=(seed.features&&seed.features.rouletteOdds)||null; return ROULETTE.map(function(r){ return {t:r.t,c:r.c,p:(o&&o[r.t]!=null)?+o[r.t]:r.p}; }); }
function rouletteHtml(){
  var s=spinState(), w=wonThisMonth(), rot=s?s.rot:0, locked=!!(s||w);
  var btnTxt=s&&ROULETTE[s.i].c||(!s&&w)?'이번 달은 끝! '+nextMonthLabel()+'에 다시 돌려요':(s?'오늘은 끝! 내일 또 돌려요 👋':'🎡 룰렛 돌리기');
  return '<section class="roul" id="roulette"><small>🎡 하루 한 번, 행운 룰렛</small><h2>오늘은 내가 주인공? 👑</h2><p>룰렛 돌리고 간식 쿠폰 챙겨가세요 ☕🍭🥛</p>'+
    '<div class="wbox"><svg class="pin" viewBox="0 0 26 30" aria-hidden="true"><path d="M13 30 1 6a12 12 0 0 1 24 0Z" fill="#1c1b22"/><circle cx="13" cy="9" r="4" fill="#fff"/></svg>'+
    WHEEL_SVG.replace('id="wheel"','id="wheel" style="transform:rotate('+rot+'deg)"')+'<span class="hub">다꾸</span></div>'+
    '<div id="rres">'+(s?resultHtml(s):(w?'<div class="rres win"><b>이번 달 당첨을 축하해요!</b><span>당첨되면 다음 달에 다시 참여할 수 있어요.<br>'+nextMonthLabel()+'부터 다시 돌릴 수 있어요.</span></div>':''))+'</div>'+
    '<button class="b pri wide" id="spin" data-spin'+(locked?' disabled':'')+'>'+btnTxt+'</button>'+
    '<p class="rnote">하루 한 번 · 꽝이면 내일 다시, 당첨되면 다음 달에 다시 돌릴 수 있어요</p>'+
    '<details class="rules"><summary>이벤트 유의사항</summary>'+rulesHtml()+'</details></section>';
}
function resultHtml(s){
  var r=ROULETTE[s.i];
  if(!r.c) return '<div class="rres lose"><b>😢 아쉬워요, 다음 기회에!</b><span>내일 다시 돌릴 수 있어요.</span></div>';
  return '<div class="rres win"><b>🎉 축하해요! '+esc(r.t)+' 당첨</b><span>오늘 경품은 <em>선착순 1명</em>이에요. 다음 참여는 '+nextMonthLabel()+'부터예요.<br>다꾸 카톡 채널로 아래 코드를 가장 먼저 보내주신 분께 쿠폰을 보내드려요.</span>'+
    '<code>'+esc(s.code)+'</code><a class="b kakao" href="http://pf.kakao.com/_xkqEFX/chat" target="_blank" rel="noopener noreferrer">💬 카톡으로 코드 보내고 쿠폰 받기</a><button class="copy" data-copy="'+esc(s.code)+'">코드 복사</button></div>';
}
function rulesHtml(){
  var odds=oddsList(), lose=100-odds.reduce(function(a,r){ return a+(r.c?r.p:0); },0);
  return '<ul>'+
    '<li><b>이벤트 기간</b> 오픈일부터 마감 공지 시까지</li>'+
    '<li><b>참여 방법</b> 누구나 하루 1회 룰렛 참여 (쇼핑이나 링크 클릭과 관계없어요). 꽝이면 다음 날 다시, 당첨되면 다음 달 1일부터 다시 참여할 수 있어요.</li>'+
    '<li><b>경품</b> 아메리카노, 카페라떼, 츄파춥스, 새콤달콤, 딸기우유, 초코우유 모바일 쿠폰 중 당첨된 1개</li>'+
    '<li><b>경품 수량</b> 모든 경품을 합쳐 <b>하루 총 1개</b>예요. 당일 당첨 코드를 다꾸 카카오톡 채널로 가장 먼저 보낸 1명에게만 지급되고, 그 뒤에 받은 코드는 당일 수량 소진으로 지급되지 않아요.</li>'+
    '<li><b>당첨 확률 (1회 기준)</b> '+odds.filter(function(r){ return r.c; }).map(function(r){ return esc(r.t)+' '+r.p+'%'; }).join(', ')+', 다음 기회에 '+(Math.round(lose*10)/10)+'%</li>'+
    '<li><b>코드 유효기간</b> 당첨된 날 23시 59분까지 보낸 코드만 인정돼요.</li>'+
    '<li><b>중복 참여</b> 하루 한 번만 돌릴 수 있어요. 같은 사람이 여러 기기·브라우저로 참여하거나, 한 카카오톡 계정으로 하루 2개 이상 코드를 보내면 모두 무효예요. 경품은 같은 카카오톡 계정 기준 한 달에 1번만 받을 수 있어요. 코드를 바꾸거나 위조한 경우도 무효예요.</li>'+
    '<li><b>경품 발송</b> 코드를 확인한 뒤 다꾸 카카오톡 채널로 7일 이내에 보내드려요. 사정에 따라 같은 가격대의 다른 상품으로 바뀔 수 있어요.</li>'+
    '<li><b>개인정보</b> 사이트에서는 개인정보를 받지 않아요. 쿠폰 발송은 카카오톡 채널 대화로만 진행해요.</li>'+
    '<li>이벤트 내용은 사전 공지 후 바뀌거나 끝날 수 있어요.</li></ul>';
}
function rid(){ var A="ABCDEFGHJKMNPQRSTUVWXYZ23456789", s=""; for(var i=0;i<4;i++) s+=A.charAt(Math.floor(Math.random()*A.length)); return s; }
function doSpin(btn){
  if(wonThisMonth()){ toast("이번 달은 이미 당첨됐어요. "+nextMonthLabel()+"에 다시 만나요!"); return; }
  if(spinState()){ toast("오늘은 이미 돌렸어요. 내일 또 만나요!"); return; }
  var odds=oddsList(), x=Math.random()*100, acc=0, pick=-1;
  for(var i=0;i<odds.length;i++){ if(!odds[i].c) continue; acc+=odds[i].p; if(x<acc){ pick=i; break; } }
  if(pick<0) pick=Math.random()<0.5?2:6;
  var t=today(), md=("0"+(t.getMonth()+1)).slice(-2)+("0"+t.getDate()).slice(-2);
  var center=pick*45+22.5+(Math.random()*24-12), rot=1800+(360-center);
  var s={d:ymd(t),i:pick,rot:rot,code:ROULETTE[pick].c?("DAKKU-"+md+"-"+ROULETTE[pick].c+"-"+rid()):""};
  ls("dakku-spin",JSON.stringify(s)); if(s.code) ls("dakku-win",JSON.stringify({m:ym(t),code:s.code}));
  btn.disabled=true; btn.textContent="돌아가는 중…";
  var w=document.getElementById("wheel"); if(w){ w.style.transform="rotate("+rot+"deg)"; }
  var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  setTimeout(function(){ var r=document.getElementById("rres"); if(r) r.innerHTML=resultHtml(s); btn.textContent=s.code?"이번 달은 끝! "+nextMonthLabel()+"에 다시 돌려요":"오늘은 끝! 내일 또 돌려요"; }, reduce?100:3400);
}


/* ---------- 다꾸 기자단 (매달 1일~말일) ---------- */
function rep(){ var r=seed.reporter; return (r&&r.on)?r:null; }
function monthRange(){ var t=today(), y=t.getFullYear(), m=t.getMonth(), last=new Date(y,m+1,0).getDate(); return {m:m+1,last:last,left:last-t.getDate()}; }
function voucherSvg(cls){
  return '<svg class="'+cls+'" viewBox="0 0 120 84" aria-hidden="true">'+
    '<path d="M10 6h100a6 6 0 0 1 6 6v18a12 12 0 0 0 0 24v18a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V54a12 12 0 0 0 0-24V12a6 6 0 0 1 6-6Z" fill="#ffd84d"/>'+
    '<path d="M10 6h100a6 6 0 0 1 6 6v6H4v-6a6 6 0 0 1 6-6Z" fill="#ffe680"/>'+
    '<path d="M40 8v68" stroke="#e8b400" stroke-width="2" stroke-dasharray="4 4"/>'+
    '<rect x="16" y="6" width="10" height="72" fill="#6a3fc8"/>'+
    '<path d="M21 32c-9-11-19-5-12 3 3 3 8 3 12-3Zm0 0c9-11 19-5 12 3-3 3-8 3-12-3Z" fill="#8b5cf6" stroke="#4b2a9e" stroke-width="1.6"/><circle cx="21" cy="33" r="3.4" fill="#4b2a9e"/>'+
    '<text x="79" y="36" text-anchor="middle" font-size="10" font-weight="700" fill="#7a5a00" font-family="Noto Sans KR,sans-serif">상품권</text>'+
    '<text x="79" y="56" text-anchor="middle" font-size="17" font-weight="900" fill="#3d2e00" font-family="Noto Sans KR,sans-serif">1만원</text>'+
  '</svg>';
}

/* ---------- 슬라이드 배너 (기자단 · 태그 이벤트) ---------- */
function giftSvg(){
  return '<svg class="giftimg" viewBox="0 0 120 110" aria-hidden="true">'+
    '<circle cx="18" cy="22" r="3" fill="#ffd84d"/><circle cx="104" cy="14" r="2.4" fill="#ff8fb1"/><path d="M100 40l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#ffd84d"/><path d="M14 58l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6Z" fill="#c9b8ff"/>'+
    '<rect x="24" y="52" width="72" height="50" rx="6" fill="#ff5a7a"/>'+
    '<rect x="20" y="40" width="80" height="16" rx="5" fill="#ff7b95"/>'+
    '<rect x="53" y="40" width="14" height="62" fill="#ffd84d"/>'+
    '<path d="M60 40c-14-18-30-10-22-1 5 5 14 4 22 1Zm0 0c14-18 30-10 22-1-5 5-14 4-22 1Z" fill="#ffd84d" stroke="#e8b400" stroke-width="2"/>'+
    '<rect x="24" y="56" width="72" height="4" fill="#e04565" opacity=".5"/>'+
    '<g transform="translate(78 70) rotate(10)"><rect x="0" y="0" width="34" height="22" rx="11" fill="#fff"/><text x="17" y="15.5" text-anchor="middle" font-size="12" font-weight="900" fill="#6a3fc8" font-family="Noto Sans KR,sans-serif">@다꾸</text></g>'+
  '</svg>';
}
function tagBanner(){
  var s=seed.sns||{}, ig=safeUrl(s.instagram), bl=safeUrl(s.blog);
  return '<div class="tagb"><span class="rx"><small>📸 다꾸 태그하기 이벤트</small><b>다꾸에서 발견한 체험단에<br>선정되면 다꾸를 태그해 주세요!</b><span class="tsub">🍀 태그해 주시면 다꾸 기자단 선정 확률 UP!</span>'+
    '<span class="tbtns"><a class="igbtn" href="'+esc(ig||"https://www.instagram.com/")+'" target="_blank" rel="noopener noreferrer">📸 인스타그램 바로가기 ›</a>'+(bl?'<a href="'+esc(bl)+'" target="_blank" rel="noopener noreferrer">블로그 ›</a>':'')+'</span>'+
    '</span>'+giftSvg()+'</div>';
}
function slideBanners(inPage){
  var slides=[]; if(rep()) slides.push(reporterBanner()); slides.push(tagBanner());
  return '<div class="slider'+(inPage?' inpage':'')+'" data-slider><div class="strack">'+slides.map(function(s){ return '<div class="slide">'+s+'</div>'; }).join("")+'</div>'+
    (slides.length>1?'<div class="sdots">'+slides.map(function(_,i){ return '<button data-dot="'+i+'" aria-label="'+(i+1)+'번째 배너"'+(i===0?' class="on"':'')+'></button>'; }).join("")+'</div>':'')+'</div>';
}
var slideT;
function startSliders(){
  clearInterval(slideT);
  var sl=document.querySelector("[data-slider]"); if(!sl) return;
  var tr=sl.querySelector(".strack"), dots=sl.querySelectorAll("[data-dot]"), n=tr.children.length; if(n<2) return;
  function idx(){ return Math.round(tr.scrollLeft/tr.clientWidth); }
  function paint(){ var i=idx(); [].forEach.call(dots,function(d,k){ d.classList.toggle("on",k===i); }); }
  tr.addEventListener("scroll",function(){ clearTimeout(tr._t); tr._t=setTimeout(paint,80); },{passive:true});
  [].forEach.call(dots,function(d){ d.addEventListener("click",function(){ tr.scrollTo({left:tr.clientWidth*(+d.dataset.dot),behavior:"smooth"}); }); });
  var hold=false; tr.addEventListener("pointerdown",function(){ hold=true; }); tr.addEventListener("pointerup",function(){ setTimeout(function(){ hold=false; },3000); });
  if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  slideT=setInterval(function(){ if(hold||!document.body.contains(tr)) return; var i=(idx()+1)%n; tr.scrollTo({left:tr.clientWidth*i,behavior:"smooth"}); },4500);
}

function reporterBanner(){
  var r=rep(); if(!r) return '';
  var mr=monthRange();
  return '<a class="repb" href="#/reporter"><span class="rx"><small>✍️ 다꾸 기자단 · '+mr.m+'월 모집중</small><b>다꾸 체험단 후기를<br>블로그에 올려주세요!</b><span class="rsub">🎁 1만원 상품권 증정</span><span class="rgo">🙋 지금 바로 신청하기'+ico(I.chev)+'</span></span>'+voucherSvg("vch")+'</a>';
}
function reporterView(){
  var r=rep(); if(!r) return '<div class="empty"><b>지금은 모집 기간이 아니에요</b><a class="b pri" href="#/">홈으로</a></div>';
  var mr=monthRange(), apply=safeUrl(r.applyUrl)||"http://pf.kakao.com/_xkqEFX/friend";
  var kw=(r.keywords||["#다꾸체험단","#체험단모아보기"]);
  return '<div class="pg rep">'+
    '<a class="back" href="#/">'+ico(I.back)+'<span>홈</span></a>'+
    '<div class="rephero"><small>✍️ 다꾸 기자단 · 블로그 체험단</small><h1>다꾸 체험단 후기를<br>블로그에 올려주세요!</h1><p>올려주신 분께 <em>1만원 상품권</em>을 드려요.</p>'+voucherSvg("vch big")+'</div>'+
    '<div class="pane info">'+
      '<div class="ir"><span>제공 내역</span><b>'+esc(r.reward||"1만원 모바일 상품권")+'</b></div>'+
      '<div class="ir"><span>모집 기간</span><b>'+mr.m+'월 1일 ~ '+mr.m+'월 '+mr.last+'일 <em>'+(mr.left===0?'오늘 마감':'D-'+mr.left)+'</em></b></div>'+
      '<div class="ir"><span>모집 일정</span><b>매달 1일부터 말일까지</b></div>'+
      '<div class="ir"><span>신청 방법</span><b>블로그 주소로 신청</b></div>'+
      (r.slots?'<div class="ir"><span>선정 인원</span><b>매달 '+esc(r.slots)+'명</b></div>':'')+
    '</div>'+
    '<section class="guide"><h2>📝 포스팅 가이드</h2><ol>'+
      '<li><b>필수 키워드</b> '+kw.map(function(k){ return '<span class="kw">'+esc(k)+'</span>'; }).join(" ")+'</li>'+
      '<li><b>분량</b> 공백 제외 <b>1,000자 이상</b></li>'+
      '<li><b>내용</b> 다꾸 체험단 모음 사이트를 소개해 주세요. 어떤 체험단을 볼 수 있는지, 써보니 어떤 점이 편했는지 솔직하게 써 주시면 돼요.</li>'+
      '<li><b>사이트 링크</b> 글 안에 <b>dagguu.github.io</b> 링크를 꼭 넣어 주세요.</li>'+
      '<li><b>사진</b> <b>10장 이상</b> (사이트 화면 캡처 포함)</li>'+
      '<li><b>동영상</b> <b>1개 이상</b> (사이트를 둘러보는 화면 녹화 등)</li>'+
      '<li><b>대가 표시 (필수)</b> 글 첫머리에 아래 문구를 넣어 주세요.<span class="disc">제품을 제공받아 작성된 후기입니다.</span></li>'+
    '</ol></section>'+
    '<section class="guide"><h2>🗓️ 진행 순서</h2><ol class="steps">'+
      '<li>아래 <b>지금 신청하기</b>로 다꾸 카톡 채널을 추가하고 <b>블로그 주소</b>를 보내 신청해요.</li><li>선정되면 카톡으로 알려드려요.</li><li>선정 후 <b>7일 안에</b> 가이드대로 포스팅해요.</li><li>포스팅 주소를 보내주시면 확인 후 <b>7일 안에</b> 상품권을 보내드려요.</li>'+
    '</ol></section>'+
    '<section class="guide fineprint"><h2>⚠️ 유의사항</h2><ul>'+
      '<li>대가 표시 문구가 없거나 가이드를 지키지 않은 글은 상품권이 지급되지 않아요.</li>'+
      '<li>포스팅은 작성일로부터 6개월 이상 유지해 주세요.</li>'+
      '<li>다른 사람의 글이나 사진을 허락 없이 쓰면 안 돼요.</li>'+
      '<li>같은 블로그는 한 달에 1번만 참여할 수 있어요.</li>'+
      '<li>모집 내용은 사정에 따라 바뀔 수 있어요.</li>'+
    '</ul></section>'+
    '<div class="repcta"><a class="b pri wide" href="'+esc(apply)+'" target="_blank" rel="noopener noreferrer">🙋 지금 신청하기</a></div>'+
  '</div>';
}


/* ---------- 광고주 마케팅 상담 문의 ---------- */
function contactBanner(){
  return '<a class="adv" href="#/contact"><span class="ax"><small>📣 광고주 · 사장님</small><b>체험단 마케팅, 다꾸와 상담해 보세요</b><span>💬 무료 상담 신청하기 ›</span></span><span class="am2">'+ico(I.bell)+'</span></a>';
}
function radios(name,opts){
  return '<div class="rgrid">'+opts.map(function(o){ return '<label class="rd2"><input type="radio" name="'+name+'" value="'+o+'"><span>'+o+'</span></label>'; }).join("")+
    '<label class="rd2 etc"><input type="radio" name="'+name+'" value="기타"><span>기타 :</span><input type="text" class="etcin" data-etc="'+name+'" placeholder="직접 입력" aria-label="'+(name==="from"?"유입경로":"회신수단")+' 기타 입력"></label></div>';
}
function contactView(){
  return '<div class="pg cform">'+
    '<a class="back" href="#/">'+ico(I.back)+'<span>홈</span></a>'+
    '<div class="advhero"><small>📣 광고주 마케팅 상담</small><h1>체험단 마케팅,<br>무료로 상담받아 보세요 🙌</h1><p>숙소·매장·제품 체험단 모집과 블로그 홍보를 도와드려요.</p></div>'+
    '<form id="cform" class="fbox" novalidate>'+
      '<label class="fl" for="f-name">업체명 혹은 성함 <i>*</i></label><input id="f-name" name="name" class="fi" placeholder="업체명을 입력해 주세요" required>'+
      '<label class="fl" for="f-area">지역 <i>*</i></label><input id="f-area" name="area" class="fi" placeholder="지역을 입력해 주세요" required>'+
      '<label class="fl" for="f-biz">업종 <i>*</i></label><input id="f-biz" name="biz" class="fi" placeholder="업종을 입력해 주세요 (예: 펜션, 카페)" required>'+
      '<span class="fl">전화번호 <i>*</i></span><div class="tel"><input name="t1" class="fi" inputmode="numeric" maxlength="4" aria-label="전화번호 앞자리" required><span>-</span><input name="t2" class="fi" inputmode="numeric" maxlength="4" aria-label="전화번호 가운데" required><span>-</span><input name="t3" class="fi" inputmode="numeric" maxlength="4" aria-label="전화번호 끝자리" required></div>'+
      '<span class="fl">유입경로 <i>*</i></span>'+radios("from",["블로그","인스타","지인추천","검색"])+
      '<span class="fl">회신수단 <i>*</i></span>'+radios("reply",["문자","카톡","유선"])+
      '<label class="fl" for="f-msg">문의내용 <i>*</i></label><textarea id="f-msg" name="msg" class="fi ta" placeholder="운영하시는 서비스에 대한 사전정보, 원하는 마케팅, 구상하고 계신 목표치 등 간략한 정보를 남겨주세요." required></textarea>'+
      '<div class="agree"><p>개인정보 보호를 위한 이용자 동의사항에 동의하십니까?</p>'+
        '<details><summary>자세히보기</summary><ul><li>수집 항목: 업체명 또는 성함, 지역, 업종, 전화번호, 유입경로, 회신수단, 문의내용</li><li>이용 목적: 마케팅 상담 회신</li><li>보유 기간: 상담 완료 후 1년 뒤 파기 (요청 시 즉시 파기)</li><li>동의하지 않으실 수 있으며, 이 경우 상담 신청이 어려워요.</li></ul></details>'+
        '<label class="ck"><input type="checkbox" name="agree" required><span>네, 동의합니다</span></label></div>'+
      '<p class="ferr" id="ferr" role="alert"></p>'+
      '<button class="b dark wide" type="submit">무료 상담 신청하기</button>'+
    '</form></div>';
}
function submitContact(f){
  var g=function(n){ var el=f.elements[n]; return el?String(el.value||"").trim():""; };
  var pick=function(n){ var r=f.querySelector('input[name="'+n+'"]:checked'); if(!r) return ""; if(r.value==="기타"){ var t=f.querySelector('[data-etc="'+n+'"]'); return "기타: "+(t?t.value.trim():""); } return r.value; };
  var tel=[g("t1"),g("t2"),g("t3")].join("-"), from=pick("from"), reply=pick("reply");
  var miss=[];
  if(!g("name")) miss.push("업체명 혹은 성함"); if(!g("area")) miss.push("지역"); if(!g("biz")) miss.push("업종");
  if(!/^\d{2,4}-\d{3,4}-\d{4}$/.test(tel)) miss.push("전화번호"); if(!from) miss.push("유입경로"); if(!reply) miss.push("회신수단"); if(!g("msg")) miss.push("문의내용");
  if(!f.elements.agree.checked) miss.push("개인정보 동의");
  var err=document.getElementById("ferr");
  if(miss.length){ err.textContent=miss.join(", ")+"을(를) 확인해 주세요."; return; }
  err.textContent="";
  var text="[다꾸 광고주 상담 신청]\n업체명/성함: "+g("name")+"\n지역: "+g("area")+"\n업종: "+g("biz")+"\n전화번호: "+tel+"\n유입경로: "+from+"\n회신수단: "+reply+"\n문의내용: "+g("msg")+"\n개인정보 수집 동의: 동의";
  var ep=safeUrl((seed.contact||{}).endpoint);
  if(ep){
    fetch(ep,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({name:g("name"),area:g("area"),biz:g("biz"),tel:tel,from:from,reply:reply,msg:g("msg"),agree:true})})
      .then(function(r){ if(!r.ok) throw 0; doneContact(null); }).catch(function(){ doneContact(text); });
  } else doneContact(text);
}
function doneContact(text){
  var v=document.getElementById("view");
  if(!text){ v.innerHTML='<div class="pg"><div class="empty"><b>상담 신청이 접수됐어요</b>남겨주신 회신수단으로 연락드릴게요.<a class="b pri" href="#/">홈으로</a></div></div>'; window.scrollTo(0,0); return; }
  try{ navigator.clipboard.writeText(text); }catch(e){}
  v.innerHTML='<div class="pg"><div class="empty"><b>마지막 단계예요</b>신청 내용을 복사했어요.<br>다꾸 카톡 채널 대화창에 붙여넣어 보내주시면 접수돼요.'+
    '<textarea class="fi ta copyta" readonly aria-label="신청 내용">'+esc(text)+'</textarea>'+
    '<a class="b kakao" href="http://pf.kakao.com/_xkqEFX/chat" target="_blank" rel="noopener noreferrer">카톡 채널로 보내기</a><button class="copy" data-copy="'+esc(text)+'">내용 다시 복사</button></div></div>';
  window.scrollTo(0,0);
}

/* ---------- 특가 ---------- */
function msToMidnight(){ var n=new Date(), m=new Date(n); m.setHours(24,0,0,0); return m-n; }
function hms(ms){ var s=Math.max(0,Math.floor(ms/1000)), h=Math.floor(s/3600), mi=Math.floor(s%3600/60), se=s%60; return h+"시간 "+("0"+mi).slice(-2)+"분 "+("0"+se).slice(-2)+"초"; }
function dealsView(){
  var h='<div class="pg"><h1>특가 🔥</h1>';
  if(ADS.length){
    h+='<section class="sec"><div class="sh"><h2>🛍️ 특가 모아보기</h2></div><div class="hs">'+
      ADS.map(function(a){ var u=safeUrl(a.u); if(!u) return ""; return '<a class="acard" '+ext(u)+'><span class="am" style="background:'+esc(a.c||"#f4f0ff")+'">'+esc(a.e||"🎁")+'</span><b>'+esc(a.t)+'</b><small>'+esc(a.d||"")+'</small></a>'; }).join("")+'</div></section>';
  }
  h+='<a class="kakaobox sm" '+ext(kakaoUrl())+'><span><small>다꾸 <i>×</i> 카카오톡</small><b>🔔 새 특가 열리면 <em>가장 먼저 알려드려요!</em></b></span><span class="kg">알림 받기</span></a>';
  if(DEALS.length){
    h+='<section class="sec"><div class="sh col"><h2>⚡ 오늘의 특가</h2><p class="cd">⏳ 종료까지 <b id="cd">'+hms(msToMidnight())+'</b> 남음</p></div><div class="deallist">'+
      DEALS.map(function(d){ var u=safeUrl(d.u); if(!u) return ""; return '<a class="drow" '+ext(u)+'><span class="dt" style="background:'+esc(d.c||"#f4f0ff")+'"><span>'+esc(d.e||"🎁")+'</span>'+(d.tag?'<em>'+esc(d.tag)+'</em>':'')+'</span><span class="dx"><b>'+esc(d.t)+'</b><small>'+esc(d.d||"")+'</small><span class="dg">👉 특가 보러가기'+ico(I.chev)+'</span></span></a>'; }).join("")+'</div></section>';
  }
  h+='<p class="fine">특가 링크는 제휴 링크로, 구매 시 다꾸가 수수료를 받을 수 있어요. 가격과 할인은 판매처 사정에 따라 바뀔 수 있어요.</p>';
  return h+'</div>';
}
var tickT; function tick(){ clearInterval(tickT); var el=document.getElementById("cd"); if(!el) return; tickT=setInterval(function(){ var e=document.getElementById("cd"); if(!e){ clearInterval(tickT); return; } e.textContent=hms(msToMidnight()); },1000); }

/* ---------- 이벤트 ---------- */
function onClick(e){
  var lk=e.target.closest("article a[target=_blank]"); if(lk){ var art=lk.closest("article"), fb=art&&art.querySelector("[data-fav]"); if(fb) markSeen(fb.dataset.fav); }
  var t=e.target.closest("[data-fav],[data-cat],[data-status],[data-view],[data-share],[data-pref-clear],[data-focus],[data-spin],[data-copy]"); if(!t) return;
  if(t.dataset.spin!==undefined){ doSpin(t); return; }
  if(t.dataset.copy){ try{ navigator.clipboard.writeText(t.dataset.copy).then(function(){ toast("코드를 복사했어요"); }); }catch(err){ toast(t.dataset.copy); } return; }
  if(t.dataset.fav!==undefined){ e.preventDefault(); toggleFav(t.dataset.fav); var on=isFav(t.dataset.fav); [].forEach.call(document.querySelectorAll('[data-fav="'+t.dataset.fav+'"]'),function(b){ b.classList.toggle("on",on); b.setAttribute("aria-pressed",on); }); toast(on?"❤️ 찜했어요":"🤍 찜을 해제했어요"); if(state.tab==="fav") render(); return; }
  if(t.dataset.cat){ state.cat=t.dataset.cat; state.region="전체"; if(state.status==="closed") state.status="open"; saveUi(); render(); return; }
  if(t.dataset.status){ state.status=t.dataset.status; saveUi(); [].forEach.call(document.querySelectorAll("[data-status]"),function(b){ b.classList.toggle("on",b===t); }); renderListGrid(); return; }
  if(t.dataset.view!==undefined){ state.view=state.view==="2"?"3":(state.view==="3"?"1":"2"); ls("dakku-view",state.view); var g=document.getElementById("grid"); if(g) g.className="grid v"+state.view; t.innerHTML=viewIcon(); t.setAttribute("aria-label","보기 방식 바꾸기 (지금 "+state.view+"단)"); renderListGrid(); return; }
  if(t.dataset.share!==undefined){ share(); return; }
  if(t.dataset.prefClear!==undefined){ PREF=""; ls("dakku-pref",""); render(); return; }
  if(t.dataset.focus){ setTimeout(function(){ var q=document.getElementById("q"); if(q) q.focus(); },60); }
}
function share(){
  var data={title:SITE,text:"전국 숙박 체험단이랑 오늘의 특가를 한곳에서 봐요!",url:location.origin+location.pathname};
  if(navigator.share){ navigator.share(data).catch(function(){}); return; }
  try{ navigator.clipboard.writeText(data.url).then(function(){ toast("링크를 복사했어요. 친구에게 붙여넣어 보내세요!"); }); }catch(e){ toast(data.url); }
}
var toastT;
function toast(msg){ var t=document.querySelector(".toast"); if(!t){ t=document.createElement("div"); t.className="toast"; t.setAttribute("role","status"); document.body.appendChild(t);} t.textContent=msg; clearTimeout(toastT); toastT=setTimeout(function(){ t.remove(); },2400); }

/* ---------- 취향 묻기 (40초 머물면 한 번) ---------- */
function prefPopup(){
  if(ls("dakku-pref-asked")) return;
  var stay=openItems("stay"); if(!stay.length) return;
  var opts=PREFS.map(function(p){ return {p:p,n:stay.filter(function(it){ return p.re.test(String(it.name)+" "+String(it.benefit)); }).length}; }).filter(function(o){ return o.n>0; });
  if(opts.length<2) return;
  ls("dakku-pref-asked","1");
  var sel="";
  var wrap=document.createElement("div"); wrap.className="modal"; wrap.setAttribute("role","dialog"); wrap.setAttribute("aria-modal","true"); wrap.setAttribute("aria-label","취향 선택");
  wrap.innerHTML='<div class="sheet"><button class="mx" data-m="x" aria-label="닫기">'+ico(I.x)+'</button><div class="mlogo">'+logoSvg(40)+'</div><h2>어떤 숙소 체험단<br>기다리고 계세요?</h2><p>골라주시면 다음부터 맨 앞에 모아드릴게요!</p>'+
    '<div class="opts">'+opts.map(function(o){ return '<button class="opt" data-m="'+o.p.k+'"><span class="rd"></span><span class="ol">'+esc(o.p.t)+'</span><span class="oc">'+o.n+'곳</span></button>'; }).join("")+'</div>'+
    '<button class="b pri wide" data-m="ok" disabled>이걸로 모아주세요</button></div>';
  document.body.appendChild(wrap);
  wrap.addEventListener("click",function(e){
    var b=e.target.closest("[data-m]"); if(!b){ if(e.target===wrap) wrap.remove(); return; }
    var m=b.dataset.m;
    if(m==="x"){ wrap.remove(); return; }
    if(m==="ok"){ if(!sel) return; PREF=sel; ls("dakku-pref",sel); wrap.remove(); toast(prefOf(sel).t+" 체험단을 맨 앞에 모았어요"); render(); return; }
    sel=m; [].forEach.call(wrap.querySelectorAll(".opt"),function(o){ o.classList.toggle("on",o===b); }); wrap.querySelector("[data-m=ok]").disabled=false;
  });
}

if("serviceWorker" in navigator){ window.addEventListener("load",function(){ navigator.serviceWorker.register("sw.js").catch(function(){}); }); }

shell(); paintLogo(); route();
window.addEventListener("hashchange",route);
fetch("data.json?v="+Date.now().toString(36).slice(0,-3),{cache:"no-cache"}).then(function(r){ return r.json(); }).then(function(d){
  seed=d||seed; if(!Array.isArray(seed.items)) seed.items=[];
  if(Array.isArray(seed.categories)&&seed.categories.length) CATS=seed.categories;
  UPCOMING=Array.isArray(seed.upcoming)?seed.upcoming:[]; ADS=Array.isArray(seed.ads)?seed.ads:[]; DEALS=Array.isArray(seed.deals)?seed.deals:[];
  state.loading=false; LOGO=pickLogo(); paintLogo(); setFavicon(); render();
  if(!PREF) setTimeout(prefPopup,40000);
}).catch(function(){ state.loading=false; var v=document.getElementById("view"); if(v) v.innerHTML='<div class="empty"><b>잠시 후 다시 시도해 주세요</b>목록을 불러오지 못했어요.</div>'; });
})();
