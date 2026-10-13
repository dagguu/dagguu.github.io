(function(){
"use strict";
var REGIONS = ["서울","경기","인천","강원","충청","전라","경상","부산","제주"];
var SITE = "다꾸 체험단 모음";
/* 분야(카테고리): data.json 의 categories 로 늘려갑니다. 2개 이상이면 상단에 분야 탭이 나타나요. */
var CATS = [{k:"stay",t:"숙박",e:"🏨",region:true,unit:"숙소",view:"숙소보기",ve:"🏨",pick:["풀빌라"],
  h1:"✨ 전국 숙박 체험단,",h2:"한곳에서 쏙쏙",h3:"골라봐요 🏝️",sub:"오늘도 공짜 호캉스 떠나볼까요? 🧳 모집이 끝나면 자동으로 마감돼요",ph:"어디로 떠나볼까요? 숙소·지역 검색"}];
function catOf(it){ return it.cat||"stay"; }
function catInfo(k){ for(var i=0;i<CATS.length;i++){ if(CATS[i].k===k) return CATS[i]; } return CATS[0]; }
function curCat(){ return catInfo(state.cat); }
function catItems(){ return state.items.filter(function(it){ return catOf(it)===curCat().k; }); }

var seed = {items:[]};
var state = {
  items: [],
  q: "", cat: "stay", region: "전체", status: "open",
  loading: true
};
try{ var s = sessionStorage.getItem("dakku-ui"); if(s){ s = JSON.parse(s); state.region = s.region || "전체"; state.cat = s.cat || "stay"; state.status = (s.status && s.status!=="all") ? s.status : "open"; } }catch(e){}
function saveUi(){ try{ sessionStorage.setItem("dakku-ui", JSON.stringify({cat:state.cat,region:state.region,status:state.status})); }catch(e){} }

/* ---------- 로고: 클래식 D + 기념일 로고 ----------
   기념일 기간에는 색과 장식이 바뀝니다. data.json 의 "logoEvents"(같은 모양) 로 추가·덮어쓰기 할 수 있어요.
   m1/d1 ~ m2/d2 (양력, 매년 반복) 또는 from/to ("YYYY-MM-DD", 음력 명절 등 해마다 날짜가 바뀌는 날) */
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
  pumpkin:function(c){ return '<path d="M47 22C47 16 50 12 55 11" stroke="#2f6b2f" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M55 13C60 10 65 12 66 16C61 17 57 16 55 13Z" fill="#3f8f3f"/>'; },
  stick:function(c){ return '<rect x="80" y="8" width="5" height="40" rx="2.5" fill="#e8c38a" transform="rotate(18 82 28)"/><rect x="80" y="8" width="5" height="24" rx="2.5" fill="#4a2615" transform="rotate(18 82 28)"/>'; },
  snow:function(c){ return '<path fill="#ffffff" d="M24 25C24 17 33 13 41 15C47 9 58 10 62 16C70 15 78 19 78 26C70 28 34 29 24 25Z"/><circle cx="20" cy="84" r="2.6" fill="#ffffff" opacity=".9"/><circle cx="88" cy="82" r="2" fill="#ffffff" opacity=".85"/><circle cx="86" cy="14" r="2.4" fill="#ffffff" opacity=".9"/>'; }
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

/* ---------- date logic (자동 마감 계산) ---------- */
function today(){ var d=new Date(); d.setHours(0,0,0,0); return d; }
function parseDate(s){ if(!s) return null; var p=String(s).split("-"); if(p.length<3) return null; var d=new Date(+p[0],+p[1]-1,+p[2]); d.setHours(0,0,0,0); return isNaN(d)?null:d; }
function ymd(d){ return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2); }
function isPick(it){ if(it.pick===true) return true; var kw=catInfo(catOf(it)).pick||[]; for(var i=0;i<kw.length;i++){ if(String(it.name||"").indexOf(kw[i])>=0) return true; } return false; }
function fmt(s){ var d=parseDate(s); if(!d) return "-"; return (d.getMonth()+1)+"."+d.getDate(); }
function statusOf(it){
  var t=today(), st=parseDate(it.start), en=parseDate(it.end);
  if(it.closed) return {key:"closed",label:"🔒 마감",dday:"마감"};
  if(en && t>en) return {key:"closed",label:"🔒 마감",dday:"마감"};
  if(st && t<st){ var n=Math.round((st-t)/864e5); return {key:"soon",label:"⏰ 오픈예정",dday:"오픈 D-"+n}; }
  if(en){ var left=Math.round((en-t)/864e5); return {key:"open",label:"🔥 모집중",dday: left===0?"오늘 마감 🚨":(left<=3?"D-"+left+" ⏳":"D-"+left)}; }
  return {key:"open",label:"🔥 모집중",dday:"상시"};
}

/* ---------- helpers ---------- */
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
function safeUrl(u){ u=String(u||"").trim(); if(!u) return ""; if(/^https?:\/\//i.test(u)) return u; if(/^images\/[\w.-]+$/.test(u)) return u; return ""; }
function uid(){ return "h"+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

function filtered(){
  var q=state.q.trim().toLowerCase();
  return catItems().sort(function(a,b){ var pa=isPick(a)&&statusOf(a).key!=="closed", pb=isPick(b)&&statusOf(b).key!=="closed"; if(pa!==pb) return pa?-1:1; return (b.createdAt||0)-(a.createdAt||0); }).filter(function(it){
    if(curCat().region && state.region!=="전체" && it.region!==state.region) return false;
    var s=statusOf(it).key;
    var td=ymd(today());
    if(state.status==="open" && s!=="open") return false;
    if(state.status==="closed" && s!=="closed") return false;
    if(state.status==="todayOpen" && !(it.start===td && s!=="closed")) return false;
    if(state.status==="pick" && !isPick(it)) return false;
    if(state.status==="fav" && !isFav(it.id)) return false;
    if(state.status==="todayClose" && !(it.end===td && s==="open")) return false;
    if(state.status==="closing"){ var en=parseDate(it.end); if(!(s==="open" && en && (en-today())/864e5<=3)) return false; }
    if(q){ var hay=(it.name+" "+it.region+" "+it.benefit).toLowerCase(); if(hay.indexOf(q)<0) return false; }
    return true;
  });
}

/* ---------- render ---------- */
var app=document.getElementById("app");
function shell(){
  app.innerHTML =
   '<div class="disclose">이 사이트는 쿠팡, 여기어때, 마이리얼트립, 토스 등으로부터 일정액의 수수료를 제공받습니다.</div>'+
      '<header class="top"><div class="wrap">'+
     '<div class="bar"><a class="logo" href="#" id="home" title="'+esc(LOGO.name||SITE)+'">'+logoSvg(30)+'<span>'+SITE+'</span>'+(LOGO.name?'<em class="logo-ev">'+esc(LOGO.name)+'</em>':'')+'</a></div>'+
     '<nav class="cats" id="cats" aria-label="분야" hidden></nav>'+
     '<label class="search"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'+
       '<input id="q" type="search" placeholder="체험단 검색" autocomplete="off" aria-label="숙소 검색"></label>'+
     '<nav class="chips" id="chips" aria-label="지역 필터"></nav>'+
   '</div></header>'+
   '<main class="wrap">'+
     '<section class="hero" id="hero"></section>'+
     '<section id="entry" class="entry"></section><section id="today" class="today"></section><section id="deals" class="deals"></section>'+
     '<div class="toolbar"><div class="seg" id="seg">'+
       '<button data-s="pick">추천 💜</button><button data-s="todayOpen">오늘오픈 🆕</button><button data-s="todayClose">오늘마감 🚨</button><button data-s="closing">마감임박 ⏰</button><button data-s="open">모집중 🔥</button><button data-s="closed">모집마감 🔒</button><button data-s="fav">찜 ❤️</button>'+
     '</div><span class="count" id="count"></span></div>'+
     '<div class="grid" id="grid"></div>'+
   '</main>'+
   '<footer><div class="wrap">'+
     
     '<div class="foot-meta"><a href="http://pf.kakao.com/_xkqEFX/friend" target="_blank" rel="noopener noreferrer" style="font-weight:700;color:#3c1e1e">💬 카카오톡 채널 ‘다꾸 체험단’</a><br>'+SITE+' · 체험단 모집 정보는 각 모집처의 공지를 기준으로 하며, 신청 조건과 일정은 변경될 수 있습니다.</div>'+
   '</div></footer>'+
   '<button class="fab" id="fab" hidden>➕ 숙소 등록</button>';

  var chips=document.getElementById("chips");
  var EMO={"전체":"🌏","서울":"🏙️","경기":"🌳","인천":"✈️","강원":"⛰️","충청":"🌾","전라":"🍃","경상":"🌊","부산":"🎡","제주":"🍊"};
  chips.innerHTML=["전체"].concat(REGIONS).map(function(r){return '<button class="chip" data-r="'+r+'">'+r+'</button>';}).join("");
  chips.addEventListener("click",function(e){ var b=e.target.closest(".chip"); if(!b) return; state.region=b.dataset.r; saveUi(); render(); });
  document.getElementById("cats").addEventListener("click",function(e){ var b=e.target.closest("[data-c]"); if(!b||b.dataset.c===state.cat) return; state.cat=b.dataset.c; state.region="전체"; state.status="open"; state.q=""; document.getElementById("q").value=""; saveUi(); render(); });
  document.getElementById("seg").addEventListener("click",function(e){ var b=e.target.closest("button"); if(!b) return; state.status=b.dataset.s; saveUi(); render(); });
  var qi=document.getElementById("q"); qi.addEventListener("input",function(){ state.q=qi.value; renderGrid(); });
  document.getElementById("home").addEventListener("click",function(e){ e.preventDefault(); state.q="";qi.value="";state.region="전체";state.status="open";saveUi();render();window.scrollTo({top:0,behavior:"smooth"}); });
  document.getElementById("grid").addEventListener("click",onGridClick);
  document.getElementById("entry").addEventListener("click",function(e){ var b=e.target.closest("[data-ec]"); if(!b||b.disabled) return;
    if(b.dataset.ec) { state.cat=b.dataset.ec; state.region="전체"; }
    state.status=b.dataset.es||"open"; saveUi(); render();
    var t=document.getElementById("seg"); if(t) t.scrollIntoView({behavior:"smooth",block:"center"}); });
  document.getElementById("today").addEventListener("click",function(e){ var b=e.target.closest("[data-go]"); if(!b) return; state.status=b.dataset.go; saveUi(); render(); var t=document.getElementById("seg"); if(t) t.scrollIntoView({behavior:"smooth",block:"center"}); });
}

function render(){
  if(!CATS.some(function(c){return c.k===state.cat;})) state.cat=CATS[0].k;
  var cc=curCat(), cats=document.getElementById("cats");
  cats.hidden=CATS.length<2;
  cats.innerHTML=CATS.map(function(c){ return '<button data-c="'+esc(c.k)+'" class="'+(c.k===cc.k?'on':'')+'">'+esc(c.e)+' '+esc(c.t)+'</button>'; }).join("");
  document.getElementById("chips").hidden=!cc.region;
  document.getElementById("hero").innerHTML='<h1>'+esc(cc.h1||("✨ 전국 "+cc.t+" 체험단,"))+'<br><span class="grad">'+esc(cc.h2||"한곳에서 쏙쏙")+'</span> '+esc(cc.h3||"골라봐요")+'</h1><p>'+esc(cc.sub||"모집이 끝나면 자동으로 마감돼요")+'</p>';
  document.getElementById("q").placeholder=cc.ph||(cc.t+" 체험단 검색");
  [].forEach.call(document.querySelectorAll(".chip"),function(b){ b.classList.toggle("on",b.dataset.r===state.region); });
  [].forEach.call(document.querySelectorAll("#seg button"),function(b){ b.classList.toggle("on",b.dataset.s===state.status); });
  renderEntry(); renderToday(); renderDeals(); renderGrid();
}

function card(it){
  var s=statusOf(it), img=safeUrl(it.image), view=safeUrl(it.viewUrl), apply=safeUrl(it.applyUrl);
  var closed=s.key==="closed";
  return '<article class="card'+(closed?' is-closed':'')+'">'+
    '<div class="thumb">'+
      (view?'<a class="thumb-link" href="'+esc(view)+'" target="_blank" rel="noopener noreferrer sponsored" aria-label="'+esc(it.name)+' '+esc(catInfo(catOf(it)).view||"보기")+'">':'<div class="thumb-link">')+
      '<div class="ph">'+esc(it.region||"숙소")+'</div>'+
      (img?'<img src="'+esc(img)+'" alt="'+esc(it.name)+' 대표 사진" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">':'')+
      '<span class="badge '+s.key+'">'+s.label+'</span>'+(isPick(it)?'<span class="pick">💜 추천</span>':'')+
      (view?'</a>':'</div>')+
      '<button class="favbtn'+(isFav(it.id)?' on':'')+'" data-act="fav" data-id="'+esc(it.id)+'" aria-label="찜하기">'+(isFav(it.id)?'❤️':'🤍')+'</button></div>'+
    '<div class="meta"><span class="region">📍 '+esc(it.region)+'</span><span class="dot"></span><span class="dday '+s.key+'">'+s.dday+'</span></div>'+
    '<h3 class="name">'+esc(it.name)+'</h3>'+
    '<p class="benefit">🎁 '+esc(it.benefit)+'</p>'+
    '<p class="period">🗓️ '+(it.start?fmt(it.start)+' ':'')+'~ '+fmt(it.end)+' 모집</p>'+
    '<div class="actions card-act">'+
      (view?'<a class="btn view" href="'+esc(view)+'" target="_blank" rel="noopener noreferrer sponsored">'+esc((catInfo(catOf(it)).ve||"🛒")+" "+(catInfo(catOf(it)).view||"보기"))+'</a>':'<span class="btn disabled">'+esc(catInfo(catOf(it)).view||"보기")+'</span>')+
      (closed?'<span class="btn disabled">마감</span>':(apply?'<a class="btn apply" href="'+esc(apply)+'" target="_blank" rel="noopener noreferrer">✍️ 신청</a>':'<span class="btn disabled">준비중</span>'))+
    '</div>'+'</article>';
}

function renderGrid(){
  var g=document.getElementById("grid"); if(state.loading){ g.innerHTML='<div class="empty">불러오는 중… ✈️</div>'; return; }
  var list=filtered();
  var openCount=catItems().filter(function(i){return statusOf(i).key!=="closed";}).length;
  document.getElementById("count").innerHTML='<b>'+list.length+'</b>개 '+esc(curCat().unit||"체험단")+' · 모집 중 '+openCount;
  var cards=[], n=0; list.forEach(function(it,i){ cards.push(card(it)); if((i+1)%4===0){ cards.push(adBox(n++)); } }); if(list.length && list.length%4!==0 && n===0){ cards.push(adBox(0)); }
  g.innerHTML = list.length ? cards.join("") : '<div class="empty"><b>🥲 조건에 맞는 숙소가 없어요</b>다른 지역이나 검색어로 찾아보세요.</div>';
  mountAds();
}

var ADS=[];
var DEALS=[];
var FAV=[]; try{ FAV=JSON.parse(localStorage.getItem("dakku-fav")||"[]")||[]; }catch(e){ FAV=[]; }
function isFav(id){ return FAV.indexOf(id)>=0; }
function toggleFav(id){ var i=FAV.indexOf(id); if(i>=0) FAV.splice(i,1); else FAV.push(id); try{ localStorage.setItem("dakku-fav",JSON.stringify(FAV)); }catch(e){} }
var LAST=0; try{ LAST=+(localStorage.getItem("dakku-last")||0); localStorage.setItem("dakku-last",String(Date.now())); }catch(e){}
/* ---------- 첫 화면 분야 입구 카드 ---------- */
var UPCOMING=[];
function renderEntry(){
  var el=document.getElementById("entry"); if(!el) return;
  var td=ymd(today()), t0=today();
  function stat(list){ var o=0,op=0,cl=0; list.forEach(function(it){ var k=statusOf(it).key; if(k==="open") op++; if(it.start===td&&k!=="closed") o++; var en=parseDate(it.end); if(k==="open"&&en&&(en-t0)/864e5<=3) cl++; }); return {o:o,op:op,cl:cl}; }
  var html=CATS.map(function(c){ var st=stat(state.items.filter(function(it){return catOf(it)===c.k;}));
    var sub = st.o>0 ? '🆕 오늘 '+st.o+'곳' : '🔥 '+st.op+'곳 모집중';
    return '<button class="ecard'+(c.k===state.cat&&state.status!=="pick"&&state.status!=="closing"?' on':'')+'" data-ec="'+esc(c.k)+'" data-es="open"><span class="ee">'+esc(c.e)+'</span><b>'+esc(c.t)+' 체험단</b><small>'+sub+'</small></button>'; });
  UPCOMING.forEach(function(u){ html.push('<button class="ecard soon" disabled data-ec=""><span class="ee">'+esc(u.e)+'</span><b>'+esc(u.t)+' 체험단</b><small>곧 오픈 ✨</small></button>'); });
  var all=stat(catItems()), pick=catItems().filter(function(it){return isPick(it)&&statusOf(it).key!=="closed";}).length;
  html.push('<button class="ecard pickc'+(state.status==="pick"?' on':'')+'" data-ec="'+esc(state.cat)+'" data-es="pick"><span class="ee">💜</span><span class="et"><b>다꾸 추천</b><small>'+esc(curCat().t)+' 추천 '+pick+'곳</small></span></button>');
  html.push('<button class="ecard hot'+(state.status==="closing"?' on':'')+'" data-ec="'+esc(state.cat)+'" data-es="closing"><span class="ee">⏰</span><span class="et"><b>마감 임박</b><small>3일 안에 마감 '+all.cl+'곳</small></span></button>');
  el.innerHTML='<div class="egrid">'+html.join("")+'</div>';
}
function renderToday(){
  var el=document.getElementById("today"); if(!el) return;
  var td=ymd(today()), opened=0, closing=0, open=0, fresh=0, favSoon=0;
  catItems().forEach(function(it){ var k=statusOf(it).key; if(k==="open") open++; if(it.start===td&&k!=="closed") opened++; if(it.end===td&&k==="open") closing++;
    if(LAST && (it.createdAt||0)>LAST && k!=="closed") fresh++;
    if(isFav(it.id)&&k==="open"){ var en=parseDate(it.end); if(en && (en-today())/864e5<=3) favSoon++; } });
  var d=today(), wk="일월화수목금토"[d.getDay()];
  var html='<div class="upd">📅 '+(d.getMonth()+1)+'월 '+d.getDate()+'일 ('+wk+') · 매일 아침 새 체험단과 특가가 올라와요</div>'+
    '<div class="stats"><button data-go="todayOpen"><b>'+opened+'</b><span>🆕 오늘 오픈</span></button><button data-go="todayClose"><b>'+closing+'</b><span>🚨 오늘 마감</span></button><button data-go="open"><b>'+open+'</b><span>🔥 모집중</span></button></div>';
  var kk=safeUrl(seed.kakao); if(kk) html+='<a class="kakao" href="'+esc(kk)+'" target="_blank" rel="noopener noreferrer"><span class="kb">💬</span><span class="kt"><b>카톡으로 매일 새 체험단 받기</b><small>오늘 오픈·마감 소식을 매일 아침에</small></span><span class="kg">채널 추가</span></a>';
  if(fresh>0) html+='<div class="note new">✨ 지난 방문 이후 새 체험단 <b>'+fresh+'곳</b>이 올라왔어요</div>';
  if(favSoon>0) html+='<button class="note fav" data-go="fav">❤️ 찜한 체험단 중 <b>'+favSoon+'곳</b>이 3일 안에 마감돼요 ›</button>';
  el.innerHTML=html;
}
function renderDeals(){
  var el=document.getElementById("deals"); if(!el) return; if(!DEALS.length){ el.innerHTML=""; return; }
  el.innerHTML='<div class="dh"><h2>🎁 오늘의 숨은 특가</h2><span>'+(seed.dealsUpdated?fmt(seed.dealsUpdated)+' 업데이트':'')+'</span></div><div class="drow">'+
    DEALS.map(function(x){ return '<a class="dcard" style="background:'+esc(x.c||"#f6f4ff")+'" href="'+esc(safeUrl(x.u))+'" target="_blank" rel="noopener noreferrer sponsored">'+(x.tag?'<span class="dtag">'+esc(x.tag)+'</span>':'')+'<span class="de">'+esc(x.e)+'</span><b>'+esc(x.t)+'</b><small>'+esc(x.d)+'</small></a>'; }).join("")+'</div>';
}
function adBox(i){ if(!ADS.length) return ''; var a=ADS[i%ADS.length]; return '<div class="adbox"><a class="adtile" style="background:'+a.c+';border-color:'+a.k+'" href="'+a.u+'" target="_blank" rel="noopener noreferrer sponsored"><span class="ademo">'+a.e+'</span><span class="adtx"><b>'+a.t+'</b><small>'+a.d+'</small></span><span class="adgo">'+a.b+' ›</span></a></div>'; }
function mountAds(){}
/* ---------- events ---------- */
function onGridClick(e){
  var b=e.target.closest("[data-act]"); if(!b) return;
  if(b.dataset.act==="fav"){ e.preventDefault(); toggleFav(b.dataset.id); renderGrid(); renderToday(); return; }
}

var toastT;
function toast(msg){ var t=document.querySelector(".toast"); if(!t){ t=document.createElement("div"); t.className="toast"; document.body.appendChild(t);} t.textContent=msg; clearTimeout(toastT); toastT=setTimeout(function(){t.remove();},2600); }

if("serviceWorker" in navigator){ window.addEventListener("load",function(){ navigator.serviceWorker.register("sw.js").catch(function(){}); }); }

shell(); render();
fetch("data.json?v="+Date.now().toString(36).slice(0,-3),{cache:"no-cache"}).then(function(r){ return r.json(); }).then(function(d){
  seed=d||seed; if(Array.isArray(seed.categories)&&seed.categories.length) CATS=seed.categories; UPCOMING=Array.isArray(seed.upcoming)?seed.upcoming:[]; state.items=Array.isArray(seed.items)?seed.items:[]; ADS=Array.isArray(seed.ads)?seed.ads:[]; DEALS=Array.isArray(seed.deals)?seed.deals:[];
  state.loading=false; LOGO=pickLogo(); var hm=document.getElementById("home"); if(hm){ hm.title=LOGO.name||SITE; hm.innerHTML=logoSvg(30)+'<span>'+SITE+'</span>'+(LOGO.name?'<em class="logo-ev">'+esc(LOGO.name)+'</em>':''); } setFavicon(); render();
}).catch(function(){ state.loading=false; var g=document.getElementById("grid"); if(g) g.innerHTML='<div class="empty"><b>잠시 후 다시 시도해주세요</b>목록을 불러오지 못했어요.</div>'; });
})();