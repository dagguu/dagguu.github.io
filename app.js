/* 화면 확대·축소 잠금(2026-10-19 시온님): viewport maximum-scale=1 + 아이폰 사파리·카톡 인앱 핀치/더블탭 막기 */
(function(){ try{ ["gesturestart","gesturechange","gestureend"].forEach(function(t){ document.addEventListener(t,function(e){ if(e.target&&e.target.closest&&e.target.closest(".dmap")) return; e.preventDefault(); },{passive:false}); });
  document.addEventListener("touchmove",function(e){ if(e.touches&&e.touches.length>1&&!(e.target&&e.target.closest&&e.target.closest(".dmap"))) e.preventDefault(); },{passive:false}); }catch(e){} })();
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
  {k:"elec",  t:"가전/가구", em:"🔌", icon:"M4 5h16v11H4ZM9 20h6M12 16v4"},
  {k:"health",t:"건강식품", em:"💊", icon:"M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7ZM7 10l7 7"},
  {k:"pet",   t:"반려동물", em:"🐾", icon:"M12 20c-3 0-6-1.5-6-4 0-2.5 3-5 6-5s6 2.5 6 5c0 2.5-3 4-6 4ZM5 10a1.5 2 0 1 0 0-.01M19 10a1.5 2 0 1 0 0-.01M9 6a1.5 2 0 1 0 0-.01M15 6a1.5 2 0 1 0 0-.01"},
  {k:"fashion",t:"패션", em:"👗", icon:"M8 4l4 2 4-2 4 4-3 3v9H7v-9L4 8Z"},
  {k:"etc",   t:"티켓", em:"🎟️", icon:"M6 12h.01M12 12h.01M18 12h.01"}
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

var SORTS=[["rec","✨ 추천순"],["high","💎 고가제품순"],["popular","🔥 인기순"],["comp","🙌 경쟁률 낮은순"],["deadline","⏰ 마감임박순"],["low","🪙 저가제품순"]], SORTS_OK=["rec","high","popular","comp","deadline","low"];
var state = { tab:"home", cat:"all", regions:[], status:"open", q:"", chs:[], view:"2", sort:"rec", pet:"", loading:true };
function ls(k,v){ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); }catch(e){ return null; } }
state.view = ls("dakku-view") || "2"; state.themes=[]; state.types=[]; state.srcs=[];
try{ var su=JSON.parse(sessionStorage.getItem("dakku-ui")||"{}"); if(su.cat) state.cat=su.cat; if(Array.isArray(su.regions)) state.regions=su.regions.filter(function(r){ return REGIONS.indexOf(r)>=0; }); if(su.status) state.status=su.status; if(SORTS_OK.indexOf(su.sort)>=0) state.sort=su.sort; if(su.pet==="dog"||su.pet==="cat") state.pet=su.pet; }catch(e){}
function saveUi(){ try{ sessionStorage.setItem("dakku-ui",JSON.stringify({cat:state.cat,regions:state.regions,status:state.status,sort:state.sort,pet:state.pet||""})); }catch(e){} }
var FAV=[]; try{ FAV=JSON.parse(ls("dakku-fav")||"[]")||[]; }catch(e){ FAV=[]; }
function isFav(id){ return FAV.indexOf(id)>=0; }
function toggleFav(id){ var i=FAV.indexOf(id); if(i>=0) FAV.splice(i,1); else FAV.push(id); ls("dakku-fav",JSON.stringify(FAV)); mFav(id,FAV.indexOf(id)>=0); pushFavSync(); }
var PREF = ls("dakku-pref") || "";
var WANT = {}; try{ WANT=JSON.parse(ls("dakku-want")||"{}")||{}; }catch(e){ WANT={}; }
if(WANT.region){ WANT.regions=[WANT.region]; delete WANT.region; } if(WANT.age){ WANT.ages=[WANT.age]; delete WANT.age; }
function wantRegs(){ return Array.isArray(WANT.regions)?WANT.regions:[]; }
function saveWant(){ ls("dakku-want",JSON.stringify(WANT)); mWant(); }
var AGES=["임신 중","0~6개월","7~12개월","13~24개월","3~4세","5~7세","8세 이상"];

/* ---------- 로고: 클래식 D + 기념일 로고 ---------- */
var D_PATH="M26 22H52C70 22 77 31.5 77 49.5C77 67.5 70 77 52 77H26Z M43 36H51.5C56 36 58 38 58 42.5V56.5C58 61 56 63 51.5 63H43Z";
var LOGO_BASE={bg:"#6a3fc8",fg:"#ffffff",deco:"",name:""};
var LOGO_EVENTS=[
  {m1:1,d1:1,m2:1,d2:3,bg:"#111111",fg:"#ffd84d",deco:"spark",name:"Happy New Year ✨"},
  {m1:2,d1:14,m2:2,d2:14,bg:"#8b4513",fg:"#ffffff",deco:"heart",name:"발렌타인데이 🍫"},
  {m1:3,d1:14,m2:3,d2:14,bg:"#ffffff",fg:"#e8508a",deco:"heart",name:"화이트데이 🍬"},
  {m1:5,d1:5,m2:5,d2:5,bg:"#ffd84d",fg:"#1d4ed8",deco:"balloon",name:"어린이날 🎈"},
  {m1:10,d1:18,m2:10,d2:31,bg:"#6a3fc8",fg:"#ffffff",deco:"jack",name:""},
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
  jack:function(){ return '<g transform="translate(76 30) scale(1.5)"><path d="M0 -12C0 -16 2 -18 5 -19" stroke="#2f6b2f" stroke-width="3.2" fill="none" stroke-linecap="round"/><ellipse cx="-6" cy="0" rx="8" ry="11" fill="#ff7a1a"/><ellipse cx="6" cy="0" rx="8" ry="11" fill="#ff7a1a"/><ellipse cx="0" cy="0" rx="8" ry="12" fill="#ff8f2e"/><path d="M-7 -3L-3 -3L-5 -7Z M3 -3L7 -3L5 -7Z" fill="#2a1600"/><path d="M-7 3Q0 9 7 3L4 5L2 3L0 5L-2 3L-4 5Z" fill="#2a1600"/></g>'; },
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
function catInfo(k){ if(k==="all") return {k:"all",t:"전체",region:false,unit:"체험단",view:"보기"}; for(var i=0;i<CATS.length;i++) if(CATS[i].k===k) return CATS[i]; return null; }
function catMeta(k){ for(var i=0;i<CAT_ORDER.length;i++) if(CAT_ORDER[i].k===k) return CAT_ORDER[i]; return {k:k,t:k,icon:CAT_ORDER[5].icon}; }
function isOpenCat(k){ return !!catInfo(k); }
function isPick(it){ if(it.pick===true) return true; var c=catInfo(catOf(it)); var kw=(c&&c.pick)||[]; for(var i=0;i<kw.length;i++) if(String(it.name||"").indexOf(kw[i])>=0) return true; return false; }
function prefOf(k){ for(var i=0;i<PREFS.length;i++) if(PREFS[i].k===k) return PREFS[i]; return null; }
function prefHit(it){ var p=prefOf(PREF); return !!(p && p.re.test(String(it.name||"")+" "+String(it.benefit||""))); }
function prefNote(k){
  if(k!=="stay") return "";
  var parts=[]; if(wantRegs().length) parts.push("📍 "+wantRegs().join("·")); if(PREF&&prefOf(PREF)) parts.push(prefOf(PREF).t);
  return parts.length?'<p class="prefnote">'+esc(parts.join(" · "))+' 체험단 먼저 보여드리는 중 · <button data-pref-clear>해제</button></p>':'';
}
function byDeadline(a,b){
  var ka=isPick(a)&&statusOf(a).key!=="closed", kb=isPick(b)&&statusOf(b).key!=="closed"; if(ka!==kb) return ka?-1:1;
  var wa=Array.isArray(WANT.ages)?WANT.ages:[]; if(wa.length){ var aa=(a.ages||[]).some(function(x){ return wa.indexOf(x)>=0; }), ab=(b.ages||[]).some(function(x){ return wa.indexOf(x)>=0; }); if(aa!==ab) return aa?-1:1; }
  var wr=wantRegs(); if(wr.length){ var ra=wr.indexOf(a.region)>=0, rb=wr.indexOf(b.region)>=0; if(ra!==rb) return ra?-1:1; }
  var pa=prefHit(a), pb=prefHit(b); if(pa!==pb) return pa?-1:1;
  return daysLeft(a)-daysLeft(b) || (b.createdAt||0)-(a.createdAt||0);
}

/* ---------- 도우미 ---------- */
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
function safeUrl(u){ u=String(u||"").trim(); if(!u) return ""; if(/^https?:\/\//i.test(u)) return u; if(/^images\/[\w.-]+$/.test(u)) return u; return ""; }
function ext(u){ return 'href="'+esc(u)+'" target="_blank" rel="noopener noreferrer sponsored"'; }
function ico(d,cls){ return '<svg class="'+(cls||"i")+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+d+'"/></svg>'; }
var I={
  bag:"M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8ZM9 8V6.5a3 3 0 0 1 6 0V8",
  user:"M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c.8-3.6 3.9-5.8 7.5-5.8s6.7 2.2 7.5 5.8",
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
  send:"M21 3 10.2 13.8M21 3l-6.6 18-4.2-7.2L3 9.6Z",
  wheel:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0v9l6.4 6.4M12 12 3.5 9",
  map:"M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Zm0 0v14m6-12v14"
};

/* ---------- 셸 ---------- */
var app=document.getElementById("app");
var TABS=[["home","홈",I.home],["list","체험단",I.ticket],["map","지도",I.map],["shop","공구",I.bag],["deals","특가",I.gift]];
/* 사이트 둘로 나누기(2026-10-21 시온님): www.dagguu.com = 다꾸체험단(정보만, 로그인·결제 없음) / partners.dagguu.com = 다이어리뷰(회원·기자단·광고주·수익화 클래스).
   두 사이트가 같은 app.js 를 쓰고, partners 의 index.html 이 window.DK_MODE="partners" 를 켠다. 한쪽에 없는 화면 주소로 들어오면 다른 사이트로 넘긴다. */
var PART_LIVE=true; /* partners.dagguu.com 이 열리면 true 로 바꾼다(그 전엔 www 에서 로그인·교육·광고주가 그대로 동작) */
var PMODE=window.DK_MODE==="partners", MAIN_URL="https://www.dagguu.com/", PART_URL="https://partners.dagguu.com/", BASE=PMODE?(window.DK_BASE||MAIN_URL):"";
var BENEFIT_ON=false; /* 룰렛·혜택(#/benefit) 메뉴·링크 숨김 — 2026-10-22 시온님. 다시 보이려면 true */
var P_TABS=/^(home|press|pjob|padmin|contact|edu|checkout|my|privacy|benefit|reporter)$/, P_ONLY=/^(pjob|padmin|contact|edu|checkout|benefit|reporter)$/; /* 공구(#/shop)는 다꾸체험단 www 에 둔다 — 2026-10-22 시온님 */
if(PMODE) TABS=[["home","홈",I.home],["press","기자단",I.send],["edu","클래스",I.trend],["contact","광고주",I.bell],["my","마이",I.user]];
/* TOP 버튼(2026-10-18 시온님 요청): 화면 1.5배 넘게 내려가면 톡상담 위에 보임 */
(function(){ var raf=0; function upd(){ raf=0; var b=document.getElementById("totop"); if(b) b.hidden=window.scrollY<window.innerHeight*1.5; }
  window.addEventListener("scroll",function(){ if(!raf) raf=requestAnimationFrame(upd); },{passive:true}); window.addEventListener("hashchange",function(){ setTimeout(upd,50); });
  document.addEventListener("click",function(e){ if(e.target.closest("#totop")){ e.preventDefault(); var y0=window.scrollY; window.scrollTo({top:0,behavior:"smooth"}); setTimeout(function(){ if(window.scrollY>=y0-5) window.scrollTo(0,0); },700); } }); })();
/* 뒤로 가기 버튼(아이폰 홈 화면 앱엔 뒤로 버튼이 없음, 2026-10-18 시온님 요청): 사이트 안에서 이동한 기록이 있으면 history.back, 없으면 홈 */
var NAVN=0; window.addEventListener("hashchange",function(){ NAVN++; });
document.addEventListener("click",function(e){ if(!e.target.closest("#backbtn")) return; e.preventDefault(); if(NAVN>0){ NAVN=Math.max(0,NAVN-2); history.back(); } else location.hash="#/"; });
function shell(){
  app.innerHTML=
    (PMODE?'':'<div class="disclose">이 사이트는 쿠팡 파트너스, 토스쇼핑 쉐어링크, 여기어때, 마이리얼트립, 트립닷컴 등 제휴 활동의 일환으로 일정액의 수수료를 제공받을 수 있습니다.</div>')+
    '<div class="frame">'+
      '<header class="appbar"><span class="abl"><button class="backbtn" id="backbtn" aria-label="뒤로 가기" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><a class="logo" href="#/" id="logo"></a></span><span class="hbtns"><span class="kch" id="kakao-talk-channel-add-button" data-channel-public-id="_xkqEFX" data-size="small" data-support-multiple-densities="true"></span>'+(PMODE?'':'<a class="iconbtn" href="#/list" data-focus="q" aria-label="체험단 검색">'+ico(I.search)+'</a>')+'<a class="iconbtn mebtn" href="#/my" id="mebtn" aria-label="마이 다꾸">'+ico(I.user)+'</a></span></header>'+
      '<main id="view" class="view"></main>'+
      (PMODE?'<footer class="foot"><a class="flink" href="#/contact">광고주 마케팅 상담 문의</a><br><a '+ext(safeUrl(seed.kakao)||"http://pf.kakao.com/_xkqEFX/friend")+'>💬 카카오톡 채널 ‘다꾸체험단’</a><p>다이어리뷰 · 블로그 기자단·체험단 대행 · <a href="'+MAIN_URL+'">다꾸체험단(체험단 모아보기)</a></p></footer>':'<footer class="foot"><a class="flink" href="#/contact">광고주 마케팅 상담 문의</a><br><a '+ext(safeUrl(seed.kakao)||"http://pf.kakao.com/_xkqEFX/friend")+'>💬 카카오톡 채널 ‘다꾸체험단’</a><div id="bizline"></div><a class="flink" href="/ad-notice.html">광고 및 콘텐츠 표시 안내</a><p>'+SITE+' · 다꾸체험단은 여러 체험단 사이트의 모집 정보를 모아 보여 주는 서비스로, 각 체험단 사이트와 무관해요. 신청·선정·진행은 해당 사이트에서 이뤄져요. 모집 정보는 각 모집처의 공지를 기준으로 하며, 신청 조건과 일정은 바뀔 수 있어요.</p></footer>')+
    '</div>'+
    '<button class="totop" id="totop" aria-label="맨 위로" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 14l6-6 6 6"/></svg><span>TOP</span></button>'+
    '<div class="kchat" id="kakao-talk-channel-chat-button" data-channel-public-id="_xkqEFX" data-title="consult" data-size="small" data-color="yellow" data-shape="mobile" data-support-multiple-densities="true"></div>'+
    '<nav class="tabbar" aria-label="하단 메뉴">'+TABS.map(function(t){ var c=!PMODE&&t[0]==="map"; return '<a href="#/'+(t[0]==="home"?"":t[0])+'" data-tab="'+t[0]+'"'+(c?' class="tc"':'')+'>'+(c?'<span class="tcb">'+ico(t[2],"ti")+'</span>':'<span class="tib">'+ico(t[2],"ti")+'</span>')+'<span>'+t[1]+'</span></a>'; }).join("")+'</nav>';
  app.addEventListener("click",onClick);
  app.addEventListener("submit",function(e){ if(e.target.id==="cform"){ e.preventDefault(); submitContact(e.target); } if(e.target.id==="eduform"){ e.preventDefault(); submitEdu(e.target); } });
  app.addEventListener("input",function(e){ if(e.target.dataset&&e.target.dataset.etc){ var r=e.target.parentNode.querySelector("input[type=radio]"); if(r) r.checked=true; } if(e.target.id==="q"){ state.q=e.target.value; renderListGrid(); } });
  app.addEventListener("change",function(e){ if(e.target.dataset && e.target.dataset.th!==undefined){ var tv=e.target.dataset.th; if(!tv) state.themes=[]; else { var tk=state.themes.indexOf(tv); if(e.target.checked&&tk<0) state.themes.push(tv); if(!e.target.checked&&tk>=0) state.themes.splice(tk,1); } var tb=document.getElementById("thbox"); if(tb) tb.innerHTML=themeChecks(); renderListGrid(); return; } if(e.target.dataset && e.target.dataset.chk!==undefined){ var v=e.target.dataset.chk; if(!v) state.chs=[]; else { var k=state.chs.indexOf(v); if(e.target.checked&&k<0) state.chs.push(v); if(!e.target.checked&&k>=0) state.chs.splice(k,1); } paintChs(); renderListGrid(); return; } if(e.target.dataset && e.target.dataset.pet!==undefined){ state.pet=e.target.dataset.pet; saveUi(); var pb=document.getElementById("petbox"); if(pb) pb.innerHTML=petChecks(); renderListGrid(); return; } if(e.target.dataset && e.target.dataset.rg!==undefined){ var v=e.target.dataset.rg; if(v==="전체") state.regions=[]; else { var i=state.regions.indexOf(v); if(e.target.checked&&i<0) state.regions.push(v); if(!e.target.checked&&i>=0) state.regions.splice(i,1); } saveUi(); paintRegions(); renderListGrid(); } });
}
function paintLogo(){ var l=document.getElementById("logo"); if(l) l.innerHTML=logoSvg(30)+'<b class="wm">'+(PMODE?'다이어리뷰':'다꾸체험단')+'</b><span class="sr">'+SITE+'</span>'+(LOGO.name?'<em class="logo-ev">'+esc(LOGO.name)+'</em>':''); }

/* 구글 애널리틱스 GA4(2026-10-18, 측정 ID G-NK2TCS1QHH, index.html head): 화면 이동은 page_view 를 직접 보내고, 주요 버튼은 이벤트로 */
function ga(ev,p){ try{ if(window.gtag) window.gtag("event",ev,p||{}); }catch(e){} }
var GA_LAST="";
function gaPage(){ var h=location.hash||"#/"; if(h===GA_LAST) return; GA_LAST=h; ga("page_view",{page_location:location.origin+"/"+h, page_path:"/"+h.replace(/^#\/?/,""), page_title:document.title});
  if(state.tab==="item"){ var it=seed.items.filter(function(x){ return String(x.id)===String(state.itemId); })[0]; if(it) ga("view_item_detail",{item_id:it.id, item_name:it.name, item_category:catOf(it), source:it.source||"", closed:statusOf(it).key==="closed"}); }
  if(state.tab==="list"&&state.q) ga("search",{search_term:state.q}); }
document.addEventListener("click",function(e){
  var t=e.target, a;
  if((a=t.closest("[data-apply]"))) ga("apply_open",{item_id:a.getAttribute("data-apply")});
  else if((a=t.closest('.applym [data-m="go"]'))) ga("apply_go",{item_id:state.itemId||""});
  else if((a=t.closest(".dbar .dbl"))) ga("coupang_click",{place:"detail",item_id:state.itemId});
  else if((a=t.closest(".promom .phead,.promom .pmart"))) ga("promo_click",{place:"popup",promo:(seed.promo||{}).link||""});
  else if((a=t.closest(".promom .pmc"))) ga("promo_click",{place:"popup_item",item_name:(a.querySelector(".pmn")||{}).textContent||""});
  else if((a=t.closest(".pmband .phead"))) ga("promo_click",{place:"mid_banner",promo:(seed.promo||{}).link||""});
  else if((a=t.closest(".pmband .pmc"))) ga("promo_click",{place:"mid_banner_item",item_name:(a.querySelector(".pmn")||{}).textContent||""});
  else if((a=t.closest(".wb"))) ga("promo_click",{place:"wide_banner",promo:(a.querySelector(".wbt b")||{}).textContent||""});
  else if((a=t.closest(".kv"))&&a.querySelector(".part")) ga("promo_click",{place:"banner",promo:(seed.promo||{}).link||""});
  else if((a=t.closest(".gdl .hdi"))) ga("deal_click",{section:"grocery", item_name:(a.querySelector(".hdn")||{}).textContent||""});
  else if((a=t.closest(".tixgo"))){ var tb=a.closest(".tixc"); ga("coupang_click",{place:"tix", item_name:tb?tb.querySelector("b").textContent:""}); }
  else if((a=t.closest(".ldl .hdi"))) ga("deal_click",{section:"lifehot", item_name:(a.querySelector(".hdn")||{}).textContent||""});
  else if((a=t.closest(".tcard"))){ var sec=a.closest(".wxsec")?"weather":a.closest(".drel")?"detail_related":a.closest("#gold")?"goldbox":a.closest("#babyhd,.hdl")?"babyhot":"deals"; ga("deal_click",{section:sec, item_name:(a.querySelector(".tn")||{}).textContent||""}); }
  else if((a=t.closest("[data-reopen]"))) ga("reopen_alert",{item_id:a.getAttribute("data-reopen")});
  else if((a=t.closest("[data-fav]"))) ga("fav_toggle",{item_id:a.getAttribute("data-fav")});
  else if((a=t.closest("[data-ishare],[data-tshare]"))) ga("share",{item_id:a.getAttribute("data-ishare")||a.getAttribute("data-tshare")});
  else if((a=t.closest("[data-pushon]"))) ga("push_on_click",{});
  else if((a=t.closest(".prlock a"))) ga("press_lock_click",{});
},true);
function route(){
  var h=(location.hash||"").replace(/^#\/?/,""), parts=h.split("?"), tab=parts[0]||"home", qs={};
  (parts[1]||"").split("&").forEach(function(p){ var kv=p.split("="); if(kv[0]) qs[decodeURIComponent(kv[0])]=decodeURIComponent(kv[1]||""); });
  if(!PMODE&&PART_LIVE&&P_ONLY.test(tab)){ location.replace(PART_URL+"#/"+h); return; }
  if(PMODE&&!P_TABS.test(tab)){ location.replace(MAIN_URL+"#/"+h); return; }
  if(!/^(home|list|fav|map|benefit|shop|mag|tix|deals|reporter|press|contact|item|my|privacy|price|event|trip|edu|checkout|pjob|padmin|sites|season)$/.test(tab)) tab="home";
  state.tab=tab;
  if(tab==="item") state.itemId=qs.id||"";
  if(tab==="event") state.evAbr=qs.t==="abroad";
  if(tab==="trip") state.tq=qs.q||"";
  if(tab==="map") state.mapC=qs.c==="stay"||qs.c==="etc"||qs.c==="mag"?qs.c:"";
  if(tab==="mag") state.magT=qs.t==="p"?"p":qs.t==="g"?"g":"s";
  if(tab==="tix") state.tixI=qs.i||"";
  if(tab==="checkout") state.coK=qs.c||"";
  if(tab==="pjob") state.pjId=qs.id||"";
  state.focusT=(tab==="deals"&&qs.t)?qs.t:"";
  state.dq=(tab==="deals"&&qs.q)?qs.q:"";
  state.pq=(tab==="price"&&qs.q)?qs.q:"";
  if(tab==="list"){ if(qs.cat) state.cat=qs.cat; if(qs.s) state.status=qs.s; else if(qs.cat) state.status="open"; if(!parts[1]){ state.q=""; state.chs=[]; state.themes=[]; state.types=[]; state.srcs=[]; } if(qs.src!==undefined) state.srcs=qs.src?qs.src.split(",").filter(Boolean):[]; if(qs.ty!==undefined) state.types=qs.ty.split(",").filter(function(x){ return FTYPES.some(function(t){ return t[0]===x; }); }); if(qs.th!==undefined) state.themes=qs.th.split(",").filter(function(x){ return THEMES.some(function(t){ return t[0]===x; }); }); if(qs.q!==undefined) state.q=qs.q; if(qs.ch!==undefined) state.chs=qs.ch.split(",").filter(function(c){ return /^(blog|insta|clip|reels|youtube|tiktok|cafe|payback|review|coupang|musinsa|nshop|ohou|olive)$/.test(c); }); if(qs.o&&SORTS_OK.indexOf(qs.o)>=0) state.sort=qs.o; if(qs.p!==undefined) state.pet=(qs.p==='dog'||qs.p==='cat')?qs.p:''; if(qs.r!==undefined) state.regions=qs.r?qs.r.split(",").filter(function(r){ return REGIONS.indexOf(r)>=0; }):[]; saveUi(); }
  render(); window.scrollTo(0,0); if(!state.loading) gaPage();
  if(state.focusT) focusToss();
  if(state.tab==="deals"&&state.dq){ setTimeout(function(){ var i=document.getElementById("dq"); if(i){ i.value=state.dq; filterDeals(state.dq); } },0); }
}
function focusToss(){
  var el=document.getElementById("tk-"+state.focusT); if(!el){ if(state.loading) setTimeout(focusToss,300); return; }
  var card=el.closest(".tcard"); card.classList.add("tfocus"); card.scrollIntoView({block:"center"});
  setTimeout(function(){ card.classList.remove("tfocus"); },4000); state.focusT="";
}
function render(){
  var bb=document.getElementById("backbtn"); if(bb) bb.hidden=state.tab==="home";
  [].forEach.call(document.querySelectorAll(".tabbar a"),function(a){ var on=a.dataset.tab===state.tab; a.classList.toggle("on",on); if(on) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current"); });
  var v=document.getElementById("view");
  if(state.loading){ v.innerHTML='<div class="empty">불러오는 중…</div>'; return; }
  if(window.introDone){ window.introDone(); window.introDone=null; }
  if(!GA_LAST) setTimeout(gaPage,0);
  if(!window.introOn&&!PMODE) setTimeout(promoPopup,600);
  if(state.tab==="home") v.innerHTML=PMODE?pHomeView():homeView();
  else if(state.tab==="list"){ v.innerHTML=listView(); renderListGrid(); }
  else if(state.tab==="fav") v.innerHTML=favView();
  else if(state.tab==="map"){ v.innerHTML=mapView(); mapInit(); }
  else if(state.tab==="benefit") v.innerHTML=benefitView();
  else if(state.tab==="shop") v.innerHTML=shopView();
  else if(state.tab==="mag") v.innerHTML=magView();
  else if(state.tab==="sites") v.innerHTML=sitesView();
  else if(state.tab==="season") v.innerHTML=seasonView();
  else if(state.tab==="tix"){ v.innerHTML=tixView(); if(state.tixI!==""){ setTimeout(function(){ var e=document.getElementById("tix"+state.tixI); if(e) e.scrollIntoView({block:"center"}); },60); } }
  else if(state.tab==="deals") v.innerHTML=dealsView();
  else if(state.tab==="reporter") v.innerHTML=reporterView();
  else if(state.tab==="press"){ v.innerHTML=PMODE?pPressView():pressView(); pjList(); }
  else if(state.tab==="pjob"){ v.innerHTML=pjobView(); pjobInit(); }
  else if(state.tab==="padmin"){ v.innerHTML=padminView(); padminInit(); }
  else if(state.tab==="contact") v.innerHTML=contactView();
  else if(state.tab==="item") v.innerHTML=itemView();
  else if(state.tab==="my"){ v.innerHTML=myView(); pjMy(); }
  else if(state.tab==="privacy") v.innerHTML=privacyView();
  else if(state.tab==="event") v.innerHTML=eventView();
  else if(state.tab==="trip") v.innerHTML=tripView();
  else if(state.tab==="edu"){ v.innerHTML=eduView(); eduResume(); }
  else if(state.tab==="checkout"){ v.innerHTML=checkoutView(); coInit(); }
  else if(state.tab==="price"){ v.innerHTML=priceView(); if(state.pq) priceSearch(state.pq); }
  if(state.tab==="home"&&!PMODE) initFeed();
  if(state.tab==="home"&&PMODE) pjList(); else if(HOBS){ HOBS.disconnect(); HOBS=null; }
  if(state.tab==="deals") initMoreDeals(); else if(MDEAL.obs){ MDEAL.obs.disconnect(); MDEAL.obs=null; }
  tick(); startSliders(); plainHeads(v); guideFill(); if(state.tab==="item") dcdInit(); tkInit();
}
/* 모던&심플(2026-10-17): 섹션 제목 앞 이모지 빼기 */
function plainHeads(v){ [].forEach.call(v.querySelectorAll("h1,h2"),function(h){ var n=h.firstChild; if(n&&n.nodeType===3) n.nodeValue=n.nodeValue.replace(/^[\s\u2600-\u27BF\uFE0F\u200D]*(?:[\uD83C-\uD83E][\uDC00-\uDFFF][\uFE0F\u200D]*)*\s*/,""); }); }

/* ---------- 공통 카드 ---------- */
var NEWOK=null;
function newOk(){ if(NEWOK!==null) return NEWOK; var open=seed.items.filter(function(it){ return statusOf(it).key==="open"; }); var n=open.filter(function(it){ return (Date.now()-(it.createdAt||0))<864e5; }).length; NEWOK=open.length>0 && n/open.length<0.4; return NEWOK; }
function thumb(it,cls){
  var s=statusOf(it), img=safeUrl(it.image), view=safeUrl(it.infUrl||it.viewUrl);
  var isNew=newOk() && (Date.now()-(it.createdAt||0))<864e5 && s.key!=="closed";
  return '<div class="th '+(cls||"")+(s.hot&&s.key==="open"?" hotth":"")+'">'+
    '<a href="'+itemHref(it)+'" aria-label="'+esc(it.name)+' 자세히 보기">'+
      '<span class="ph">'+esc(it.region||"")+'</span>'+(img?'<img src="'+esc(img)+'" alt="'+esc(it.name)+'" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">':'')+
    '</a>'+
    (it.region?'<span class="rgs">📍 '+esc(it.region)+'</span>':'')+
    (isTodayEnd(it)?'<span class="cdst"><em>⏰ 오늘 마감</em><b data-cdx>'+clock(msToMidnight())+'</b></span>':'<span class="dd '+(s.key==="closed"?"off":(s.hot?"hot":""))+'">'+esc(s.dday)+'</span>')+
    (isPick(it)&&s.key!=="closed"?'<span class="pks">💜 추천</span>':'')+
    (isNew?'<span class="nws" aria-label="새로 올라옴">✨</span>':'')+
    (s.key==="closed"?'<a class="closedov" href="'+esc(kakaoUrl())+'" target="_blank" rel="noopener noreferrer"><b>모집 마감</b><span>🔔 다음 모집 알림받기</span></a>':'')+
    '<button class="shb" data-ishare="'+esc(it.id)+'" aria-label="'+esc(it.name)+' 공유하기">'+ico(I.send)+'</button>'+
    '<button class="fv'+(isFav(it.id)?" on":"")+'" data-fav="'+esc(it.id)+'" aria-label="찜하기" aria-pressed="'+isFav(it.id)+'">'+ico(I.heart)+'</button>'+
  '</div>';
}
/* 상세 페이지·가격보기 (2026-10-18 시온님 요청): 사진·이름은 사이트 상세 페이지로, 쿠팡은 "가격보기 ↗ 광고" 작은 링크로만. 페이백·구매평 체험단은 쿠팡 링크 없음(파트너스 운영정책 2.2 회색지대). */
function itemHref(it){ return '#/item?id='+encodeURIComponent(it.id); }
function adOk(it){ return true; } /* 페이백·구매평도 쿠팡 링크 표시(2026-10-18 시온님 결정, 제재 오면 다시 막기) */
function priceUrl(it){ return adOk(it)?safeUrl(it.infUrl||it.viewUrl):""; }
var CARD_PRICE=false; /* 카드의 가격보기 링크: 2026-10-18 시온님 요청으로 뺌(상세 페이지 아래 버튼에만). 다시 넣으려면 true */
function priceLink(it,big){ if(!CARD_PRICE) return ''; var u=priceUrl(it); if(!u) return ''; var c=catOf(it)==="stay";
  return big?'<a class="b pbig" '+ext(u)+'>'+(c?'숙소 가격보기':'상품 가격보기')+' <span class="via">'+(c?'쿠팡트래블':'쿠팡')+' ↗</span></a>'
            :'<a class="pricel" '+ext(u)+'>'+(c?'숙소 가격보기':'상품 가격보기')+'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg></a>'; }
function applyBtn(it,cls){ var s=statusOf(it), a=safeUrl(it.refUrl||it.applyUrl); if(s.key==="closed") return '<span class="b dis'+(cls?' '+cls:'')+'">마감</span>'; return a?'<a class="b pri'+(cls?' '+cls:'')+'" href="'+esc(a)+'" target="_blank" rel="noopener noreferrer" data-apply="'+esc(it.id)+'">신청하기</a>':''; }
function worthLine(it){ return it.worth?'<p class="worth">💰 '+esc(it.worth)+' 상당</p>':''; }
/* 경쟁률: item.ap=[지원자, 모집인원] (각 체험단 사이트에서 직접 읽음, data.json apAt 기준 시각) */
function apOf(it){ var a=it.ap; return Array.isArray(a)&&a.length>=2&&+a[1]>0&&statusOf(it).key!=="closed"?[+a[0]||0,+a[1]]:null; }
function apRatio(it){ var a=apOf(it); return a?a[0]/a[1]:Infinity; }
function apLine(it){ var a=apOf(it); if(!a) return ''; var r=a[0]/a[1];
  if(!a[0]) return '<p class="apl low">모집 '+a[1].toLocaleString()+' · <b>아직 지원자 없음</b></p>';
  return '<p class="apl'+(r<=1.5?' low':'')+'">지원 '+a[0].toLocaleString()+' · 모집 '+a[1].toLocaleString()+' <b>'+(r<10?r.toFixed(1):Math.round(r))+':1</b></p>'; }
function cdLine(it){ return ''; } /* 오늘 마감 시계는 사진 위 스티커(thumb, cdst)로 옮김 2026-10-18 시온님 요청 */
function isTodayEnd(it){ return statusOf(it).dday==="오늘 마감"; }
function miniCard(it,btns){
  var act='';
  if(btns){ var s=statusOf(it), view=safeUrl(it.infUrl||it.viewUrl), apply=safeUrl(it.refUrl||it.applyUrl), c=catInfo(catOf(it))||{};
    act=priceLink(it)?'<div class="act3">'+priceLink(it)+'</div>':''; }
  return '<article class="mini">'+thumb(it)+chBadges(it)+'<h3><a class="tl" href="'+itemHref(it)+'">'+esc(it.name)+'</a></h3>'+worthLine(it)+'<p class="bn">🎁 '+esc(it.benefit)+'</p>'+cdLine(it)+apLine(it)+act+'</article>';
}
function fullCard(it){
  var s=statusOf(it), view=safeUrl(it.infUrl||it.viewUrl), apply=safeUrl(it.refUrl||it.applyUrl), c=catInfo(catOf(it))||{};
  var closed=s.key==="closed";
  return '<article class="card'+(closed?" closed":"")+'">'+thumb(it)+
    '<div class="body">'+chBadges(it)+'<h3><a class="tl" href="'+itemHref(it)+'">'+esc(it.name)+'</a></h3>'+worthLine(it)+'<p class="bn">🎁 '+esc(it.benefit)+'</p>'+cdLine(it)+apLine(it)+
    '<p class="pd">🗓️ '+(it.start?fmt(it.start)+' ':'')+'~ '+fmt(it.end)+' 모집 · '+esc(it.source||"")+'</p>'+
    priceLink(it)+'</div></article>';
}
function babyDeals(){
  var now=Date.now(), seen={};
  var a=(Array.isArray(seed.babyDeals)?seed.babyDeals:[]).concat((Array.isArray(seed.babyGold)?seed.babyGold:[]).filter(function(g){ return /출산|유아/.test(g.cat||""); }));
  return a.filter(function(x){ var k=(x.name||"").slice(0,12); if(!safeUrl(x.u)||seen[k]||(x.endAt&&Date.parse(x.endAt)<=now)) return false; seen[k]=1; return true; });
}
var GROC_RE=/식품|생활용품|두부|우유|계란|달걀|쌀|라면|김치|과일|사과|귤|바나나|채소|야채|고기|돼지|한우|닭|생수|커피|과자|햄|참치|스팸|김\b|즉석|간편|밀키트|휴지|화장지|물티슈|세제|섬유유연제|샴푸|바디워시|치약|칫솔|키친타올|비누|생리대|기저귀/;
function groceryList(){
  var ln={}; lifeDeals().forEach(function(x){ ln[(x.name||"").slice(0,12)]=1; });
  var seen={}, L=liveGold().concat((Array.isArray(seed.moreDeals)?seed.moreDeals:[]).filter(function(x){ return x.k==="식품"||x.k==="생활용품"||GROC_RE.test(x.name||""); }));
  return L.filter(function(x){ if(!safeUrl(x.u)||seen[x.u]||ln[(x.name||"").slice(0,12)]||(x.endAt&&Date.parse(x.endAt)<=Date.now())) return false; if(x.k!=="식품"&&x.k!=="생활용품"&&!GROC_RE.test(x.name||"")) return false; seen[x.u]=1; return true; }).sort(byPrice);
}
function groceryDeal(){
  var L=groceryList(); if(L.length<4) return "";
  return '<section class="hdl gdl"><div class="hdh"><span class="hdk">🛒 쿠팡 식품·생필품</span><b>오늘 장보기 특가</b><small>골드박스·카테고리 베스트에서 골랐어요</small></div>'+
    '<div class="hdr">'+L.slice(0,12).map(function(x){ var img=safeUrl((x.img||"").replace("230x230ex","492x492ex"));
      return '<a class="hdi" data-gsec="grocery" '+ext(safeUrl(x.u))+'><span class="hdm">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'')+(x.rate?'<i>'+esc(String(x.rate).replace("%",""))+'%</i>':'')+'</span><span class="hdn">'+esc(x.name)+'</span><span class="hdp"><b>'+esc(x.price||"")+'</b>'+(x.orig?'<s>'+esc(x.orig)+'</s>':'')+'</span></a>'; }).join("")+'</div></section>';
}
function hotDeal(){
  var L=babyDeals(); if(L.length<2) return "";
  return '<section class="hdl"><div class="hdh"><span class="hdk">👶 쿠팡 골드박스</span><b>오늘의 아기용품 핫딜</b><small>⏳ 오전 7시 마감까지 <em data-hd>'+clock(nextSeven())+'</em></small></div>'+
    '<div class="hdr">'+L.slice(0,10).sort(byPrice).map(function(x){ var img=safeUrl((x.img||"").replace("230x230ex","492x492ex"));
      return '<a class="hdi" '+ext(safeUrl(x.u))+'><span class="hdm">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'')+(x.rate?'<i>'+esc(String(x.rate).replace("%",""))+'%</i>':'')+'</span><span class="hdn">'+esc(x.name)+'</span><span class="hdp"><b>'+esc(x.price||"")+'</b>'+(x.orig?'<s>'+esc(x.orig)+'</s>':'')+'</span></a>'; }).join("")+'</div></section>';
}
/* 오늘의 생활용품 핫딜(2026-10-20 시온님 요청): data.json lifeDeals = 07:23 작업이 골드박스 화면 카드에서 생활용품만 고름(scripts/life_deals.py) */
function lifeDeals(){ var now=Date.now(), seen={}; return (Array.isArray(seed.lifeDeals)?seed.lifeDeals:[]).filter(function(x){ var k=(x.name||"").slice(0,12); if(!safeUrl(x.u)||seen[k]||(x.endAt&&Date.parse(x.endAt)<=now)) return false; seen[k]=1; return true; }); }
function lifeHot(){
  var L=lifeDeals(); if(L.length<2) return "";
  return '<section class="hdl ldl"><div class="hdh"><span class="hdk">🧺 쿠팡 골드박스</span><b>오늘의 생활용품 핫딜</b><small>⏳ 오전 7시 마감까지 <em data-hd>'+clock(nextSeven())+'</em></small></div>'+
    '<div class="hdr">'+L.slice(0,12).sort(byPrice).map(function(x){ var img=safeUrl(x.img||"");
      return '<a class="hdi" data-gsec="lifehot" '+ext(safeUrl(x.u))+'><span class="hdm">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'')+(x.rate?'<i>'+esc(String(x.rate).replace("%",""))+'%</i>':'')+'</span><span class="hdn">'+esc(x.name)+'</span><span class="hdp"><b>'+esc(x.price||"")+'</b>'+(x.orig?'<s>'+esc(x.orig)+'</s>':'')+'</span></a>'; }).join("")+'</div></section>';
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
  out.push({href:"#/deals",em:"🏃",kicker:"매일 오전 7시 바뀌어요",title:"오늘의 특가 보기",bg:"#fff0f0",tile:"#e5484d",ink:"#b42318",icon:I.gift});
  if(BENEFIT_ON&&f.roulette) out.push({href:"#/benefit",em:"🎡",kicker:"하루 한 번 무료",title:"룰렛 돌리고 선물 받아가기 🎉",bg:"#f4f0ff",tile:"#6a3fc8",ink:"#4b2a9e",icon:I.wheel});
  if(BENEFIT_ON&&f.quiz) out.push({href:"#/benefit",em:"🤔",kicker:"하루 한 문제",title:"인기상품 가격 맞히기",bg:"#fff3e6",tile:"#e0782a",ink:"#9a4a0e",icon:I.quiz});
  if(BENEFIT_ON&&f.search) out.push({href:"#/benefit",em:"📈",kicker:"요즘 많이 찾는 숙소",title:"인기 검색어 보기",bg:"#eef3ff",tile:"#2f6bff",ink:"#1d4ed8",icon:I.trend});
  out.push({href:"#/list?s=closing",em:"⏰",kicker:"3일 안에 끝나요",title:"마감 임박 체험단 보기 🏃",bg:"#eef8f3",tile:"#1f7a5a",ink:"#14573f",icon:I.flame});
  return out;
}
function leftText(it){ var s=statusOf(it); if(s.key==="closed") return "모집 마감"; var d=daysLeft(it); return d<=0?"오늘 마감":d+"일 남음"; }
function hcard(it){
  var c=catMeta(catOf(it))||{}, view=safeUrl(it.infUrl||it.viewUrl), d=daysLeft(it);
  var tags='<span class="htags">'+(it.region?'<span class="htg">📍 '+esc(it.region)+'</span>':'')+'<span class="htg">'+esc((c.em||"")+" "+(c.t||""))+'</span></span>';
  var t='<a href="'+itemHref(it)+'">'+esc(it.name)+'</a>';
  return '<article class="hc">'+thumb(it,"hth")+tags+
    (isTodayEnd(it)?'':'<p class="hl"><b class="'+(d<=1?'hot':'')+'">'+leftText(it)+'</b></p>')+
    chBadges(it)+'<h3>'+t+'</h3>'+(it.worth?'<p class="hw">💰 <b>'+esc(it.worth)+'</b> 상당</p>':'<p class="hbn">🎁 '+esc(it.benefit)+'</p>')+apLine(it)+hact(it)+'</article>';
}
function bizLine(){ var b=seed.biz; if(!b||!b.name) return ""; var x=[["상호",b.name],["대표",b.ceo],["사업자등록번호",b.regNo],["통신판매업 신고",b.mailOrder],["주소",b.addr],["이메일",b.email],["전화",b.tel]].filter(function(r){ return r[1]; });
  return '<p class="biz"><b>다꾸체험단 · 운영 '+esc(b.name)+'</b><br>'+x.map(function(r){ return '<span>'+r[0]+' '+esc(r[1])+'</span>'; }).join("")+'</p>'; }
function hact(it){
  var s=statusOf(it), view=safeUrl(it.infUrl||it.viewUrl), apply=safeUrl(it.refUrl||it.applyUrl), c=catInfo(catOf(it))||{};
  if(!view&&!apply) return "";
  var pl=priceLink(it); return pl?'<div class="hact">'+pl+'</div>':'';
}
function hrow(title,more,list,sub){
  if(!list.length) return "";
  return '<section class="hsec"><div class="hsh"><h2>'+title+'</h2>'+(more?'<a class="hmore" href="'+more+'">더 보기 ›</a>':'')+'</div>'+(sub||"")+
    '<div class="hs">'+list.slice(0,10).map(hcard).join("")+'</div></section>';
}
var HOME_MENU=[ /* 2026-10-21 시온님: 공짜여행 빼고, 마감임박 옆 재택알바·매거진·블로그, 숙박 옆 티켓. 윗줄/아랫줄은 숙박에서 나눔 */
  ["✨","오늘 오픈","#/list?cat=all&s=todayOpen","NEW"],["⏰","마감임박","#/list?cat=all&s=closing","HOT"],["💻","재택알바","#/press"],["📚","매거진","#/mag"],["📝","블로그","#/list?cat=all&s=open&ch=blog"],["📸","인스타그램","#/list?cat=all&s=open&ch=insta"],["🎬","숏폼","#/list?cat=all&s=open&ch=clip,reels,youtube"],["🎁","혜택","#/benefit"],["🔗","바로가기","#/sites"],
  ["🏨","숙박","#/list?cat=stay&s=open"],["🎟️","티켓","#/list?cat=etc"],["👶","육아","#/list?cat=baby"],["💄","뷰티","#/list?cat=beauty"],["🧺","생활","#/list?cat=life"],["🔌","가전/가구","#/list?cat=elec"],["💊","건강식품","#/list?cat=health"],["🐾","반려동물","#/list?cat=pet"],["👗","패션","#/list?cat=fashion"]
].filter(function(m){ return BENEFIT_ON||m[2]!=="#/benefit"; });
/* 슬라이드 배너 위 한 줄 소식 (2026-10-18 시온님 요청). 지어낸 이용자 후기는 쓰지 않고 data.json 실제 숫자만 */
function manW(v){ return v>=10000?Math.round(v/10000).toLocaleString()+"만원":v.toLocaleString()+"원"; }
function tickerHtml(open){
  var td=ymd(today()), L=[], cat=function(it){ var c=CAT_ORDER.filter(function(m){ return m.k===catOf(it); })[0]; return c?c.t:"체험단"; };
  var sum=0, n=0; open.forEach(function(it){ var v=valOf(it); if(v>0&&v<5e6){ sum+=v; n++; } });
  if(sum) L.push(['💰','모집 중 '+open.length+'곳 · 제공 금액 <b>'+manW(Math.floor(sum/10000)*10000)+' 이상</b>','#/list?cat=all&s=open']);
  var fr=open.filter(isNewToday).length; if(fr) L.push(['✨','오늘 새로 올라온 체험단 <b>'+fr+'곳</b>','#/list?cat=all&s=open']);
  var top=open.slice().sort(function(a,b){ return valOf(b)-valOf(a); }).filter(function(it){ return valOf(it)>0; }).slice(0,3);
  top.forEach(function(it){ L.push(['🎁','['+cat(it)+'] '+esc(it.name.replace(/\s*\(.*?\)\s*$/,""))+' <b>'+manW(valOf(it))+' 상당</b> 모집 중','#/item?id='+encodeURIComponent(it.id)]); });
  var ce=open.filter(function(it){ return it.end===td; }).length; if(ce) L.push(['⏰','오늘 마감 체험단 <b>'+ce+'곳</b>','#/list?cat=all&s=todayClose']);
  var easy=open.filter(function(it){ return apRatio(it)<=1.5; }).length; if(easy) L.push(['🙌','경쟁률 1.5:1 이하 체험단 <b>'+easy+'곳</b>','#/list?cat=all&s=open&o=comp']);
  if(!L.length) return "";
  return '<div class="tkr" aria-live="off"><div class="tkw"><div class="tkl">'+L.map(function(x){ return '<a class="tki" href="'+x[2]+'"><span class="tke">'+x[0]+'</span><span class="tkt">'+x[1]+'</span></a>'; }).join("")+'</div></div><span class="tka" aria-hidden="true">⌃<br>⌄</span></div>';
}
var tkT; function tkInit(){ clearInterval(tkT); var l=document.querySelector(".tkl"); if(!l) return; var n=l.children.length, i=0; if(n<2) return; tkT=setInterval(function(){ if(!document.body.contains(l)){ clearInterval(tkT); return; } i=(i+1)%n; l.style.transform="translateY(-"+(i*44)+"px)"; },3200); }
function homeView(){
  var td=ymd(today()), open=seed.items.filter(function(it){ return statusOf(it).key==="open"; });
  var h=tickerHtml(open)+slideBanners(false);
  var hmA=function(m){ return '<a href="'+m[2]+'"'+(m[3]?' class="hmhot"':'')+'><span class="hmi">'+m[0]+(m[3]?'<i class="hmb">'+m[3]+'</i>':'')+'</span><span>'+m[1]+'</span></a>'; }, hmH=HOME_MENU.findIndex(function(m){ return m[1]==="숙박"; }); if(hmH<1) hmH=Math.ceil(HOME_MENU.length/2);
  h+='<nav class="hmenu hms" aria-label="바로가기"><div class="hmr">'+HOME_MENU.slice(0,hmH).map(hmA).join("")+'</div><div class="hmr">'+HOME_MENU.slice(hmH).map(hmA).join("")+'</div></nav>';
  var closingToday=open.filter(function(it){ return it.end===td; });
  h+=wideBanners(open,closingToday);
  var byNew=function(a,b){ return (b.createdAt||0)-(a.createdAt||0); };
  var fresh=open.filter(function(it){ return (Date.now()-(it.createdAt||0))<3*864e5; }).sort(byNew);
  h+=hrow('✨ <em>새로 올라온</em> 체험단','#/list?cat=all&s=open',fresh);
  var picks=open.filter(isPick).sort(byDeadline);
  h+=hrow('💜 지금 <em>인기 있는</em> 체험단','#/list?cat=all&s=pick',picks);
  var soon=open.filter(function(it){ return daysLeft(it)<=3; }).sort(function(a,b){ return daysLeft(a)-daysLeft(b); });
  h+=hrow('⏰ <em>곧 마감!</em> 지금 신청하세요','#/list?cat=all&s=closing',soon);
  var baby=open.filter(function(it){ return catOf(it)==="baby"; }).sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
  h+=hrow('👶 <em>육아</em> 체험단도 있어요','#/list?cat=baby&s=open',baby);
  var tdy=ymd(today()), easy=open.filter(function(it){ return apRatio(it)<=1.5 && it.end!==tdy; }).sort(function(a,b){ return apRatio(a)-apRatio(b) || valOf(b)-valOf(a); });
  h+=hrow('🙌 <em>경쟁률 낮은</em> 체험단','#/list?cat=all&s=open&o=comp',easy);
  [["beauty","💄 <em>뷰티</em> 체험단"],["health","💊 <em>건강식품</em> 체험단"],["life","🧺 <em>생활</em> 체험단"],["elec","🔌 <em>가전/가구</em> 체험단"],["pet","🐾 <em>반려동물</em> 체험단"]].forEach(function(c){
    var l=open.filter(function(it){ return catOf(it)===c[0]; }).sort(function(a,b){ return valOf(b)-valOf(a) || (b.createdAt||0)-(a.createdAt||0); });
    if(l.length>=3) h+=hrow(c[1],'#/list?cat='+c[0]+'&s=open',l);
  });
  var pool=open.filter(function(it){ return /풀빌라|풀 ?빌라/.test(it.name+" "+it.benefit); }).sort(byDeadline);
  if(pool.length>=2) h+='<section class="promo"><div class="pl"><small>물놀이 걱정 없는</small><b>풀빌라<br>체험단</b><a href="#/list?cat=stay&s=open&q=%ED%92%80%EB%B9%8C%EB%9D%BC">모두 보기 ›</a></div><div class="pr">'+pool.slice(0,6).map(function(it){ var img=safeUrl(it.image), v=safeUrl(it.infUrl||it.viewUrl);
      return '<a class="pi" '+(v?ext(v):'href="#/list"')+'>'+(img?'<span class="pimg"><img src="'+esc(img)+'" alt="" loading="lazy" referrerpolicy="no-referrer"><em>'+esc(it.region||"")+'</em></span>':'')+'<span class="pt"><b>'+esc(it.name)+'</b><small>'+leftText(it)+'</small></span></a>'; }).join("")+'</div></section>';
  var regs=wantRegs(), regTitle;
  if(!regs.length){ var cnt={}; open.forEach(function(it){ if(it.region) cnt[it.region]=(cnt[it.region]||0)+1; }); var top=Object.keys(cnt).sort(function(x,y){ return cnt[y]-cnt[x]; })[0]; if(top) regs=[top]; regTitle='📍 지금 <em>'+esc(regs[0]||"")+'</em> 체험단이 많아요'; }
  else regTitle='📍 <em>관심 지역</em>의 체험단이에요';
  if(regs.length) h+=hrow(regTitle,'#/list?cat=stay&s=open&r='+encodeURIComponent(regs.join(",")),open.filter(function(it){ return regs.indexOf(it.region)>=0; }).sort(byDeadline));
  var gd=groceryDeal(); if(gd) h+='<div class="hpad">'+gd+'</div>';
  var wx=wxSection(); if(wx) h+='<div class="hpad">'+wx+'</div>';
  var hd=hotDeal(); if(hd) h+='<div class="hpad">'+hd+'</div>'; var lh=lifeHot(); if(lh) h+='<div class="hpad">'+lh+'</div>'; var cb=cheapBtn(); if(cb) h+='<div class="hpad">'+cb+'</div>'; // 오늘의 특가(골드박스)는 홈에서 숨김 (2026-10-14 시온님 요청)
  var up=CAT_ORDER.filter(function(m){ return !isOpenCat(m.k) && UPCOMING.some(function(u){ return u.k===m.k||u.t===m.t; }); });
  if(up.length) h+='<a class="upbox" '+ext(kakaoUrl())+'><span class="ul"><small>곧 열려요 ✨</small><b>'+up.map(function(m){ return m.em+' '+esc(m.t); }).join(" · ")+' 체험단</b></span><span class="ug">🔔 오픈 알림</span></a>';
  if(!pushOn()) h+=pushBox().replace('class="pushbox"','class="pushbox hpb"');
  var gb=[];
  if(rep()) gb.push(['#/reporter','','#6aa8ff','#4338ca','✍️','다꾸 기자단 모집','후기 쓰고 1만원 상품권 받아요']);
  gb.push([kakaoUrl(),'ext','#5eead4','#16a34a','🔔','새로 나온 체험단 알림','매일 아침 카톡으로 먼저 받아요']);
  if(BENEFIT_ON) gb.push(['#/benefit','','#ffc46b','#f43f5e','🎁','오늘의 혜택 모음','룰렛 · 쿠폰 · 이벤트 한곳에']);
  h+='<div class="gbs">'+gb.map(function(g){ return '<a class="gb" '+(g[1]?ext(g[0]):'href="'+g[0]+'"')+' style="--g1:'+g[2]+';--g2:'+g[3]+'"><span class="gt"><b>'+g[5]+'</b><small>'+g[6]+'</small></span><span class="ge">'+g[4]+'</span></a>'; }).join("")+'</div>';
  // 끝없는 스크롤: 모집 중 체험단 전부 → 이어서 특가 전부 (조금씩 이어 붙임)
  HFEED.items=open.slice().sort(byNew).slice(0,72); HFEED.deals=homeDeals().slice(0,20); HFEED.i=0; HFEED.j=0;
  h+='<div class="hpad" data-guides></div>';
  h+='<section class="hsec"><div class="hsh"><h2>다른 체험단도 둘러볼까요?</h2></div><div class="htool"><span>총 <b>'+open.length+'</b>개</span><a class="hflt" href="#/list?cat=all&s=open">⚙️ 필터</a></div>'+
    '<div class="grid v2 hgrid" id="hfeed"></div></section>';
  if(HFEED.deals.length) h+='<section class="hsec hdeals" id="hdealsec" hidden><div class="hsh"><h2>🔥 오늘의 <em>특가</em> 모아보기</h2><a class="hmore" href="#/deals">특가 탭 ›</a></div><div class="tgrid hgrid" id="hdfeed"></div><p class="fine">특가 링크는 제휴 링크로, 구매 시 다꾸가 수수료를 받을 수 있어요. 가격과 할인은 판매처 사정에 따라 바뀔 수 있어요.</p></section>';
  h+='<div id="hsent" class="hsent" aria-hidden="true"></div>';
  h+='<div class="hallw"><a class="b pri wide" href="#/list?cat=all&s=open">모집 중인 체험단 '+open.length+'개 전체 보기 ›</a></div>';
  if(false) /* 2026-10-21 시온님 "광고·제휴 문의하기 일단 숨겨줘" — 다시 보이려면 if(false) 를 지움 */ h+='<section class="adbox"><h2>혹시, <em>체험단 모집</em>이나 <em>광고 상담</em>이<br>필요하신가요?</h2><p>간단히 문의만 남겨주시면 바로 안내해 드릴게요.</p><a class="b pri" href="#/contact">광고·제휴 문의하기 ›</a></section>';
  return h;
}

/* ---------- 홈 끝없는 스크롤 ---------- */
var HFEED={items:[],deals:[],i:0,j:0}, HOBS=null;
function pnum(x){ var n=parseInt(String(x&&x.price||"").replace(/[^0-9]/g,""),10); return isNaN(n)?1e12:n; }
function byPrice(a,b){ return pnum(a)-pnum(b); }
function homeDeals(){
  var seen={}, out=[];
  function add(x){ var u=safeUrl(x.u); if(!u||seen[u]) return; seen[u]=1; out.push(x); }
  liveToss().filter(function(x){ return !x.soldOut; }).forEach(add);
  babyDeals().forEach(function(x){ add({name:x.name,u:x.u,img:safeUrl((x.img||"").replace("230x230ex","492x492ex")),price:x.price,rate:x.rate?String(x.rate).replace("%","")+"%":"",endAt:x.endAt}); });
  liveGold().forEach(function(x){ add(x.rate?x:Object.assign({},x,{badge:x.badge||"골드박스 특가"})); });
  return out.sort(byPrice);
}
function feedMore(){
  var g=document.getElementById("hfeed"); if(!g) return false;
  if(HFEED.i<HFEED.items.length){
    var next=HFEED.items.slice(HFEED.i,HFEED.i+12); HFEED.i+=next.length;
    g.insertAdjacentHTML("beforeend",next.map(fullCard).join("")); return true;
  }
  var d=document.getElementById("hdfeed"); if(!d) return false;
  var sec=document.getElementById("hdealsec"); if(sec) sec.hidden=false;
  if(HFEED.j<HFEED.deals.length){
    var nd=HFEED.deals.slice(HFEED.j,HFEED.j+10); HFEED.j+=nd.length;
    d.insertAdjacentHTML("beforeend",nd.map(tossCard).join("")); return true;
  }
  return false;
}
function initFeed(){
  if(HOBS){ HOBS.disconnect(); HOBS=null; }
  var s=document.getElementById("hsent"); if(!s) return;
  feedMore(); feedMore();
  if(!("IntersectionObserver" in window)){ while(feedMore()); return; }
  HOBS=new IntersectionObserver(function(es){ if(es.some(function(e){ return e.isIntersecting; })){ if(!feedMore()){ HOBS.disconnect(); HOBS=null; } } },{rootMargin:"800px 0px"});
  HOBS.observe(s);
}

/* ---------- 체험단 목록 ---------- */
var STATUSES=[["open","🔥 모집중"],["todayOpen","✨ 오늘 오픈"],["todayClose","🚨 오늘 마감"],["closing","⏰ 마감 임박"],["pick","💜 추천"],["closed","🔒 마감"]];
function listView(){
  var c=catInfo(state.cat);
  return '<div class="lv">'+
    '<label class="search">'+ico(I.search)+'<input id="q" type="search" placeholder="지역·숙소 이름 검색" value="'+esc(state.q)+'" autocomplete="off" aria-label="체험단 검색"></label><div id="rqbox" class="rqbox" hidden></div>'+
    '<div class="catrow">'+[{k:"all",t:"전체",em:"🌈"}].concat(CAT_ORDER.filter(function(m){ return isOpenCat(m.k); }),CAT_ORDER.filter(function(m){ return !isOpenCat(m.k); })).map(function(m){ var on=m.k===state.cat; return '<button class="cat'+(on?" on":"")+'" data-cat="'+m.k+'" aria-pressed="'+on+'"><span class="em">'+m.em+'</span>'+esc(m.t)+'</button>'; }).join("")+'</div>'+
    (c?'<div class="chips hs">'+STATUSES.map(function(s){ return '<button class="chip'+(s[0]===state.status?" on":"")+'" data-status="'+s[0]+'">'+s[1]+'</button>'; }).join("")+'</div>'+
      '<div class="fbrow"><div class="fbar" id="fbar">'+fbarHtml()+'</div>'+
        '<label class="sortsel sortpill"><span class="sr">정렬</span><select id="sort" aria-label="정렬 순서" style="width:'+sortW(state.sort)+'px">'+SORTS.map(function(o){ return '<option value="'+o[0]+'"'+(o[0]===state.sort?' selected':'')+'>'+o[1].replace(/^\S+\s/,"")+'</option>'; }).join("")+'</select></label></div>'+
      '<div id="toprows"></div>'+
      '<div class="tools"><span id="count" class="count"></span><span class="tr">'+
        '<button class="viewbtn" data-view aria-label="보기 방식 바꾸기 (지금 '+state.view+'단)">'+viewIcon()+'</button></span></div>'+
      prefNote(state.cat)+
      '<div id="grid" class="grid v'+state.view+'"></div>'
    : soonView(catMeta(state.cat)))+
  '</div>';
}
var CHN={payback:"💰 페이백",review:"⭐ 구매평",blog:"📝 블로그",insta:"📸 인스타그램",clip:"🎬 클립",reels:"🎞️ 릴스",youtube:"▶️ 유튜브",tiktok:"🎵 틱톡",cafe:"👩‍👧 맘카페",coupang:"🛒 쿠팡 리뷰",musinsa:"👕 무신사 후기",nshop:"🛍️ 네이버 구매평",ohou:"🏠 오늘의집 리뷰",olive:"💚 올리브영 리뷰"};
var CHL={blog:"블로그",insta:"인스타",clip:"클립",reels:"릴스",youtube:"유튜브",tiktok:"틱톡",cafe:"맘카페",coupang:"쿠팡 리뷰",musinsa:"무신사 후기",nshop:"네이버 구매평",ohou:"오늘의집 리뷰",olive:"올리브영 리뷰",short:"숏폼",payback:"페이백",review:"구매평",premier:"프리미어 전용",ret:"회수형"};
/* 리뷰를 남기는 쇼핑몰도 작성 채널로(2026-10-21 시온님 요청: 쿠팡·무신사 등). ch 에 직접 넣거나, 제공내역·모집 사이트 글자로 판단 */
var PLAT_CH=["coupang","musinsa","nshop","ohou","olive"];
function platOf(it){ var b=String(it.benefit||"")+" "+String(it.name||""), o=[];
  if(it.source==="무신사"||/무신사\s*체험단|무신사\s*(후기|리뷰)/.test(b)) o.push("musinsa");
  if(/쿠팡\s*(구매평|리뷰|포토\s*리뷰|상품평)|쿠팡리뷰/.test(b)) o.push("coupang");
  if(/네이버\s*(구매평|쇼핑\s*리뷰|스토어\s*리뷰)|스마트\s*스토어\s*(구매평|리뷰)/.test(b)) o.push("nshop");
  if(/오늘의집\s*(구매평|리뷰)|오늘의집\+/.test(b)) o.push("ohou");
  if(/올리브영\s*(구매평|리뷰)/.test(b)) o.push("olive");
  (Array.isArray(it.ch)?it.ch:[]).forEach(function(x){ if(PLAT_CH.indexOf(x)>=0&&o.indexOf(x)<0) o.push(x); });
  return o; }
function chOf(it){ var c=it.ch; if(typeof c==="string") c=c?[c]:[]; if(!Array.isArray(c)) c=[]; var pl=platOf(it), o=c.filter(function(x){ return x!=="review"&&PLAT_CH.indexOf(x)<0; });
  if(o.length) return o.concat(pl); if(pl.length) return pl; return ((c.length||it.pay)?[]:["blog"]); }
function payOf(it){ var p=(it.pay||[]).slice(), b=it.benefit||""; if(/회수형/.test(b)&&p.indexOf("ret")<0) p.push("ret"); if(/페이백|선결제/.test(b)&&p.indexOf("payback")<0) p.push("payback"); if((/구매평/.test(b)||(it.ch||[]).indexOf("review")>=0)&&p.indexOf("review")<0) p.push("review"); return p; }
function chBadge(c){ return '<span class="chb chb-'+c+'">'+(CHL[c]||c)+'</span>'; }
function chBadges(it){ var P=payOf(it).filter(function(x){ return x!=="review"||!platOf(it).length; }), O=["premier","ret"], b=P.filter(function(x){ return O.indexOf(x)>=0; }).concat(P.filter(function(x){ return O.indexOf(x)<0; })).concat(chOf(it)); return b.length?'<div class="chbs">'+b.map(chBadge).join("")+'</div>':''; }
function chChecks(){
  var all=!state.chs.length;
  return '<span class="rgl">매체</span>'+[["","전체"],["blog","블로그"],["insta","인스타"],["clip","클립"],["reels","릴스"],["youtube","유튜브"],["payback","페이백"],["review","구매평"]].map(function(c){
    var on=c[0]?state.chs.indexOf(c[0])>=0:all;
    return '<label class="rck'+(on?' on':'')+'"><input type="checkbox" data-chk="'+c[0]+'"'+(on?' checked':'')+'>'+c[1]+'</label>';
  }).join("");
}
function paintChs(){ var b=document.getElementById("chbox"); if(b) b.innerHTML=chChecks(); }

/* 필터 시트(2026-10-19 시온님 요청: 스타일씨처럼 아래에서 올라오는 필터 — 체험단 유형·작성 채널·카테고리·지역·테마) */
var FTYPES=[["give","📦","제공형"],["payback","💳","페이백형"],["pr","🧾","페이백 + 구매평"],["review","📝","구매평"],["ret","🔁","회수형"]];
var FCH=[["blog","📝","네이버 블로그"],["clip","🎬","네이버 클립"],["insta","📸","인스타그램"],["reels","🎞️","인스타그램 릴스"],["youtube","▶️","유튜브 Shorts"],["tiktok","🎵","틱톡"],["cafe","👩‍👧","맘카페"],["coupang","🛒","쿠팡 리뷰"],["musinsa","👕","무신사 후기"],["nshop","🛍️","네이버 구매평"],["ohou","🏠","오늘의집 리뷰"],["olive","💚","올리브영 리뷰"]];
var RGEM={"서울":"🏙️","경기":"🌳","인천":"✈️","강원":"⛰️","충청":"🌾","전라":"🍃","경상":"🏯","부산":"🌊","제주":"🍊"};
function typeOk(it,k){ var p=payOf(it), pb=p.indexOf("payback")>=0, rv=p.indexOf("review")>=0;
  if(k==="give") return !pb&&!rv; if(k==="payback") return pb; if(k==="pr") return pb&&rv; if(k==="review") return rv; if(k==="ret") return p.indexOf("ret")>=0; return false; }
var FS=null; // 시트 안에서 고르는 중인 값(보기 누르면 적용)
function fTabs(cat){ var c=catInfo(cat), t=[["type","체험단 유형"],["ch","작성 채널"],["cat","카테고리"]]; if(cat==="all"||(c&&c.region)) t.push(["rg","지역"]); if(cat==="stay") t.push(["th","테마"]); if(cat==="pet") t.push(["pet","반려동물"]); t.push(["src","사이트"]); return t; }
/* 모집 사이트별 보기(2026-10-21 시온님 요청: 강남맛집·스타일씨·레뷰·리뷰노트·오마이블로그 등) */
function srcOf(it){ return String(it.source||"").trim(); }
function fChips(F){ var o=[];
  if(F.cat!=="all"){ var m=catMeta(F.cat)||{}; o.push(["cat",F.cat,(m.em?m.em+" ":"")+(m.t||F.cat)]); }
  F.types.forEach(function(k){ var t=FTYPES.filter(function(x){ return x[0]===k; })[0]; if(t) o.push(["type",k,t[2]]); });
  F.chs.forEach(function(k){ var t=FCH.filter(function(x){ return x[0]===k; })[0]; o.push(["ch",k,t?t[2]:(CHL[k]||k)]); });
  F.regions.forEach(function(r){ o.push(["rg",r,r]); });
  F.themes.forEach(function(k){ var t=THEMES.filter(function(x){ return x[0]===k; })[0]; if(t) o.push(["th",k,t[2]]); });
  if(F.pet) o.push(["pet",F.pet,F.pet==="dog"?"강아지":"고양이"]);
  (F.srcs||[]).forEach(function(k){ o.push(["src",k,k]); });
  return o; }
function curF(){ return {cat:state.cat,types:state.types.slice(),chs:state.chs.slice(),regions:state.regions.slice(),themes:state.themes.slice(),pet:state.pet||"",srcs:(state.srcs||[]).slice()}; }
/* 작성 채널 빠른 선택(2026-10-23 시온님 "블로그·클립·인스타그램 이렇게 선택할 수 있게") */
function sortW(k){ var o=SORTS.filter(function(x){ return x[0]===k; })[0]; var t=o?o[1].replace(/^\S+\s/,""):"추천순"; return Math.round(t.length*16.5+(t.indexOf(" ")>=0?-7:0)+38); }
var QCH=[["blog","블로그"],["clip","클립"],["insta","인스타그램"]];
function fbarHtml(){ var all=fChips(curF()).filter(function(x){ return x[0]!=="cat"; }), chs=state.chs||[];
  var ci=catInfo(state.cat), rgOn=!!(ci&&ci.region), rgs=state.regions||[];
  var ch=all.filter(function(x){ return !(x[0]==="ch"&&QCH.some(function(q){ return q[0]===x[1]; })) && !(rgOn&&x[0]==="rg"); });
  var rgBtn=rgOn?'<button class="qch qrg'+(rgs.length?' qon':'')+'" data-fopen="rg" aria-label="지역 선택">📍 '+(rgs.length?esc(rgs.length>2?rgs.slice(0,2).join("·")+" 외 "+(rgs.length-2):rgs.join("·")):"지역")+' ▾</button>':'';
  return '<button class="fbtn'+(ch.length?' on':'')+'" data-fopen="type" aria-label="필터 열기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>'+(ch.length?' <b>'+ch.length+'</b>':'')+'</button>'+rgBtn+
    QCH.map(function(q){ var on=chs.indexOf(q[0])>=0; return '<button class="qch'+(on?' qon':'')+'" data-fdel="ch|'+q[0]+'" aria-pressed="'+on+'">'+q[1]+'</button>'; }).join("")+
    ch.map(function(x){ return '<button class="fchip" data-fdel="'+x[0]+'|'+esc(x[1])+'">'+esc(x[2])+' ✕</button>'; }).join(""); }
function fOpts(tab,F){ var open=seed.items.filter(function(it){ return statusOf(it).key==="open" && (F.cat==="all"||catOf(it)===F.cat); });
  function n(fn){ return open.filter(fn).length; }
  if(tab==="type") return FTYPES.map(function(t){ return [t[0],t[1],t[2],n(function(it){ return typeOk(it,t[0]); }),F.types.indexOf(t[0])>=0]; });
  if(tab==="ch") return FCH.map(function(t){ return [t[0],t[1],t[2],n(function(it){ return chOf(it).indexOf(t[0])>=0; }),F.chs.indexOf(t[0])>=0]; });
  if(tab==="cat") return [{k:"all",t:"전체",em:"🌈"}].concat(CAT_ORDER.filter(function(m){ return isOpenCat(m.k); })).map(function(m){ return [m.k,m.em,m.t,seed.items.filter(function(it){ return statusOf(it).key==="open" && (m.k==="all"||catOf(it)===m.k); }).length,F.cat===m.k]; });
  if(tab==="rg") return REGIONS.map(function(r){ return [r,RGEM[r]||"📍",r,n(function(it){ return it.region===r; }),F.regions.indexOf(r)>=0]; });
  if(tab==="th") return THEMES.map(function(t){ return [t[0],t[1],t[2],n(function(it){ return themeOf(it,t[0]); }),F.themes.indexOf(t[0])>=0]; });
  if(tab==="pet") return [["dog","🐶","강아지"],["cat","🐱","고양이"]].map(function(t){ return [t[0],t[1],t[2],n(function(it){ return petOf(it).indexOf(t[0])>=0; }),F.pet===t[0]]; });
  if(tab==="src"){ var cnt={}; open.forEach(function(it){ var k=srcOf(it); if(k) cnt[k]=(cnt[k]||0)+1; }); (F.srcs||[]).forEach(function(k){ if(!(k in cnt)) cnt[k]=0; });
    return Object.keys(cnt).sort(function(a,b){ return cnt[b]-cnt[a]||a.localeCompare(b,"ko"); }).map(function(k){ return [k,'<i class="srcdot">'+esc(k.charAt(0))+'</i>',k,cnt[k],(F.srcs||[]).indexOf(k)>=0]; }); }
  return []; }
function fCount(F){ var keep=curF(); state.cat=F.cat; state.types=F.types; state.chs=F.chs; state.regions=F.regions; state.themes=F.themes; state.pet=F.pet; state.srcs=F.srcs||[];
  var n=filtered().length; state.cat=keep.cat; state.types=keep.types; state.chs=keep.chs; state.regions=keep.regions; state.themes=keep.themes; state.pet=keep.pet; state.srcs=keep.srcs; return n; }
function fPaint(){ var el=document.getElementById("fsheet"); if(!el||!FS) return; var F=FS.F, tabs=fTabs(F.cat);
  if(!tabs.some(function(t){ return t[0]===FS.tab; })) FS.tab="type";
  var radio=FS.tab==="cat"||FS.tab==="pet";
  el.querySelector(".fsbody").innerHTML='<div class="fstabs" role="tablist">'+tabs.map(function(t){ return '<button role="tab" class="'+(t[0]===FS.tab?'on':'')+'" data-ftab="'+t[0]+'">'+t[1]+'</button>'; }).join("")+'</div>'+
    '<div class="fschips">'+fChips(F).map(function(x){ return '<button class="fchip" data-fsdel="'+x[0]+'|'+esc(x[1])+'">'+esc(x[2])+' ✕</button>'; }).join("")+'</div>'+
    '<div class="fslist">'+fOpts(FS.tab,F).map(function(o){ return '<button class="fsrow'+(o[4]?' on':'')+'" data-fpick="'+esc(o[0])+'"><span class="fsck" aria-hidden="true"></span><span class="fsem">'+o[1]+'</span><span class="fsnm">'+esc(o[2])+'</span></button>'; }).join("")+'</div>';
  el.querySelector("[data-fgo]").textContent=fCount(F)+'개 체험단 보기'; }
function fOpen(tab){ if(!document.getElementById("fsheet")){ var d=document.createElement("div"); d.id="fsheet"; d.className="fsheet";
    d.innerHTML='<div class="fsbg" data-fclose></div><div class="fsbox" role="dialog" aria-modal="true" aria-label="필터"><div class="fsgrab"></div><div class="fshead"><b>필터</b><button class="fsx" data-fclose aria-label="닫기">✕</button></div><div class="fsbody"></div><div class="fsfoot"><button class="fsreset" data-freset>↻ 초기화</button><button class="fsgo" data-fgo></button></div></div>';
    document.body.appendChild(d); d.addEventListener("click",fClick); }
  FS={tab:tab||"type",F:curF()}; fPaint(); document.getElementById("fsheet").classList.add("on"); document.body.classList.add("fsopen"); }
function fClose(){ var el=document.getElementById("fsheet"); if(el) el.classList.remove("on"); document.body.classList.remove("fsopen"); FS=null; }
function fToggle(F,tab,v){ var key={type:"types",ch:"chs",rg:"regions",th:"themes",src:"srcs"}[tab]; if(tab==="src"&&!F.srcs) F.srcs=[];
  if(tab==="cat"){ if(F.cat!==v){ F.cat=v; F.regions=[]; F.themes=[]; F.pet=""; } return; }
  if(tab==="pet"){ F.pet=F.pet===v?"":v; return; }
  var a=F[key], i=a.indexOf(v); if(i>=0) a.splice(i,1); else a.push(v); }
function fApply(F){ state.cat=F.cat; state.types=F.types; state.chs=F.chs; state.regions=F.regions; state.themes=F.themes; state.pet=F.pet; state.srcs=F.srcs||[]; if(state.status==="closed") state.status="open"; saveUi(); render(); }
function fClick(e){ var t=e.target.closest("button,[data-fclose]"); if(!t||!FS) return;
  if(t.hasAttribute("data-fclose")){ fClose(); return; }
  if(t.dataset.ftab){ FS.tab=t.dataset.ftab; fPaint(); return; }
  if(t.dataset.fpick!==undefined){ fToggle(FS.F,FS.tab,t.dataset.fpick); fPaint(); return; }
  if(t.dataset.fsdel){ var a=t.dataset.fsdel.split("|"); if(a[0]==="cat") fToggle(FS.F,"cat","all"); else if(a[0]==="pet") FS.F.pet=""; else fToggle(FS.F,a[0],a[1]); fPaint(); return; }
  if(t.hasAttribute("data-freset")){ FS.F={cat:FS.F.cat,types:[],chs:[],regions:[],themes:[],pet:"",srcs:[]}; fPaint(); return; }
  if(t.hasAttribute("data-fgo")){ var F=FS.F; fClose(); fApply(F); ga("list_filter",{cat:F.cat,types:F.types.join(","),chs:F.chs.join(","),regions:F.regions.join(","),themes:F.themes.join(","),srcs:(F.srcs||[]).join(",")}); return; } }
/* 숙소 테마(2026-10-19 시온님 요청: 가족이랑·아이랑·반려동물이랑·단 둘이). 이름·제공내역·AI 요약·추가 요금 글자로 판단, 여러 개 고르면 하나라도 맞으면 보임 */
var THEMES=[["fam","👨‍👩‍👧","가족이랑",/가족|패밀리|대가족|단체|[4-9]인|1\d인|독채/],["kid","👶","아이랑",/키즈|아이와|아이랑|아이들|어린이|유아|베이비|아기/],["pet","🐶","반려동물이랑",null],["cpl","💑","단 둘이",/커플|연인|둘만|둘이|신혼|허니문|기념일|자쿠지|스파|프라이빗/]];
function themeOf(it,k){ if(catOf(it)!=="stay") return false; if(k==="pet") return petStay(it); var t=THEMES.filter(function(x){ return x[0]===k; })[0]; var f=it.fee||{}; return !!t && t[3].test((it.name||"")+" "+(it.benefit||"")+" "+(it.sum||"")+" "+[f.p,f.b,f.f,f.w,f.j,f.d].join(" ")); }
function themeChecks(){
  var cnt={}; seed.items.forEach(function(it){ if(statusOf(it).key==="open" && (state.cat==="all"||catOf(it)===state.cat)) THEMES.forEach(function(t){ if(themeOf(it,t[0])) cnt[t[0]]=(cnt[t[0]]||0)+1; }); });
  var all=!state.themes.length;
  return '<span class="rgl">테마</span>'+[["","","전체"]].concat(THEMES).map(function(t){
    var on=t[0]?state.themes.indexOf(t[0])>=0:all;
    return '<label class="rck'+(on?' on':'')+'"><input type="checkbox" data-th="'+t[0]+'"'+(on?' checked':'')+'>'+(t[1]?t[1]+' ':'')+t[2]+(t[0]&&cnt[t[0]]?'<small>'+cnt[t[0]]+'</small>':'')+'</label>';
  }).join("");
}
function regionChecks(){
  var cnt={}; seed.items.forEach(function(it){ if(catOf(it)===state.cat && statusOf(it).key==="open") cnt[it.region]=(cnt[it.region]||0)+1; });
  var all=!state.regions.length;
  return '<span class="rgl">지역</span>'+['전체'].concat(REGIONS).map(function(r){
    var on=r==="전체"?all:state.regions.indexOf(r)>=0;
    return '<label class="rck'+(on?' on':'')+'"><input type="checkbox" data-rg="'+r+'"'+(on?' checked':'')+'>'+r+(r!=="전체"&&cnt[r]?'<small>'+cnt[r]+'</small>':'')+'</label>';
  }).join("");
}
/* 반려동물: 강아지/고양이 (2026-10-18 시온님 요청). item.pet=["dog"]|["cat"]|["dog","cat"] 이 있으면 그걸, 없으면 이름·제공내역 글자로 판단. 둘 다 안 보이면 공용(둘 다에 보임). */
var DOGRE=/강아지|반려견|애견|도그|dog|퍼피|puppy|견용|노령견|소형견|대형견|댕댕|멍멍/i, CATRE=/고양이|반려묘|캣|cat|냥|키튼|kitten|묘용|고양이모래|스크래쳐/i;
function petOf(it){ if(Array.isArray(it.pet)&&it.pet.length) return it.pet; var t=(it.name||"")+" "+(it.benefit||""), d=DOGRE.test(t), c=CATRE.test(t); return d&&!c?["dog"]:c&&!d?["cat"]:["dog","cat"]; }
function petChecks(){
  var cnt={dog:0,cat:0}; seed.items.forEach(function(it){ if(catOf(it)==="pet"&&statusOf(it).key==="open") petOf(it).forEach(function(p){ cnt[p]++; }); });
  return '<span class="rgl">반려동물</span>'+[["","전체"],["dog","🐶 강아지"],["cat","🐱 고양이"]].map(function(p){
    var on=(state.pet||"")===p[0];
    return '<label class="rck'+(on?' on':'')+'"><input type="radio" name="petsel" data-pet="'+p[0]+'"'+(on?' checked':'')+'>'+p[1]+(p[0]&&cnt[p[0]]?'<small>'+cnt[p[0]]+'</small>':'')+'</label>';
  }).join("");
}
function paintRegions(){ var b=document.getElementById("rgbox"); if(b) b.innerHTML=regionChecks(); }
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
    if(state.cat!=="all" && catOf(it)!==state.cat) return false;
    if(((c&&c.region)||state.cat==="all") && state.regions.length && state.regions.indexOf(it.region)<0) return false;
    if(state.types.length && !state.types.some(function(k){ return typeOk(it,k); })) return false;
    if(state.srcs&&state.srcs.length && state.srcs.indexOf(srcOf(it))<0) return false;
    if(state.cat==="pet" && state.pet && petOf(it).indexOf(state.pet)<0) return false;
    if(state.chs.length && !chOf(it).concat(payOf(it)).some(function(c){ return state.chs.indexOf(c)>=0; })) return false;
    if(state.themes.length && state.cat==="stay" && !state.themes.some(function(k){ return themeOf(it,k); })) return false;
    var s=statusOf(it).key;
    if(state.status==="open" && s!=="open") return false;
    if(state.status==="closed" && s!=="closed") return false;
    if(state.status==="todayOpen" && !(isNewToday(it) && s!=="closed")) return false;
    if(state.status==="pick" && !(isPick(it) && s!=="closed")) return false;
    if(state.status==="todayClose" && !(it.end===td && s==="open")) return false;
    if(state.status==="closing" && !(s==="open" && daysLeft(it)<=3)) return false;
    if(q){ var hay=(it.name+" "+it.region+" "+it.benefit).toLowerCase(); if(hay.indexOf(q)<0) return false; }
    return true;
  }).sort(state.status==="closed"?function(a,b){ return (b.createdAt||0)-(a.createdAt||0); }:sorter());
}
/* 정렬: 금액(valOf)은 worth("N만원") → 쿠팡 판매가(cpPrice) → 제공내역 속 "N원/N만원" 중 가장 큰 값. 금액을 모르면 맨 뒤. */
function valOf(it){ if(it._v!==undefined) return it._v; var v=0;
  if(it.worth){ var m=String(it.worth).replace(/,/g,"").match(/\d+(\.\d+)?/g); if(m) v=Math.max.apply(null,m.map(Number))*(/만/.test(it.worth)?10000:1); }
  if(!v&&it.cpPrice) v=+it.cpPrice||0;
  if(!v){ var re=/(\d{1,3}(?:,\d{3})+|\d+)\s*(만\s*)?원/g, r, b=it.benefit||""; while((r=re.exec(b))){ var n=+r[1].replace(/,/g,"")*(r[2]?10000:1); if(n>v&&n<1e8) v=n; } }
  return it._v=v; }
function popScore(it){ var s=0; if(isPick(it)) s+=3; s+=Math.min(chOf(it).length,4); var v=valOf(it); if(v>=300000) s+=3; else if(v>=100000) s+=2; else if(v>=30000) s+=1; if(payOf(it).indexOf("payback")>=0) s+=1; if(isFav(it.id)) s+=1; if(Date.now()-(it.createdAt||0)<2*864e5) s+=1; return s; }
/* 추천순(2026-10-21 시온님 요청, 기본 정렬): 시온님 취향 제품(data.json taste) > 제공형 > 작성 채널 블로그·인스타 피드·클립·릴스 순 > 지원자 많은(인기) 것 > 추천 브랜드 > 금액 */
var CH_W={blog:4,insta:3,clip:2,reels:1,youtube:0.5,tiktok:0.5,cafe:1};
function tasteOf(it){ var t=seed.taste||[], n=String(it.name||"")+" "+String(it.benefit||""); for(var i=0;i<t.length;i++) if(t[i]&&n.indexOf(t[i])>=0) return true; return false; }
function recScore(it){ if(it._r!==undefined) return it._r; var s=0, p=payOf(it);
  if(tasteOf(it)) s+=10;
  if(p.indexOf("payback")<0&&p.indexOf("review")<0) s+=3;
  var c=0; chOf(it).forEach(function(k){ c=Math.max(c,CH_W[k]||0); }); s+=c;
  var ap=it.ap&&it.ap[0]; if(ap) s+=Math.min(6,Math.log(ap+1)/Math.LN10*2);
  if(isPick(it)) s+=2; if(valOf(it)>=100000) s+=1;
  return it._r=s; }
function sorter(){
  var o=state.sort;
  if(o==="rec") return function(a,b){ return recScore(b)-recScore(a) || valOf(b)-valOf(a) || daysLeft(a)-daysLeft(b); };
  if(o==="deadline") return function(a,b){ return daysLeft(a)-daysLeft(b) || valOf(b)-valOf(a); };
  if(o==="popular") return function(a,b){ return popScore(b)-popScore(a) || daysLeft(a)-daysLeft(b); };
  if(o==="comp") return function(a,b){ var x=apRatio(a), y=apRatio(b); if(x===y) return valOf(b)-valOf(a) || daysLeft(a)-daysLeft(b); return x===Infinity?1:y===Infinity?-1:x-y; };
  if(o==="low") return function(a,b){ var x=valOf(a), y=valOf(b); if(!x!==!y) return x?-1:1; return x-y || daysLeft(a)-daysLeft(b); };
  return function(a,b){ var x=valOf(a), y=valOf(b); if(!x!==!y) return x?-1:1; return y-x || daysLeft(a)-daysLeft(b); };
}
/* 오늘 오픈 = 가장 최근에 새로 올라온 날(2026-10-22 시온님: 새로 업데이트되기 전까지는 전날 것이 계속 보이게) */
var NEWDAY={k:"",d:""};
function newDay(){ var td=ymd(today()), k=td+"|"+seed.items.length; if(NEWDAY.k===k) return NEWDAY.d;
  var best="";
  seed.items.forEach(function(it){ if((it.end||"9999")<td) return; [it.start, it.createdAt?ymd(new Date(it.createdAt)):""].forEach(function(d){ if(d && d<=td && d>best) best=d; }); });
  NEWDAY={k:k,d:best||td}; return NEWDAY.d; }
function isNewToday(it){ var td=newDay(); return it.start===td || (it.createdAt && ymd(new Date(it.createdAt))===td); }
function topRows(list){
  if(state.status!=="open"||state.q.trim()) return "";
  var td=ymd(today()), close=list.filter(function(it){ return it.end===td; }), fresh=list.filter(function(it){ return isNewToday(it)&&it.end!==td; });
  var h="";
  if(close.length) h+='<section class="hsec trow"><div class="hsh"><h2>🚨 <em>오늘 마감</em>이에요 <small class="tcnt">'+close.length+'</small></h2><span class="hmore" data-cdl>'+clock(msToMidnight())+' 남음</span></div><div class="hs">'+close.slice(0,15).map(hcard).join("")+'</div></section>';
  if(fresh.length) h+='<section class="hsec trow"><div class="hsh"><h2>✨ <em>오늘 오픈</em>했어요 <small class="tcnt">'+fresh.length+'</small></h2></div><div class="hs">'+fresh.slice(0,15).map(hcard).join("")+'</div></section>';
  if(state.sort!=="comp"){ var easy=list.filter(function(it){ return apRatio(it)<=1.5 && !isNewToday(it) && it.end!==td; }).sort(function(a,b){ return apRatio(a)-apRatio(b) || valOf(b)-valOf(a); });
    if(easy.length) h+='<section class="hsec trow"><div class="hsh"><h2>🙌 <em>경쟁률 낮은</em> 곳 <small class="tcnt">'+easy.length+'</small></h2><button class="hmore" data-sortcomp>모두 보기</button></div><div class="hs">'+easy.slice(0,15).map(hcard).join("")+'</div>'+apNote()+'</section>'; }
  return h;
}
function renderListGrid(){
  var g=document.getElementById("grid"); if(!g) return;
  var list=filtered(), n=0, out=[];
  var tr=document.getElementById("toprows"); if(tr) tr.innerHTML=topRows(list)+(state.sort==="comp"?apNote():'');
  var cnt=document.getElementById("count"); if(cnt) cnt.innerHTML='<b>'+list.length+'</b>'+(state.cat==="stay"||state.cat==="all"?'곳':'개');
  list.forEach(function(it,i){
    out.push(state.view==="3"?miniCard(it,true):fullCard(it));
    var every=state.view==="3"?9:(state.view==="1"?5:6);
    if((i+1)%every===0){ var hd=hotDeal(), B=ADS.map(function(a){ return adWide(a); }); if(hd){ if(state.cat==="baby") B.unshift(hd); else B.splice(1,0,hd); } if(state.cat==="pet"){ var pb=petStayBanner(); if(pb) B.unshift(pb); } if(B.length) out.push('<div class="span">'+B[n++%B.length]+'</div>'); }
  });
  g.innerHTML=list.length?out.join(""):(state.chs.length&&state.chs.indexOf("blog")<0?'<div class="empty span"><b>'+state.chs.map(function(c){ return CHN[c]||c; }).join(" · ")+' 체험단을 모으고 있어요</b>새로 올라오면 카톡으로 가장 먼저 알려드릴게요.<a class="b kakao" '+ext(kakaoUrl())+'>💬 카톡으로 알림 받기</a></div>':'<div class="empty span"><b>🥲 조건에 맞는 체험단이 없어요</b>다른 지역이나 상태를 골라 보세요.</div>');
  plainHeads(document.getElementById("view"));
}


/* ---------- 맞춤 추천 (이 브라우저 안에서만 계산, 서버로 보내지 않음) ---------- */
var SEEN=[]; try{ SEEN=JSON.parse(ls("dakku-seen")||"[]")||[]; }catch(e){ SEEN=[]; }
function markSeen(id){ if(!id) return; var i=SEEN.indexOf(id); if(i>=0) SEEN.splice(i,1); SEEN.unshift(id); SEEN=SEEN.slice(0,30); ls("dakku-seen",JSON.stringify(SEEN)); mSeen(id); }
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
  var pool=seed.items.filter(function(it){ return statusOf(it).key==="open" && !isFav(it.id) && !(state.tab==="item" && String(it.id)===String(state.itemId)); });
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
/* 상세 페이지 남은 시간·말풍선(2026-10-18 시온님 요청, 체험단 앱 참고): 사진 위 "N일 HH:MM:SS 남음" → 스크롤해 사진이 지나가면 아래 버튼 줄 위로 옮겨 붙음(dcdfix). 매체 말풍선은 3초 뒤 사라짐, 공유 버튼 "친구에게도 공유하기"는 계속. 모집 기간 점 깜박임 */
function dcdMs(end){ var d=parseDate(end); return d?(d.getTime()+864e5-Date.now()):0; }
function dcdText(end){ var ms=Math.max(0,dcdMs(end)), dd=Math.floor(ms/864e5); return (dd>0?dd+"일 ":"")+clock(ms-dd*864e5); }
var CHTIP={coupang:"쿠팡 리뷰",musinsa:"무신사 후기",nshop:"네이버 쇼핑 구매평",ohou:"오늘의집 리뷰",olive:"올리브영 리뷰",blog:"네이버 블로그",clip:"네이버 클립",insta:"인스타그램 피드",reels:"인스타그램 릴스",youtube:"유튜브",tiktok:"틱톡",cafe:"맘카페"};
function chTip(it){ var c=chOf(it).filter(function(x){ return CHTIP[x]; }).map(function(x){ return CHTIP[x]; }), P=payOf(it);
  if(c.length) return c.slice(0,3).join("·")+"에 작성해야 하는 체험단이에요."+(P.indexOf("review")>=0?" 구매평도 남겨요.":"");
  if(P.indexOf("review")>=0) return "구매평을 남기는 체험단이에요."; return ""; }
function dcdInit(){
  var t=document.getElementById("chtip"); if(t) setTimeout(function(){ t.classList.add("hide"); },3200);
  var a=document.getElementById("dcd"), f=document.getElementById("dcdfix"); if(!a||!f||!("IntersectionObserver" in window)) return;
  var io=new IntersectionObserver(function(es){ es.forEach(function(e){ f.classList.toggle("on",!e.isIntersecting && e.boundingClientRect.top<0); }); },{threshold:0});
  io.observe(a); window._dcdIO&&window._dcdIO.disconnect(); window._dcdIO=io;
}
function itemView(){
  var it=seed.items.filter(function(x){ return String(x.id)===String(state.itemId); })[0];
  if(!it) return '<div class="pg"><div class="empty sm"><b>😢 이 체험단을 찾을 수 없어요</b>모집이 끝나 목록에서 내려갔을 수 있어요.</div><a class="morebig" href="#/list">🎟️ 지금 모집 중인 체험단 보기 ›</a></div>';
  var s=statusOf(it), img=safeUrl(it.image), stay=catOf(it)==="stay", src=it.source||"체험단 사이트", closed=s.key==="closed";
  var mapQ=(it.name||"").replace(/\s*\(([^)]*)\)\s*$/,function(m,g){ return " "+g; });
  var rows='<dl class="dtl">'+
    '<dt>제공 내역</dt><dd>'+esc(it.benefit||"")+(it.worth?'<br><b>'+esc(it.worth)+' 상당</b>':'')+'</dd>'+
    '<dt>'+(closed?'':'<i class="blink" aria-hidden="true"></i>')+'모집 기간</dt><dd>'+(it.start?fmt(it.start)+' ':'')+'~ '+fmt(it.end)+' <span class="dd2'+(s.hot?' hot':'')+'">'+esc(s.dday)+'</span></dd>'+
    (apOf(it)?'<dt>경쟁률</dt><dd>'+apLine(it).replace(/<\/?p[^>]*>/g,'')+'</dd>':'')+
    '<dt>모집 사이트</dt><dd>'+esc(src)+'</dd>'+
    (it.region?'<dt>지역</dt><dd>'+esc(it.region)+'</dd>':'')+'</dl>';
  return '<div class="pg dpg">'+
    '<div class="dthimg">'+(closed?'':'<span class="dcd" id="dcd"><b data-dcd="'+esc(it.end)+'">'+dcdText(it.end)+'</b> 남음</span>')+(img?'<img src="'+esc(img)+'" alt="'+esc(it.name)+'" referrerpolicy="no-referrer" onerror="this.remove()">':'')+'</div>'+
    '<div class="dhd">'+(chTip(it)?'<span class="chtip" id="chtip">'+esc(chTip(it))+'</span>':'')+chBadges(it)+'<h1>'+esc(it.name)+'</h1>'+'<div class="dico"><span class="shtip">친구에게도 공유하기</span><button class="shb" data-ishare="'+esc(it.id)+'" aria-label="공유하기">'+ico(I.send)+'</button></div></div>'+
    (closed?'':'<span class="dcd dcdfix" id="dcdfix" aria-hidden="true"><b data-dcd="'+esc(it.end)+'">'+dcdText(it.end)+'</b> 남음</span>')+
    rows+feeBox(it)+aiSum(it)+'<p class="srcnote">다꾸체험단은 모집 정보를 모아 보여 주는 서비스로 '+esc(it.source||"모집 사이트")+'와 무관해요. 신청·선정·진행은 '+esc(it.source||"해당 사이트")+'에서 이뤄져요.</p>'+
    (closed?'<div class="dclosed"><b>모집이 끝난 체험단이에요</b><span>같은 '+(stay?'숙소':'제품')+'가 다시 모집하면 알림으로 알려드려요.'+(priceUrl(it)?' 지금 바로 이용하려면 아래 '+(stay?'숙소 사진 보기':(catOf(it)==='etc'?'입장권 가격 보기':'상품 가격 보기'))+'를 눌러 주세요.':'')+'</span></div>'
      :'<p class="dnote">신청은 '+esc(src)+'에서 진행돼요. 리뷰 조건·체험 가능일을 꼭 확인해 주세요.</p>')+
    '<div class="dbar"><button class="fv dbfav'+(isFav(it.id)?" on":"")+'" data-fav="'+esc(it.id)+'" aria-label="찜하기" aria-pressed="'+isFav(it.id)+'">'+ico(I.heart)+'</button>'+
      (priceUrl(it)?'<a class="dbl" '+ext(priceUrl(it))+'>'+(stay?'숙소 사진 보기':(catOf(it)==='etc'?'입장권 가격 보기':'제품 상세 보기'))+'</a>':'')+(closed?reopenBtn(it):applyBtn(it,"dbp"))+'</div>'+
    babyMore(it)+relDeals(it)+
    recoSection("이런 체험단은 어때요?")+'</div>';
}
/* 육아 상세 페이지 바로 아래 "다른 육아 체험단" (2026-10-19 시온님 요청): 모집 중 육아 중 같은 나이대 먼저, 그다음 금액 큰 순 */
function babyMore(it){
  if(catOf(it)!=="baby") return "";
  var ag=it.ages||[], L=seed.items.filter(function(x){ return x.id!==it.id && catOf(x)==="baby" && statusOf(x).key!=="closed"; });
  L.sort(function(a,b){ var ma=(a.ages||[]).some(function(g){ return ag.indexOf(g)>=0; })?1:0, mb=(b.ages||[]).some(function(g){ return ag.indexOf(g)>=0; })?1:0;
    return (mb-ma) || (valOf(b)-valOf(a)) || (daysLeft(a)-daysLeft(b)); });
  return hrow("👶 다른 육아 체험단","#/list?cat=baby",L);
}
/* 마감 체험단: 재모집 알림 (찜 + 알림 켜기 → send_push.js 찜 오픈 알림이 같은 숙소·제품 재모집을 알려줌), 2026-10-18 시온님 요청 */
function reopenOn(it){ return isFav(it.id)&&(!pushOk()||pushOn()); }
function reopenBtn(it){ return reopenOn(it)?'<button class="b dbp dbon" data-reopen="'+esc(it.id)+'">🔔 재모집 알림 받는 중</button>':'<button class="b pri dbp" data-reopen="'+esc(it.id)+'">🔔 재모집 알림받기</button>'; }
document.addEventListener("click",function(e){
  var t=e.target.closest("[data-reopen]"); if(!t) return; e.preventDefault();
  var id=t.getAttribute("data-reopen"), it=seed.items.filter(function(x){ return String(x.id)===id; })[0]; if(!it) return;
  if(reopenOn(it)){ toast("다시 모집하면 알림으로 알려드릴게요 🔔"); return; }
  if(!isFav(id)) toggleFav(id);
  if(pushOk()&&!pushOn()){ enablePush(); return; }
  render(); toast(pushOk()?"다시 모집하면 알림으로 알려드릴게요 🔔":"찜해 뒀어요. 찜 목록에서 다시 모집하는지 확인할 수 있어요");
});
/* 상세 페이지 아래 "함께 보면 좋은 특가" (골드박스), 2026-10-18 시온님 요청 */
var REL_RE={fashion:/양말|장갑|목도리|머플러|모자|비니|가방|지갑|벨트|슬리퍼|운동화|티셔츠|니트|레깅스|패딩|안경|선글라스/,stay:/여행|캐리어|파우치|세면|칫솔|치약|수건|목베개|보조배터리|선크림|선스틱|우산|캠핑|텀블러|슬리퍼|삼각대/,baby:/아기|유아|기저귀|물티슈|분유|이유식|젖병|빨대컵|베이비|키즈/,beauty:/크림|세럼|앰플|토너|선크림|선스틱|샴푸|마스크|클렌징|로션|화장|립|쿠션|바디/,health:/식품|커피|과자|라면|견과|단백질|유산균|비타민|우유|생수|햇반|즉석|만두|김치|오메가|홍삼|차 /,pet:/사료|간식|고양이|강아지|반려|배변|모래|펫/,life:/세제|휴지|화장지|물티슈|청소|주방|수세미|섬유유연제|건전지|수납|타월|탈취/,elec:/충전|이어폰|청소기|가습기|선풍기|전기|블루투스|케이블|모니터|에어|드라이어/};
function relDeals(it){
  var c=catOf(it), re=REL_RE[c]||REL_RE[c==="food"?"health":"life"], pool=(c==="baby"?babyDeals():[]).concat(liveGold()), seen={}, hit=[], rest=[];
  pool.forEach(function(x){ var k=(x.name||"").slice(0,14); if(seen[k]||!safeUrl(x.u)) return; seen[k]=1; (re&&re.test(x.name||"")?hit:rest).push(x); });
  var h=0; String(it.id).split("").forEach(function(ch){ h=(h*31+ch.charCodeAt(0))%9973; });
  if(rest.length){ var o=h%rest.length; rest=rest.slice(o).concat(rest.slice(0,o)); }
  var L=hit.concat(rest).slice(0,4); if(L.length<2) return "";
  return '<section class="sec tossec drel"><div class="sh"><h2>함께 보면 좋은 특가</h2></div><div class="tgrid">'+L.map(tossCard).join("")+'</div></section>';
}
/* AI 요약(2026-10-18 시온님 요청): item.sum 이 있을 때만. 숙소·제품 자체 소개(쇼핑으로도 사고 싶게), 원문에 있는 사실만 */
var FEE_ROWS=[["p","👥","인원 추가"],["b","🍖","바베큐"],["f","🔥","불멍"],["w","♨️","온수·수영장"],["j","🛁","자쿠지·스파"],["d","🐶","반려동물"]];
function feeBox(it){ var f=it.fee; if(!f||catOf(it)!=="stay") return ""; var r=FEE_ROWS.filter(function(x){ return f[x[0]]; }); if(!r.length) return "";
  return '<div class="feebox"><b class="fbt">추가 요금 안내</b><dl>'+r.map(function(x){ return '<dt>'+x[1]+' '+x[2]+'</dt><dd>'+esc(f[x[0]])+'</dd>'; }).join("")+'</dl><small>모집 글에 적힌 내용이에요. 요금은 바뀔 수 있으니 예약할 때 숙소에 꼭 확인하세요.</small></div>'; }
function aiSum(it){ var t=(it.sum||"").trim(); if(!t) return ""; return '<div class="aisum"><span class="aisl">✦ AI 요약</span><p>'+esc(t)+'</p><small>숙소·제품 소개 자료를 바탕으로 AI가 정리했어요. 정확한 정보는 판매 페이지에서 확인해 주세요.</small></div>'; }
/* ---------- 지도 (2026-10-25 시온님 "숙소/티켓 지도, 하단 찜 자리에 지도보기, 찜은 마이다꾸로") ----------
   좌표 = geo.json (scripts/geo.py · Actions geo.yml: 카카오 로컬 키워드 검색 → 못 찾으면 시·군 중심).
   지도 = Leaflet + OpenStreetMap 타일(키 없음, 출처 표시). 핀을 누르면 그 자리 체험단 목록 → 사이트 상세(#/item). 쿠팡으로 바로 가지 않는다. */
var GEO=null, LMAP=null;
function mapView(){
  var c=state.mapC||"";
  return '<div class="pg mapg"><div class="maptop"><h1>체험단 지도</h1><div class="mapchips">'+
    [["","전체"],["mag","💜 감성숙소"],["stay","🏡 숙박"],["etc","🎟️ 티켓"]].map(function(x){ return '<a href="#/map'+(x[0]?'?c='+x[0]:'')+'"'+(c===x[0]?' class="on"':'')+'>'+x[1]+'</a>'; }).join("")+'</div></div>'+
    '<div id="dmap" class="dmap"><div class="empty">지도를 불러오는 중…</div></div><div id="mapsheet" class="mapsheet" hidden></div>'+
    '<p class="mapnote" id="mapnote">모집 중인 숙박·티켓 체험단을 지도로 모았어요. 핀 위 숫자는 그 근처 체험단 수예요.</p></div>';
}
function loadLeaflet(cb){
  if(window.L&&window.L.map) return cb();
  if(!document.getElementById("lfcss")){ var l=document.createElement("link"); l.id="lfcss"; l.rel="stylesheet"; l.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(l); }
  var sc=document.getElementById("lfjs"); if(sc){ sc.addEventListener("load",cb); return; }
  sc=document.createElement("script"); sc.id="lfjs"; sc.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; sc.onload=cb; sc.onerror=function(){ var m=document.getElementById("dmap"); if(m) m.innerHTML='<div class="empty">지도를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</div>'; }; document.head.appendChild(sc);
}
function mapInit(){
  var done=0, go=function(){ if(++done<2) return; mapDraw(); };
  loadLeaflet(go);
  var done2=0, go2=function(){ if(++done2===2) go(); };
  if(GEO) go2(); else fetch((BASE||"/")+"geo.json",{cache:"no-cache"}).then(function(r){ return r.ok?r.json():{}; }).then(function(j){ GEO=(j&&j.p)||{}; go2(); }).catch(function(){ GEO={}; go2(); });
  if(STAYM) go2(); else fetch((BASE||"/")+"m/list.json",{cache:"no-cache"}).then(function(r){ return r.ok?r.json():[]; }).then(function(L){ STAYM=L||[]; go2(); }).catch(function(){ STAYM=[]; go2(); });
}
function mapDraw(){
  var el=document.getElementById("dmap"); if(!el||!window.L) return;
  var c=state.mapC||"";
  /* 감성숙소 추천(2026-10-25 시온님 "내가 추천하는 감성숙소 위치도 같이, 매거진 연결"): geo.json "m:<slug>" → 핀을 누르면 /m/<slug>.html */
  var M0=(c===""||c==="mag"||c==="stay")?(STAYM||[]).filter(function(x){ return GEO["m:"+x.slug]; }).map(function(x){ return {mag:1,id:"m:"+x.slug,slug:x.slug,name:x.name,area:x.area,t:x.t,no:x.no,image:x.img,campEnd:x.campEnd}; }):[];
  var L0=c==="mag"?[]:seed.items.filter(function(it){ var k=catOf(it); return (k==="stay"||k==="etc")&&(!c||k===c)&&statusOf(it).key!=="closed"&&GEO[it.id]; });
  L0=M0.concat(L0);
  if(!L0.length){ el.innerHTML='<div class="empty">지도 위치를 준비하고 있어요. 조금 뒤에 다시 열어 주세요.</div>'; return; }
  var spots={}; L0.forEach(function(it){ var g=GEO[it.id], k=g[0].toFixed(3)+","+g[1].toFixed(3); (spots[k]=spots[k]||{g:g,L:[]}).L.push(it); });
  el.innerHTML="";
  if(LMAP){ try{ LMAP.remove(); }catch(e){} LMAP=null; }
  LMAP=window.L.map(el,{zoomControl:true,attributionControl:true}).setView([36.3,127.8],7);
  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(LMAP);
  var bounds=[], approx=0, SP=Object.keys(spots).map(function(k){ var S=spots[k]; if(S.g[2]==="c") approx+=S.L.length; bounds.push([S.g[0],S.g[1]]); return S; });
  var grp=window.L.layerGroup().addTo(LMAP);
  /* 가까운 핀 묶기(2026-10-25): 화면에서 46px 안에 있는 자리는 숫자 동그라미 하나로, 누르면 확대 → 더 확대할 수 없으면 목록 */
  function draw(){
    grp.clearLayers(); var z=LMAP.getZoom(), CL=[];
    SP.slice().sort(function(a,b){ return b.L.length-a.L.length; }).forEach(function(S){ var pt=LMAP.project([S.g[0],S.g[1]],z), hit=null;
      for(var q=0;q<CL.length;q++){ var c=CL[q]; if(Math.abs(c.x-pt.x)<48&&Math.abs(c.y-pt.y)<48){ hit=c; break; } }
      if(hit){ hit.C.push(S); } else CL.push({x:pt.x,y:pt.y,C:[S]}); });
    CL.forEach(function(cl){
      var C=cl.C, L=[].concat.apply([],C.map(function(S){ return S.L; })), n=L.length, etc=L.every(function(it){ return !it.mag&&catOf(it)==="etc"; }), mg=L.some(function(it){ return it.mag; }), allmg=L.every(function(it){ return it.mag; });
      var ll=LMAP.unproject([cl.x,cl.y],z), la=ll.lat, ln=ll.lng;
      var sz=n>=20?44:n>=5?38:34;
      var ic=window.L.divIcon({className:"dpin"+(etc?" etc":"")+(allmg?" mag":mg?" hasmag":""),html:'<span style="width:'+sz+'px;height:'+sz+'px">'+(n>1?n:(allmg?"💜":etc?"🎟️":"🏡"))+'</span>',iconSize:[sz,sz],iconAnchor:[sz/2,sz/2]});
      window.L.marker([la,ln],{icon:ic}).addTo(grp).on("click",function(){
        if(C.length>1&&LMAP.getZoom()<15) LMAP.fitBounds(C.map(function(S){ return [S.g[0],S.g[1]]; }),{padding:[50,50],maxZoom:LMAP.getZoom()+3});
        else mapSheet({g:C[0].g.slice(0,2).concat(C.every(function(S){ return S.g[2]==="c"; })?"c":"s"),L:L});
      });
    });
  }
  LMAP.on("zoomend",draw);
  if(bounds.length>1) LMAP.fitBounds(bounds,{padding:[28,28],maxZoom:11});
  draw();
  var nm=M0.length, nc=L0.length-nm, nt=document.getElementById("mapnote"); if(nt) nt.innerHTML=(nm?'💜 감성숙소 추천 <b>'+nm+'곳</b>'+(nc?' · ':''):'')+(nc?'모집 중 '+(c==="etc"?"티켓":c==="stay"?"숙박":"숙박·티켓")+' 체험단 <b>'+nc+'곳</b>':'')+'을 지도에 표시했어요.'+(approx?' '+approx+'곳은 숙소가 있는 시·군 중심에 표시해서 실제 위치와 조금 달라요.':'');
}
function mapSheet(S){
  var b=document.getElementById("mapsheet"); if(!b) return;
  var L=S.L.slice().sort(function(a,c){ return (c.mag?1:0)-(a.mag?1:0)||daysLeft(a)-daysLeft(c); });
  b.innerHTML='<div class="mshd"><b>'+(S.g[2]==="c"?"이 지역":"이곳")+(L.every(function(x){return x.mag;})?' 감성숙소 ':' 숙소·체험단 ')+L.length+'곳</b><button type="button" data-mclose aria-label="닫기">✕</button></div><div class="msl">'+L.map(function(it){ if(it.mag){ var cd=it.campEnd?Math.round((parseDate(it.campEnd)-today())/864e5):-1, im=safeUrl(it.image);
      return '<a class="msi msmag" href="/m/'+encodeURIComponent(it.slug)+'.html" data-mapmag="'+esc(it.slug)+'">'+(im?'<img src="'+esc(im)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span class="noimg"></span>')+'<span><i class="mtag">💜 감성숙소 추천 ['+("00"+(+it.no||0)).slice(-3)+']</i><b>'+esc(it.name)+' · '+esc(it.area||"")+'</b><small>'+esc(it.t||"")+'</small>'+(cd>=0?'<em>🚨체험단 모집중 '+(cd===0?"D-DAY":"D-"+cd)+'</em>':'<em class="mgo">숙소 소개 보기 ›</em>')+'</span></a>'; }
    var d=daysLeft(it), img=safeUrl(it.image);
    return '<a class="msi" href="#/item?id='+encodeURIComponent(it.id)+'">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span class="noimg"></span>')+'<span><b>'+esc(it.name)+'</b><small>'+esc(String(it.benefit||"").slice(0,48))+'</small><em>'+(d<=0?"오늘 마감":"D-"+d)+(it.source?' · '+esc(it.source):'')+'</em></span></a>'; }).join("")+'</div>';
  b.hidden=false;
  b.querySelector("[data-mclose]").onclick=function(){ b.hidden=true; };
  try{ if(window.gtag) gtag("event","map_pin",{n:L.length}); }catch(e){}
}
function favView(){
  var list=seed.items.filter(function(it){ return isFav(it.id); }).sort(function(a,b){ var sa=statusOf(a).key==="closed", sb=statusOf(b).key==="closed"; if(sa!==sb) return sa?1:-1; return daysLeft(a)-daysLeft(b); });
  var soon=list.filter(function(it){ return statusOf(it).key==="open" && daysLeft(it)<=3; }).length;
  return '<div class="pg"><h1>찜 ❤️</h1>'+favPushBox()+(soon?'<p class="note">⏰ 찜한 체험단 중 <b>'+soon+'곳</b>이 3일 안에 마감돼요</p>':'')+
    (list.length?'<div class="grid v1">'+list.map(fullCard).join("")+'</div>'+recoSection("💜 찜한 곳과 비슷한 체험단"):'<div class="empty sm"><b>🤍 아직 찜한 체험단이 없어요</b>마음에 드는 체험단의 하트를 눌러 보세요.</div>'+recoSection())+recentSection()+'</div>';
}

/* ---------- 공구 (2026-10-19 시온님 요청: 하단 탭 혜택 → 공구, 시온님이 직접 파는 상품) ----------
   data.json gonggu: [{name, price, orig, rate, img, u(구매 링크), until(YYYY-MM-DD, 지나면 숨김), soldOut}] */
function shopList(){ var t=ymd(today()); return (seed.gonggu||[]).filter(function(x){ return x&&x.name&&safeUrl(x.u)&&!(x.until&&x.until<t); }); }
function shopView(){
  var L=shopList();
  var h='<div class="pg"><h1>다꾸 공구</h1><p class="pgsub">다꾸가 고른 공동구매 상품이에요</p>';
  if(!L.length) h+='<div class="empty shopempty sm"><b>곧 공구가 열려요</b><span>카카오톡 채널을 추가하면 공구 오픈 소식을 받아볼 수 있어요</span><a class="btn" '+ext(safeUrl(seed.kakao)||"http://pf.kakao.com/_xkqEFX/friend")+'>카카오톡 채널 추가</a></div>';
  else { var BS={}; L.forEach(function(x){ if(x.bundle&&x.seller) BS[x.seller]=(BS[x.seller]||0)+1; });
    Object.keys(BS).forEach(function(k){ if(BS[k]>1) h+='<div class="shopbundle">🚚 <b>'+esc(k)+'</b> 상품끼리는 <b>합배송</b>돼요</div>'; });
    h+='<section class="sec tossec shopsec"><div class="tgrid">'+L.map(function(x){ var c=tossCard({name:(x.soldOut?"[품절] ":"")+x.name,img:x.img,u:x.u,price:x.price,orig:x.orig,rate:x.rate,ship:x.ship,fee:x.fee,badge:x.tag||"다꾸 공구",endAt:x.until?x.until+"T23:59:59+09:00":""});
      /* 같은 상품이 쿠팡에도 있으면 아래에 쿠팡 가기 버튼(2026-10-25 시온님) — 구성·가격을 같이 적어 비교할 수 있게, "더 싸요" 문구 없음 */
      return x.cp&&safeUrl(x.cp.u)?'<div class="gcard">'+c+'<a class="gcp" data-gcp '+ext(safeUrl(x.cp.u))+'>'+esc(x.cp.t||"쿠팡에서 보기")+' ↗</a></div>':c; }).join("")+'</div></section>'; }
  /* 공구 상품과 비슷한 쿠팡 상품(2026-10-25 시온님 "비슷한 상품은 쿠팡으로 연결") — 같은 상품이 아니라 '비슷한 상품'으로만 보여 주고 가격 비교 문구는 쓰지 않는다 */
  L.forEach(function(x){ var S=(x.sim||[]).filter(function(y){ return safeUrl(y.u); }); if(S.length<2) return;
    h+='<section class="sec tossec shopsim" data-gsim="'+esc(x.simT||"")+'"><div class="hsh"><h2>\''+esc(x.simT||x.name)+'\' 비슷한 상품 더 보기</h2></div><p class="pgsub">쿠팡에서 판매 중인 비슷한 상품이에요 (공구 상품과 같은 상품은 아니에요)</p><div class="tgrid">'+S.slice(0,4).map(function(y){ return tossCard({name:y.name,img:y.img,u:y.u,price:y.price,rocket:y.rocket}); }).join("")+'</div></section>'; });
  if(L.some(function(x){ return (x.sim||[]).length>1; })) h+='<p class="prnote">쿠팡 상품 가격은 '+esc(seed.gongguAt||"")+' 조회 기준이라 지금과 다를 수 있어요</p>';
  setTimeout(rankInit,0);
  return h+'<section class="rksec" data-rank></section></div>';
}
/* 엄마들 장바구니·선물 추천 테마 랭킹(2026-10-23 시온님, 키즈노트 '옆집 장바구니 랭킹' 참고 — 똑같이 말고 선물 추천도).
   rank.json = scripts/gen_rank.py(쿠팡 베스트 순서·골드박스·다꾸 추천 모음). 구매 건수·보는 사람 수·순위 변동은 데이터가 없어 보여 주지 않는다. */
var RANK=null, RANK_K="", RANK_ALL=false;
function rankInit(){ var el=document.querySelector("[data-rank]"); if(!el) return; if(RANK){ rankPaint(); return; }
  fetch(BASE+"rank.json?v="+Date.now().toString(36).slice(0,-4),{cache:"no-cache"}).then(function(r){ return r.json(); }).then(function(j){ RANK=j; rankPaint(); }).catch(function(){ el.remove(); }); }
function rankPaint(){ var el=document.querySelector("[data-rank]"); if(!el||!RANK) return; var T=RANK.themes||[]; if(!T.length){ el.remove(); return; }
  var t=T.filter(function(x){ return x.k===RANK_K; })[0]||T[0]; RANK_K=t.k; var list=t.items.slice(0,RANK_ALL?10:5);
  el.innerHTML='<div class="rkhd"><h2>엄마들 장바구니 · 선물 추천</h2><p>오늘 뭐 살지 고민될 때 테마별로 골라 보세요</p></div>'+
    '<div class="rktabs">'+T.map(function(x){ return '<button class="'+(x.k===t.k?'on':'')+'" data-rtab="'+x.k+'">'+esc(x.tab)+'</button>'; }).join("")+'</div>'+
    '<div class="rkcard"><span class="rksrc">'+esc(t.src)+'</span><h3>'+t.em+' '+esc(t.h)+'</h3><ol class="rklist">'+
    list.map(function(x,i){ return '<li><a '+ext(safeUrl(x.u))+' data-rk="'+t.k+'"><b class="rkn">'+(i+1)+'</b><span class="rkim"><img src="'+esc(x.img)+'" alt="" loading="lazy"></span><span class="rktx"><span class="rknm">'+esc(x.n)+'</span><b class="rkp">'+esc(x.p)+'</b>'+(x.r?'<i class="rkr">로켓배송</i>':'')+'</span></a></li>'; }).join("")+'</ol>'+
    (t.items.length>5?'<button class="rkmore" data-rmore>'+(RANK_ALL?'접기 ︿':'\''+esc(t.tab)+'\' 더보기 ›')+'</button>':'')+
    (t.more?'<a class="rkpage" href="'+esc(t.more)+'">추천 모음 글로 보기 ›</a>':'')+
    '<p class="prnote">가격은 '+esc(RANK.at||"")+' 수집 기준이라 쿠팡에서 다를 수 있어요</p></div>'; }
document.addEventListener("click",function(e){ var t=e.target.closest&&e.target.closest("[data-rtab],[data-rmore],[data-rk]"); if(!t) return;
  if(t.dataset.rtab){ RANK_K=t.dataset.rtab; RANK_ALL=false; rankPaint(); var b=document.querySelector('.rktabs .on'); if(b&&b.scrollIntoView) b.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"}); return; }
  if(t.hasAttribute("data-rmore")){ RANK_ALL=!RANK_ALL; rankPaint(); return; }
  if(t.dataset.rk){ try{ if(window.gtag) gtag("event","deal_click",{section:"rank_"+t.dataset.rk}); }catch(err){} } });

/* ---------- 혜택 ---------- */
function partnerRows(){
  return (Array.isArray(seed.partners)?seed.partners:[]).filter(function(p){ return safeUrl(p.u); }).map(function(p){
    return '<a class="orc pcard" '+ext(safeUrl(p.u))+'><span class="orh"><span class="orclk">'+esc(p.tag||"✈️")+'</span><span class="ort"><small>'+esc(p.top||"")+'</small><b>'+esc(p.t)+'</b></span><span class="orgo">'+esc(p.b||"보기")+' ›</span></span>'+(p.d?'<span class="ord">'+esc(p.d)+'</span>':'')+'</a>';
  }).join("");
}
function orState(){
  var o=seed.openrun||{}, hr=+o.hour||10, n=new Date(), t=new Date(n); t.setHours(hr,0,0,0);
  if(n<t) return {open:false,ms:t-n,hr:hr};
  return {open:true,hr:hr};
}
function orText(s){ return s.open?'🔥 오늘 '+s.hr+'시 오픈! 지금 바로 확인하세요':'⏳ 오늘 오픈까지 <b>'+clock(s.ms)+'</b>'; }
function openrunCard(){
  var o=seed.openrun, u=o&&safeUrl(o.u); if(!u) return "";
  var s=orState();
  return '<a class="orc" '+ext(u)+'><span class="orh"><span class="orclk">⏰</span><span class="ort"><small>매일 오전 '+s.hr+'시</small><b>'+esc(o.t)+'</b></span><span class="orgo">바로보기 ›</span></span><span class="ord">'+esc(o.d||"")+'</span><span class="orcd" data-or>'+orText(s)+'</span></a>';
}
function couponCards(){
  var list=(Array.isArray(seed.coupons)?seed.coupons:[]).filter(function(c){ return safeUrl(c.u); });
  if(!list.length) return "";
  return '<section class="cpsec"><h2>🎟️ 지금 받을 수 있는 쿠폰</h2>'+list.map(function(c){
    return '<a class="cpn" '+ext(safeUrl(c.u))+'><span class="cpl"><small>'+esc(c.brand?c.brand+' · ':'')+esc(c.tag||"제휴 쿠폰")+'</small><b class="cpbig">'+esc(c.big||"")+'</b><b class="cpt">'+esc(c.t)+'</b><span class="cpd">'+esc(c.d||"")+'</span></span>'+
      '<span class="cpr"><span class="cpdl">⬇</span><span>'+esc(c.b||"쿠폰 받기")+'</span></span></a>'+(c.note?'<p class="cpnote">'+esc(c.note)+'</p>':'');
  }).join("")+'</section>';
}
/* ---------- 이벤트: 마이리얼트립 숙소 특가 (2026-10-17 시온님 요청, scripts/mrt_api.py 가 매일 6:40 채움) ---------- */
function mrtList(){ return (seed.mrtDeals||[]).filter(function(x){ return safeUrl(x.u)&&x.price; }); }
function yeogiBox(pos){ // 여기어때 마케팅 파트너 링크(시온님이 파트너센터에서 발급, data.json yeogi). until 지나면 숨김
  var td=ymd(today()), Y=(seed.yeogi||[]).filter(function(x){ return safeUrl(x.u)&&(!x.until||x.until>=td)&&((x.pos||"top")===(pos||"top")); });
  return Y.map(function(x){ return '<a class="yeo" '+ext(x.u)+'><span><small>여기어때</small><b>'+esc(x.t)+'</b>'+(x.d?'<em>'+esc(x.d)+'</em>':'')+'</span><i>'+esc(x.b||"보러가기")+' ›</i></a>'; }).join("");
}
/* 공짜여행 기획전(2026-10-19 시온님 요청 "이제 공짜여행이 시작된다!", 인트로 '지금 바로가기'·홈 배너 → #/trip): 모집 중 숙박 체험단 모음. 사이트 안 페이지라 광고 표시 없음 */
var TRIP_Q=[["","전체"],["풀빌라","풀빌라"],["키즈","키즈"],["키즈풀빌라","키즈풀빌라"],["반려동물","반려동물 동반"],["오션뷰","오션뷰"],["글램핑","글램핑"],["한옥","한옥"],["독채","독채"]];
var PET_STAY=/애견|반려|펫|강아지|댕댕|도그/i;
function petStay(it){ var f=it.fee||{}; return PET_STAY.test((it.name||"")+" "+(it.benefit||"")+" "+(it.sum||"")+" "+(f.d||"")) && !/반려동물\s*:?\s*동반\s*불가|애견\s*동반\s*불가|반려동물\s*불가/.test((it.benefit||"")+" "+(it.sum||"")); }
/* 반려동물 체험단 목록 중간 배너(2026-10-19 시온님 요청): 가로 배너의 "반려동물 동반 숙소" 한 장 */
function petStayBanner(){ var n=seed.items.filter(function(it){ return catOf(it)==="stay" && statusOf(it).key==="open" && petStay(it); }).length; if(n<2) return "";
  return '<div class="wbs wb1"><div class="wbtrack"><a class="wb" style="background:linear-gradient(90deg,#3a1d0b 0%,#8a4a17 60%,#d08a3a 100%)" href="#/trip?q='+encodeURIComponent("반려동물")+'"><span class="wbt"><small>댕댕이랑 같이 떠나요</small><b>반려동물 동반 숙소 <em>'+n+'곳</em></b></span><span class="wbe" aria-hidden="true">🐶</span></a></div></div>'; }
function tripView(){
  var all=seed.items.filter(function(it){ return catOf(it)==="stay" && statusOf(it).key==="open"; }), q=state.tq||"";
  var L=q?all.filter(function(it){ var t=(it.name||"")+" "+(it.benefit||"")+" "+(it.sum||""); return q==="반려동물"?petStay(it):t.indexOf(q)>=0; }):all;
  var sum=0; all.forEach(function(it){ var v=valOf(it); if(v>0&&v<5e6) sum+=v; });
  var fresh=all.filter(isNewToday).sort(function(a,b){ return valOf(b)-valOf(a); }), soon=all.filter(function(it){ return daysLeft(it)<=1; }).sort(byDeadline);
  var h='<div class="trp">'+
    '<section class="trhero"><img class="trart" src="images/free-trip.svg" alt=""><div class="trtx"><small>아직도 몰랐어?</small><h1>이제 <span>공짜여행</span>이<br>시작된다!</h1><p>여행도 다니고 돈도 아끼고!<br>여행 무료 체험단</p>'+
      '<div class="trnum"><b>'+all.length+'곳</b> 모집 중'+(sum?' · 제공 금액 <b>'+manW(Math.floor(sum/10000)*10000)+' 이상</b>':'')+'</div></div></section>'+
    '<section class="trhow"><h2>이렇게 떠나요</h2><ol><li><b>1</b><span><em>마음에 드는 숙소 신청</em>모집 사이트에서 신청해요</span></li><li><b>2</b><span><em>선정되면 예약하고 여행</em>숙박을 무료로 제공받아요</span></li><li><b>3</b><span><em>후기 남기기</em>블로그·SNS에 솔직한 후기를 올려요</span></li></ol>'+
      '<p class="trnote">체험단은 숙박을 제공받고 후기를 남기는 조건이에요. 인원 추가·바베큐 같은 추가 요금은 상세 페이지에서 확인하세요.</p></section>'+
    (fresh.length?hrow('✨ 오늘 새로 열린 여행','#/list?cat=stay&s=open',fresh):'')+
    (soon.length?hrow('⏰ 곧 마감되는 여행','#/list?cat=stay&s=closing',soon):'')+
    '<section class="hsec trlist"><div class="hsh"><h2>공짜여행 숙소 모두 보기</h2></div>'+
      '<div class="trchips">'+TRIP_Q.map(function(c){ return '<a href="#/trip'+(c[0]?'?q='+encodeURIComponent(c[0]):'')+'"'+(c[0]===q?' class="on"':'')+'>'+esc(c[1])+'</a>'; }).join("")+'</div>'+
      (L.length?'<div class="grid v2">'+L.sort(function(a,b){ return valOf(b)-valOf(a) || byDeadline(a,b); }).map(function(it){ return fullCard(it); }).join("")+'</div>':'<div class="empty sm"><b>지금은 '+esc(q)+' 숙소가 없어요</b>새로 올라오면 알려드릴게요.</div>')+
    '</section><div class="hallw"><a class="b pri wide" href="#/list?cat=stay&s=open">숙박 체험단 전체 목록 보기 ›</a></div></div>';
  return h;
}
function eventView(){
  var all=mrtList(), info=seed.mrtInfo||{}, abr=!!state.evAbr;
  var L=all.filter(function(x){ return abr?!x.dom:x.dom; }).sort(function(a,b){ return b.rate-a.rate; });
  var md=function(d){ var p=String(d||"").split("-"); return p.length===3?(+p[1])+"/"+(+p[2]):""; };
  var h='<div class="pg ev"><h1>숙소 할인 특가</h1><p class="pgsub">마이리얼트립 숙소 특가를 할인율 높은 순으로 모았어요</p>'+
    '<div class="evtab"><a href="#/event"'+(abr?'':' class="on"')+'>국내</a><a href="#/event?t=abroad"'+(abr?' class="on"':'')+'>해외</a></div>'+
    yeogiBox()+
    (info.checkIn?'<p class="evnote">'+md(info.checkIn)+'(토) 1박 · 성인 '+(info.adults||2)+'명 기준 가격이에요. 날짜·인원에 따라 달라지고, 매일 아침 새로 모아요.</p>':'');
  if(!L.length) return h+'<div class="empty sm"><b>특가를 준비 중이에요</b>내일 아침에 다시 확인해 주세요.</div>'+yeogiBox("bottom")+'</div>';
  var mid=L.length>=8?6:L.length-(L.length%2), yb=yeogiBox("bottom"); // 여기어때 배너는 목록 중간(6개 뒤)에 (2026-10-18 시온님 요청)
  h+='<div class="evgrid2">'+L.map(function(x,i){
    return (i===mid&&yb?'<div class="evmid">'+yb+'</div>':'')+'<a class="evd" '+ext(x.u)+'><span class="evi"><img src="'+esc(x.img)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"><em>'+esc(x.region)+'</em></span>'+
      '<b class="evn">'+esc(x.name)+'</b>'+(x.score?'<small class="evs">★ '+esc(x.score)+(x.reviews?' ('+Number(x.reviews).toLocaleString()+')':'')+'</small>':'')+
      '<span class="evp"><i>'+x.rate+'%</i><b>'+Number(x.price).toLocaleString()+'원</b></span><s>'+Number(x.orig).toLocaleString()+'원</s></a>'; }).join("")+(mid>=L.length&&yb?'<div class="evmid">'+yb+'</div>':'')+'</div>'+
    '<p class="evfoot">이 페이지의 링크로 예약하면 다꾸가 마이리얼트립·여기어때에서 일정액의 수수료를 받을 수 있어요. 예약 조건·취소 규정은 마이리얼트립에서 꼭 확인해 주세요.</p></div>';
  return h;
}
/* 체험단 가이드 글(g/, gen_share.py 가 g/list.json 생성) — 홈·혜택 탭에 목록 (2026-10-18) */
var GUIDES=null;
/* 다꾸 매거진(2026-10-20 시온님 "게시판 볼 곳 하나"): 체험단 가이드(g/list.json)와 추천 모음(p/list.json)은 따로 관리하고 #/mag 한 화면에서 탭으로 본다 */
var PICKS=null, STAYM=null;
function qs0(k){ var m=(location.hash.split("?")[1]||"").match(new RegExp("(?:^|&)"+k+"=([^&]*)")); return m?decodeURIComponent(m[1]):""; }
function magLoad(cb){
  var n=0, done=function(){ if(++n===3) cb(); };
  if(STAYM) done(); else fetch((BASE||"/")+"m/list.json",{cache:"no-cache"}).then(function(r){ return r.ok?r.json():[]; }).then(function(L){ STAYM=L||[]; done(); }).catch(function(){ STAYM=[]; done(); });
  if(GUIDES) done(); else fetch((BASE||"/")+"g/list.json",{cache:"no-cache"}).then(function(r){ return r.ok?r.json():[]; }).then(function(L){ GUIDES=(L||[]).slice().sort(function(a,b){ return (b.date||"")>(a.date||"")?1:(b.date||"")<(a.date||"")?-1:0; }); done(); }).catch(function(){ GUIDES=[]; done(); });
  if(PICKS) done(); else fetch((BASE||"/")+"p/list.json",{cache:"no-cache"}).then(function(r){ return r.ok?r.json():[]; }).then(function(L){ PICKS=L||[]; done(); }).catch(function(){ PICKS=[]; done(); });
}
function gDate(d){ return d?'<em class="gdt">'+esc(String(d).replace(/-/g,"."))+' 업로드</em>':""; }
function mvTag(k){ return '<em class="mvc" data-mv="'+esc(k)+'" hidden></em>'; }
function guideRow(g){ return '<a class="gdi" href="/g/'+esc(g.slug)+'.html"><b>'+esc(g.t)+'</b><small>'+esc(g.d)+'</small>'+gDate(g.date)+mvTag("g:"+g.slug)+'</a>'; }
function pickRow(x){ return '<a class="gdi pki" href="/p/'+esc(x.slug)+'.html">'+(safeUrl(x.img)?'<img src="'+esc(safeUrl(x.img))+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'')+'<span><b>'+esc(x.h||x.t)+'</b><small>'+esc(x.d)+'</small>'+gDate(x.date)+mvTag("p:"+x.slug)+'</span></a>'; }
function stayRow(x){ return '<a class="gdi pki smg" href="/m/'+esc(x.slug)+'.html" data-no="'+esc(x.no||"")+'" data-q="'+esc((x.name+" "+x.area+" "+x.t).toLowerCase())+'">'+(x.no?'<i class="sno">'+esc(x.no)+'</i>':'')+(safeUrl(x.img)?'<img src="'+esc(safeUrl(x.img))+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'')+'<span><b>'+esc(x.t)+'</b><small>'+esc(x.name)+' · '+esc(x.area)+'</small>'+gDate(x.date)+mvTag("m:"+x.slug)+'</span></a>'; }
function guideFill(){
  var B=document.querySelectorAll("[data-guides]"), M=document.getElementById("magbody"); if(!B.length&&!M) return;
  magLoad(function(){
    var h=(STAYM.length?'<section class="gdbox"><div class="gdh"><b>국내 감성숙소 추천</b><a href="#/mag?t=s">전체 ›</a></div>'+STAYM.slice(0,3).map(stayRow).join("")+'</section>':"")+(GUIDES.length?'<section class="gdbox"><div class="gdh"><b>체험단 가이드</b><a href="#/mag?t=g">전체 ›</a></div>'+GUIDES.slice(0,3).map(guideRow).join("")+'</section>':"")+
      (PICKS.length?'<section class="gdbox"><div class="gdh"><b>다꾸 추천 모음</b><a href="#/mag?t=p">전체 ›</a></div>'+PICKS.slice(0,3).map(pickRow).join("")+'</section>':"");
    [].forEach.call(B,function(b){ b.innerHTML=h; });
    if(M){ var L=state.magT==="p"?PICKS:state.magT==="s"?STAYM:GUIDES; M.innerHTML=L.length?(state.magT==="s"?'<div class="stsrch"><input id="stq" type="search" placeholder="번호 또는 숙소 이름·지역 검색 (예: 3, 가평)" autocomplete="off" enterkeyhint="search"></div>':'')+'<div class="maglist">'+L.map(state.magT==="p"?pickRow:state.magT==="s"?stayRow:guideRow).join("")+'</div>'+(state.magT==="s"?'<p class="smgnone" id="stnone" hidden>찾는 숙소가 없어요. 번호를 다시 확인해 주세요.</p>':''):'<div class="empty">곧 새 글이 올라와요</div>';
      var sq=document.getElementById("stq"); if(sq){ var run=function(){ var v=sq.value.trim().toLowerCase().replace(/[\[\]]/g,"").replace(/^no\.?\s*/,"").replace(/^#/,""),hit=0; [].forEach.call(M.querySelectorAll(".smg"),function(a){ var ok=!v||(/^\d+$/.test(v)?a.getAttribute("data-no")===String(+v):a.getAttribute("data-q").indexOf(v)>=0); a.style.display=ok?"":"none"; if(ok)hit++; }); document.getElementById("stnone").hidden=!!hit||!v; }; sq.addEventListener("input",run); if(qs0("n")){ sq.value=qs0("n"); run(); } } }
    if(window.dkMagPaint) window.dkMagPaint();
  });
}

/* 체험단 사이트 바로가기 (2026-10-22 시온님 "이런 페이지 하나 만들어줘" — 콜라보매니저 플랫폼 바로가기 참고).
   남의 로고는 쓰지 않고 색 + 글자만. 기본 순서는 다꾸에 모집 중인 곳 수, "순서 편집"으로 위로 올리면 이 기기에 기억(dakku-site-order). */
var SITES=[["레뷰","https://www.revu.net","#7b2ff2"],["리뷰노트","https://www.reviewnote.co.kr","#1fae8c"],["포포몬","https://popomon.com","#ff7a45"],["스타일씨","https://www.stylec.co.kr","#ec4f8a"],
  ["강남맛집","https://xn--939au0g4vj8sq.net","#ff6a13"],["리뷰플레이스","https://www.reviewplace.co.kr","#e5424d"],["클라우드리뷰","https://www.cloudreview.co.kr","#3d8bfd"],["댕댕뷰","https://dengdengview.co.kr","#c9822b"],
  ["체리뷰","https://cherivu.co.kr","#d6336c"],["오마이블로그","https://www.ohmyblog.co.kr","#5b6ee1"],["링블","https://www.ringble.co.kr","#14a3b8"],["택배의여왕","https://tqueens.net","#f0568a"],
  ["뷰티의여왕","https://bqueens.net","#e0569b"],["디너의여왕","https://dinnerqueen.net","#f2006a"],["서울오빠","https://www.seoulouba.co.kr","#5b8cff"],["미블","https://www.mrblog.net","#222222"],
  ["아싸뷰","https://assaview.co.kr","#2fc6d8"],["가보자 체험단","https://www.xn--o39a04kpnjo4k9hgflp.com","#7cc242","가보자"],["슈퍼멤버스","https://app.supermembers.co.kr","#ff8a00"],["똑똑리워드","https://ddok.it","#12b886","똑똑"],
  ["시원뷰","https://sioneview.com","#4dabf7"],["후기업","https://www.whogiup.com","#845ef7"]];
var SITE_AB={"리뷰노트":"노트","리뷰플레이스":"리플","클라우드리뷰":"클라","오마이블로그":"오마이","슈퍼멤버스":"슈멤","똑똑리워드":"똑똑","택배의여왕":"택여","뷰티의여왕":"뷰여","디너의여왕":"디여","강남맛집":"강맛"};
function siteOrder(){
  var open=seed.items.filter(function(it){ return statusOf(it).key==="open"; }), n={};
  open.forEach(function(it){ var k=it.source||""; n[k]=(n[k]||0)+1; });
  var L=SITES.map(function(x,i){ var c=(n[x[0]]||0)+(x[3]&&x[3]!==x[0]?(n[x[3]]||0):0); return {k:x[0],u:x[1],c:x[2],src:x[3]&&x[3]!==x[0]?x[0]+","+x[3]:x[0],n:c,i:i}; });
  var saved=[]; try{ saved=JSON.parse(localStorage.getItem("dakku-site-order")||"[]"); }catch(e){}
  L.sort(function(a,b){ var ia=saved.indexOf(a.k), ib=saved.indexOf(b.k); if(ia>=0||ib>=0) return (ia<0?999:ia)-(ib<0?999:ib); return (b.n-a.n)||(a.i-b.i); });
  return L;
}
/* 마이 다꾸 체험단 사이트 바로가기 — 2026-10-22 시온님 */
function mySites(){
  var L=siteOrder();
  return '<section class="mysites"><div class="sh"><h2>🔗 체험단 사이트 바로가기</h2><a class="hmore" href="#/sites">순서 편집 ›</a></div><p class="mysub2">한번만 로그인 해두고 편하게 사용하세요!</p><div class="msgrid">'+L.map(function(x){ var ab=SITE_AB[x.k]||x.k.replace(/\s*체험단$/,""); ab=ab.length>3?ab.slice(0,2):ab;
    return '<a href="'+x.u+'" target="_blank" rel="noopener" data-sitego="'+esc(x.k)+'"><span class="stab" style="background:'+x.c+'">'+esc(ab)+'</span><b>'+esc(x.k)+'</b></a>'; }).join("")+'</div></section>';
}
function sitesView(){
  var L=siteOrder(), ed=!!state.siteEd;
  return '<div class="pg sites"><h1>체험단 사이트 바로가기</h1><p class="pgsub">자주 가는 체험단 사이트를 한 번에 열어 보세요 🚀</p>'+
    '<div class="stbar"><span>'+(ed?'↑ 를 눌러 순서를 바꿔요 (이 기기에 저장)':'다꾸에 모집 중인 곳이 많은 순')+'</span><button class="lnk" data-sited>'+(ed?'완료':'순서 편집')+'</button></div>'+
    '<ul class="stlist">'+L.map(function(x,i){ var ab=SITE_AB[x.k]||x.k.replace(/\s*체험단$/,""); ab=ab.length>3?ab.slice(0,2):ab;
      return '<li><span class="stab" style="background:'+x.c+'">'+esc(ab)+'</span>'+
        '<a class="stgo" style="background:'+x.c+'" href="'+x.u+'" target="_blank" rel="noopener" data-sitego="'+esc(x.k)+'"><b>'+esc(x.k)+'</b><span>›</span></a>'+
        (ed?'<button class="stup" data-siteup="'+i+'" aria-label="위로"'+(i?'':' disabled')+'>↑</button>':
          (x.n?'<a class="stn" href="#/list?cat=all&s=open&src='+encodeURIComponent(x.src)+'"><b>'+x.n+'</b><small>모집 중</small></a>':'<span class="stn off"><small>–</small></span>'))+'</li>'; }).join("")+'</ul>'+
    '<p class="stnote">다꾸체험단은 각 체험단 사이트와 무관한 정보 모음 서비스예요. 오른쪽 숫자를 누르면 그 사이트의 모집 중 체험단을 다꾸에서 모아 볼 수 있어요.</p></div>';
}
document.addEventListener("click",function(e){
  var t=e.target, a;
  if((a=t.closest&&t.closest("[data-sited]"))){ state.siteEd=!state.siteEd; render(); return; }
  if((a=t.closest&&t.closest("[data-siteup]"))){ var i=+a.dataset.siteup; if(i<1) return; var L=siteOrder().map(function(x){ return x.k; }); var m=L[i]; L[i]=L[i-1]; L[i-1]=m; try{ localStorage.setItem("dakku-site-order",JSON.stringify(L)); }catch(err){} render(); return; }
  if((a=t.closest&&t.closest("[data-sitego]"))) ga("site_go",{site:a.dataset.sitego});
});
function magView(){
  var t=state.magT==="p"?"p":state.magT==="g"?"g":"s";
  return '<div class="pg mag"><h1>다꾸 매거진</h1><p class="pgsub">감성숙소 추천 · 체험단 가이드 · 추천 모음을 모아 봤어요</p>'+
    '<div class="magtabs"><a href="#/mag"'+(t==="s"?' class="on"':'')+'>감성숙소 추천</a><a href="#/mag?t=g"'+(t==="g"?' class="on"':'')+'>체험단 가이드</a><a href="#/mag?t=p"'+(t==="p"?' class="on"':'')+'>추천 모음</a></div>'+
    (t!=="g"?'<p class="magnote">'+(t==="s"?"감성숙소 추천":"추천 모음")+'의 링크는 쿠팡 파트너스 활동으로 수수료를 받을 수 있어요.</p>':'')+
    '<div id="magbody"><div class="empty">불러오는 중…</div></div></div>';
}
function benefitView(){
  var h='<div class="pg"><h1>혜택 🎁</h1><p class="pgsub">룰렛 · 이벤트 · 기자단 모집을 한곳에 모았어요</p>'+slideBanners(true);
  h+=couponCards();
  if((seed.features||{}).roulette) h+=rouletteHtml();
  var r=rep();
  h+='<div data-guides></div>';
  h+='<div class="evgrid">'+
    (r?'<a class="evc" href="#/reporter" style="--b:#f1ecff;--i:#4b2a9e"><span class="eve">✍️</span><b>다꾸 기자단</b><small>후기 쓰고 1만원 상품권</small></a>':'')+
    '<a class="evc" href="'+esc(safeUrl((seed.sns||{}).instagram)||"https://www.instagram.com/")+'" target="_blank" rel="noopener noreferrer" style="--b:#fff6dc;--i:#7a5a00"><span class="eve">📸</span><b>다꾸 태그 이벤트</b><small>선정되면 다꾸를 태그해요</small></a>'+
    '<a class="evc" href="'+esc(kakaoUrl())+'" target="_blank" rel="noopener noreferrer" style="--b:#fff9c4;--i:#5a4a00"><span class="eve">💬</span><b>카톡 친구추가</b><small>새 체험단 알림 받기</small></a>'+
    '<button class="evc" data-share style="--b:#eef6ff;--i:#1d4ed8"><span class="eve">🔗</span><b>친구에게 공유</b><small>다꾸를 알려주세요</small></button>'+
  '</div>';
  h+='<div class="pane soonpane"><h2>🎈 곧 열리는 놀거리</h2>'+
     ((seed.features||{}).roulette?[]:[["행운 룰렛","하루 한 번 돌리고 간식 쿠폰 받기",I.wheel]]).concat([["🤔 숙소 가격 맞히기","하루 한 문제, 가격 감각 테스트",I.quiz],["📈 요즘 뜨는 검색어","많이 찾는 숙소 검색어 모아보기",I.trend]]).map(function(x){ return '<div class="srow"><span class="si">'+ico(x[2])+'</span><span class="lt"><b>'+x[0]+'</b><small>'+x[1]+'</small></span><span class="pill">준비 중</span></div>'; }).join("")+
     '<a class="b kakao" '+ext(kakaoUrl())+'>💬 열리면 카톡으로 알림 받기</a></div>';
  h+='<a class="morebig" href="#/deals">🔥 특가 상품은 <b>특가 탭</b>에서 볼 수 있어요 ›</a>';
  return h+'</div>';
}
function endLeft(iso){ var ms=Date.parse(iso)-Date.now(); if(!(ms>0)) return "종료"; var d=Math.floor(ms/864e5); return (d>0?d+"일 ":"")+clock(ms%864e5)+" 남음"; }
function nextSeven(){ var n=new Date(), t=new Date(n); t.setHours(7,0,0,0); if(t<=n) t.setDate(t.getDate()+1); return t-n; }
function tossCode(x){ var m=/\/_m\/([A-Za-z0-9_-]+)/.exec(String(x.u||"")); return m?m[1]:""; }
function tossCard(x){
  var img=safeUrl(x.img), tk=tossCode(x);
  return '<a class="tcard'+(img?'':' noimg')+(x.soldOut?' sold':'')+'" '+ext(safeUrl(x.u))+'><span class="tim"'+(tk?' id="tk-'+esc(tk)+'"':'')+'>'+(tk?'<button class="shb tsh" data-tshare="'+esc(tk)+'" aria-label="'+esc(x.name)+' 공유하기">'+ico(I.send)+'</button>':'')+(img?'<img src="'+esc(img)+'" alt="'+esc(x.name)+'" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">':'<span class="tno">'+ico(I.gift)+'</span>')+(x.badge?'<em>'+esc(x.badge)+'</em>':'')+(x.rocket?'<span class="rks">로켓배송</span>':'')+(x.fee?'<span class="shk">'+esc(x.fee)+'</span>':'')+(x.best?'<strong class="bestb">🔥 오늘 최대 할인</strong>':'')+(x.soldOut?'<span class="soldov"><b>품절</b><span>밤 12시에 새 특가가 열려요</span></span>':'')+'</span>'+
    (x.low30?'<span class="low30">지금 <b>30일 내 최저가</b>예요</span>':'')+'<span class="tn">'+esc(x.name)+'</span>'+(x.price?'<span class="tp">'+(x.rate?'<i>'+esc(x.rate)+'</i> ':'')+esc(x.price)+(x.orig?' <s class="tor">'+esc(x.orig)+'</s>':'')+'</span>':'<span class="tgo">특가 확인하기 ›</span>')+(x.endAt?'<span class="tcd" data-end="'+esc(x.endAt)+'">'+endLeft(x.endAt)+'</span>':'')+(x.comp?'<span class="tchips"><span class="chipr">최저가보상</span></span>':'')+(x.ship?'<span class="tch">'+esc(x.ship)+'</span>':'')+'</a>';
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
  if(authCfg()){ if(!USER){ goLogin("룰렛은 로그인하고 참여할 수 있어요"); return; } serverSpin(btn); return; }
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
    '<text x="79" y="36" text-anchor="middle" font-size="10" font-weight="700" fill="#7a5a00" font-family="Pretendard Variable,Pretendard,sans-serif">상품권</text>'+
    '<text x="79" y="56" text-anchor="middle" font-size="17" font-weight="900" fill="#3d2e00" font-family="Pretendard Variable,Pretendard,sans-serif">1만원</text>'+
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
    '<g transform="translate(78 70) rotate(10)"><rect x="0" y="0" width="34" height="22" rx="11" fill="#fff"/><text x="17" y="15.5" text-anchor="middle" font-size="12" font-weight="900" fill="#6a3fc8" font-family="Pretendard Variable,Pretendard,sans-serif">@다꾸</text></g>'+
  '</svg>';
}
function tagBanner(){
  var s=seed.sns||{}, ig=safeUrl(s.instagram), bl=safeUrl(s.blog);
  return '<div class="tagb"><span class="rx"><small>📸 다꾸 태그하기 이벤트</small><b>다꾸에서 발견한 체험단에<br>선정되면 다꾸를 태그해 주세요!</b><span class="tsub">🍀 태그해 주시면 다꾸 기자단 선정 확률 UP!</span>'+
    '<span class="tbtns"><a class="igbtn" href="'+esc(ig||"https://www.instagram.com/")+'" target="_blank" rel="noopener noreferrer">📸 인스타그램 바로가기 ›</a>'+(bl?'<a href="'+esc(bl)+'" target="_blank" rel="noopener noreferrer">블로그 ›</a>':'')+'</span>'+
    '</span>'+giftSvg()+'</div>';
}
function kakaoSlide(){
  return '<a class="kkb" href="'+esc(kakaoUrl())+'" target="_blank" rel="noopener noreferrer"><span class="rx"><small>💬 다꾸 카카오톡 채널</small><b>카카오톡 채널 친구추가 하면<br>체험단 소식 알림받기!</b><span class="kbtn">친구추가하기 ›</span></span><span class="kbub"><svg viewBox="0 0 64 60" aria-hidden="true"><path d="M32 6C16.5 6 4 15.8 4 28c0 7.8 5.1 14.6 12.8 18.6L14 56l11-6.6c2.2.4 4.6.6 7 .6 15.5 0 28-9.8 28-22S47.5 6 32 6Z" fill="#3c1e1e"/><text x="32" y="33" text-anchor="middle" font-size="13" font-weight="900" fill="#fee500" font-family="Pretendard Variable,Pretendard,sans-serif">TALK</text></svg><em>🔔</em></span></a>';
}
var SPARK='<svg class="spk" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0c.6 6.2 5.8 11.4 12 12-6.2.6-11.4 5.8-12 12-.6-6.2-5.8-11.4-12-12C6.2 11.4 11.4 6.2 12 0Z" fill="currentColor"/></svg>';
/* 광고 프로모션(2026-10-18 시온님 요청 "이번 주말 어디가지?" → 쿠팡트래블 입장권 특가): data.json promo + links[promo.link].u(쿠팡 API 수익 링크). 1 인트로(index.html) → 2 아래 팝업(promoPopup) → 3 홈 배너 첫 장(heroSlides) */
function promoOn(){ var P=seed.promo; if(!P||!P.on) return null; if(P.until&&new Date().toISOString().slice(0,10)>P.until) return null; var L=(seed.links||{})[P.link]||{}, u=safeUrl(L.u); if(!u) return null; var o={}; for(var k in P) o[k]=P[k]; o.u=u; return o; }
var PM_NAMED=/아쿠아|롯데월드|에버랜드|스카이|플라넷|리움|워터파크|동물원|박물관|미술관|테마파크|랜드|월드|타워|케이블카|레일바이크|스파|온천/; // 입장권 이름에 장소가 들어간 것만(옵션명만 있는 '입장권 1인권' 같은 건 뺌)
function promoList(P){ var S=seed.seasonDeals||{}, L=[], seen={}; (P.items||[]).forEach(function(k){ (S[k]||[]).forEach(function(x){ var nm=x.name||"", n=nm.slice(0,16); if(safeUrl(x.u)&&safeUrl(x.img)&&!seen[n]&&PM_NAMED.test(nm)&&!/^\s*[A-Z]\d|^\[/.test(nm)){ seen[n]=1; L.push(x); } }); }); return L.slice(0,10); }
function promoRows(L){ /* 2026-10-20 시온님 요청: 팝업·배너의 흐르는 상품 카드는 쿠팡이 아니라 다꾸 입장권 특가 페이지(#/tix)로 — 운영정책 4.1-2 레이어 오클릭 대비 */
  function card(x,i){ return '<a class="pmc" href="#/tix?i='+i+'"><span class="pmt"><b>'+esc(x.price||"")+'</b>'+(x.rocket?'<i>로켓배송</i>':'')+'</span><span class="pmn">'+esc(x.name||"")+'</span><img src="'+esc(safeUrl(x.img))+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"></a>'; }
  var half=Math.ceil(L.length/2);
  function row(a,cls,o){ var c=function(x,j){ return card(x,o+j); }; return a.length?'<div class="pmrow '+cls+'"><div class="pmtrack">'+a.map(c).join("")+a.map(c).join("")+'</div></div>':''; }
  return row(L.slice(0,half),"r1",0)+row(L.slice(half),"r2",half); }
/* 입장권 특가 모아보기(#/tix, 2026-10-20): 팝업 카드를 누르면 여기로. 상품마다 "쿠팡에서 가격 보기 ↗" 로만 쿠팡에 간다 */
function tixView(){
  var P=promoOn(), L=P?promoList(P):[], T=openItems("etc");
  var h='<div class="pg tix"><h1>이번 주말 입장권 특가</h1><p class="pgsub">아쿠아리움·테마파크 같은 나들이 입장권을 모았어요. 가격과 날짜는 쿠팡 화면에서 확인해 주세요.</p>';
  if(L.length) h+='<div class="tixg">'+L.map(function(x,i){ var img=safeUrl(x.img); return '<div class="tixc'+(String(i)===String(state.tixI)?' on':'')+'" id="tix'+i+'">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'')+'<div class="tixb"><b>'+esc(x.name)+'</b><span>'+esc(x.price||"")+'</span><a class="tixgo" data-gsec="tix" '+ext(safeUrl(x.u))+'>상품 바로가기</a></div></div>'; }).join("")+'</div>';
  else h+='<div class="empty">지금 보여드릴 입장권 특가가 없어요</div>';
  if(P) h+='<a class="tixall" '+ext(P.u)+'>입장권 특가 전체 보기</a>';
  h+=hrow("입장권 체험단도 있어요","#/list?cat=etc",T);
  return h+'</div>';
}
/* 홈 중간 배너(2026-10-19 시온님 요청 "팝업이랑 비슷한 디자인"): 같은 promo·상품, 상품 4개 미만이면 안 보임 */
function promoBand(){ var P=promoOn(); if(!P) return ""; var L=promoList(P); if(L.length<4) return "";
  return '<section class="pmband" aria-label="광고"><a class="phead" '+ext(P.u)+'><small>'+esc(P.small||"")+'</small><b>'+esc((P.t||"").replace(/<[^>]+>/g,""))+'</b><em>'+esc(P.t2||P.b||"")+' ›</em></a>'+promoRows(L)+'<div class="pmgap"></div></section>'; }
/* 오늘의 감성숙소(2026-10-25 시온님): gen_stays.py 가 index.html 에 넣는 window.STAY_TODAY → 홈 슬라이드 첫 장·가로 띠 첫 장·팝업. 모두 사이트 안 매거진 글로 간다(쿠팡으로 바로 보내지 않음, 운영정책 4.1-2) */
function stayToday(){ var T=window.STAY_TODAY; if(!T||!T.slug||!safeUrl(T.img)) return null; return T; }
function stayNo(T){ return ("00"+(+T.no||0)).slice(-3); }
function stayHref(T){ return "/m/"+encodeURIComponent(T.slug)+".html"; }
function stayPopup(T){
  if(state.tab!=="home"||document.querySelector(".promom")) return;
  try{ if(sessionStorage.getItem("dakku-promo")) return; var td=new Date().toISOString().slice(0,10); if(localStorage.getItem("dakku-promo-hide")===td) return; sessionStorage.setItem("dakku-promo","1"); }catch(e){ return; }
  var w=document.createElement("div"); w.className="modal promom stpop"; w.setAttribute("role","dialog"); w.setAttribute("aria-modal","true"); w.setAttribute("aria-label","오늘의 감성숙소");
  w.innerHTML='<div class="psheet2"><a class="stpc" href="'+stayHref(T)+'" data-stgo="popup"><img src="'+esc(T.img)+'" alt="" referrerpolicy="no-referrer"><span class="stpt"><small>오늘의 감성숙소 ['+stayNo(T)+']</small><b>'+esc(T.t||T.name)+'</b><em>'+esc(T.name)+' · '+esc(T.area||"")+'</em><i>숙소 소개 보러가기 ›</i></span></a>'+
    '<div class="pfoot"><button data-p="hide">오늘 그만보기</button><button data-p="x">닫기</button></div></div>';
  function close(){ w.classList.add("out"); setTimeout(function(){ w.remove(); },250); }
  w.addEventListener("click",function(e){ if(e.target===w) return close(); var b=e.target.closest("[data-p]"); if(b){ if(b.dataset.p==="hide"){ try{ localStorage.setItem("dakku-promo-hide",new Date().toISOString().slice(0,10)); }catch(er){} } close(); } else if(e.target.closest("a")) setTimeout(close,300); });
  document.body.appendChild(w);
}
document.addEventListener("click",function(e){ var a=e.target.closest&&e.target.closest("[data-stgo]"); if(!a) return; try{ if(window.gtag){ var T=stayToday()||{}; gtag("event","promo_click",{place:a.getAttribute("data-stgo"),promo:"stay_today",item_name:T.name||""}); } }catch(er){} });
function promoPopup(){
  var ST=stayToday(); if(ST) return stayPopup(ST);
  var P=promoOn(); if(!P||state.tab!=="home"||document.querySelector(".promom")) return;
  try{ if(sessionStorage.getItem("dakku-promo")) return; var td=new Date().toISOString().slice(0,10); if(localStorage.getItem("dakku-promo-hide")===td) return; sessionStorage.setItem("dakku-promo","1"); }catch(e){ return; }
  var L=promoList(P);
  var w=document.createElement("div"); w.className="modal promom"; w.setAttribute("role","dialog"); w.setAttribute("aria-modal","true"); w.setAttribute("aria-label","광고");
  w.innerHTML='<div class="psheet2"><a class="phead" href="#/tix"><small>'+esc(P.small||"")+'</small><b>'+esc((P.t||"").replace(/<[^>]+>/g,""))+'</b><em>'+esc(P.t2||P.b||"")+' ›</em></a>'+
    (L.length>=4?promoRows(L):'<a class="pmart" href="#/tix"><img src="'+esc(P.art)+'" alt=""></a>')+
    '<div class="pfoot"><button data-p="hide">오늘 그만보기</button><button data-p="x">닫기</button></div></div>';
  function close(){ w.classList.add("out"); setTimeout(function(){ w.remove(); },250); }
  w.addEventListener("click",function(e){ if(e.target===w) return close(); var b=e.target.closest("[data-p]"); if(b){ if(b.dataset.p==="hide"){ try{ localStorage.setItem("dakku-promo-hide",new Date().toISOString().slice(0,10)); }catch(er){} } close(); } else if(e.target.closest("a")) setTimeout(close,300); });
  document.body.appendChild(w);
}
window.afterIntro=function(){ promoPopup(); };
function heroSlides(){
  var s=[], ig=safeUrl((seed.sns||{}).instagram), oc=safeUrl(seed.openchat);
  var ST=stayToday(); if(ST) s.push({bg:"#1a0b3d",photo:ST.img,k:"오늘의 감성숙소 ["+stayNo(ST)+"]",t:esc(ST.t||ST.name),d:esc(ST.name)+" · "+esc(ST.area||""),b:"숙소 소개 보기",h:stayHref(ST),noart:1,st:1});
  s.push({bg:"radial-gradient(120% 90% at 50% 20%,#5b2fd6 0%,#3a1aa8 45%,#1d0b5c 100%)",t:"이제 <span>공짜여행</span>이 시작된다!",d:"아직도 몰랐어? 여행 무료 체험단<br>여행도 다니고 돈도 아끼고!",b:"지금 바로가기",h:"#/trip",art:"images/free-trip.svg",ft:1});
  /* 다꾸 수익화 배너는 2026-10-21 시온님 요청으로 뺌 */ //s.push({bg:"linear-gradient(120deg,#3a1670,#8a3fd0 55%,#d46fd8)",t:"<span>다꾸 수익화</span> 1:1 코칭",d:"한번 배우면 평생 써먹는<br>블로그 수익화",b:"자세히 보기",h:"#/edu",e:["🧑‍🏫","📈","✍️"]});
  var P=promoOn(); if(P) s.push({bg:"linear-gradient(120deg,#3a1670,#8a3fd0 55%,#b558d6)",t:P.t,d:P.d,b:P.b,h:P.u,x:1,art:P.art});
  var M=mrtList();
  if(M.length){ var top=M.slice().sort(function(a,b){ return b.rate-a.rate; }); s.push({bg:"#111",t:"숙소 <span>할인</span> 특가 보러가기!",d:"국내·해외 숙소 특가를<br>매일 아침 모아 드려요",b:"특가 보러가기",h:"#/event",imgs:top.slice(0,2).map(function(x){ return x.img; }),rate:top[0].rate}); }
  s.push({bg:"linear-gradient(120deg,#ffe94d,#fee500)",dark:1,t:"카카오톡 친구추가하고<br><span>NEW 체험단</span> 소식받아보세요!",d:"",b:"친구추가하기",h:kakaoUrl(),x:1,e:["💬","🔔","💛"]});
  if(authCfg()&&!USER) s.push({bg:"linear-gradient(120deg,#a855f7,#ec4899)",t:"지금 가입하면 <span>이런 혜택</span>이!",d:"매일 룰렛 간식 쿠폰 · 기자단 신청<br>찜 저장 · 맞춤 체험단 알림",b:"카카오로 3초 가입",h:"#/my",e:["🎁","🎡","💜"]});
  if(oc) s.push({bg:"linear-gradient(120deg,#22c55e,#0ea5e9)",t:"블로그 <span>서로이웃</span> · 인스타 <span>맞팔</span>해요",d:"체험단 하는 사람들끼리<br>단톡방에서 함께 소통해요!",b:"단톡방 들어가기",h:oc,x:1,e:["🤝","📝","📸"]});
  if(rep()) s.push({bg:"linear-gradient(120deg,#8b5cf6,#6a3fc8)",t:"다꾸 <span>#기자단</span> 모집",d:"체험단 후기를 블로그에 올리고<br>1만원 상품권 받아가세요~",b:"기자단 신청하기",h:"#/reporter",e:["✍️","🎁","📝"]});
  s.push({bg:"linear-gradient(120deg,#16b9c9,#0ea5b7)",t:"당첨률 높은 <span>#풀빌라</span> 체험단",d:"물놀이 걱정 없는 풀빌라,<br>지금 신청하고 무료로 즐겨보세요~",b:"체험단 확인하기",h:"#/list?cat=stay&s=open&q=%ED%92%80%EB%B9%8C%EB%9D%BC",e:["🏝️","🛟","🍹"]});
  s.push({bg:"linear-gradient(120deg,#ffe1e6,#ffd0d8)",dark:1,t:"#오직 #아이와 #함께",d:"아이랑 가기 좋은 키즈 숙소<br>체험단을 놓치지 마세요!",b:"체험단 확인하기",h:"#/list?cat=stay&s=open&q=%ED%82%A4%EC%A6%88",e:["👶","🧸","🎈"]});
  if(ig) s.push({bg:"linear-gradient(120deg,#ff8a4c,#ff5f6d)",t:"<span>#다꾸</span> 태그 이벤트",d:"다꾸에서 찾은 체험단에 선정되면<br>@다꾸를 태그해 주세요!",b:"인스타그램 바로가기",h:ig,x:1,e:["📸","💜","✨"]});
  return s;
}
function heroSlide(o){
  var href=o.jump?'href="#/deals" data-jump="'+esc(o.jump)+'"':(o.x?ext(o.h):'href="'+esc(o.h)+'"');
  var cd=o.cd?'<span class="hcd">⏳ <em '+(o.cd==="mid"?'data-mid>'+clock(msToMidnight()):'data-hd>'+clock(nextSeven()))+'</em> 남음</span>':'';
  var art=o.photo?'<img class="stbg" src="'+esc(o.photo)+'" alt="" referrerpolicy="no-referrer">':o.noart?'':o.art?'<span class="hart part" aria-hidden="true"><img src="'+esc(o.art)+'" alt=""></span>':(o.imgs&&o.imgs.length)?'<span class="hart dimg" aria-hidden="true">'+o.imgs.slice(0,2).map(function(u,i){ return '<img class="di'+(i+1)+'" src="'+esc(u)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">'; }).join("")+(o.rate?'<em class="drate">최대<b>'+esc(o.rate)+'%</b></em>':'')+'</span>'
    :'<span class="hart" aria-hidden="true"><span class="he1">'+o.e[0]+'</span><span class="he2">'+o.e[1]+'</span><span class="he3">'+o.e[2]+'</span>'+SPARK.replace('class="spk"','class="spk s1"')+SPARK.replace('class="spk"','class="spk s2"')+SPARK.replace('class="spk"','class="spk s3"')+'</span>';
  return '<a class="kv'+(o.dark?' dark':'')+(o.imgs?' dkv':'')+(o.ft?' ftkv':'')+(o.st?' stkv':'')+'"'+(o.st?' data-stgo="hero"':'')+' style="background:'+o.bg+'" '+href+'><span class="htx">'+(o.k?'<i class="hk">'+o.k+'</i>':'')+'<b>'+o.t+'</b>'+(o.d?'<small>'+o.d+'</small>':'')+cd+'<span class="hbtn">'+esc(o.b)+' ›</span></span>'+art+'</a>';
}
function maxRate(a){ var m=0; a.forEach(function(x){ var r=parseInt(String(x.rate||"").replace(/\D/g,""),10); if(r>m) m=r; }); return m||""; }
function liveGold(){ return (Array.isArray(seed.goldbox)?seed.goldbox:[]).filter(function(x){ return safeUrl(x.u) && !(x.endAt && Date.parse(x.endAt)<=Date.now()); }); }
function liveToss(){ return (Array.isArray(seed.toss)?seed.toss:[]).filter(function(x){ return safeUrl(x.u) && !(x.endAt && Date.parse(x.endAt)<=Date.now()); }); }
function dealSlides(){
  var s=[], G=liveGold(), B=babyDeals(), T=liveToss().filter(function(x){ return !x.soldOut; }), img=function(a){ return a.map(function(x){ return safeUrl(x.img); }).filter(Boolean); };
  var goods=G.filter(function(x){ return !/AFFTDP|trip\.coupang/.test(x.u); });
  if(G.length) s.push({bg:"linear-gradient(120deg,#ffe14d,#ffc700)",dark:1,k:"매일 오전 7시, 단 하루 특가",t:"오늘의 <span>골드박스</span> 특가",d:"쿠팡 골드박스 특가를<br>한눈에 모아봤어요",cd:"7",b:"특가 보러가기",jump:"gold",imgs:img(goods.length?goods:G),rate:maxRate(G)});
  if(B.length>=2) s.push({bg:"linear-gradient(120deg,#ffd6e3,#ffb4c8)",dark:1,k:"쿠팡 골드박스 · 아기용품",t:"오늘의 <span>아기용품</span> 핫딜",d:"물티슈·기저귀·유아용품<br>내일 오전 7시까지 특가",cd:"7",b:"핫딜 보러가기",jump:"babyhd",imgs:img(B),rate:maxRate(B)});
  if(T.length) s.push({bg:"linear-gradient(120deg,#4f8cff,#2b62e3)",k:"밤 12시 교체 · 토스쇼핑",t:"오늘의 <span>하루특가</span>",d:"오늘 밤 12시까지만<br>이 가격이에요!",cd:"mid",b:"하루특가 보기",jump:"toss",imgs:img(T),rate:maxRate(T)});
  var o=seed.openrun; if(o&&safeUrl(o.u)) s.push({bg:"linear-gradient(120deg,#ff6a5b,#ff3d6e)",k:"매일 오전 "+(+o.hour||10)+"시 오픈",t:"<span>오픈런</span> 숙소 특가",d:"놓칠 수 없는 숙소 혜택,<br>오픈 시간에 맞춰 확인하세요!",b:"오픈런 바로보기",h:safeUrl(o.u),x:1,e:["⏰","🏨","🔥"]});
  (Array.isArray(seed.partners)?seed.partners:[]).filter(function(p){ return safeUrl(p.u); }).slice(0,1).forEach(function(p){ s.push({bg:"linear-gradient(120deg,#7c5cff,#4b2fd6)",k:esc(p.top||"여행 특가"),t:esc(p.t),d:esc(p.d||"진행 중인 특가를 확인해 보세요!"),b:p.b||"특가 보기",h:safeUrl(p.u),x:1,e:["✈️","🎟️","✨"]}); });
  var babyFirst=WANT.cat==="baby"||(WANT.ages||[]).length;
  if(babyFirst) s.sort(function(a,b){ return (b.jump==="babyhd")-(a.jump==="babyhd"); });
  return s;
}
function slideBanners(inPage,list){
  var slides=list||heroSlides();
  return '<div class="slider hslider'+(inPage?' inpage':'')+'" data-slider><div class="strack">'+slides.map(function(s){ return '<div class="slide">'+heroSlide(s)+'</div>'; }).join("")+'</div>'+
    (slides.length>1?'<div class="sdots">'+slides.map(function(_,i){ return '<button data-dot="'+i+'" aria-label="'+(i+1)+'번째 배너"'+(i===0?' class="on"':'')+'></button>'; }).join("")+'</div>':'')+'</div>';
}
var slideT;
/* 가로 기획전 배너(2026-10-19 시온님 요청, 트립비토즈 '비토즈위크 24시간 특가' 띠 배너 참고): 홈 메뉴 아래 예전 "오늘 마감" 줄 자리. 슬라이드 + "1 / N" */
function wideBanners(open,closing){
  var W=[], st=open.filter(function(it){ return catOf(it)==="stay"; });
  var ST=stayToday(); if(ST) W.push({h:stayHref(ST),st:1,bg:"linear-gradient(90deg,#1a0b3d 0%,#3a1a8a 60%,#6a3fd6 100%)",s:"오늘의 감성숙소 ["+stayNo(ST)+"] · "+esc(ST.area||""),t:esc(ST.name)+" <em>보러가기</em>",art:ST.img});
  W.push({h:"#/trip",bg:"linear-gradient(90deg,#12063f 0%,#2a0f8a 55%,#5b3fd6 100%)",s:"아직도 몰랐어? 여행 무료 체험단",t:"이제 <em>공짜여행</em>이 시작된다!",art:"images/free-trip.svg"});
  /* 다꾸 수익화 배너는 2026-10-21 시온님 요청으로 뺌 */ //W.push({h:"#/edu",bg:"linear-gradient(90deg,#3a1670 0%,#8a3fd0 60%,#d46fd8 100%)",s:"한번 배우면 평생 써먹는 블로그 수익화",t:"다꾸체험단에서 <em>알려드려요!</em>",e:"🧑‍🏫"});
  if(closing.length) W.push({h:"#/list?cat=all&s=todayClose",bg:"linear-gradient(90deg,#2b1055 0%,#5a1f8f 60%,#a43f9f 100%)",s:'오늘 밤 12시까지 · ⏳ <span id="stripcd">'+clock(msToMidnight())+'</span>',t:"오늘 마감 체험단 <em>"+closing.length+"곳</em>",e:"⏰"});
  else W.push({h:"#/list?cat=all&s=open",bg:"linear-gradient(90deg,#2b1055 0%,#5a1f8f 60%,#a43f9f 100%)",s:"지금 신청할 수 있어요",t:"모집 중 체험단 <em>"+open.length+"곳</em>",e:"🎟️"});
  var kids=st.filter(function(it){ return /키즈\s*풀빌라/.test((it.name||"")+" "+(it.benefit||"")); }).length;
  if(kids>=2) W.push({h:"#/trip?q="+encodeURIComponent("키즈풀빌라"),bg:"linear-gradient(90deg,#0b2a5c 0%,#1c4fa8 60%,#4f8de8 100%)",s:"아이랑 물놀이하는 가족여행",t:"키즈 풀빌라 체험단 <em>"+kids+"곳</em>",e:"👶🏻"});
  var pets=st.filter(petStay).length;
  if(pets>=2) W.push({h:"#/trip?q="+encodeURIComponent("반려동물"),bg:"linear-gradient(90deg,#3a1d0b 0%,#8a4a17 60%,#d08a3a 100%)",s:"댕댕이랑 같이 떠나요",t:"반려동물 동반 숙소 <em>"+pets+"곳</em>",e:"🐶"});
  if(mrtList().length) W.push({h:"#/event",bg:"linear-gradient(90deg,#111 0%,#2c2c34 60%,#4a4a58 100%)",s:"국내·해외 숙소 특가를 매일 아침",t:"숙소 할인 <em>특가 모음</em>",e:"🏨"});
  var P=promoOn(); if(P) W.push({h:P.u,x:1,ad:1,bg:"linear-gradient(90deg,#0c1a6b 0%,#1f3aa8 60%,#3f6be0 100%)",s:esc(P.small||""),t:esc((P.t||"").replace(/<[^>]+>/g,"")),art:P.art});
  var n=W.length;
  return '<div class="wbs" data-wslider><div class="wbtrack">'+W.map(function(o,i){
    return '<a class="wb'+(o.st?' stwb':'')+'" style="background:'+o.bg+'" '+(o.x?ext(o.h):'href="'+o.h+'"')+(o.st?' data-stgo="wide_banner"':'')+'><span class="wbt"><small>'+o.s+'</small><b>'+o.t+'</b></span>'+
      (o.art?'<img class="wba" src="'+esc(o.art)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span class="wbe" aria-hidden="true">'+o.e+'</span>')+
      '<span class="wbn"><b>'+(i+1)+'</b> / '+n+'</span></a>'; }).join("")+'</div></div>';
}
var wbT; function startWide(){
  clearInterval(wbT); var tr=document.querySelector("[data-wslider] .wbtrack"); if(!tr||tr.children.length<2) return;
  var n=tr.children.length, hold=false; function idx(){ return Math.round(tr.scrollLeft/tr.clientWidth); }
  tr.addEventListener("pointerdown",function(){ hold=true; }); tr.addEventListener("pointerup",function(){ setTimeout(function(){ hold=false; },3000); });
  if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  wbT=setInterval(function(){ if(hold||!document.body.contains(tr)) return; tr.scrollTo({left:tr.clientWidth*((idx()+1)%n),behavior:"smooth"}); },3800);
}
function startSliders(){
  startWide();
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
      '<li><b>사이트 링크</b> 글 안에 <b>www.dagguu.com</b> 링크를 꼭 넣어 주세요.</li>'+
      '<li><b>사진</b> <b>10장 이상</b> (사이트 화면 캡처 포함)</li>'+
      '<li><b>동영상</b> <b>1개 이상</b> (사이트를 둘러보는 화면 녹화 등)</li>'+
      '<li><b>대가 표시 (필수)</b> 글 첫머리에 아래 문구를 넣어 주세요.<span class="disc">제품을 제공받아 작성된 후기입니다.</span></li>'+
    '</ol></section>'+
    '<section class="guide"><h2>🗓️ 진행 순서</h2><ol class="steps">'+
      (authCfg()?'<li>카카오로 로그인하고 아래에 <b>블로그 주소</b>를 넣어 신청해요.</li>':'<li>아래 <b>지금 신청하기</b>로 다꾸 카톡 채널을 추가하고 <b>블로그 주소</b>를 보내 신청해요.</li>')+'<li>선정되면 카톡으로 알려드려요.</li><li>선정 후 <b>7일 안에</b> 가이드대로 포스팅해요.</li><li>포스팅 주소를 보내주시면 확인 후 <b>7일 안에</b> 상품권을 보내드려요.</li>'+
    '</ol></section>'+
    '<section class="guide fineprint"><h2>⚠️ 유의사항</h2><ul>'+
      '<li>대가 표시 문구가 없거나 가이드를 지키지 않은 글은 상품권이 지급되지 않아요.</li>'+
      '<li>포스팅은 작성일로부터 6개월 이상 유지해 주세요.</li>'+
      '<li>다른 사람의 글이나 사진을 허락 없이 쓰면 안 돼요.</li>'+
      '<li>같은 블로그는 한 달에 1번만 참여할 수 있어요.</li>'+
      '<li>모집 내용은 사정에 따라 바뀔 수 있어요.</li>'+
    '</ul></section>'+
    '<div class="repcta">'+(authCfg()?(USER?(MYREP?'<p class="repst">이번 달 신청 상태: <b>'+esc(MYREP.status)+'</b></p>':repForm()):'<button class="b kakaolg wide" data-login="kakao">카카오로 로그인하고 신청하기</button>'):'<a class="b pri wide" href="'+esc(apply)+'" target="_blank" rel="noopener noreferrer">🙋 지금 신청하기</a>')+'</div>'+
  '</div>';
}


/* ---------- 블로그 기자단 (2026-10-21 시온님: 맛보기 2개만 보여주고 나머지는 잠금 → 수익화 교육 연결) ----------
   data.json press {at, n(모집 중 전체 수), src, list:[{t,src,url,o,ap,e,img}]} — 숫자는 실제 모집 중 개수만. "수강생만 신청 가능"이라고 쓰지 않는다(모집은 각 사이트에 공개). */
function pressView(){
  var P=seed.press||{}, L=(P.list||[]).filter(function(x){ return x.e>=ymd(today()); }).slice(0,3), more=Math.max(0,(P.n||0)-L.length);
  var at=P.at?new Date(P.at):null, atS=at?(at.getMonth()+1)+"/"+at.getDate()+" "+String(at.getHours()).padStart(2,"0")+":"+String(at.getMinutes()).padStart(2,"0"):"";
  var dd=function(e){ var n=Math.round((new Date(e+"T00:00:00")-today())/864e5); return n<=0?"오늘 마감":"D-"+n; };
  /* 2026-10-21 시온님: 맛보기 카드는 모집 사이트 이름·지원/모집 숫자를 흐리게, 링크 없음(실제 값은 화면에 넣지 않고 가림 글자만) */
  var card=function(x){ return '<div class="prc">'+
    '<span class="prim"><img src="'+esc(x.img)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility=\'hidden\'"><i>'+dd(x.e)+'</i></span>'+
    '<span class="prx"><small><span class="prbl" aria-label="모집 사이트 가림">체험단사이트</span> · 📝 블로그</small><b>'+esc(x.t)+'</b><em>💰 '+esc(x.o)+'</em><small class="prbl" aria-label="지원·모집 인원 가림">지원 00 · 모집 0 · 0.0:1</small></span></div>'; };
  var sk='<div class="prc sk"><span class="prim"></span><span class="prx"><span class="l1"></span><span class="l2"></span><span class="l3"></span></span></div>';
  return '<div class="pg press">'+
    '<div class="prhero"><small>💻 블로그 재택알바</small><h1>제품 없이 글만 쓰고<br><em>원고료</em> 받아요</h1>'+
      '<p>방문하거나 제품을 받지 않아도 돼요. 받은 자료로 블로그 글을 쓰면 원고료나 포인트를 받아요. 이런 모집을 <b>\'기자단\'</b>이라고 불러요.</p><p class="prfine">고용 계약이 아니라 글 한 편마다 원고료·포인트를 받는 방식이에요. 금액은 모집마다 달라요.</p></div>'+
    '<div class="prhow"><div><b>1</b><span>모집 글 보고 신청</span></div><div><b>2</b><span>자료 받아 글 쓰기</span></div><div><b>3</b><span>원고료·포인트 받기</span></div></div>'+
    '<div id="pjlist" class="pjlist" hidden></div>'+'<h2 class="prh">지금 모집 중인 원고료 기자단</h2>'+
    (L.length?L.map(card).join(""):'<div class="empty">오늘 보여드릴 기자단을 준비하고 있어요</div>')+
    (more?'<div class="prlockw"><div class="prblur">'+sk+sk+sk+'</div>'+
      '<div class="prlock"><span class="pl1">🔒</span><b>모집 중인 기자단이 <em>'+more.toLocaleString()+'개</em> 더 있어요</b>'+
      '<p>매일 모아 정리한 전체 기자단 목록과<br>당첨 잘 되는 기자단 고르는 법·원고료 받는 글쓰기는<br><b>다꾸 수익화 클래스</b> 수강생에게 알려드려요.</p>'+
      '<a class="b pri wide" href="'+PART_URL+'#/edu">자세히 보기 ›</a></div></div>':'')+
    '<p class="prnote">'+(atS?atS+' 기준, '+esc(P.src||"체험모아")+'에 올라온 모집 중 기자단 수예요. ':'')+'기자단 모집 글은 각 모집 사이트에 공개돼 있고, 신청도 각 사이트에서 해요. 원고료·조건은 모집 사이트 안내가 우선이에요.</p>'+
  '</div>';
}

/* ---------- 다꾸 기자단(2026-10-21 시온님 "다음 진행": 광고주에게 판 기자단을 다꾸 회원 블로거에게 모집, 원고료 적립·출금) ----------
   DB = supabase/press_jobs.sql (press_jobs·press_files·press_apps·press_ledger·press_withdrawals + 함수). 적립금은 출금만 되는 미지급 원고료(충전·구매·양도 없음).
   화면: #/press 맨 위 "다꾸 기자단 모집"(pjList) · #/pjob?id= 상세·신청·글 제출 · 마이페이지 "내 기자단·원고료"(pjMy) · #/padmin 관리자(시온님) */
var PJ_ST={applied:"신청 완료",selected:"선정 · 글 쓰기",rejected:"미선정",submitted:"글 제출 · 검수 중",returned:"수정 요청",approved:"승인 · 원고료 적립"};
var PJ_MIN=10000, PJ_TAX=0.033;
function won(n){ return Number(n||0).toLocaleString()+"원"; }
function pjNet(n){ var it=Math.floor(n*0.03/10)*10; if(it<1000) return n; return n-it-Math.floor(it*0.1/10)*10; } /* 소득세 3%(1천원 미만 소액부징수) + 지방소득세 10% */
function pjDd(e){ var n=Math.round((new Date(e+"T00:00:00")-today())/864e5); return n<0?"마감":n===0?"오늘 마감":"D-"+n; }
function pjWait(cb){ if(SB){ cb(); return; } if(!authCfg()){ cb(); return; } initAuth(); var n=0, t=setInterval(function(){ if(SB||++n>40){ clearInterval(t); cb(); } },150); }
function pjErr(e){ var m=(e&&e.message)||""; return /closed/.test(m)?"모집이 끝났어요":/duplicate|unique/.test(m)?"이미 신청했어요":/blog|url/.test(m)?"주소를 확인해 주세요":/balance/.test(m)?"적립금이 모자라요":/min/.test(m)?"1만원부터 출금할 수 있어요":/unit/.test(m)?"1만원 단위로 출금할 수 있어요":/max/.test(m)?"한 번에 50만원까지 출금할 수 있어요":/week/.test(m)?"출금 신청은 7일에 1번만 할 수 있어요":/info/.test(m)?"출금 자료를 확인해 주세요":/state/.test(m)?"지금은 할 수 없는 단계예요":"잠시 후 다시 시도해 주세요"; }
function pjCard(j){ return '<a class="pjc" href="'+(PMODE?'':PART_URL)+'#/pjob?id='+j.id+'"><span class="pjt"><small>'+esc(j.region||"")+(j.kw?' · '+esc(j.kw):'')+'</small><b>'+esc(j.title)+'</b><em>원고료 '+won(j.pay)+'</em></span><span class="pjr"><i>'+pjDd(j.ends)+'</i><small>모집 '+j.slots+'명</small></span></a>'; }
/* 모집 중 기자단 목록: 로그인 없이 읽기만 해서 두 사이트 모두 Supabase REST(공개 키)로 직접 읽음 */
function pjList(){
  var box=document.getElementById("pjlist"), a=seed.auth||{}; if(!box) return;
  if(!safeUrl(a.url)||!a.key){ box.hidden=!PMODE; return; }
  fetch(a.url+"/rest/v1/press_jobs?select=id,title,region,kw,pay,slots,ends&status=eq.open&ends=gte."+ymd(today())+"&order=ends",{headers:{apikey:a.key,Authorization:"Bearer "+a.key}}).then(function(r){ return r.ok?r.json():[]; }).catch(function(){ return []; }).then(function(L){
    var hd=box.dataset.h||"다꾸 기자단 모집", sub=PMODE?"신청·글 제출·원고료 적립까지 다이어리뷰에서 해요.":"다이어리뷰가 직접 모집해요. 신청은 다이어리뷰에서 해요.";
    if(!L||!L.length){ if(PMODE){ box.innerHTML='<h2 class="prh">'+hd+'</h2><div class="empty pjempty">지금 모집 중인 기자단이 없어요<br><small>새 모집이 열리면 카카오톡 채널로 알려드려요</small></div>'; box.hidden=false; } else box.hidden=true; return; }
    box.innerHTML='<h2 class="prh">'+hd+'</h2><p class="pjsub">'+sub+'</p>'+L.map(pjCard).join(""); box.hidden=false; plainHeads(box); });
}
/* 다이어리뷰(partners) 홈·기자단·마이 */
function pHomeView(){
  return '<div class="pg phome">'+
    '<section class="phero"><small>DIARY VIEW · 다이어리뷰</small><h1>블로거와 사장님을 잇는<br><em>기자단·체험단</em> 대행</h1><p>블로거는 글을 쓰고 원고료를 받고, 사장님은 블로그 홍보를 맡기는 곳이에요.</p></section>'+
    '<div class="pgo"><a href="#/press"><i>✍️</i><span><b>블로거라면</b>기자단 신청하고 원고료 받기</span><em>›</em></a>'+
      '<a href="#/contact"><i>📣</i><span><b>사장님이라면</b>기자단·체험단 홍보 맡기기</span><em>›</em></a>'+
      '<a href="#/edu"><i>🎓</i><span><b>블로그를 키우고 싶다면</b>블로그 수익화 1:1 클래스</span><em>›</em></a></div>'+
    '<div id="pjlist" class="pjlist" data-h="모집 중인 기자단" hidden></div>'+
    '<a class="pmain" href="'+MAIN_URL+'"><span><b>전국 체험단 모아보기</b>숙박·육아·뷰티 체험단은 다꾸체험단에서</span><em>›</em></a>'+
  '</div>';
}
function pPressView(){
  return '<div class="pg press">'+
    '<div class="prhero"><small>✍️ 다이어리뷰 기자단</small><h1>받은 자료로 글 쓰고<br><em>원고료</em> 받아요</h1><p>방문하거나 제품을 받지 않아도 돼요. 광고주가 준 원고·사진으로 블로그 글을 쓰면 원고료가 적립되고, 1만원부터 출금할 수 있어요.</p><p class="prfine">고용 계약이 아니라 글 한 편마다 원고료를 받는 방식이에요. 출금할 때 3.3%(소득세·지방소득세)를 떼고 입금해요.</p></div>'+
    '<div class="prhow"><div><b>1</b><span>모집 글 보고 신청</span></div><div><b>2</b><span>선정되면 자료 받아 글 쓰기</span></div><div><b>3</b><span>검수 후 원고료 적립</span></div></div>'+
    '<div id="pjlist" class="pjlist" data-h="모집 중인 기자단" hidden></div>'+
  '</div>';
}
function pMyView(){
  var a=authCfg(), h='<div class="pg my"><h1>마이 다이어리뷰</h1>';
  if(!USER){
    return h+'<section class="lgcard"><div class="mlogo">'+logoSvg(44)+'</div><b>로그인하고 기자단에<br>참여해 보세요</b>'+
      '<ul class="lgben"><li>✍️ 기자단 신청 · 글 제출</li><li>💰 원고료 적립 · 출금 신청</li><li>📝 내 블로그·인스타 주소 등록</li><li>🎓 블로그 수익화 클래스 수강 신청</li></ul>'+
      (a?'<button class="b kakaolg wide" data-login="kakao"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#191600" d="M12 4C7 4 3 7.2 3 11.1c0 2.5 1.7 4.7 4.2 6l-.9 3.4c-.1.3.3.6.6.4l4-2.7h1.1c5 0 9-3.2 9-7.1S17 4 12 4Z"/></svg>카카오로 3초 만에 시작하기</button><p class="lgnote">시작하면 <a href="#/privacy">개인정보처리방침</a>에 동의하는 것으로 봐요.</p>':'<p class="lgsoon">잠시 후 다시 열어 주세요</p>')+'</section></div>';
  }
  h+='<div class="hello"><b>'+esc(nick())+'님, 반가워요 👋</b><button class="lnk" data-logout>로그아웃</button></div>';
  h+=chSection()+pjMySection();
  h+='<a class="pmain" href="#/edu"><span><b>블로그 수익화 1:1 클래스</b>체험단 당첨부터 수익화까지</span><em>›</em></a>';
  h+='<div class="myfoot"><a href="#/privacy">개인정보처리방침</a> · <button class="lnk" data-unreg>회원 탈퇴</button><br><button class="lnk myuid" data-copy="'+esc(USER.id)+'">회원 번호 복사</button></div>';
  return h+'</div>';
}
function pjobView(){ return '<div class="pg pjob" id="pjob"><a class="back" href="#/press">'+ico(I.back)+'<span>기자단</span></a><div class="empty">불러오는 중…</div></div>'; }
function pjobInit(){
  var v=document.getElementById("pjob"), id=+state.pjId; if(!v) return;
  pjWait(function(){
    if(!SB){ v.innerHTML='<div class="empty">지금은 볼 수 없어요</div>'; return; }
    SB.from("press_jobs").select("*").eq("id",id).maybeSingle().then(function(r){
      var j=r.data; if(sbErr(r)||!j){ v.innerHTML='<a class="back" href="#/press">'+ico(I.back)+'<span>기자단</span></a><div class="empty">모집 글을 찾을 수 없어요</div>'; return; }
      var open=j.status==="open"&&j.ends>=ymd(today());
      var head='<a class="back" href="#/press">'+ico(I.back)+'<span>기자단</span></a>'+
        '<div class="pjh"><small>다이어리뷰 기자단 · '+esc(j.region||"")+'</small><h1>'+esc(j.title)+'</h1><div class="pjpay"><b>'+won(j.pay)+'</b><span>1편 원고료 (세전)</span></div></div>'+
        '<table class="pjtb"><tr><th>모집 인원</th><td>'+j.slots+'명</td></tr><tr><th>신청 마감</th><td>'+esc(j.ends)+' ('+pjDd(j.ends)+')</td></tr>'+(j.kw?'<tr><th>키워드</th><td>'+esc(j.kw)+'</td></tr>':'')+(j.biz?'<tr><th>업체</th><td>'+esc(j.biz)+'</td></tr>':'')+'<tr><th>작성 채널</th><td>네이버 블로그</td></tr></table>'+
        (j.guide?'<section class="pjsec"><h2>무엇을 쓰나요</h2><p class="pjg">'+esc(j.guide).replace(/\n/g,"<br>")+'</p></section>':'')+
        '<section class="pjsec"><h2>꼭 지켜 주세요</h2><ul class="pjrule"><li>광고주가 준 원고·사진 자료로 쓰는 소개 글이에요.</li><li>글 첫 부분에 원고료를 받고 쓴 글이라는 문구를 꼭 넣어요(공정위 추천·보증 심사지침).</li><li>글은 올린 날부터 3개월 동안 지우지 않아요.</li><li>원고료는 검수 승인 뒤 적립되고, 1만원부터 출금할 수 있어요. 출금할 때 3.3%(소득세·지방소득세)를 떼고 입금해요.</li></ul></section>';
      if(!USER){ v.innerHTML=head+'<div class="dbar pjbar"><button class="b" data-pjlogin>카카오로 로그인하고 신청하기</button></div>'; return; }
      SB.from("press_apps").select("*").eq("job_id",id).eq("user_id",USER.id).maybeSingle().then(function(a){
        var ap=a.data, h=head;
        if(ap){
          h+='<section class="pjsec pjmy"><h2>내 신청</h2><p class="pjst st-'+ap.status+'">'+esc(PJ_ST[ap.status]||ap.status)+'</p>'+(ap.note?'<p class="pjnote">💬 '+esc(ap.note)+'</p>':'')+
            '<p class="pjsm">블로그: '+esc(ap.blog_url)+'</p>'+(ap.post_url?'<p class="pjsm">제출한 글: <a href="'+esc(safeUrl(ap.post_url))+'" target="_blank" rel="noopener noreferrer">'+esc(ap.post_url)+'</a></p>':'')+'<div id="pjfiles"></div>'+
            (ap.status==="selected"||ap.status==="returned"?'<form id="pjsubmit" class="pjf"><label class="fl" for="pj-post">올린 글 주소</label><input id="pj-post" class="fi" type="url" inputmode="url" placeholder="https://blog.naver.com/아이디/글번호" required><button class="b pri wide" type="submit">글 제출하기</button></form>':'')+'</section>';
          v.innerHTML=h; plainHeads(v);
          if(/selected|submitted|returned|approved/.test(ap.status)) SB.from("press_files").select("url,memo").eq("job_id",id).maybeSingle().then(function(f){ var el=document.getElementById("pjfiles"); if(el&&f.data&&safeUrl(f.data.url)) el.innerHTML='<a class="b pjfile" href="'+esc(safeUrl(f.data.url))+'" target="_blank" rel="noopener noreferrer">📁 원고·사진 자료 받기 ↗</a>'+(f.data.memo?'<p class="pjsm">'+esc(f.data.memo)+'</p>':''); });
          var sf=document.getElementById("pjsubmit"); if(sf) sf.addEventListener("submit",function(e){ e.preventDefault(); var u=document.getElementById("pj-post").value.trim();
            SB.rpc("press_submit",{p_app:ap.id,p_url:u}).then(function(x){ if(x.error){ toast(pjErr(x.error)); return; } toast("✅ 제출했어요. 검수 후 원고료가 적립돼요"); ga("press_submit",{}); pjobInit(); }); });
          return;
        }
        if(!open){ v.innerHTML=h+'<div class="empty">모집이 끝났어요</div>'; plainHeads(v); return; }
        var bl=(myChs().blogs||[]);
        h+='<section class="pjsec"><h2>신청하기</h2><form id="pjapply" class="pjf">'+
          '<label class="fl" for="pj-blog">블로그 주소 <i>*</i></label>'+(bl.length?'<select id="pj-blog" class="fi">'+bl.map(function(b){ return '<option>'+esc(b)+'</option>'; }).join("")+'<option value="">직접 입력</option></select><input id="pj-blog2" class="fi" type="url" inputmode="url" placeholder="https://blog.naver.com/아이디" hidden>':'<input id="pj-blog2" class="fi" type="url" inputmode="url" placeholder="https://blog.naver.com/아이디" required>')+
          '<label class="fl" for="pj-msg">하고 싶은 말</label><textarea id="pj-msg" class="fi ta" maxlength="500" placeholder="주로 쓰는 주제, 하루 방문자 등"></textarea>'+
          '<label class="ck"><input type="checkbox" id="pj-ok"><span>위 안내(대가성 문구·3개월 유지·3.3% 원천징수)를 확인했어요</span></label>'+
          '<button class="b pri wide" type="submit">기자단 신청하기</button></form></section>';
        v.innerHTML=h; plainHeads(v);
        var sel=document.getElementById("pj-blog"), b2=document.getElementById("pj-blog2");
        if(sel) sel.addEventListener("change",function(){ b2.hidden=!!sel.value; });
        document.getElementById("pjapply").addEventListener("submit",function(e){ e.preventDefault();
          var blog=(sel&&sel.value)||chNorm("blogs",b2.value)||b2.value.trim();
          if(!/^https?:\/\//i.test(blog)){ toast("블로그 주소를 확인해 주세요"); return; }
          if(!document.getElementById("pj-ok").checked){ toast("안내를 확인하고 체크해 주세요"); return; }
          SB.rpc("press_apply",{p_job:id,p_blog:blog,p_msg:document.getElementById("pj-msg").value}).then(function(x){ if(x.error){ toast(pjErr(x.error)); return; } toast("✅ 신청했어요. 선정되면 여기에서 자료를 받을 수 있어요"); ga("press_apply",{job:id}); pjobInit(); }); });
      });
    });
  });
}
document.addEventListener("click",function(e){ var b=e.target.closest&&e.target.closest("[data-pjlogin]"); if(!b) return; e.preventDefault(); ls("dakku-after-login",location.hash); login("kakao"); });
/* 마이페이지: 내 기자단·원고료 */
function pjMySection(){ return USER?'<section class="pane mypj" id="mypj" hidden></section>':''; }
function pjMy(){
  var box=document.getElementById("mypj"); if(!box||!SB||!USER) return;
  /* 관리자(시온님)에게만 마이페이지 맨 위 "기자단 관리" 버튼(2026-10-21 시온님) */
  SB.rpc("is_press_admin").then(function(r){ if(!r.data||document.getElementById("padmlnk")) return; var h=document.querySelector(".pg.my h1"); if(h) h.insertAdjacentHTML("afterend",'<a id="padmlnk" class="b pri wide padmlnk" href="#/padmin">🛠️ 기자단 관리 (관리자)</a>'); });
  Promise.all([SB.from("press_apps").select("id,job_id,status,note,press_jobs(title,pay)").eq("user_id",USER.id).order("created_at",{ascending:false}).limit(20), SB.rpc("press_balance"), SB.from("press_withdrawals").select("amount,status,created_at").eq("user_id",USER.id).order("created_at",{ascending:false}).limit(5)]).then(function(R){
    var apps=R[0].data, bal=R[1].data, wds=R[2].data||[]; if(R[0].error||R[1].error) return;
    if(!apps.length&&!bal&&!wds.length){ box.innerHTML='<h2>✍️ 내 기자단 · 원고료</h2><p class="mysub">아직 신청한 기자단이 없어요.</p><a class="lnk" href="#/press">모집 중인 기자단 보기 ›</a>'; box.hidden=false; return; }
    var h='<h2>✍️ 내 기자단 · 원고료</h2><div class="pjbal"><span>출금할 수 있는 원고료</span><b>'+won(bal)+'</b><small>출금 시 3.3% 떼고 '+won(pjNet(bal))+' 입금</small>'+
      '<button class="b pri" data-pjwd'+(bal<PJ_MIN?' disabled':'')+'>출금 신청</button>'+(bal<PJ_MIN?'<small>1만원부터 출금할 수 있어요</small>':'')+'</div>';
    h+=apps.map(function(a){ var j=a.press_jobs||{}; return '<a class="pjmyr" href="#/pjob?id='+a.job_id+'"><span><b>'+esc(j.title||"")+'</b><small>'+won(j.pay)+'</small></span><i class="st-'+a.status+'">'+esc(PJ_ST[a.status]||a.status)+'</i></a>'; }).join("");
    if(wds.length) h+='<p class="pjwdh">출금 신청 내역</p>'+wds.map(function(w){ return '<p class="pjwdr"><span>'+w.created_at.slice(0,10)+'</span><span>'+won(w.amount)+'</span><b>'+({requested:"처리 중",paid:"입금 완료",rejected:"반려"})[w.status]+'</b></p>'; }).join("");
    box.innerHTML=h; box.hidden=false;
  });
}
/* 원고료 출금 신청(2026-10-21 시온님이 스타일씨 캐시 출금 화면 보여줌): 1만원 단위·1회 최대 50만원·7일에 1번, 매주 목 17시까지 신청 → 금요일 입금.
   이름·주민번호·은행·계좌는 data.json payKey(시온님 공개 키, tools/paykey.html 로 만듦)로 이 기기에서 암호화한 글자만 서버에 저장 → 관리자 화면에서 시온님 개인 키 파일로만 열림.
   payKey 가 없으면 예전처럼 카톡 채널로 받는 안내만 */
var PJ_MAX=500000, PJ_BANKS=["KB국민","신한","우리","하나","NH농협","IBK기업","카카오뱅크","토스뱅크","케이뱅크","SC제일","씨티","새마을금고","신협","우체국","수협","부산","대구","경남","광주","전북","제주","산업"];
function pjB64(buf){ var s="",b=new Uint8Array(buf); for(var i=0;i<b.length;i++) s+=String.fromCharCode(b[i]); return btoa(s); }
function pjUnB64(t){ var s=atob(t), b=new Uint8Array(s.length); for(var i=0;i<s.length;i++) b[i]=s.charCodeAt(i); return b.buffer; }
function pjEnc(obj){ var k=String(seed.payKey||"").replace(/\s+/g,""); return crypto.subtle.importKey("spki",pjUnB64(k),{name:"RSA-OAEP",hash:"SHA-256"},false,["encrypt"]).then(function(key){ return crypto.subtle.encrypt({name:"RSA-OAEP"},key,new TextEncoder().encode(JSON.stringify(obj))); }).then(pjB64); }
document.addEventListener("click",function(e){ var b=e.target.closest&&e.target.closest("[data-pjwd]"); if(!b||b.disabled) return; e.preventDefault();
  SB.rpc("press_balance").then(function(r){ var bal=r.data||0; if(bal<PJ_MIN){ toast("1만원부터 출금할 수 있어요"); return; }
    var mx=Math.min(PJ_MAX,Math.floor(bal/10000)*10000), hasKey=!!seed.payKey&&window.crypto&&crypto.subtle, opts=""; for(var v=mx;v>=PJ_MIN;v-=10000) opts+='<option value="'+v+'">'+won(v)+'</option>';
    var el=document.createElement("div"); el.className="edusheet pjwds";
    el.innerHTML='<div class="epk" role="dialog" aria-modal="true" aria-label="출금 신청"><div class="ephd"><b>원고료 출금 신청</b><button type="button" class="epx" aria-label="닫기">✕</button></div>'+
      '<div class="wdbx"><label class="epnm">출금할 원고료 <small>(1만원 단위, 최대 50만원)</small><select class="fi" id="pjwda">'+opts+'</select></label><p class="wdnet">출금 예정 금액 <b id="pjwdn">'+won(pjNet(mx))+'</b><small>3.3%(소득세·지방소득세)를 뗀 금액이에요</small></p></div>'+
      (hasKey?
      '<div class="wdbx"><b class="wdh">출금 자료</b>'+
        '<label class="epnm">입금자명(본인 실명)<input class="fi" id="pjwnm" maxlength="20" autocomplete="name"></label>'+
        '<span class="epnm">주민등록번호</span><div class="wdrrn"><input class="fi" id="pjwr1" inputmode="numeric" maxlength="6" placeholder="앞 6자리"><span>-</span><input class="fi" id="pjwr2" type="password" inputmode="numeric" maxlength="7" placeholder="뒤 7자리"></div>'+
        '<label class="epnm">은행<select class="fi" id="pjwbk"><option value="">은행 선택</option>'+PJ_BANKS.map(function(x){ return '<option>'+x+'</option>'; }).join("")+'</select></label>'+
        '<label class="epnm">계좌번호<input class="fi" id="pjwac" inputmode="numeric" maxlength="20" placeholder="- 없이 숫자만"></label>'+
        '<label class="epnm">입금 안내 연락처<input class="fi" id="pjwph" inputmode="tel" maxlength="13" placeholder="010-0000-0000" autocomplete="tel"></label></div>'+
      '<details class="adpd" open><summary>출금 안내</summary><ul>'+
        '<li>매주 목요일 17시까지 신청한 건은 그 주 금요일에 입금해요(금요일이 쉬는 날이면 그 전 영업일).</li>'+
        '<li>출금 신청은 7일에 1번만 할 수 있어요.</li>'+
        '<li>본인 명의 계좌로만 입금해요. 이름·계좌가 맞지 않으면 반려되고 원고료(원천징수 전 금액)로 되돌려 드려요.</li>'+
        '<li>주민등록번호는 소득세법 제145조에 따른 원천징수 신고에만 쓰고, 이 기기에서 잠근 상태로 저장돼 운영자만 열 수 있어요. 법에 따라 5년 보관한 뒤 지워요.</li>'+
        '<li>운영 정책에 어긋나는 활동으로 생긴 원고료는 반려될 수 있어요.</li></ul></details>'+
      '<label class="epck adck"><input type="checkbox" id="pjwok"> <span>[필수] 출금을 위한 개인정보(이름·주민등록번호·은행·계좌·연락처) 수집·이용에 동의해요</span></label>'
      :'<p class="adpn">처음 출금하실 때는 신청 후 카카오톡 채널 「다꾸체험단」으로 <b>이름·주민등록번호·은행·계좌번호</b>를 보내 주세요(원천징수 신고에 필요해요).</p>')+
      '<button type="button" class="b pri epgo">출금 신청하기</button></div>';
    document.body.appendChild(el);
    var g=function(id){ var x=document.getElementById(id); return x?String(x.value||"").trim():""; };
    document.getElementById("pjwda").addEventListener("change",function(){ document.getElementById("pjwdn").textContent=won(pjNet(+this.value)); });
    el.addEventListener("click",function(ev){ if(ev.target===el||ev.target.closest(".epx")) el.remove(); });
    el.querySelector(".epgo").addEventListener("click",function(){ var btn=this, n=+g("pjwda");
      if(n<PJ_MIN||n>bal||n%10000){ toast("출금 금액을 확인해 주세요"); return; }
      var go=function(enc,ph){ btn.disabled=true; SB.rpc("press_withdraw",{p_amount:n,p_enc:enc,p_phone:ph}).then(function(x){ btn.disabled=false; if(x.error){ toast(pjErr(x.error)); return; } el.remove(); ga("press_withdraw",{}); toast("✅ 출금 신청했어요. 금요일에 입금해 드려요"); pjMy(); }); };
      if(!hasKey){ go(null,null); return; }
      var nm=g("pjwnm"), r1=g("pjwr1"), r2=g("pjwr2"), bk=g("pjwbk"), ac=g("pjwac").replace(/\D/g,""), ph=g("pjwph");
      if(!/^[가-힣a-zA-Z ]{2,20}$/.test(nm)){ toast("입금자명(본인 실명)을 확인해 주세요"); return; }
      if(!/^\d{6}$/.test(r1)||!/^\d{7}$/.test(r2)){ toast("주민등록번호를 확인해 주세요"); return; }
      if(!bk||ac.length<8){ toast("은행·계좌번호를 확인해 주세요"); return; }
      if(!/^01[016789]-?\d{3,4}-?\d{4}$/.test(ph)){ toast("연락처를 확인해 주세요"); return; }
      if(!document.getElementById("pjwok").checked){ toast("개인정보 수집·이용에 동의해 주세요"); return; }
      pjEnc({n:nm,r:r1+"-"+r2,b:bk,a:ac}).then(function(enc){ go(enc,ph); },function(){ toast("잠시 후 다시 시도해 주세요"); });
    });
  });
});
/* 관리자: 시온님 개인 키 파일로 출금 자료 열기(이 화면 메모리에만, 저장 안 함) */
var PJ_PRV=null;
function pjDec(enc){ if(!PJ_PRV||!enc) return Promise.resolve(null); return crypto.subtle.decrypt({name:"RSA-OAEP"},PJ_PRV,pjUnB64(enc)).then(function(b){ return JSON.parse(new TextDecoder().decode(b)); }).catch(function(){ return null; }); }
document.addEventListener("change",function(e){ if(!e.target||e.target.id!=="pjkey") return; var f=e.target.files&&e.target.files[0]; if(!f) return;
  f.text().then(function(t){ var k=t.replace("DAGGUU-PAYKEY-PRIVATE","").replace(/\s+/g,""); return crypto.subtle.importKey("pkcs8",pjUnB64(k),{name:"RSA-OAEP",hash:"SHA-256"},false,["decrypt"]); })
   .then(function(k){ PJ_PRV=k; toast("🔓 출금 자료를 열었어요"); [].forEach.call(document.querySelectorAll("[data-wdenc]"),function(el){ pjDec(el.getAttribute("data-wdenc")).then(function(d){ el.innerHTML=d?'<b>'+esc(d.n)+'</b> · '+esc(d.r)+'<br>'+esc(d.b)+' '+esc(d.a)+' <button class="lnk" data-copy="'+esc(d.b+' '+d.a+' '+d.n)+'">복사</button>':'열 수 없어요(다른 키로 잠김)'; }); }); },function(){ toast("키 파일이 맞지 않아요"); });
});
/* 관리자 #/padmin (press_admins 에 있는 계정만) */
function padminView(){ return '<div class="pg padm" id="padm"><h1>기자단 관리</h1><div class="empty">불러오는 중…</div></div>'; }
function padminInit(){
  var v=document.getElementById("padm"); if(!v) return;
  pjWait(function(){
    if(!SB||!USER){ v.innerHTML='<h1>기자단 관리</h1><div class="empty">로그인이 필요해요<button class="b pri" data-pjlogin>카카오로 로그인</button></div>'; return; }
    SB.rpc("is_press_admin").then(function(r){
      if(r.data) SB.rpc("press_purge").then(function(){});
      if(!r.data){ v.innerHTML='<h1>기자단 관리</h1><div class="empty">관리자만 볼 수 있어요</div>'; return; }
      Promise.all([SB.from("press_jobs").select("*").order("created_at",{ascending:false}).limit(50), SB.from("press_apps").select("*").order("created_at",{ascending:false}).limit(500), SB.from("press_withdrawals").select("*").eq("status","requested").order("created_at"), SB.from("press_files").select("*")]).then(function(R){
        var jobs=R[0].data||[], apps=R[1].data||[], wds=R[2].data||[], files={}; (R[3].data||[]).forEach(function(f){ files[f.job_id]=f; });
        var ids=apps.map(function(a){ return a.user_id; }).concat(wds.map(function(w){ return w.user_id; }));
        SB.rpc("press_admin_names",{p_ids:ids.filter(function(x,i){ return ids.indexOf(x)===i; })}).then(function(N){
          var nm={}; (N.data||[]).forEach(function(x){ nm[x.id]=x.nickname||"회원"; });
          var h='<h1>기자단 관리</h1>';
          h+='<section class="pane"><h2>출금 신청 ('+wds.length+')</h2>'+(wds.some(function(w){ return w.enc; })?'<label class="b wdkey">🔑 개인 키 파일로 출금 자료 열기<input type="file" id="pjkey" accept=".txt" hidden></label>':'')+(wds.length?wds.map(function(w){ return '<div class="pawd"><span><b>'+esc(nm[w.user_id]||"회원")+'</b> · '+won(w.amount)+' → 입금 '+won(pjNet(w.amount))+'<small>'+w.created_at.slice(0,16).replace("T"," ")+(w.phone?' · '+esc(w.phone):'')+'</small>'+(w.enc?'<small class="wdenc" data-wdenc="'+esc(w.enc)+'">🔒 출금 자료(개인 키로 열기)</small>':'<small>출금 자료 없음(카톡으로 받기)</small>')+'</span><button class="b pri" data-pawd="'+w.id+'" data-ok="1">입금 완료</button><button class="b" data-pawd="'+w.id+'" data-ok="0">반려</button></div>'; }).join(""):'<p class="mysub">처리할 출금이 없어요</p>')+'</section>';
          h+='<section class="pane"><h2>새 모집 글</h2><form id="pjnew" class="pjf">'+
            '<input class="fi" name="title" placeholder="제목 (예: 가평 ○○펜션 소개 글)" required><input class="fi" name="biz" placeholder="업체 이름"><input class="fi" name="region" placeholder="지역 (예: 경기 가평)"><input class="fi" name="kw" placeholder="키워드">'+
            '<textarea class="fi ta" name="guide" placeholder="무엇을 쓰는지·조건 (모두에게 보여요)"></textarea>'+
            '<input class="fi" name="files" type="url" placeholder="원고·사진 자료 링크 (선정된 사람만 보여요)"><input class="fi" name="memo" placeholder="자료 안내 메모 (선정된 사람만)">'+
            '<div class="pjrow pj3"><label>1편 원고료(원)<input class="fi" name="pay" type="number" inputmode="numeric" required></label><label>모집 인원<input class="fi" name="slots" type="number" inputmode="numeric" required></label><label>신청 마감<input class="fi" name="ends" type="date" required></label></div>'+
            '<button class="b pri wide" type="submit">모집 글 올리기</button></form></section>';
          h+=jobs.map(function(j){ var A=apps.filter(function(a){ return a.job_id===j.id; }), done=A.filter(function(a){ return a.status==="approved"; }).length;
            return '<section class="pane pajob"><h2>'+esc(j.title)+'</h2><p class="mysub">'+won(j.pay)+' · '+j.slots+'명 · 마감 '+esc(j.ends)+' · '+({open:"모집 중",closed:"마감",hidden:"숨김"})[j.status]+' · 신청 '+A.length+' · 승인 '+done+'</p>'+
              '<div class="pjrow"><button class="b" data-pajs="'+j.id+'" data-s="'+(j.status==="open"?"closed":"open")+'">'+(j.status==="open"?"모집 마감하기":"다시 모집")+'</button><button class="b" data-pajs="'+j.id+'" data-s="hidden">숨기기</button><a class="b" href="#/pjob?id='+j.id+'">글 보기</a></div>'+
              (files[j.id]?'<p class="pjsm">자료: '+esc(files[j.id].url)+'</p>':'')+
              A.map(function(a){ var st=a.status, bt=function(s,t){ return '<button class="b" data-paa="'+a.id+'" data-s="'+s+'">'+t+'</button>'; };
                return '<div class="paap"><p><b>'+esc(nm[a.user_id]||"회원")+'</b> <i class="st-'+st+'">'+esc(PJ_ST[st])+'</i><br><a href="'+esc(safeUrl(a.blog_url))+'" target="_blank" rel="noopener noreferrer">'+esc(a.blog_url)+'</a>'+(a.msg?'<br><small>'+esc(a.msg)+'</small>':'')+(a.post_url?'<br>글: <a href="'+esc(safeUrl(a.post_url))+'" target="_blank" rel="noopener noreferrer">'+esc(a.post_url)+'</a>':'')+'</p>'+
                  '<div class="pjrow">'+(st==="applied"?bt("selected","선정")+bt("rejected","미선정"):st==="submitted"?bt("approved","승인(원고료 적립)")+bt("returned","수정 요청"):st==="rejected"?bt("selected","선정으로 바꾸기"):"")+'</div></div>'; }).join("")+'</section>'; }).join("");
          v.innerHTML=h;
          document.getElementById("pjnew").addEventListener("submit",function(e){ e.preventDefault(); var f=e.target, g=function(n){ return String(f.elements[n].value||"").trim(); };
            SB.from("press_jobs").insert({title:g("title"),biz:g("biz")||null,region:g("region")||null,kw:g("kw")||null,guide:g("guide")||null,pay:+g("pay"),slots:+g("slots"),ends:g("ends")}).select("id").single().then(function(x){
              if(x.error){ toast("올리지 못했어요: "+x.error.message); return; }
              var done=function(){ toast("✅ 올렸어요"); padminInit(); };
              if(safeUrl(g("files"))) SB.from("press_files").insert({job_id:x.data.id,url:g("files"),memo:g("memo")||null}).then(done); else done(); }); });
        });
      });
    });
  });
}
document.addEventListener("click",function(e){ var t=e.target.closest&&e.target.closest("[data-paa],[data-pawd],[data-pajs]"); if(!t||!SB) return; e.preventDefault();
  var fin=function(x){ if(x.error){ toast("처리하지 못했어요: "+x.error.message); return; } toast("✅ 처리했어요"); padminInit(); };
  if(t.dataset.paa){ var s=t.dataset.s, note=(s==="returned"||s==="rejected")?(prompt("신청자에게 보일 메모 (없으면 비워 두세요)")||""):""; if(s==="approved"&&!confirm("승인하면 원고료가 적립되고 되돌릴 수 없어요. 승인할까요?")) return; SB.rpc("press_admin_set",{p_app:+t.dataset.paa,p_status:s,p_note:note}).then(fin); }
  else if(t.dataset.pawd){ var ok=t.dataset.ok==="1"; if(!confirm(ok?"입금을 마쳤나요? 입금 완료로 바꿔요.":"반려하면 적립금을 되돌려요.")) return; SB.rpc("press_admin_wd",{p_wd:+t.dataset.pawd,p_paid:ok,p_note:ok?"":(prompt("반려 이유")||"")}).then(fin); }
  else SB.from("press_jobs").update({status:t.dataset.s}).eq("id",+t.dataset.pajs).then(fin);
});

/* ---------- 광고주 마케팅 상담 문의 ---------- */
function contactBanner(){
  return '<a class="adv" href="#/contact"><span class="ax"><small>📣 광고주 · 사장님</small><b>체험단 마케팅, 다꾸와 상담해 보세요</b><span>💬 무료 상담 신청하기 ›</span></span><span class="am2">'+ico(I.bell)+'</span></a>';
}
function radios(name,opts){
  return '<div class="rgrid">'+opts.map(function(o){ return '<label class="rd2"><input type="radio" name="'+name+'" value="'+o+'"><span>'+o+'</span></label>'; }).join("")+
    '<label class="rd2 etc"><input type="radio" name="'+name+'" value="기타"><span>기타 :</span><input type="text" class="etcin" data-etc="'+name+'" placeholder="직접 입력" aria-label="'+(name==="from"?"유입경로":"회신수단")+' 기타 입력"></label></div>';
}
/* 광고주 페이지(2026-10-21 시온님 "광고주페이지부터"): 기자단 패키지 + 체험단 묶음 + 진행 순서 + 지키는 원칙 + 환불 기준 + FAQ + 상담 폼.
   패키지·가격은 data.json adPkgs 로 바꿀 수 있다(없으면 AD_PKGS). 결제 링크는 data.json adPay {k: 페이앱 주소} — 있으면 패키지 카드에 결제 버튼(누르면 환불 기준 동의 창 → 페이앱) */
var AD_PKGS=[
  {k:"r5",t:"기자단 5명",tag:"맛보기",p:100000,d:["블로그 기자단 5명 게재","키워드 1개 선정","원고 가이드 작성"]},
  {k:"r10",t:"기자단 10명",tag:"추천",best:1,p:180000,d:["블로그 기자단 10명 게재","키워드 3개 선정","원고 가이드 작성","결과 보고서(글 링크 모음)"]},
  {k:"r20",t:"기자단 20명",tag:"집중 노출",p:330000,d:["블로그 기자단 20명 게재","키워드 5개 선정","원고 가이드 + 사진 고르기","결과 보고서(글 링크 모음)"]}
];
var AD_REFUND=["모집을 시작하기 전에는 전액 환불해요.","모집을 시작한 뒤에는 아직 글이 올라가지 않은 인원만큼 1인 단가로 환불해요(이미 원고를 쓰고 있는 인원은 빼요).","글이 올라간 인원은 환불되지 않아요.","마감일까지 약속한 인원을 다 채우지 못하면 못 채운 인원만큼 1인 단가로 돌려드려요.","게재 후 3개월 안에 블로거가 글을 지우면 다른 블로거로 다시 채우거나 1인 단가로 돌려드려요.","환불은 카카오톡 채널 「다꾸체험단」으로 요청하면 3영업일 안에 결제 수단으로 취소해요."];
var AD_PKG_ON=false; /* 2026-10-21 시온님 "기자단 패키지는 일단 숨겨줘" — true 로 바꾸면 패키지 카드·가격이 다시 보임 */
function adPkgs(){ var L=seed.adPkgs; return (L&&L.length)?L:AD_PKGS; }
function contactView(){
  var w=function(n){ return Number(n).toLocaleString()+'원'; }, pay=seed.adPay||{};
  var pk=adPkgs().map(function(x){ var per=x.n||parseInt(String(x.t).replace(/\D/g,""),10)||0;
    return '<div class="adpk'+(x.best?' best':'')+'"><span class="adtg">'+esc(x.tag||"")+'</span><b>'+esc(x.t)+'</b>'+
      '<strong>'+w(x.p)+'</strong>'+(per?'<small>1명당 '+w(Math.round(x.p/per))+' · 부가세 포함</small>':'')+
      '<ul>'+(x.d||[]).map(function(d){ return '<li>'+esc(d)+'</li>'; }).join("")+'</ul>'+
      '<div class="adbt">'+(safeUrl(pay[x.k])?'<button type="button" class="b pri" data-adpay="'+esc(x.k)+'">결제하기</button>':'')+
      '<a class="b" href="#cform" data-adpk="'+esc(x.t)+'">상담하기</a></div></div>'; }).join("");
  var step=[["💬","상담·결제","원하는 키워드와 일정을 듣고 인원·구성을 정해요."],["📷","자료 받기","사진 10장 이상, 매장·숙소 소개, 꼭 넣을 내용을 받아요."],["📝","원고 가이드","키워드·제목 방향·사진 순서·대가성 문구를 담은 가이드를 만들어요."],["🙋","블로거 모집·선정","다꾸 회원 블로거와 체험단 플랫폼에서 모집해, 최근 활동과 방문자를 보고 골라요."],["✅","게재·검수","올라온 글의 키워드·사진·대가성 문구를 확인해요. 모집 시작부터 보통 2주 안팎."],["📊","결과 보고서","글 링크를 한 번에 모아 보내 드려요."]];
  var faq=[["기자단과 체험단은 뭐가 달라요?","체험단은 블로거가 직접 방문해 경험을 쓰고, 기자단은 업체가 준 사진·정보로 소개 글을 써요. 기자단은 방문 일정이 없어 빠르게 여러 개를 올릴 수 있어요."],["검색 상단에 꼭 뜨나요?","검색 순위는 네이버가 정해서 약속드릴 수 없어요. 대신 약속한 인원만큼 글이 올라가는 건 책임지고, 못 채우면 돌려드려요."],["키워드는 직접 정해도 되나요?","네. 원하시는 키워드가 있으면 그대로 쓰고, 없으면 검색 수를 보고 골라 드려요."],["세금 증빙은 어떻게 받아요?","카드로 결제하시면 카드 영수증이 증빙이 돼요. 다른 증빙이 필요하면 상담 때 말씀해 주세요."],["체험단도 같이 할 수 있나요?","네. 진짜 후기는 체험단으로, 검색 노출 개수는 기자단으로 채우는 묶음을 많이 하세요. 상담으로 구성해 드려요."]];
  return '<div class="pg cform adp">'+
    '<a class="back" href="#/">'+ico(I.back)+'<span>홈</span></a>'+
    '<div class="adh"><small>📣 사장님 · 광고주</small><h1>블로그 기자단,<br>다꾸가 대신 모아 드려요</h1><p>숙소·매장·제품 소개 글을 블로거 여러 명에게 맡기고 싶을 때. 키워드 고르기부터 원고 가이드, 블로거 선정, 결과 보고서까지 한 번에 해요.</p>'+
      '<div class="adch"><span>⚡ 방문 일정 없이 빠르게</span><span>🔑 키워드 선정</span><span>📊 결과 보고서</span></div>'+
      (AD_PKG_ON?'<a class="b pri" href="#adpk" data-jumpid="adpk">패키지 보기</a>':'<a class="b pri" href="#cform" data-jumpid="cform">무료 상담 신청</a>')+'</div>'+
    '<section class="adsec"><h2>이럴 때 좋아요</h2><ul class="adwhy"><li><i>🏡</i><span><b>새로 열었거나 리뉴얼했어요</b>지역+업종 검색에 소개 글이 아직 없을 때</span></li><li><i>📅</i><span><b>체험단 받을 여유가 없어요</b>성수기라 방을 못 빼거나 매장이 바쁠 때</span></li><li><i>🔍</i><span><b>검색에 보이는 글을 늘리고 싶어요</b>체험단 후기와 함께 노출 개수를 채울 때</span></li></ul></section>'+
    '<section class="adsec" id="adpk">'+(AD_PKG_ON?'<h2>기자단 패키지</h2><p class="adsub">글 1개 = 블로그 1명. 가격은 부가세 포함이에요.</p><div class="adpks">'+pk+'</div>':'<h2>구성·비용은 상담으로</h2><p class="adsub">인원·키워드·일정에 맞춰 상담으로 정해 드려요.</p><div class="adset"><b>📝 블로그 기자단</b><p>업체가 준 사진·정보로 블로거 여러 명이 소개 글을 올려요. 필요한 인원과 키워드를 알려 주세요.</p><a class="b" href="#cform" data-adpk="블로그 기자단">기자단 상담하기 ›</a></div>')+
      '<div class="adset"><b>🤝 체험단 + 기자단 묶음</b><p>체험단 몇 명으로 진짜 후기를 받고, 기자단으로 검색 노출 개수를 채워요. 숙소·매장 상황에 맞춰 상담으로 구성해 드려요.</p><a class="b" href="#cform" data-adpk="체험단 + 기자단 묶음">묶음 상담하기 ›</a></div></section>'+
    '<section class="adsec"><h2>진행 순서</h2><ol class="adstep">'+step.map(function(s,i){ return '<li><i>'+s[0]+'</i><span><b>'+(i+1)+'. '+s[1]+'</b>'+s[2]+'</span></li>'; }).join("")+'</ol></section>'+
    '<section class="adsec"><h2>다꾸가 지키는 원칙</h2><ul class="adrule"><li><b>모든 글에 대가성 문구</b>원고료를 받고 쓴 글이라는 걸 글 첫 부분에 밝혀요(공정위 추천·보증 심사지침).</li><li><b>약속한 인원은 책임져요</b>못 채운 인원과 3개월 안에 지워진 글은 다시 채우거나 돌려드려요.</li></ul></section>'+
    '<section class="adsec"><h2>자주 묻는 질문</h2><div class="adfaq">'+faq.map(function(q){ return '<details><summary>'+q[0]+'</summary><p>'+q[1]+'</p></details>'; }).join("")+'</div></section>'+
    '<section class="adsec"><h2>환불 기준</h2><ul class="adref">'+AD_REFUND.map(function(t){ return '<li>'+esc(t)+'</li>'; }).join("")+'</ul></section>'+
    '<section class="adsec adform"><h2>무료 상담 신청</h2><p class="adsub">남겨 주시면 고르신 회신수단으로 연락드려요.</p>'+
    '<form id="cform" class="fbox" novalidate>'+
      '<span class="fl">관심 상품 <i>*</i></span>'+radios("pkg",(AD_PKG_ON?adPkgs().map(function(x){ return x.t; }):["블로그 기자단"]).concat(["체험단 + 기자단 묶음","체험단 모집"]))+
      '<label class="fl" for="f-name">업체명 혹은 성함 <i>*</i></label><input id="f-name" name="name" class="fi" placeholder="업체명을 입력해 주세요" required>'+
      '<label class="fl" for="f-area">지역 <i>*</i></label><input id="f-area" name="area" class="fi" placeholder="지역을 입력해 주세요" required>'+
      '<label class="fl" for="f-biz">업종 <i>*</i></label><input id="f-biz" name="biz" class="fi" placeholder="업종을 입력해 주세요 (예: 펜션, 카페)" required>'+
      '<span class="fl">전화번호 <i>*</i></span><div class="tel"><input name="t1" class="fi" inputmode="numeric" maxlength="4" aria-label="전화번호 앞자리" required><span>-</span><input name="t2" class="fi" inputmode="numeric" maxlength="4" aria-label="전화번호 가운데" required><span>-</span><input name="t3" class="fi" inputmode="numeric" maxlength="4" aria-label="전화번호 끝자리" required></div>'+
      '<span class="fl">유입경로 <i>*</i></span>'+radios("from",["블로그","인스타","지인추천","검색"])+
      '<span class="fl">회신수단 <i>*</i></span>'+radios("reply",["문자","카톡","유선"])+
      '<label class="fl" for="f-msg">문의내용 <i>*</i></label><textarea id="f-msg" name="msg" class="fi ta" placeholder="원하는 키워드, 희망 일정, 업체 주소나 홈페이지 등을 남겨주세요." required></textarea>'+
      '<div class="agree"><p>개인정보 보호를 위한 이용자 동의사항에 동의하십니까?</p>'+
        '<details><summary>자세히보기</summary><ul><li>수집 항목: 관심 상품, 업체명 또는 성함, 지역, 업종, 전화번호, 유입경로, 회신수단, 문의내용</li><li>이용 목적: 마케팅 상담 회신</li><li>보유 기간: 상담 완료 후 1년 뒤 파기 (요청 시 즉시 파기)</li><li>동의하지 않으실 수 있으며, 이 경우 상담 신청이 어려워요.</li></ul></details>'+
        '<label class="ck"><input type="checkbox" name="agree" required><span>네, 동의합니다</span></label></div>'+
      '<p class="ferr" id="ferr" role="alert"></p>'+
      '<button class="b dark wide" type="submit">무료 상담 신청하기</button>'+
    '</form></section>'+
    '<div class="dbar adbar"><a class="b" href="#cform" data-jumpid="cform">💬 무료 상담 신청하기</a></div>'+
  '</div>';
}
/* 패키지 "상담하기" → 폼의 관심 상품 자동 선택 + 폼으로 이동 */
document.addEventListener("click",function(e){ var a=e.target.closest&&e.target.closest("[data-adpk]"); if(!a) return; e.preventDefault();
  var r=[].filter.call(document.querySelectorAll('#cform input[name="pkg"]'),function(x){ return x.value===a.dataset.adpk; })[0]; if(r) r.checked=true;
  var f=document.getElementById("cform"); if(f) f.scrollIntoView({behavior:"smooth",block:"start"}); ga("ad_pkg_click",{pkg:a.dataset.adpk}); });
/* 결제하기 → 환불 기준을 결제 전에 보여 주고 동의받은 뒤 페이앱(전자상거래법 사전 고지) */
document.addEventListener("click",function(e){ var b=e.target.closest&&e.target.closest("[data-adpay]"); if(!b) return; e.preventDefault();
  var k=b.dataset.adpay, x=adPkgs().filter(function(p){ return p.k===k; })[0], u=safeUrl((seed.adPay||{})[k]); if(!x||!u) return;
  var el=document.createElement("div"); el.className="edusheet";
  el.innerHTML='<div class="epk" role="dialog" aria-modal="true" aria-label="결제 확인"><div class="ephd"><b>'+esc(x.t)+' · '+Number(x.p).toLocaleString()+'원</b><button type="button" class="epx" aria-label="닫기">✕</button></div>'+
    '<p class="adpn">결제 후 카카오톡 채널 「다꾸체험단」으로 업체명과 결제자 이름을 보내 주시면 자료 받기부터 시작해요.</p>'+
    '<details class="adpd"><summary>환불 기준 보기</summary><ul>'+AD_REFUND.map(function(t){ return '<li>'+esc(t)+'</li>'; }).join("")+'</ul></details>'+
    '<label class="epck adck"><input type="checkbox"> <span>[필수] 환불 기준을 확인했고 동의해요</span></label>'+
    '<button type="button" class="b pri epgo" disabled>동의하고 결제하기 ↗</button></div>';
  document.body.appendChild(el);
  var ck=el.querySelector(".adck input"), go=el.querySelector(".epgo");
  ck.addEventListener("change",function(){ go.disabled=!ck.checked; });
  el.addEventListener("click",function(ev){ if(ev.target===el||ev.target.closest(".epx")) el.remove(); });
  go.addEventListener("click",function(){ ga("ad_pay_click",{pkg:k}); window.open(u,"_blank","noopener"); el.remove(); });
});
/* 다꾸 수익화 1:1 코칭(2026-10-19 시온님 요청). 수강료·기간은 공개하지 않음(상담 때 안내). 결제는 아직 없음 → 신청 내용을 카톡 채널로 보내는 방식 */
var EDU_TALK=[["🎓", "대학생", "학교 다니면서 알바도 해야 하고.."], ["💑", "커플", "데이트 비용이 너무 많이 들어요 ㅠㅠ"], ["💍", "예비부부·신혼", "결혼, 노후 준비 막막해요."], ["👶", "육아맘", "생활비 부담 좀 덜고 싶어요."], ["💼", "직장인", "월급만으로는 빠듯해서 부업이 필요해요."], ["🌷", "50대", "이 나이에 블로그 시작해도 될까요?"]];
var EDU_PICK=["블로그를 처음 시작해요","체험단 신청해도 당첨이 잘 안 돼요","내 글이 검색 위쪽에 안 보여요","블로그로 수익을 내고 싶어요"];
function dlTiles(end){ var ms=Math.max(0,dcdMs(end)), m=Math.floor(ms/6e4), d=Math.floor(m/1440), h=Math.floor(m%1440/60), mi=m%60; function t(n,u){ var x=(n<10?"0":"")+n; return '<i>'+x[0]+'</i><i>'+x[1]+'</i><u>'+u+'</u>'; } return t(d,"일")+t(h,"시간")+t(mi,"분"); }
/* 수강료 결제 링크(2026-10-21 시온님: 가격은 숨기고, 시온님이 결제 링크를 주면 과목별 "결제하러 가기" 버튼). data.json eduPay {blog, cp, set} = 결제 페이지 주소. 없으면 버튼 안 보임 */
/* 2026-10-21 시온님: 회원가입(카카오 로그인)을 해야 결제 버튼이 열림 */
/* 수강 과목 = 와디즈 리워드처럼 (2026-10-21 시온님, 가격 공개). 블로그 150 · 쿠팡파트너스 150 = 실제 판매가, 세트 200 = 오픈 이벤트. "N개 남음"·"N명 보는 중" 같은 숫자는 실제 값이 없으면 넣지 않는다 */
var EDU_PRICE={blog:1200000,cp:1200000,set:2000000}, EDU_LIST={blog:1500000,cp:1500000}, EDU_EV="10/31";
function eduRewards(){
  var w=function(n){ return n.toLocaleString()+'원'; };
  return '<div class="wzrw" id="edurw"><h2>수강 과목 선택</h2><p class="wzp">10월 수강생 · 오픈 이벤트 진행 중</p>'+
    '<div class="wzr"><span class="wzt hot">과목 1 · 🔥 오픈 이벤트</span><b>[블로그] 블로그 수익화 5주 1:1</b><p>체험단 당첨 · 기자단 · 검색 키워드 글쓰기 · AI 프롬프트 글쓰기 · 수익화<br>🎨 블로그 꾸미기·셋팅 1회 포함</p><span class="wzo"><s>'+w(EDU_LIST.blog)+'</s> <em>20%</em> · '+EDU_EV+'까지 오픈 이벤트가</span><strong>'+w(EDU_PRICE.blog)+'</strong>'+eduPayBtn("blog")+'</div>'+
    '<div class="wzr"><span class="wzt hot">과목 2 · 🔥 오픈 이벤트</span><b>[쿠팡파트너스] 쿠팡파트너스 수익화 3주 1:1</b><p>1주 가입·승인·셋팅 · 2주 상품 고르기·링크 글쓰기·대가성 문구 · 3주 검색 키워드 글쓰기·운영정책 지키기<br>🎨 블로그 꾸미기·셋팅 1회 포함</p><span class="wzo"><s>'+w(EDU_LIST.cp)+'</s> <em>20%</em> · '+EDU_EV+'까지 오픈 이벤트가</span><strong>'+w(EDU_PRICE.cp)+'</strong>'+eduPayBtn("cp")+'</div>'+
    '<div class="wzr set"><span class="wzt hot">🔥 오픈 이벤트</span><b>[SET] 블로그 + 쿠팡파트너스 5주 1:1 올인원</b><p>두 과목을 5주 안에 한 번에 끝내요<br>🎨 블로그 꾸미기·셋팅 1회 포함</p><span class="wzo">따로 들으면 <s>'+w(EDU_PRICE.blog+EDU_PRICE.cp)+'</s> <em>'+Math.round((1-EDU_PRICE.set/(EDU_PRICE.blog+EDU_PRICE.cp))*100)+'%</em></span><strong>'+w(EDU_PRICE.set)+'</strong>'+eduPayBtn("set")+'</div>'+
    '<div class="wzx"><span class="wzxt">수강 외 결제 · 선택</span><b>이웃·방문자·인스타 1:1 실전 코칭</b>'+
      '<div class="wzxi"><i>🤝</i><div><b>한 달 안에 이웃 1,000명 만들기</b><p>목표 코칭 · 이웃 찾기 · 서로이웃 소통 · 댓글 관리 방법</p></div></div>'+
      '<div class="wzxi"><i>📈</i><div><b>한 달 안에 일 방문자 1,000명 만들기</b><p>목표 코칭 · 검색 유입 키워드 잡기 · 제목·본문 구성 피드백</p></div></div>'+
      '<div class="wzxi"><i>📸</i><div><b>인스타그램 계정 만들기</b><p>계정 콘셉트 · 프로필·피드 셋팅 · 체험단 신청용 계정 준비</p></div></div>'+
      '<p class="wzxn">이웃·방문자를 대신 늘려 드리는 서비스가 아니라, 목표를 세우고 직접 늘리는 방법을 1:1로 알려 드려요. 결과는 활동량·주제에 따라 달라요. 수강료와 별도이며 금액은 상담 때 안내해요.</p></div>'+
    '</div>';
}
function eduPayBtn(k){ return ''; } /* 2026-10-21 12:38 시온님: 과목 카드의 결제·카카오 버튼은 빼고, 아래 고정 '수강 신청하기' → 과목 선택 창(eduPick)에서 신청 */
/* 결제 전 환불 조건 확인 창(2026-10-21 시온님 "결제할 때 볼 수 있게"). 청약철회 제한은 결제 전에 알리고 동의를 받아야 효력이 있어서, 결제 페이지로 가기 전에 보여 주고 체크해야 넘어감 */
var EDU_PARTS=[["① 전자책·강의자료",30,"받은 뒤 환불 안 됨"],["② 1:1 강의",10,"남은 날만큼 − 10%"],["③ 1:1 진단 컨설팅 1회",20,"받은 뒤 환불 안 됨"],["④ 12개월 1:1 코칭",10,"남은 개월만큼 − 10%"],["⑤ 블로그 꾸미기·셋팅 1회",10,"적용 후 환불 안 됨"],["⑥ AI 프롬프트",10,"받은 뒤 환불 안 됨"],["⑦ 기자단 모음 평생 열람·알림",10,"열람 시작 후 환불 안 됨"]];
var EDU_TERMS_VER="2026-10-21";
document.addEventListener("click",function(e){ var b=e.target.closest&&e.target.closest("[data-edulogin]"); if(!b) return; e.preventDefault(); ga("edu_join_click",{}); ls("dakku-after-login","#/edu"); login("kakao"); });
/* 수강 신청 과목 선택 창(2026-10-21 시온님 "아래 고정 수강신청하기 누르면 상품 선택"). 고른 뒤 → 로그인 안 했으면 카카오 간편 가입 후 돌아와 계약서 → 페이앱 */
var EDU_OPT=[["blog","[블로그] 블로그 수익화 5주 1:1"],["cp","[쿠팡파트너스] 쿠팡파트너스 수익화 3주 1:1"],["set","[SET] 블로그 + 쿠팡파트너스 5주 1:1 올인원"]];
var EDU_REFUND=['전자책·강의자료를 받기 전이고 컨설팅·첫 교육 전이면 전액 환불해요.','전자책·강의자료·AI 프롬프트는 디지털 콘텐츠라 받은 뒤에는 청약철회가 제한되어 환불되지 않아요(전자상거래법 제17조 제2항).','진단 컨설팅·블로그 꾸미기는 제공을 마치면 환불되지 않아요.','1:1 강의는 남은 일수만큼, 12개월 코칭은 남은 개월만큼 환불하고 남은 금액의 10%를 해지 수수료로 빼요.','기자단 모음 열람은 시작 후 환불되지 않아요. 다만 결제 후 12개월 안에 다꾸체험단이 체험단 사업을 종료하면 남은 개월만큼 돌려드려요.','환불은 카카오톡 채널 「다꾸체험단」으로 요청하면 3영업일 안에 결제 수단으로 취소해요.','교육은 방법을 함께 찾는 서비스로, 수익 금액·체험단 선정·검색 순위를 약속하거나 보장하지 않아요.'];
function eduPick(){
  var w=function(n){ return n.toLocaleString()+'원'; }, pay=seed.eduPay||{};
  var el=document.createElement("div"); el.className="edusheet";
  el.innerHTML='<div class="epk" role="dialog" aria-modal="true" aria-label="수강 과목 선택"><div class="ephd"><b>수강 과목 선택</b><button type="button" class="epx" aria-label="닫기">✕</button></div>'+
    EDU_OPT.map(function(o){ var k=o[0], lp=eduListPrice(k), pr=EDU_PRICE[k], pc=Math.round((1-pr/lp)*100);
      return '<label class="epo"><input type="radio" name="edupk" value="'+k+'"'+(safeUrl(pay[k])?'':' disabled')+'><span class="epn"><b>'+esc(o[1])+'</b><small>'+(k==="set"?'따로 들으면 ':'')+(lp>pr?'<s>'+w(lp)+'</s> <em>'+pc+'%</em>':'')+'</small></span><strong>'+w(pr)+'</strong></label>'; }).join("")+
    '<button type="button" class="b pri epgo" disabled>다음</button></div>';
  document.body.appendChild(el);
  var go=el.querySelector(".epgo"), sel=function(){ var r=el.querySelector('input[name=edupk]:checked'); return r&&r.value; };
  el.addEventListener("change",function(){ go.disabled=!sel(); });
  el.addEventListener("click",function(e){
    if(e.target===el||e.target.closest(".epx")){ el.remove(); return; }
    if(!e.target.closest(".epgo")||go.disabled) return;
    var k=sel(), to="#/checkout?c="+k; ga("edu_pick",{course:k}); el.remove();
    if(authCfg()&&!USER){ ga("edu_join_click",{course:k}); ls("dakku-after-login",to); login("kakao"); return; }
    location.hash=to;
  });
}
function eduListPrice(k){ return k==="set"?EDU_PRICE.blog+EDU_PRICE.cp:(EDU_LIST[k]||EDU_PRICE[k]); }
function eduResume(){}
/* 수강 결제 페이지 #/checkout?c=blog (2026-10-21 시온님이 와디즈 결제 화면 보여주며 "참고해서 만들어줘"): 수강생 정보 → 선택한 과목 → 결제 금액 → 결제 수단 안내 → 결제 유의사항 → 아래 고정 동의(전체 동의·각 항목 › 팝업) + N원 결제하기 → 동의 기록 → 페이앱 */
var CO_DOCS={
  refund:function(){ return '<p class="cot">교육 제공자: 다꾸체험단</p><b>결제 금액 구성</b><table>'+EDU_PARTS.map(function(r){ return '<tr><th>'+r[0]+'</th><td>'+r[1]+'%</td><td>'+r[2]+'</td></tr>'; }).join("")+'</table><p class="cot">12개월 뒤 1:1 코칭은 평생 무료예요("평생"은 다꾸체험단이 체험단 사업을 운영하는 동안).</p><b>결제 취소 및 환불 안내</b><ul>'+EDU_REFUND.map(function(t){ return '<li>'+t+'</li>'; }).join("")+'</ul><a href="'+(BASE||"/")+'refund.html" target="_blank" rel="noopener">환불정책 전문 보기 ↗</a>'; },
  privacy:function(){ return '<table><tr><th>수집 항목</th><td colspan="2">휴대폰 번호, 이메일, 카카오 회원 식별자, 신청 과목·결제 금액·동의 일시</td></tr><tr><th>목적</th><td colspan="2">수강 신청 확인, 결제자 확인, 강의 일정·자료 안내, 환불 처리, 분쟁 대응</td></tr><tr><th>보유 기간</th><td colspan="2">계약·결제 기록은 「전자상거래법」에 따라 5년, 그 밖에는 수강 종료 후 1년</td></tr></table><p class="cot">동의를 거부할 수 있지만, 거부하면 수강 신청을 할 수 없어요. 결제는 결제대행사 페이앱 화면에서 진행되고, 카드 정보는 다꾸체험단이 받지 않아요.</p><a href="#/privacy">개인정보처리방침 전체 보기 ›</a>'; },
  notice:function(){ return '<p>수강 신청 확인, 강의 일정, 자료 전달, 결제·환불 안내를 문자·카카오톡·이메일로 보내 드려요. 광고성 정보는 보내지 않아요.</p>'; }
};
var CO_TITLE={refund:"환불 정책 동의",privacy:"개인정보 수집·이용 동의",notice:"수강·결제 관련 안내 수신 동의"};
function checkoutView(){
  var k=state.coK, w=function(n){ return n.toLocaleString()+'원'; }, opt=EDU_OPT.filter(function(o){ return o[0]===k; })[0];
  if(!opt||!safeUrl((seed.eduPay||{})[k])) return '<div class="pg co"><div class="empty">과목을 다시 골라 주세요.<br><a class="b pri" href="#/edu">수강 과목 보러 가기</a></div></div>';
  var lp=eduListPrice(k), pr=EDU_PRICE[k], pv={}; try{ pv=JSON.parse(ls("dakku-edu-consent")||"{}"); }catch(e){}
  var md=(USER&&USER.user_metadata)||{}, em=(USER&&USER.email)||md.email||pv.email||"", ph=pv.tel||(USER&&USER.phone)||md.phone_number||"";
  var login=authCfg()&&!USER;
  return '<div class="pg co">'+
    (login?'<section class="cosec colog"><b>회원가입 후 결제할 수 있어요</b><p>카카오 로그인 한 번이면 가입돼요.</p><button type="button" class="b pri" data-cologin>카카오로 계속하기</button></section>':'')+
    '<section class="cosec"><h2>수강생 정보</h2>'+
      '<label class="cof"><span>휴대폰 번호</span><input class="fi" id="coTel" inputmode="tel" maxlength="13" autocomplete="tel" placeholder="010-0000-0000" value="'+esc(ph)+'"></label>'+
      '<label class="cof"><span>이메일</span><input class="fi" id="coMail" type="email" maxlength="80" autocomplete="email" placeholder="자료 받을 이메일" value="'+esc(em)+'"></label></section>'+
    '<section class="cosec"><h2>선택한 과목</h2><div class="coitem"><span class="cotag">🔥 오픈 이벤트</span><b>'+esc(opt[1])+'</b><div class="corow"><span>1개</span><strong>'+w(pr)+'</strong></div></div><a class="cochg" href="#/edu" data-edupick>과목 변경</a></section>'+
    '<section class="cosec"><h2>결제 금액</h2><div class="corow"><span>수강료'+(k==="set"?' (따로 들을 때)':'')+'</span><span>'+w(lp)+'</span></div>'+(lp>pr?'<div class="corow"><span>오픈 이벤트 할인</span><span class="codc">−'+w(lp-pr)+'</span></div>':'')+'<div class="corow cototal"><b>총 결제 금액</b><b>'+w(pr)+'</b></div></section>'+
    '<section class="cosec"><h2>결제 수단</h2><div class="copay"><b>💳 페이앱 결제</b><p>다음 화면(결제대행사 페이앱)에서 신용·체크카드 등 결제 수단을 고를 수 있어요. 할부 개월 수와 할부 수수료는 카드사 기준이에요.</p></div></section>'+
    '<section class="cosec conote"><b>ⓘ 결제 유의사항</b><ul><li>결제가 끝나면 입력한 연락처로 강의 일정과 자료 받는 방법을 안내해 드려요.</li><li>전자책·강의자료·AI 프롬프트는 받은 뒤에는 환불되지 않아요. 자세한 내용은 아래 환불 정책 동의에서 확인할 수 있어요.</li></ul></section>'+
    '<div class="cobar"><button type="button" class="cotog" aria-label="동의 항목 펼치기">︿</button><div class="coags"><label class="coall"><input type="checkbox" id="coAll"> <b>결제 진행 필수 동의</b></label>'+
      [["refund","환불 정책 동의 (필수)"],["privacy","개인정보 수집·이용 동의 (필수)"],["notice","수강·결제 관련 안내 수신 동의 (필수)"]].map(function(a){ return '<div class="coag"><label><input type="checkbox" class="coAg" data-k="'+a[0]+'"> '+a[1]+'</label><button type="button" class="codoc" data-doc="'+a[0]+'" aria-label="'+a[1]+' 보기">›</button></div>'; }).join("")+
      '</div><button type="button" class="b pri cogo dis">'+w(pr)+' 결제하기</button></div>'+
  '</div>';
}
function coInit(){
  var pg=document.querySelector(".pg.co"); if(!pg||!pg.querySelector(".cobar")) return;
  var tel=pg.querySelector("#coTel"), mail=pg.querySelector("#coMail"), all=pg.querySelector("#coAll"), ags=[].slice.call(pg.querySelectorAll(".coAg")), go=pg.querySelector(".cogo");
  var ok=function(){ return /^01[016789]-?\d{3,4}-?\d{4}$/.test(tel.value.trim()) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.value.trim()) && ags.every(function(a){ return a.checked; }) && !(authCfg()&&!USER); };
  var chk=function(){ go.classList.toggle("dis",!ok()); all.checked=ags.every(function(a){ return a.checked; }); };
  /* 로그인한 회원은 예전에 결제 페이지에서 남긴 휴대폰·이메일을 서버(edu_consents 본인 기록)에서 불러와 채운다(다른 기기에서도) — 2026-10-21 시온님 */
  if(SB&&USER&&(!tel.value||!mail.value)) SB.from("edu_consents").select("phone,email").eq("user_id",USER.id).order("agreed_at",{ascending:false}).limit(1).then(function(r){ var x=r&&r.data&&r.data[0]; if(!x) return; if(!tel.value&&x.phone) tel.value=x.phone; if(!mail.value&&x.email) mail.value=x.email; chk(); });
  pg.addEventListener("input",function(e){ if(e.target.type!=="checkbox") chk(); }); pg.addEventListener("change",function(e){ if(e.target===all){ ags.forEach(function(a){ a.checked=all.checked; }); } chk(); }); chk();
  pg.addEventListener("click",function(e){
    var d=e.target.closest("[data-doc]"); if(d){ coDoc(d.getAttribute("data-doc")); return; }
    if(e.target.closest("[data-cologin]")){ ga("edu_join_click",{course:state.coK}); ls("dakku-after-login",location.hash); login("kakao"); return; }
    if(e.target.closest(".cotog")){ pg.querySelector(".cobar").classList.toggle("open"); return; }
    if(!e.target.closest(".cogo")) return;
    if(go.classList.contains("dis")){ var bar=pg.querySelector(".cobar"); if(authCfg()&&!USER){ toast("카카오로 가입한 뒤 결제할 수 있어요"); window.scrollTo({top:0,behavior:"smooth"}); return; } if(!/^01[016789]-?\d{3,4}-?\d{4}$/.test(tel.value.trim())||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.value.trim())){ toast("휴대폰 번호와 이메일을 확인해 주세요"); (/^01/.test(tel.value)?mail:tel).focus(); return; } bar.classList.add("open"); toast("필수 동의 항목을 확인해 주세요"); return; }
    var k=state.coK, u=safeUrl((seed.eduPay||{})[k]), pr=EDU_PRICE[k], t=tel.value.trim(), m=mail.value.trim(); if(!u) return;
    ga("edu_pay_click",{course:k});
    var win=window.open("about:blank","_blank"), open=function(){ if(win) win.location.href=u; else location.href=u; };
    try{ ls("dakku-edu-consent",JSON.stringify({course:k,price:pr,ver:EDU_TERMS_VER,tel:t,email:m,at:new Date().toISOString()})); }catch(er){}
    if(SB&&USER){ SB.from("edu_consents").insert({user_id:USER.id,phone:t,email:m,course:k,price:pr,terms_ver:EDU_TERMS_VER,ua:navigator.userAgent.slice(0,200)}).then(function(r){ if(r&&r.error) console.warn("[dakku] consent",r.error.message); open(); },function(){ open(); }); }
    else open();
  });
}
function coDoc(k){
  var el=document.createElement("div"); el.className="codlg";
  el.innerHTML='<div class="cobox" role="dialog" aria-modal="true" aria-label="'+CO_TITLE[k]+'"><div class="cohd"><b>'+CO_TITLE[k]+'</b><button type="button" class="cox" aria-label="닫기">✕</button></div><div class="cobody">'+CO_DOCS[k]()+'</div><button type="button" class="b pri cook">확인</button></div>';
  document.body.appendChild(el); if(k==="refund") ga("edu_refund_view",{});
  el.addEventListener("click",function(e){ if(e.target===el||e.target.closest(".cox")||e.target.closest(".cook")){ el.remove(); } else if(e.target.closest('a[href^="#/"]')) el.remove(); });
}
document.addEventListener("click",function(e){ var b=e.target.closest&&e.target.closest("[data-edupick]"); if(!b) return; e.preventDefault(); eduPick(); });
function eduView(){
  var EDU_DL="2026-10-31", eduOpen=dcdMs(EDU_DL)>0;
  return '<div class="pg edu">'+(eduOpen?'<div class="edudl"><b><span class="dlw">🔥 10월 수강생 · 10/31 마감까지</span><span class="dlm">🔥 10월 수강생 모집중 🔥</span></b><span class="dlt" data-edl="'+EDU_DL+'">'+dlTiles(EDU_DL)+'</span></div>':'')+
    '<section class="eduhero hero2 wz"><span class="wzk">왕초보 가능 부업 🤑</span><h1>블로그로 누구나 쉽게!<br><span>AI 블로그 글쓰기</span> 수익화 방법</h1><p class="wzby">📣 광고대행사 대표가 직접 알려드려요</p>'+
      '<div class="wzsum"><b class="wzst">✦ 한눈에 보기</b>'+
        '<div class="wzi"><i>🧑‍💻</i><div><b>블로그 수익화 5주 1:1</b><p>체험단 당첨 · 기자단 · 검색 키워드 글쓰기까지</p></div></div>'+
        '<div class="wzi"><i>🤖</i><div><b>최신 AI 프롬프트로 글쓰기</b><p>글솜씨 없어도 왕초보가 따라 할 수 있게 프롬프트를 드려요</p></div></div>'+
        '<div class="wzi"><i>📚</i><div><b>전자책·강의자료 + 컨설팅·코칭</b><p>1:1 진단 컨설팅으로 시작해 12개월 1:1 코칭, 그 뒤엔 평생 무료로 피드백해요</p></div></div>'+
        '<div class="wzi"><i>📰</i><div><b>기자단 모음 평생 열람 · 업데이트 알림</b><p>원고료 기자단 모집을 모아 보고, 새 기자단이 올라오면 알려 드려요</p></div></div>'+
        '<div class="wzi"><i>🎨</i><div><b>블로그 꾸미기·셋팅 1회 포함</b><p>스킨 디자인 · 위젯 설치 · 공정위 스티커까지 만들어 드려요</p></div></div>'+
      '</div>'+eduRewards()+'</section>'+
    '<section class="edupts"><small>다꾸 수익화 POINT</small><h2><span>한 달 1:1 교육</span>으로 끝내는<br>블로그 체험단·수익화</h2><div class="edupt p1"><i>Point 1</i><b>5주 1:1 교육으로 <em>한 달이면 끝!</em></b><p>블로그 셋팅부터 체험단 당첨·키워드 글쓰기·수익화까지</p></div><div class="edupt p2"><i>Point 2</i><b>끝나도 <em>평생 1:1 코칭</em></b><p>12개월 1:1 코칭 · 그 뒤 평생 무료 · 횟수 제한 없이 피드백</p></div><div class="edupt p3"><i>Point 3</i><b><em>50대도</em> 처음부터 차근차근</b><p>최신 AI 프롬프트 · 블로그 책</p></div></section>'+
    '<section class="eduwhy"><p>다꾸 수익화는 왜<br>누구나 따라 할 수 있을까요?</p><div class="hl">왕초보 · 대학생 · 직장인 · 육아맘 · 50대<br>누구나 가능한 방법</div><p class="st"><s>젊은 나이 · 뛰어난 글솜씨 · 비싼 장비</s> 필요 없어요<br>휴대폰·노트북 하나면 시작할 수 있어요</p></section><section class="eduall"><h2>다꾸 수익화 클래스 모든 혜택 <span>🎁</span></h2><div class="eagrid"><div class="ea"><i>+</i><span class="eae">🧑‍🏫</span><b>5주 1:1 강의</b><small>셋팅부터 수익화까지</small></div><div class="ea"><i>+</i><span class="eae">📚</span><b>전자책·강의자료</b><small>결제 직후 바로 제공</small></div><div class="ea"><i>+</i><span class="eae">🤖</span><b>최신 AI 프롬프트</b><small>블로그 글쓰기 시간 단축</small></div><div class="ea"><i>+</i><span class="eae">🎬</span><b>릴스·클립 체험단</b><small>100% 활용법</small></div><div class="ea"><i>+</i><span class="eae">🔎</span><b>키워드 글쓰기</b><small>검색하는 사람에게 맞춘 글</small></div><div class="ea"><i>+</i><span class="eae">🎁</span><b>평생 1:1 코칭</b><small>횟수 제한 없음</small></div><div class="ea"><i>+</i><span class="eae">📖</span><b>블로그 관련 서적</b><small>표지 아래에서 확인</small></div><div class="ea"><i>+</i><span class="eae">🏆</span><b>다꾸 이벤트</b><small>평생 우선권</small></div><div class="ea"><i>+</i><span class="eae">💯</span><b>당첨 안 되면</b><small>100% 환불 (조건 있음)</small></div></div></section>'+
    '<section class="edusec"><h2>이런 분들께 맞아요</h2><div class="edutalk">'+EDU_TALK.map(function(t,i){ return '<div class="et'+(i%2?' r':'')+'"><i>'+t[0]+'</i><p><small>'+esc(t[1])+'</small>'+esc(t[2])+'</p></div>'; }).join("")+'</div><ul class="educhk">'+EDU_PICK.map(function(t){ return '<li>'+esc(t)+'</li>'; }).join("")+'</ul></section>'+
    '<section class="edusec"><h2>5주 커리큘럼</h2><p class="edumonth2">⚡ 한 달이면 블로그 수익화까지 다 배워요</p><ol class="educur">'+
      [["🛠️","블로그 셋팅 및 점검 · ✍️ 포스팅하는 법"],["🎟️","체험단 신청하는 방법 · 📝 당첨 후기 작성법"],["🔎","블로그 검색 키워드 글쓰기 · 🎬 인스타그램 릴스·클립 체험단 100% 활용"],["📰","블로그 기자단 · 🤖 AI 글쓰기 <small class=\"cpt\">(최신 AI 프롬프트 제공)</small>"],["💰","블로그 수익화 비법"]].map(function(c,k){ return '<li><b>✨ '+(k+1)+'주차</b><span>'+c[0]+' '+c[1]+'</span></li>'; }).join("")+
    '</ol></section>'+
    '<section class="edusec"><h2>📚 수강생에게 드리는 블로그 책</h2><div class="edubk50"><img src="'+BASE+'images/books/b50.jpg" alt="50대에도 블로그 체험단 한다" loading="lazy"><div><b>50대에도<br>블로그 체험단 한다</b><p>나이는 상관없어요.<br>처음 시작해도 체험단으로 즐겁게!</p></div></div><div class="edubks"><img src="'+BASE+'images/books/b1.jpg" alt="블로그 관련 책" loading="lazy"><img src="'+BASE+'images/books/b2.jpg" alt="블로그 관련 책" loading="lazy"><img src="'+BASE+'images/books/b3.jpg" alt="블로그 관련 책" loading="lazy"><img src="'+BASE+'images/books/b4.jpg" alt="블로그 관련 책" loading="lazy"><img src="'+BASE+'images/books/b5.jpg" alt="블로그 관련 책" loading="lazy"><img src="'+BASE+'images/books/b6.jpg" alt="블로그 관련 책" loading="lazy"><img src="'+BASE+'images/books/b7.jpg" alt="블로그 관련 책" loading="lazy"><img src="'+BASE+'images/books/b8.jpg" alt="블로그 관련 책" loading="lazy"><img src="'+BASE+'images/books/b9.jpg" alt="블로그 관련 책" loading="lazy"></div></section>'+
    '<section class="edurv"><small>REVIEW</small><h2>수강생 후기</h2><p class="edurvn">다꾸 수익화 교육 전에 같은 강사가 진행한 블로그·인스타 협찬 강의 수강생이 남긴 실제 후기예요.</p><div class="edurvs"><div class="edurvc"><em class="rvn">REVIEW 01</em><b>타부업보다 훨씬 좋은 플랫폼</b><p>다른 부업 사이트에서 보면 터무니없는 강의자료와 중요한 것들은 안 알려주고 넘어가는 게 많아서 아쉬웠는데, 강사님께 실무 중심으로 많은 것들을 배울 수 있었습니다. 덕분에 도움이 많이 되었어요.</p></div><div class="edurvc"><em class="rvn">REVIEW 02</em><small>마케팅 처음 배우시는 분들께 추천!</small><b>초보자도 기초부터 탄탄하게 배울 수 있는 강의!</b><p>처음부터 어떻게 시작해야 하는지 고민을 많이 했는데.. 강사님 커리큘럼 보고 협찬 문의가 늘기 시작했어요. 기초부터 하나하나 다 알려주셔서 따라 하면서 익히기에 정말 좋았습니다.</p></div><div class="edurvc"><em class="rvn">REVIEW 03</em><small>부가수익이 필요해서 시작했어요!</small><b>이거 진작 시작할걸 그랬어요!</b><p>아예 처음 배우는 거라 초기 비용이 너무너무 부담되었는데… 부업 시작하시는 분들 멘토님이랑 저 믿고 시작하세요. 저는 친구한테도 추천하고 있어요!</p></div><div class="edurvc"><em class="rvn">REVIEW 04</em><b>AI 프롬프트 정리가 잘 되어 있어요</b><p>무엇보다 블로그 포스팅 AI 프롬프트 정리가 잘 되어 있어서 좋았어요. 멘토님께서 1:1 피드백도 매일 해주시고 출석 알림 주셔서 감사했습니다.</p></div><div class="edurvc"><em class="rvn">REVIEW 05</em><b>퇴사 후 만난 부업이에요</b><p>저는 5년 차 직장인으로 이직을 준비하던 중 집에서 용돈 벌 수 있는 일을 알아봤어요. 그러다 인스타를 통해서 멘토님을 알게 되었고, 화장품 협찬 릴스 보고 혹해서 시작하게 되었어요.</p></div><div class="edurvc"><em class="rvn">REVIEW 06</em><small>육아맘 협찬 부업으로 추천!</small><b>내 인생 최고의 부업!</b><p>그동안 부업을 해야겠다 마음만 먹고 있었는데 멘토님 인스타 보고 시작하게 됐어요. 고민 중이시라면 시작해 보세요.</p></div></div></section>'+
    '<section class="edusec"><h2>진행 방식</h2><ul class="eduway"><li>💬 카톡으로 상담 신청 → 수강료 결제</li><li>📚 전자책·강의자료를 바로 드려요</li><li>🧑‍🏫 5주 1:1 교육 커리큘럼</li><li>🧑‍🏫 1:1 진단 컨설팅 1회 + 12개월 1:1 코칭 (수강료에 포함, 횟수 제한 없음)</li><li>🎨 블로그 꾸미기·셋팅 1회 (스킨 디자인 · 위젯 설치 · 공정위 스티커, 수강료에 포함)</li><li>🤖 AI 글쓰기 프롬프트 제공 (수강료에 포함)</li><li>📰 기자단 모음 평생 열람 · 새 기자단 업데이트 알림 (수강료에 포함, 다꾸체험단 체험단 사업 종료 시까지)</li><li>🎁 수강생 혜택: 12개월 뒤에도 1:1 코칭 평생 무료</li><li>🏆 수강생 혜택: 다꾸체험단이 직접 진행하는 캠페인·이벤트 평생 우선권</li><li>📚 수강생 혜택: 블로그 관련 서적 제공</li><li>💳 한 번 결제, 카드 할부 가능 (할부 개월 수는 카드사마다 달라요)</li></ul>'+
      '<div class="eduguar"><b>💯 당첨 안 되면 100% 환불</b><p>5주 교육을 마친 뒤 3개월 안에, 배운 방법대로 체험단을 30번 이상 신청했는데 한 번도 선정되지 않으면 결제 금액 전액을 돌려드려요. (신청 내역 캡처로 확인)</p><small>⚠️ 허위 신청 내역·캡처 조작 등 부정한 방법으로 환불을 받으면 환불금 반환을 청구하고, 민·형사상 법적 책임을 물을 수 있어요.</small></div>'+
      '<div class="edustage"><p class="esk">한 달이면 끝내는 블로그 체험단·수익화</p><h3>다꾸 수익화 1:1 클래스</h3><div class="esbody"><span class="esf f1">📝</span><span class="esf f2">✨</span><span class="esf f3">💜</span><div class="esbox"><span class="esbadge">오픈<br>이벤트</span><small>5주 1:1 강의 + 전자책·강의자료</small><hr><b class="esmon">월 10만원대</b><a class="esask" href="#eduapply" data-jumpid="eduapply">🔐 1:1 상담 신청하기</a><em>*12개월 카드 할부 시<br>(할부 수수료는 카드사 기준)</em></div></div><p class="esgift"><b>진단 컨설팅 + 12개월 코칭 · 이후 평생 무료</b><br>다꾸체험단 이벤트 평생 우선권 · 블로그 관련 서적</p><a class="b esbtn" href="#eduapply" data-jumpid="eduapply">수강료 알아보기 ›</a></div>'+
      '</section>'+
    '<section class="educta"><p>아직 고민하는 분들께</p><h2>지금 시작하고<br><span>생활비 월 100</span> 아껴보세요!</h2><small>*체험단 활용 정도에 따라 사람마다 달라요</small></section>'+
    '<section class="edusec" id="eduapply"><h2>상담 신청</h2><form id="eduform" class="eduform" novalidate>'+
      '<label class="fl">닉네임 <i>*</i><input class="fi" name="nick" maxlength="30" autocomplete="nickname"></label>'+
      '<label class="fl">블로그·인스타 주소<input class="fi" name="blog" maxlength="200" inputmode="url" placeholder="https://blog.naver.com/..."></label>'+
      '<span class="fl">듣고 싶은 과목 <i>*</i></span><div class="edupick">'+["블로그 수익화 (5주)","쿠팡파트너스 수익화 (3주)","블로그 + 쿠팡파트너스 세트 (5주)"].map(function(t,i){ return '<label class="rck"><input type="radio" name="course" value="'+t+'"'+(i===0?' checked':'')+'>'+t+'</label>'; }).join("")+'</div>'+
      '<span class="fl">지금 고민 <i>*</i></span><div class="edupick">'+EDU_PICK.map(function(t,i){ return '<label class="rck"><input type="checkbox" name="pk" value="'+esc(t)+'">'+esc(t)+'</label>'; }).join("")+'</div>'+
      '<label class="fl">하고 싶은 말<textarea class="fi ta" name="msg" maxlength="500" placeholder="궁금한 점이나 목표를 편하게 적어 주세요"></textarea></label>'+
      '<label class="agree"><input type="checkbox" name="agree"> 상담을 위해 닉네임·블로그 주소·고민 내용을 받는 데 동의해요 (상담이 끝나면 지워요)</label>'+
      '<p class="ferr" id="eduerr"></p><button class="b pri wide" type="submit">카톡으로 상담 신청하기</button></form></section>'+
    '<div class="dbar edubar"><a class="b" href="#edurw" data-edupick>💳 수강 신청하기 <small>과목 선택</small></a></div>'+
  '</div>';
}
document.addEventListener("click",function(e){ var a=e.target.closest&&e.target.closest("[data-jumpid]"); if(!a) return; e.preventDefault(); var el=document.getElementById(a.dataset.jumpid); if(el) el.scrollIntoView({behavior:"smooth",block:"start"}); });
function submitEdu(f){
  var nick=String(f.elements.nick.value||"").trim(), blog=String(f.elements.blog.value||"").trim(), msg=String(f.elements.msg.value||"").trim();
  var pk=[].map.call(f.querySelectorAll('input[name="pk"]:checked'),function(x){ return x.value; });
  var miss=[]; if(!nick) miss.push("닉네임"); if(!pk.length) miss.push("지금 고민"); if(!f.elements.agree.checked) miss.push("동의");
  var err=document.getElementById("eduerr"); if(miss.length){ err.textContent=miss.join(", ")+"을(를) 확인해 주세요."; return; } err.textContent="";
  var crs=(f.querySelector('input[name="course"]:checked')||{}).value||"-";
  ga("edu_apply",{course:crs});
  doneContact("[다꾸 수익화 1:1 상담 신청]\n과목: "+crs+"\n닉네임: "+nick+"\n블로그: "+(blog||"-")+"\n고민: "+pk.join(" / ")+"\n하고 싶은 말: "+(msg||"-")+"\n개인정보 수집 동의: 동의");
}
function submitContact(f){
  var g=function(n){ var el=f.elements[n]; return el?String(el.value||"").trim():""; };
  var pick=function(n){ var r=f.querySelector('input[name="'+n+'"]:checked'); if(!r) return ""; if(r.value==="기타"){ var t=f.querySelector('[data-etc="'+n+'"]'); return "기타: "+(t?t.value.trim():""); } return r.value; };
  var tel=[g("t1"),g("t2"),g("t3")].join("-"), from=pick("from"), reply=pick("reply"), pkg=pick("pkg");
  var miss=[];
  if(!pkg) miss.push("관심 상품"); if(!g("name")) miss.push("업체명 혹은 성함"); if(!g("area")) miss.push("지역"); if(!g("biz")) miss.push("업종");
  if(!/^\d{2,4}-\d{3,4}-\d{4}$/.test(tel)) miss.push("전화번호"); if(!from) miss.push("유입경로"); if(!reply) miss.push("회신수단"); if(!g("msg")) miss.push("문의내용");
  if(!f.elements.agree.checked) miss.push("개인정보 동의");
  var err=document.getElementById("ferr");
  if(miss.length){ err.textContent=miss.join(", ")+"을(를) 확인해 주세요."; return; }
  err.textContent="";
  var text="[다꾸 광고주 상담 신청]\n관심 상품: "+pkg+"\n업체명/성함: "+g("name")+"\n지역: "+g("area")+"\n업종: "+g("biz")+"\n전화번호: "+tel+"\n유입경로: "+from+"\n회신수단: "+reply+"\n문의내용: "+g("msg")+"\n개인정보 수집 동의: 동의";
  var ep=safeUrl((seed.contact||{}).endpoint);
  if(ep){
    fetch(ep,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({pkg:pkg,name:g("name"),area:g("area"),biz:g("biz"),tel:tel,from:from,reply:reply,msg:g("msg"),agree:true})})
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
function cheapBtn(cls){
  var x=(seed.links||{}).goldbox||{}, u=safeUrl(x.u); if(!u) return "";
  return '<a class="cheapb'+(cls?' '+cls:'')+'" '+ext(u)+'><span class="cbx"><small>오늘 할인 중인 상품</small><b>쿠팡 골드박스 보러가기</b></span><span class="cbl cbi" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></span><em class="cbad">AD</em></a>';
}
function shopBtn(){
  var u=safeUrl(((seed.links||{}).shop||{}).u); if(!u) return "";
  return '<a class="cheapb shopb" '+ext(u)+'><span class="cbx"><small>다꾸가 직접 고른</small><b>다꾸 추천템 모아보기 ›</b></span><span class="cbl" aria-hidden="true">🛍️</span><em class="cbad">AD</em></a>';
}
function cpSearch(){
  var u=safeUrl(seed.coupangSearch); if(!/^https:\/\/coupa\.ng\/\w+$/.test(u)) return "";
  return '<div class="cpsrch"><iframe src="'+esc(u)+'" title="쿠팡 상품 검색" width="100%" height="44" frameborder="0" scrolling="no" referrerpolicy="unsafe-url" loading="lazy"></iframe></div>';
}
function cpBanner(){
  var b=seed.coupangBanner||{}; if(!/^\d+$/.test(String(b.id||"")) || !/^[A-Za-z0-9]+$/.test(String(b.trackingCode||""))) return "";
  var fr=document.getElementById("view"), w=Math.min(+b.width||680, Math.max(280,((fr&&fr.clientWidth)||window.innerWidth)-32)), hgt=+b.height||140;
  var src="https://ads-partners.coupang.com/widgets.html?id="+b.id+"&template="+encodeURIComponent(b.template||"carousel")+"&trackingCode="+b.trackingCode+"&subId=&width="+w+"&height="+hgt;
  return '<p class="cpbl">🛒 나를 위한 쿠팡 추천</p>'+cpSearch()+'<div class="cpban" style="height:'+hgt+'px"><iframe src="'+esc(src)+'" title="오늘의 추천 특가" loading="lazy" referrerpolicy="unsafe-url" scrolling="no" frameborder="0"></iframe></div>';
}
function todayDeals(){
  if(!DEALS.length) return "";
  return '<section class="sec"><div class="sh col"><h2>⚡ 오늘의 특가</h2><p class="cd">특가 종료까지 <b id="cd">'+hms(nextSeven())+'</b> 남음</p></div><div class="deallist">'+
      DEALS.map(function(d){ var u=safeUrl(d.u); if(!u) return ""; return '<a class="drow" '+ext(u)+'><span class="dt" style="background:'+esc(d.c||"#f4f0ff")+'"><span>'+esc(d.e||"🎁")+'</span>'+(d.tag?'<em>'+esc(d.tag)+'</em>':'')+'</span><span class="dx"><b>'+esc(d.t)+'</b><small>'+esc(d.d||"")+'</small><span class="dg">👉 특가 보러가기'+ico(I.chev)+'</span></span></a>'; }).join("")+'</div></section>';
}
function topDeals(n){
  var src=[];
  liveToss().forEach(function(x){ if(!x.soldOut) src.push({x:x,end:"밤 12시까지"}); });
  babyDeals().forEach(function(x){ src.push({x:{name:x.name,u:x.u,img:x.img,price:x.price,rate:String(x.rate).replace("%","")+"%",endAt:x.endAt},end:"내일 7시까지"}); });
  liveGold().forEach(function(x){ if(x.rate) src.push({x:x,end:"내일 7시까지"}); });
  src.forEach(function(o){ o.r=parseInt(String(o.x.rate||"").replace(/\D/g,""),10)||0; });
  var all=src.filter(function(o){ return o.r>0; }).sort(function(a,b){ return b.r-a.r; }), L=all.slice(0,n||4);
  var bb=all.filter(function(o){ return o.end==="내일 7시까지"&&babyDeals().some(function(b){ return b.u===o.x.u; }); })[0];
  if(bb&&L.indexOf(bb)<0) L[L.length-1]=bb;
  return L;
}
function topDealsHtml(){
  var L=topDeals(4); if(!L.length) return "";
  return '<section class="sec topdeal" id="topdeal"><div class="sh col"><h2>🏆 지금 할인율 TOP</h2><p class="cd">카톡 소식에서 본 특가도 여기 있어요</p></div><div class="tgrid">'+L.map(function(o){ return tossCard(o.x); }).join("")+'</div></section>';
}
function dealSearch(){ return '<div class="dsrch"><span class="dsi">🔍</span><input id="dq" type="search" placeholder="찾는 특가가 있나요? 예: 물티슈, 라면" aria-label="특가 상품 찾기" autocomplete="off"><button class="dsx" data-dqx aria-label="지우기" hidden>✕</button></div><p class="dsnone" id="dsnone" hidden>😢 오늘 특가에는 없어요. 아래 쿠팡 검색창에서 찾아보세요.</p>'; }
function filterDeals(q){
  q=String(q||"").trim().toLowerCase().replace(/\s+/g,"");
  var v=document.getElementById("view"); if(!v) return;
  var cards=v.querySelectorAll(".tcard,.hdi"), shown=0;
  [].forEach.call(cards,function(c){ var t=(c.textContent||"").toLowerCase().replace(/\s+/g,""); var ok=!q||t.indexOf(q)>=0; c.style.display=ok?"":"none"; if(ok&&q) shown++; });
  [].forEach.call(v.querySelectorAll(".sec,.hdl,.rdeal,.topdeal"),function(sec){ if(!q){ sec.style.display=""; return; } var has=[].some.call(sec.querySelectorAll(".tcard,.hdi"),function(c){ return c.style.display!=="none"; }); sec.style.display=has?"":"none"; });
  [].forEach.call(document.querySelectorAll(".hslider,.cpban,.orc,.kakaobox"),function(e){ e.style.display=q?"none":""; });
  var no=document.getElementById("dsnone"); if(no) no.hidden=!(q&&!shown);
  var x=v.querySelector("[data-dqx]"); if(x) x.hidden=!q;
}
document.addEventListener("input",function(e){ if(e.target&&e.target.id==="dq") filterDeals(e.target.value); });
document.addEventListener("click",function(e){ var b=e.target.closest("[data-dqx]"); if(!b) return; var i=document.getElementById("dq"); if(i){ i.value=""; filterDeals(""); i.focus(); } });
/* 날씨·계절 추천(2026-10-18 시온님 요청): data.json weather(서울, MET Norway, 매일 07:12) + 이번 달 → 테마 → seasonDeals[검색어](쿠팡 공식 검색 API 수익 링크) */
var WX_TH=[ // 전국적인 날씨일 때만(2026-10-18 시온님 요청). w: 8개 도시 요약
  {k:"typhoon", ok:function(w,m){ return w.windCities>=3&&w.maxRain>=20; }, ic:"🌀", t:"태풍 영향권", d:"비바람 대비 랜턴·제습기", kw:["랜턴","제습기"]},
  {k:"monsoon", ok:function(w,m,md){ return md>="06-20"&&md<="07-31"&&w.rainCities>=5; }, ic:"☔", t:"장마철", d:"눅눅한 집엔 제습기", kw:["제습기","장우산"]},
  {k:"rain", ok:function(w){ return w.rainCities>=5; }, ic:"☔", t:"전국에 비 소식", d:"장우산·제습기 챙기세요", kw:["장우산","제습기"]},
  {k:"shower", ok:function(w,m){ return m>=6&&m<=9&&w.rainCities>=4&&w.maxRain<10; }, ic:"🌦️", t:"곳곳에 소나기", d:"가방 속 우산 하나", kw:["장우산"]}];
var SEASON_TH={1:[["한겨울 따뜻하게","핫팩","온수매트"],["건조한 겨울 실내","가습기","수면양말"]],2:[["끝까지 따뜻하게","핫팩","전기요"],["건조한 실내","가습기","수면양말"]],3:[["황사·미세먼지 대비","황사마스크","공기청정기"],["봄맞이 침구 바꾸기","봄이불","침구청소기"]],4:[["봄맞이 침구 관리","침구청소기","봄이불"],["봄 햇살 대비","선크림","공기청정기"]],5:[["여름 미리 준비","선풍기","냉감이불"],["모기 시즌 시작","모기퇴치기","선크림"]],6:[["장마 대비","제습기","선풍기"],["시원한 잠자리","냉감이불","쿨매트"]],7:[["한여름 필수","선풍기","쿨매트"],["열대야 꿀잠","냉감이불","모기퇴치기"]],8:[["늦여름 모기 조심","모기퇴치기","선풍기"],["열대야 꿀잠","냉감이불","쿨매트"]],9:[["환절기 침구 관리","침구청소기","차렵이불"],["밤공기 선선할 때","전기요","가습기"]],10:[["겨울이불 꺼낼 때","겨울이불","극세사 이불"],["밤공기 쌀쌀할 때","전기요","온수매트"],["건조한 가을 실내","가습기","침구청소기"],["발끝까지 따뜻하게","수면양말","전기장판"]],11:[["겨울 준비","겨울이불","극세사 이불"],["따뜻한 잠자리","전기요","온수매트"],["건조한 실내","가습기","수면양말"],["첫 추위 대비","핫팩","전기장판"]],12:[["연말 모임 시즌","숙취해소제","핫팩"],["한겨울 잠자리","전기요","온수매트"],["건조한 겨울 실내","가습기","수면양말"]]};
/* 2026-10-22 시온님 "매일 같은 이불만 나와": 테마·상품을 날짜로 돌려서 매일 바뀌게 */
function wxDay(){ var k=new Date(Date.now()+9*36e5); return Math.floor(k.getTime()/864e5); }
function wxThemes(all){
  var S=seed.seasonDeals||{}, w=seed.weather, kst=new Date(Date.now()+9*36e5), today=kst.toISOString().slice(0,10), m=kst.getUTCMonth()+1, md=today.slice(5);
  if(!w||w.date!==today||w.rainCities==null) w=null;
  var out=[], used={}, dn=wxDay(); function add(ic,t,d,kws){ var L=[], seen={}; var KW=kws.filter(function(q){ return !used[q]&&(S[q]||[]).some(function(x){ return safeUrl(x.u); }); }); KW.forEach(function(q){ var A=(S[q]||[]).filter(function(x){ return safeUrl(x.u); }), off=A.length?(dn*2)%A.length:0, n=0; for(var j=0;j<A.length&&n<(all?99:Math.ceil(4/KW.length));j++){ var x=A[(off+j)%A.length], key=String(x.name||"").slice(0,18); if(seen[key]) continue; seen[key]=1; L.push(x); n++; } used[q]=1; }); if(L.length>=2) out.push({ic:ic,t:t,d:d,L:all?L:L.slice(0,4)}); return L.length>=2; }
  if(w){ for(var i=0;i<WX_TH.length;i++){ var th=WX_TH[i]; if(th.ok(w,m,md)){ add(th.ic,th.t,th.d,th.kw); break; } } }
  var ST=SEASON_TH[m]||[]; for(var k=0;k<ST.length;k++){ var st=ST[(dn+k)%ST.length]; if(add("🗓️",st[0],st.slice(1).join("·")+" 챙기세요",st.slice(1))&&!all) break; }
  return all?out:out.slice(0,2);
}
/* 오늘 같은 날 필요한 것 더 보기(2026-10-22 시온님): 이번 달 테마 전부 + 검색 결과 전부 */
function seasonView(){
  var T=wxThemes(true), w=seed.weather;
  if(!T.length) return '<div class="pg"><div class="empty sm"><b>지금은 준비된 상품이 없어요</b></div></div>';
  return '<div class="pg"><h1>오늘 같은 날 필요한 것</h1><p class="pgsub">날씨와 계절에 맞춰 매일 아침 쿠팡 검색 결과로 골라요</p>'+T.map(function(t){ return '<section class="sec tossec wxsec"><p class="wxt"><span>'+t.ic+'</span><b>'+esc(t.t)+'</b> · '+esc(t.d)+'</p><div class="tgrid">'+t.L.map(tossCard).join("")+'</div></section>'; }).join("")+
    '<p class="wxsrc">'+(w&&w.src?'날씨 정보: '+esc(w.src)+' · ':'')+'쿠팡 검색 결과 · 가격은 바뀔 수 있어요</p><a class="morebig" href="#/deals">🔥 다른 특가는 <b>특가 탭</b>에서 볼 수 있어요 ›</a></div>';
}
function wxSection(){
  var T=wxThemes(); if(!T.length) return "";
  var w=seed.weather;
  return '<section class="sec tossec wxsec"><div class="sh"><h2>오늘 같은 날 필요한 것</h2><a class="hmore" href="#/season">더 보기 ›</a></div>'+T.map(function(t){ return '<p class="wxt"><span>'+t.ic+'</span><b>'+esc(t.t)+'</b> · '+esc(t.d)+'</p><div class="tgrid">'+t.L.map(tossCard).join("")+'</div>'; }).join("")+
    (T.wx?'':'')+'<p class="wxsrc">'+(w&&w.src?'날씨 정보: '+esc(w.src)+' · ':'')+'쿠팡 검색 결과</p>'+'</section>';
}
function dealsView(){
  var h=slideBanners(false,dealSlides())+'<div class="pg"><h1>오늘의 특가 🔥</h1>'+cheapBtn()+shopBtn()+dealSearch()+topDealsHtml()+groceryDeal()+wxSection()+recentDeals();
  h+=goldSec();
  h+=cpBanner();
  if(ADS.length){
    h+='<section class="sec"><div class="sh"><h2>🛍️ 특가 모아보기</h2></div><div class="hs">'+
      ADS.map(function(a){ var u=safeUrl(a.u); if(!u) return ""; var im=safeUrl(a.img); return '<a class="acard" '+ext(u)+'><span class="am'+(im?' amp':'')+'" style="background:'+esc(a.c||"#f4f0ff")+'">'+(im?'<img src="'+esc(im)+'" alt="" loading="lazy" referrerpolicy="no-referrer"'+(a.pos&&/^[0-9% ]+$/.test(a.pos)?' style="object-position:'+a.pos+'"':'')+' onerror="this.remove()">':esc(a.e||"🎁"))+'</span><b>'+(im&&a.e?esc(a.e)+' ':'')+esc(a.t)+'</b><small>'+esc(a.d||"")+'</small></a>'; }).join("")+'</div></section>';
  }
  h+=openrunCard();
  h+=partnerRows();
  var TOSS=(Array.isArray(seed.toss)?seed.toss:[]).filter(function(x){ return safeUrl(x.u) && !(x.endAt && Date.parse(x.endAt)<=Date.now()); });
  (function(){ var mx=-1,bi=-1; TOSS.forEach(function(x,i){ x.best=false; var r=parseInt(x.rate,10); if(!x.soldOut&&r>mx){ mx=r; bi=i; } }); if(bi>=0) TOSS[bi].best=true; })();
  h+='<div id="babyhd">'+hotDeal()+'</div>';
  h+='<div id="lifehd">'+lifeHot()+'</div>';
  if(TOSS.length) h+='<section class="sec tossec" id="toss"><div class="sh"><h2>🛒 오늘의 하루특가</h2>'+(seed.tossUpdated?'<span class="upd">'+esc(String(seed.tossUpdated).slice(11))+' 기준</span>':'')+'</div><p class="cd tcdh">⏳ 밤 12시 교체까지 <b id="tossd">'+hms(msToMidnight())+'</b> 남음</p><div class="tgrid">'+TOSS.slice(0,10).sort(byPrice).map(tossCard).join("")+'</div></section>';
  /* 오늘 많이 사는 쿠팡 인기템(moreDealsSec)은 2026-10-22 시온님 요청으로 뺌 → 골드박스 전체가 끝없이 이어짐 */
  h+='<a class="kakaobox sm" '+ext(kakaoUrl())+'><span><small>다꾸 <i>×</i> 카카오톡</small><b>🔔 새 특가 열리면 <em>가장 먼저 알려드려요!</em></b></span><span class="kg">알림 받기</span></a>';
  h+='<p class="fine">특가 링크는 제휴 링크로, 구매 시 다꾸가 수수료를 받을 수 있어요. 가격과 할인은 판매처 사정에 따라 바뀔 수 있어요.</p>';
  return h+'</div>';
}
/* 특가 탭 끝없는 목록 (골드박스 나머지 + 카테고리 베스트, 쿠팡 공식 API) */
var MDEAL={L:[],i:0,obs:null};
/* 오늘이 제일 싸요(2026-10-22 시온님 "10개만 나와, 인기템 지우고 골드박스로"): API 골드박스 + 골드박스 화면 카드 전체(goldAll) + 나머지 골드박스, 가격 낮은 순으로 12개씩 이어 붙임 */
function goldList(){ var seen={}, out=[]; liveGold().concat((Array.isArray(seed.goldAll)?seed.goldAll:[]),(Array.isArray(seed.moreDeals)?seed.moreDeals:[]).filter(function(x){ return x.k==="골드박스"; })).forEach(function(x){ if(!safeUrl(x.u)||(x.endAt&&Date.parse(x.endAt)<=Date.now())) return; var k=String(x.name||"").slice(0,14); if(seen[k]||seen[x.u]) return; seen[k]=seen[x.u]=1; out.push(x); }); return out.sort(byPrice); }
function goldSec(){
  MDEAL.L=goldList(); MDEAL.i=0; if(!MDEAL.L.length) return "";
  return '<section class="sec tossec" id="gold"><div class="sh"><h2>⏰ 오늘의 골드박스 특가</h2>'+(seed.goldboxUpdated?'<span class="upd">'+esc(seed.goldboxUpdated)+' 기준</span>':'')+'</div><p class="cd" style="margin:-6px 4px 10px">특가 종료까지 <b id="gbcd">'+clock(nextSeven())+'</b> · 골드박스 '+MDEAL.L.length+'개</p><p class="prnote">가격·할인율은 수집 시점 기준이라 쿠팡에서 다를 수 있어요.</p><div class="tgrid" id="mdfeed"></div><div id="mdsent" style="height:1px"></div></section>';
}
function moreDealsSec(){
  var shown={}; liveGold().concat(liveToss(),babyDeals(),lifeDeals()).forEach(function(x){ if(x.u) shown[x.u]=1; });
  MDEAL.L=(Array.isArray(seed.moreDeals)?seed.moreDeals:[]).filter(function(x){ return safeUrl(x.u)&&!shown[x.u]&&!(x.endAt&&Date.parse(x.endAt)<=Date.now()); }).sort(byPrice);
  MDEAL.i=0; if(!MDEAL.L.length) return "";
  return '<section class="sec tossec" id="moredeal"><div class="sh col"><h2>🛍️ 오늘 많이 사는 쿠팡 인기템</h2><p class="cd">골드박스·카테고리 베스트를 계속 보여드려요</p></div><div class="tgrid" id="mdfeed"></div><div id="mdsent" style="height:1px"></div></section>';
}
function mdealCard(x){ var y={name:x.name,u:x.u,img:x.img,price:x.price,orig:x.orig,rate:x.rate?String(x.rate).replace(/%$/,"")+"%":"",rocket:x.rocket,endAt:x.endAt,badge:x.k&&x.k!=="골드박스"?x.k+" 베스트":""}; return tossCard(y); }
function mdealMore(){ var g=document.getElementById("mdfeed"); if(!g||MDEAL.i>=MDEAL.L.length) return false; var n=MDEAL.L.slice(MDEAL.i,MDEAL.i+12); MDEAL.i+=n.length; g.insertAdjacentHTML("beforeend",n.map(mdealCard).join("")); return true; }
function initMoreDeals(){
  if(MDEAL.obs){ MDEAL.obs.disconnect(); MDEAL.obs=null; }
  var s=document.getElementById("mdsent"); if(!s) return; mdealMore();
  if(!("IntersectionObserver" in window)){ while(mdealMore()); return; }
  MDEAL.obs=new IntersectionObserver(function(es){ if(!es.some(function(e){ return e.isIntersecting; })) return; if(!mdealMore()){ MDEAL.obs.disconnect(); MDEAL.obs=null; return; } MDEAL.obs.unobserve(s); MDEAL.obs.observe(s); },{rootMargin:"900px 0px"});
  MDEAL.obs.observe(s);
}
function clock(ms){ var x=Math.max(0,Math.floor(ms/1000)); return ("0"+Math.floor(x/3600)).slice(-2)+":"+("0"+Math.floor(x%3600/60)).slice(-2)+":"+("0"+x%60).slice(-2); }
var tickT; function tick(){ clearInterval(tickT); tickT=setInterval(function(){ var orE=document.querySelector("[data-or]"); if(orE) orE.innerHTML=orText(orState()); var ms=msToMidnight(), e=document.getElementById("cd"); if(e) e.textContent=hms(nextSeven()); var c=clock(ms); [].forEach.call(document.querySelectorAll("[data-cd]"),function(el){ el.textContent="⏰ "+c; }); [].forEach.call(document.querySelectorAll("[data-cdl]"),function(el){ el.textContent=c+" 남음"; }); [].forEach.call(document.querySelectorAll("[data-cdx]"),function(el){ el.textContent=c; }); [].forEach.call(document.querySelectorAll("[data-dcd]"),function(el){ el.textContent=dcdText(el.getAttribute("data-dcd")); }); [].forEach.call(document.querySelectorAll("[data-edl]"),function(el){ var h=dlTiles(el.getAttribute("data-edl")); if(el.innerHTML!==h) el.innerHTML=h; }); [].forEach.call(document.querySelectorAll("[data-end]"),function(el){ el.textContent=endLeft(el.dataset.end); }); var td2=document.getElementById("tossd"); if(td2) td2.textContent=hms(ms); var g=document.getElementById("gbcd"); if(g) g.textContent=clock(nextSeven()); var st=document.getElementById("stripcd"); if(st) st.textContent=c; [].forEach.call(document.querySelectorAll("[data-hd]"),function(el){ el.textContent=clock(nextSeven()); }); [].forEach.call(document.querySelectorAll("[data-mid]"),function(el){ el.textContent=c; }); },1000); }

/* ---------- 이벤트 ---------- */
function onClick(e){
  var lk=e.target.closest("article a[target=_blank]"); if(lk){ var art=lk.closest("article"), fb=art&&art.querySelector("[data-fav]"); if(fb) markSeen(fb.dataset.fav); }
  var t=e.target.closest("[data-fopen],[data-fdel],[data-fav],[data-cat],[data-status],[data-view],[data-share],[data-pref-clear],[data-focus],[data-spin],[data-copy],[data-ishare],[data-tshare]"); if(!t) return;
  if(t.dataset.tshare){ e.preventDefault(); e.stopPropagation(); shareToss(t.dataset.tshare); return; }
  if(t.dataset.ishare){ e.preventDefault(); shareItem(t.dataset.ishare); return; }
  if(t.dataset.spin!==undefined){ doSpin(t); return; }
  if(t.dataset.copy){ try{ navigator.clipboard.writeText(t.dataset.copy).then(function(){ toast("코드를 복사했어요"); }); }catch(err){ toast(t.dataset.copy); } return; }
  if(t.dataset.fav!==undefined){ e.preventDefault(); toggleFav(t.dataset.fav); var on=isFav(t.dataset.fav); [].forEach.call(document.querySelectorAll('[data-fav="'+t.dataset.fav+'"]'),function(b){ b.classList.toggle("on",on); b.setAttribute("aria-pressed",on); }); toast(on?"❤️ 찜했어요":"🤍 찜을 해제했어요"); if(state.tab==="fav") render(); return; }
  if(t.dataset.fopen){ fOpen(t.dataset.fopen); return; }
  if(t.dataset.fdel){ var fa=t.dataset.fdel.split("|"), F=curF(); if(fa[0]==="pet") F.pet=""; else fToggle(F,fa[0],fa[1]); fApply(F); return; }
  if(t.dataset.cat){ state.cat=t.dataset.cat; state.regions=[]; if(state.status==="closed") state.status="open"; saveUi(); render(); return; }
  if(t.dataset.status){ state.status=t.dataset.status; saveUi(); [].forEach.call(document.querySelectorAll("[data-status]"),function(b){ b.classList.toggle("on",b===t); }); renderListGrid(); return; }
  if(t.dataset.view!==undefined){ state.view=state.view==="2"?"3":(state.view==="3"?"1":"2"); ls("dakku-view",state.view); var g=document.getElementById("grid"); if(g) g.className="grid v"+state.view; t.innerHTML=viewIcon(); t.setAttribute("aria-label","보기 방식 바꾸기 (지금 "+state.view+"단)"); renderListGrid(); return; }
  if(t.dataset.share!==undefined){ share(); return; }
  if(t.dataset.prefClear!==undefined){ PREF=""; ls("dakku-pref",""); delete WANT.regions; saveWant(); render(); return; }
  if(t.dataset.focus){ setTimeout(function(){ var q=document.getElementById("q"); if(q) q.focus(); },60); }
}
function share(){
  var data={title:SITE,text:"전국 숙박 체험단이랑 오늘의 특가를 한곳에서 봐요!",url:location.origin+location.pathname};
  if(navigator.share){ navigator.share(data).catch(function(){}); return; }
  try{ navigator.clipboard.writeText(data.url).then(function(){ toast("링크를 복사했어요. 친구에게 붙여넣어 보내세요!"); }); }catch(e){ toast(data.url); }
}
function shareItem(id){
  var it=seed.items.filter(function(x){ return String(x.id)===String(id); })[0]; if(!it) return;
  var s=statusOf(it), url=location.origin+"/s/"+encodeURIComponent(id)+".html";
  var text=((catMeta(catOf(it))||{}).em||"🎁")+" "+it.name+(it.region?" ("+it.region+")":"")+(it.worth?"\n💰 "+it.worth+" 상당":"")+"\n🗓️ "+s.dday+" · 다꾸 체험단 모음에서 봤어요!";
  if(navigator.share){ navigator.share({title:it.name,text:text,url:url}).catch(function(){}); return; }
  var all=text+"\n"+url;
  try{ navigator.clipboard.writeText(all).then(function(){ toast("✈️ 링크를 복사했어요. 친구에게 붙여넣어 보내세요!"); }).catch(function(){ prompt("아래 링크를 복사해 친구에게 보내세요",url); }); }catch(e){ toast(url); }
}
function shareToss(code){
  var x=(seed.toss||[]).filter(function(y){ return tossCode(y)===code; })[0]; if(!x) return;
  var url=location.origin+"/t/"+encodeURIComponent(code)+".html";
  var text="🛒 "+x.name+(x.price?"\n🔥 "+(x.rate?x.rate+" ":"")+x.price:"")+"\n⏰ 오늘의 하루특가 · 다꾸 체험단 모음에서 봤어요!";
  if(navigator.share){ navigator.share({title:x.name,text:text,url:url}).catch(function(){}); return; }
  try{ navigator.clipboard.writeText(text+"\n"+url).then(function(){ toast("✈️ 링크를 복사했어요. 친구에게 붙여넣어 보내세요!"); }).catch(function(){ prompt("아래 링크를 복사해 친구에게 보내세요",url); }); }catch(e){ toast(url); }
}
document.addEventListener("change",function(e){ if(e.target&&e.target.id==="sort"){ state.sort=e.target.value; e.target.style.width=sortW(state.sort)+"px"; saveUi(); renderListGrid(); } });
/* 카드 아무 곳이나 누르면 상세 페이지(링크·버튼 제외) — 2026-10-18 */
document.addEventListener("click",function(e){ var t=e.target; if(!t||!t.closest||t.closest("a,button,input,label,select")) return; var art=t.closest("article.card,article.mini,article.hc"); if(!art) return; var a=art.querySelector('a[href^="#/item?id="]'); if(a) location.hash=a.getAttribute("href").slice(1); });
document.addEventListener("click",function(e){ var b=e.target&&e.target.closest&&e.target.closest("[data-sortcomp]"); if(!b) return; state.sort="comp"; saveUi(); var s=document.getElementById("sort"); if(s) s.value="comp"; renderListGrid(); var g=document.getElementById("grid"); if(g) g.scrollIntoView({behavior:"smooth",block:"start"}); });
function apNote(){ if(!seed.apAt) return ''; var d=new Date(seed.apAt); if(isNaN(d)) return '';
  return '<p class="apnote">경쟁률은 '+(d.getMonth()+1)+'/'+d.getDate()+' '+d.getHours()+'시 기준이에요. 각 체험단 사이트에서 직접 확인한 숫자이고, 지금은 더 늘었을 수 있어요.</p>'; }
/* ---------- 신청하기 팝업 · 신청한 체험단 ---------- */
var APPLIED=[]; try{ APPLIED=JSON.parse(ls("dakku-applied")||"[]")||[]; }catch(e){ APPLIED=[]; }
function markApplied(id){ var i=APPLIED.indexOf(id); if(i>=0) APPLIED.splice(i,1); APPLIED.unshift(id); APPLIED=APPLIED.slice(0,50); ls("dakku-applied",JSON.stringify(APPLIED)); }
function applyPopup(it){
  var url=safeUrl(it.refUrl||it.applyUrl); if(!url) return;
  var old=document.querySelector(".modal.applym"); if(old) old.remove();
  var src=it.source||"체험단";
  var wrap=document.createElement("div"); wrap.className="modal applym"; wrap.setAttribute("role","dialog"); wrap.setAttribute("aria-modal","true"); wrap.setAttribute("aria-label",src+" 홈페이지로 이동");
  wrap.innerHTML='<div class="sheet"><button class="mx" data-m="x" aria-label="닫기">'+ico(I.x)+'</button><div class="mlogo">'+logoSvg(40)+'</div>'+
    '<h2>['+esc(src)+'] 홈페이지로<br>이동해요👀</h2><p>한번만 로그인 해두면<br>편하게 신청 가능해져요.</p>'+
    (payOf(it).indexOf("payback")>=0?'<div class="paynote"><b>💳 선정 후 구매하는 페이백 상품이에요</b><span>['+esc(src)+']에서 당첨 후 안내에 따라 진행하세요. 선정 전에 먼저 구매하면 페이백을 받지 못할 수 있어요.</span></div>':'')+
    '<p class="apnote">✅ 신청하신 체험단은<br><a href="#/my" data-m="x" data-jump="applied">다꾸체험단 마이페이지</a>에서 확인하실 수 있어요.</p>'+
    '<a class="b pri wide" data-m="go" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(src)+'에서 신청하기 ↗</a>'+
    '<button class="b sec wide" data-m="x" style="margin-top:8px">닫기</button></div>';
  function close(){ wrap.remove(); document.removeEventListener("keydown",esck); }
  function esck(e){ if(e.key==="Escape") close(); }
  wrap.addEventListener("click",function(e){
    if(e.target===wrap) return close();
    var b=e.target.closest("[data-m]"); if(!b) return;
    if(b.dataset.m==="go"){ markApplied(it.id); setTimeout(close,300); return; }
    if(b.dataset.m==="x") close();
  });
  document.addEventListener("keydown",esck);
  document.body.appendChild(wrap);
  var g=wrap.querySelector('[data-m="go"]'); if(g) g.focus();
}
document.addEventListener("click",function(e){
  var a=e.target.closest("a[data-apply]"); if(!a) return;
  var it=seed.items.filter(function(x){ return x.id===a.dataset.apply; })[0]; if(!it) return;
  e.preventDefault(); e.stopPropagation(); applyPopup(it);
},true);
/* ---------- 웹 푸시 알림 (아침 오늘 오픈 · 점심 특가 · 저녁 오늘 마감) ---------- */
function pushKey(){ return (seed.push||{}).vapid||""; }
function pushOk(){ return !!(pushKey()&&authCfg()&&"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window); }
function isIOS(){ return /iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1); }
function isStandalone(){ return (window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true; }
function pushOn(){ return ls("dakku-push")==="1"&&("Notification" in window)&&Notification.permission==="granted"; }
function b64u(s){ var p="=".repeat((4-s.length%4)%4), r=atob((s+p).replace(/-/g,"+").replace(/_/g,"/")), a=new Uint8Array(r.length); for(var i=0;i<r.length;i++) a[i]=r.charCodeAt(i); return a; }
function pushRpc(fn,body){ var a=authCfg(); return fetch(a.url+"/rest/v1/rpc/"+fn,{method:"POST",headers:{apikey:a.key,Authorization:"Bearer "+a.key,"Content-Type":"application/json"},body:JSON.stringify(body)}); }
function pushSheet(html){
  var old=document.querySelector(".modal.pushm"); if(old) old.remove();
  var w=document.createElement("div"); w.className="modal pushm applym"; w.setAttribute("role","dialog"); w.setAttribute("aria-modal","true");
  w.innerHTML='<div class="sheet"><button class="mx" data-m="x" aria-label="닫기">'+ico(I.x)+'</button><div class="mlogo">'+logoSvg(40)+'</div>'+html+'<button class="b sec wide" data-m="x" style="margin-top:8px">닫기</button></div>';
  w.addEventListener("click",function(e){ if(e.target===w||e.target.closest('[data-m="x"]')) w.remove(); });
  document.body.appendChild(w);
}
var PUSH_INFO='<ul class="lgben"><li>☀️ 아침: 오늘 오픈한 체험단</li><li>🍱 점심: 오늘의 특가</li><li>🌙 저녁: 오늘 마감 체험단</li></ul>';
function enablePush(){
  if(isIOS()&&!isStandalone()){ pushSheet('<h2>아이폰은 홈 화면에<br>추가해야 알림이 와요 📲</h2>'+PUSH_INFO+'<p class="apnote">① 사파리 아래 <b>공유 버튼(□↑)</b>을 누르고<br>② <b>홈 화면에 추가</b>를 누른 뒤<br>③ 홈 화면의 <b>다꾸</b> 아이콘으로 열어서 다시 <b>알림 받기</b>를 눌러 주세요.</p>'); return; }
  if(!pushOk()){ pushSheet('<h2>이 브라우저는 알림을<br>지원하지 않아요 😢</h2><p>크롬이나 삼성 인터넷, 아이폰은 사파리에서 열어 주세요.</p>'); return; }
  Notification.requestPermission().then(function(p){
    if(p!=="granted"){ pushSheet('<h2>알림이 꺼져 있어요</h2><p>휴대폰 설정 → 알림에서 브라우저(또는 다꾸) 알림을 허용한 뒤 다시 눌러 주세요.</p>'); return; }
    return navigator.serviceWorker.ready.then(function(reg){
      return reg.pushManager.getSubscription().then(function(old){
        var nk=b64u(pushKey()), same=false;
        try{ var ok=old&&old.options&&old.options.applicationServerKey; if(ok){ var a=new Uint8Array(ok); same=a.length===nk.length&&a.every(function(v,i){ return v===nk[i]; }); } }catch(e){}
        if(old&&same) return old;
        return (old?old.unsubscribe():Promise.resolve()).then(function(){ return reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:nk}); });
      });
    }).then(function(sub){
      var j=sub.toJSON(); return pushRpc("push_subscribe",{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth,p_ua:navigator.userAgent.slice(0,200)});
    }).then(function(r){
      if(!r||!r.ok) throw new Error("save");
      ls("dakku-push","1"); ls("dakku-push-key",pushKey()); try{ localStorage.removeItem("dakku-push-favs"); }catch(e){} pushFavSync(); render();
      pushSheet('<h2>알림을 켰어요 🔔</h2>'+PUSH_INFO+'<button class="b pri wide" data-pushpref>🔍 관심 지역·단어도 설정하기</button><p class="apnote">마이 다꾸에서 언제든 바꾸거나 끌 수 있어요.</p>');
    });
  }).catch(function(){ pushSheet('<h2>알림 켜기에 실패했어요</h2><p>잠시 뒤 다시 눌러 주세요.</p>'); });
}
function disablePush(){
  navigator.serviceWorker.ready.then(function(reg){ return reg.pushManager.getSubscription(); }).then(function(sub){
    if(!sub) return; var ep=sub.endpoint; return sub.unsubscribe().then(function(){ return pushRpc("push_unsubscribe",{p_endpoint:ep}); });
  }).catch(function(){}).then(function(){ try{ localStorage.removeItem("dakku-push"); }catch(e){} render(); });
}
function pushPref(){ try{ var p=JSON.parse(ls("dakku-push-pref")||"{}"); return {regions:p.regions||[],words:p.words||[]}; }catch(e){ return {regions:[],words:[]}; } }
function pushPrefText(){ var p=pushPref(), t=p.regions.concat(p.words.map(function(w){ return "‘"+w+"’"; })); return t.length?t.join(" · "):"설정 안 함"; }
function pushPrefSheet(){
  var p=pushPref();
  pushSheet('<h2>관심 지역·단어 알림 🔍</h2><p>새 체험단 중 고른 지역이나 단어가 들어간 게 올라오면 따로 알려드려요.</p>'+
    '<form id="ppform" style="text-align:left"><span class="fl">관심 지역 (숙박)</span>'+chipChecks("pr",REGIONS.map(function(x){ return [x,x]; }),p.regions)+
    '<span class="fl">관심 단어 <small>(쉼표로 구분, 최대 10개)</small></span><input class="ppw" name="pw" maxlength="120" placeholder="예: 풀빌라, 가평, 유모차, 카시트" value="'+esc(p.words.join(", "))+'">'+
    '<button class="b pri wide" type="submit" style="margin-top:12px">저장하기</button></form>');
  var f=document.getElementById("ppform"); if(!f) return;
  f.addEventListener("change",function(e){ var l=e.target.closest&&e.target.closest(".rck"); if(l) l.classList.toggle("on",e.target.checked); });
  f.addEventListener("submit",function(e){
    e.preventDefault();
    var regs=[].map.call(f.querySelectorAll('input[name=pr]:checked'),function(i){ return i.value; });
    var words=f.pw.value.split(/[,，\n]/).map(function(w){ return w.trim(); }).filter(Boolean).slice(0,10);
    navigator.serviceWorker.ready.then(function(reg){ return reg.pushManager.getSubscription(); }).then(function(sub){
      if(!sub) throw new Error("nosub");
      return pushRpc("push_prefs",{p_endpoint:sub.endpoint,p_regions:regs,p_words:words});
    }).then(function(r){
      if(!r||!r.ok) throw new Error("save");
      ls("dakku-push-pref",JSON.stringify({regions:regs,words:words})); render();
      pushSheet('<h2>저장했어요 ✅</h2><p>'+esc(regs.concat(words.map(function(w){ return "‘"+w+"’"; })).join(" · ")||"관심 지역·단어 없음")+'</p><p class="apnote">새 체험단에 맞는 게 올라오면 알려드려요.</p>');
    }).catch(function(){ pushSheet('<h2>저장에 실패했어요</h2><p>알림을 먼저 켠 뒤 다시 저장해 주세요.</p>'); });
  });
}
/* 찜한 체험단 마감 알림용: 찜 목록을 알림 구독에 같이 저장(바뀌었을 때만, 2026-10-17) */
var pushFavT=0;
/* 찜한 숙소·제품이 체험단을 다시 열면 알리려고, 찜 id 와 함께 숙소·제품 열쇠("k:쿠팡상품번호" 또는 이름)를 보낸다(2026-10-18). 열쇠는 이 기기에 기억해 둬서 체험단이 목록에서 내려가도 남는다 */
function favKey(it){ var m=String(it.cpUrl||"").match(/products\/(\d+)/); return it.coupangPid?String(it.coupangPid):(m?m[1]:String(it.name||"").replace(/\s*\([^)]*\)\s*$/,"").replace(/\s+/g,"")); }
function favPayload(){
  var K={}; try{ K=JSON.parse(ls("dakku-fav-keys")||"{}")||{}; }catch(e){ K={}; }
  var by={}; (seed.items||[]).forEach(function(it){ by[it.id]=it; });
  var ids=FAV.slice(-150), keep={}; ids.forEach(function(id){ var it=by[id]; var k=it?favKey(it):K[id]; if(k) keep[id]=k; });
  ls("dakku-fav-keys",JSON.stringify(keep));
  var ks=[]; ids.forEach(function(id){ var k="k:"+keep[id]; if(keep[id]&&ks.indexOf(k)<0) ks.push(k); });
  return ids.concat(ks);
}
function pushFavSync(){
  clearTimeout(pushFavT); pushFavT=setTimeout(function(){
    if(!pushOn()||!pushOk()) return; var P=favPayload(), v=JSON.stringify(P); if(ls("dakku-push-favs")===v) return;
    navigator.serviceWorker.ready.then(function(reg){ return reg.pushManager.getSubscription(); }).then(function(sub){
      if(!sub) return; return pushRpc("push_favs",{p_endpoint:sub.endpoint,p_favs:P}).then(function(r){ if(r.ok) ls("dakku-push-favs",v); });
    }).catch(function(){});
  },1200);
}
function pushRefresh(){ // 알림 키가 바뀌었으면 조용히 다시 구독
  if(!pushOn()||!pushOk()) return; if(ls("dakku-push-key")===pushKey()){ pushFavSync(); return; }
  navigator.serviceWorker.ready.then(function(reg){ return reg.pushManager.getSubscription().then(function(old){ return (old?old.unsubscribe():Promise.resolve()).then(function(){ return reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(pushKey())}); }); }); })
    .then(function(sub){ var j=sub.toJSON(), p=pushPref(); return pushRpc("push_subscribe",{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth,p_ua:navigator.userAgent.slice(0,200)}).then(function(r){ if(r.ok){ ls("dakku-push-key",pushKey()); if(p.regions.length||p.words.length) pushRpc("push_prefs",{p_endpoint:j.endpoint,p_regions:p.regions,p_words:p.words}); try{ localStorage.removeItem("dakku-push-favs"); }catch(e){} pushFavSync(); } }); }).catch(function(){});
}
function favPushBox(){ // 찜 화면: 찜 마감 알림 켜기(2026-10-17 시온님 요청)
  if(!pushKey()||!authCfg()) return "";
  return pushOn()?'<div class="pushbox on"><span><b>🔔 찜 알림 켜짐</b><small>마감 전날·당일, 같은 곳이 다시 모집하면 알려드려요</small></span><span class="pbb"><button class="b sec" data-pushoff>끄기</button></span></div>'
    :'<div class="pushbox"><span><b>⏰ 찜한 체험단 알림</b><small>마감 전날·당일, 같은 곳이 다시 모집할 때 알려드려요</small></span><button class="b pri" data-pushon>알림 설정하기</button></div>';
}
function pushBox(){
  if(!pushKey()||!authCfg()) return "";
  return pushOn()?'<div class="pushbox on"><span><b>🔔 앱 알림 켜짐</b><small>아침 오늘 오픈 · 점심 특가 · 저녁 오늘 마감 · ❤️ 찜 마감</small><small>🔍 관심: '+esc(pushPrefText())+'</small></span><span class="pbb"><button class="b pri" data-pushpref>관심 설정</button><button class="b sec" data-pushoff>끄기</button></span></div>'
    :'<div class="pushbox"><span><b>📲 앱 알림 받기</b><small>아침 오늘 오픈 · 점심 특가 · 저녁 오늘 마감</small></span><button class="b pri" data-pushon>알림 받기</button></div>';
}
document.addEventListener("click",function(e){
  var t=e.target.closest("[data-pushon],[data-pushoff],[data-pushpref]"); if(!t) return; e.preventDefault();
  if(t.hasAttribute("data-pushon")) enablePush(); else if(t.hasAttribute("data-pushpref")) pushPrefSheet(); else disablePush();
});
function appliedSection(){
  var byId={}; seed.items.forEach(function(it){ byId[it.id]=it; });
  var list=APPLIED.map(function(id){ return byId[id]; }).filter(Boolean);
  if(!list.length) return '<section class="hsec" id="applied"><div class="hsh"><h2>✅ <em>신청한</em> 체험단</h2></div><p class="mysub" style="padding:0 16px">체험단 \'신청하기\'로 이동하면 여기에 모아드려요. (이 기기 기준)</p></section>';
  return '<section class="hsec" id="applied"><div class="hsh"><h2>✅ <em>신청한</em> 체험단</h2></div><div class="hs">'+list.slice(0,30).map(hcard).join("")+'</div></section>';
}
var toastT;
function toast(msg){ var t=document.querySelector(".toast"); if(!t){ t=document.createElement("div"); t.className="toast"; t.setAttribute("role","status"); document.body.appendChild(t);} t.textContent=msg; clearTimeout(toastT); toastT=setTimeout(function(){ t.remove(); },2400); }

/* ---------- 취향 묻기 (40초 머물면 한 번) ---------- */
function prefPopup(){
  if(ls("dakku-want-asked") || WANT.cat) return;
  if(document.querySelector(".modal")) return;
  ls("dakku-want-asked","1");
  var pick={regions:[],ages:[]}, step=1;
  var CHOICES=[["stay","🏨","숙박 체험단"],["baby","👶","육아 체험단"],["life","🧺","생활용품"],["beauty","💄","뷰티제품"],["elec","🔌","가전/가구"],["health","💊","건강식품"],["pet","🐾","반려동물"],["fashion","👗","패션"],["etc","🎟️","티켓"]];
  var wrap=document.createElement("div"); wrap.className="modal"; wrap.setAttribute("role","dialog"); wrap.setAttribute("aria-modal","true"); wrap.setAttribute("aria-label","기다리는 체험단 선택");
  function head(t,sub){ return '<button class="mx" data-m="x" aria-label="닫기">'+ico(I.x)+'</button><div class="mlogo">'+logoSvg(40)+'</div><h2>'+t+'</h2><p>'+sub+'</p>'; }
  function draw(){
    var h='<div class="sheet">';
    if(step===1){
      h+=head("어떤 체험단<br>기다리고 계세요?","골라주시면 다음부터 맨 앞에 모아드릴게요!")+'<div class="wgrid">'+CHOICES.map(function(c){
        var n=isOpenCat(c[0])?openItems(c[0]).length:0;
        return '<button class="wopt'+(pick.cat===c[0]?' on':'')+'" data-m="cat" data-v="'+c[0]+'"><span class="we">'+c[1]+'</span><b>'+c[2]+'</b><small>'+(n?n+'곳 모집 중':'곧 열려요')+'</small></button>';
      }).join("")+'</div><button class="b pri wide" data-m="next"'+(pick.cat?'':' disabled')+'>다음</button>';
    } else if(step===2 && pick.cat==="stay"){
      var cnt={}; openItems("stay").forEach(function(it){ cnt[it.region]=(cnt[it.region]||0)+1; });
      h+=head("어느 지역 숙소를<br>찾고 계세요?","여러 곳 골라도 돼요! 고른 지역을 맨 앞에 모아드려요")+'<div class="rgrid">'+["전국"].concat(REGIONS).map(function(r){
        var n=r==="전국"?openItems("stay").length:(cnt[r]||0);
        return '<button class="ropt'+(pick.regions.indexOf(r)>=0?' on':'')+'" aria-pressed="'+(pick.regions.indexOf(r)>=0)+'" data-m="val" data-v="'+r+'"><b>'+(r==="전국"?"🇰🇷 전국":r)+'</b><small>'+n+'곳</small></button>';
      }).join("")+'</div><div class="wbtns"><button class="b sec" data-m="back">이전</button><button class="b pri" data-m="ok"'+(pick.regions.length?'':' disabled')+'>이걸로 모아주세요</button></div>';
    } else if(step===2 && pick.cat==="baby"){
      h+=head("아기가 몇 살이에요?","아이가 여럿이면 모두 골라주세요 👶")+'<div class="rgrid">'+AGES.map(function(a){
        return '<button class="ropt'+(pick.ages.indexOf(a)>=0?' on':'')+'" aria-pressed="'+(pick.ages.indexOf(a)>=0)+'" data-m="val" data-v="'+a+'"><b>'+a+'</b></button>';
      }).join("")+'</div><div class="wbtns"><button class="b sec" data-m="back">이전</button><button class="b pri" data-m="ok"'+(pick.ages.length?'':' disabled')+'>선택 완료</button></div>';
    } else {
      var c=CHOICES.filter(function(x){ return x[0]===pick.cat; })[0], open=isOpenCat(pick.cat);
      h+=head(c[1]+' '+c[2]+(open?' 먼저 보여드릴게요!':'<br>열리면 알려드릴게요!'),open?'홈 맨 위에 모아뒀어요.':(pick.ages.length?'아기 나이('+esc(pick.ages.join(", "))+')에 맞는 체험단부터 챙겨드릴게요.':'새 체험단이 열리면 카톡으로 가장 먼저 알려드려요.'))+
        (open?'':'<a class="b kakao wide" href="'+esc(kakaoUrl())+'" target="_blank" rel="noopener noreferrer" style="margin-bottom:8px">💬 카톡으로 알림 받기</a>')+'<button class="b '+(open?'pri':'sec')+' wide" data-m="x">확인</button>';
    }
    wrap.innerHTML=h+'</div>';
  }
  function finish(){
    WANT={cat:pick.cat}; if(pick.cat==="stay"){ var rs=pick.regions.filter(function(r){ return r!=="전국"; }); if(rs.length) WANT.regions=rs; } if(pick.cat==="baby" && pick.ages.length) WANT.ages=pick.ages.slice();
    saveWant(); render();
  }
  draw(); document.body.appendChild(wrap);
  wrap.addEventListener("click",function(e){
    var b=e.target.closest("[data-m]"); if(!b){ if(e.target===wrap) wrap.remove(); return; }
    var m=b.dataset.m;
    if(m==="x"){ wrap.remove(); return; }
    if(m==="cat"){ pick.cat=b.dataset.v; draw(); return; }
    if(m==="val"){ var v=b.dataset.v, arr=pick.cat==="stay"?pick.regions:pick.ages, i=arr.indexOf(v);
      if(i>=0) arr.splice(i,1); else { if(v==="전국") arr.length=0; else { var j=arr.indexOf("전국"); if(j>=0) arr.splice(j,1); } arr.push(v); }
      draw(); return; }
    if(m==="back"){ step=1; draw(); return; }
    if(m==="next"){ if(!pick.cat) return; if(pick.cat==="stay"||pick.cat==="baby"){ step=2; draw(); } else { finish(); step=3; draw(); } return; }
    if(m==="ok"){ finish(); if(pick.cat==="stay"){ wrap.remove(); toast((wantRegs().length?"📍 "+wantRegs().join("·"):"🏨 숙박")+" 체험단을 맨 앞에 모았어요"); window.scrollTo(0,0); } else { step=3; draw(); } return; }
  });
}

/* ---------- 최근 본 특가 (이 기기) ---------- */
var DSEEN=[]; try{ DSEEN=JSON.parse(ls("dakku-dseen")||"[]")||[]; }catch(e){ DSEEN=[]; }
function liveDealUrls(){ var m={}; liveGold().concat(liveToss(),babyDeals(),lifeDeals()).forEach(function(x){ if(x.u) m[x.u]=x; }); return m; }
function recentDeals(){
  var live=liveDealUrls(), L=DSEEN.filter(function(d){ return live[d.u]; }).slice(0,10);
  if(!L.length) return "";
  return '<section class="sec rdeal"><div class="sh"><h2>👀 내가 본 특가</h2></div><div class="hdr">'+L.map(function(d){ var x=live[d.u], img=safeUrl(x.img||d.img);
    return '<a class="hdi" '+ext(safeUrl(d.u))+'><span class="hdm">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'')+(x.rate?'<i>'+esc(String(x.rate).replace("%",""))+'%</i>':'')+'</span><span class="hdn">'+esc(x.name||d.n)+'</span><span class="hdp"><b>'+esc(x.price||"")+'</b></span></a>'; }).join("")+'</div></section>';
}
document.addEventListener("click",function(e){
  var j=e.target.closest("[data-jump]");
  if(j){ var el=document.getElementById(j.dataset.jump); if(el){ e.preventDefault(); el.scrollIntoView({behavior:"smooth",block:"start"}); } return; }
  var a=e.target.closest("a.tcard,a.hdi"); if(!a) return;
  var u=a.getAttribute("href")||""; if(!/^https?:/.test(u)) return;
  var q=function(sel){ var x=a.querySelector(sel); return x?x.textContent.trim():""; }, im=a.querySelector("img");
  DSEEN=DSEEN.filter(function(d){ return d.u!==u; }); DSEEN.unshift({u:u,n:q(".tn")||q(".hdn"),img:im?im.getAttribute("src"):""}); DSEEN=DSEEN.slice(0,20);
  ls("dakku-dseen",JSON.stringify(DSEEN));
},true);

/* ---------- 📷 최저가 확인 (마트 vs 쿠팡) ---------- */
function priceEntry(){ return '<a class="pentry" href="#/price"><span class="pe1">📷</span><span class="pe2"><b>마트에서 쿠팡가 3초 확인</b><small>바코드 찍고 어디가 더 싼지 바로 비교해요</small></span><span class="pe3">›</span></a>'; }
var PRICE={items:[],q:"",busy:false};
function priceView(){
  return '<div class="pg pricepg"><a class="back" href="#/deals">'+ico(I.back)+'<span>특가</span></a>'+
    '<div class="phero"><small>마트 · 공구 가격 비교</small><h1>📷 최저가 확인</h1><p>바코드를 찍거나 상품명을 넣으면<br><b>쿠팡 가격</b>과 바로 비교해 드려요.</p></div>'+
    '<div class="pbtns"><button class="b pri" data-pscan>📷 바코드 찍기</button><label class="b sec pfile">🖼️ 사진에서 찾기<input type="file" accept="image/*" capture="environment" data-pfile hidden></label></div>'+
    '<div id="pcam" class="pcam" hidden><div id="pcamv"></div><button class="b sec wide" data-pstop>닫기</button></div>'+
    '<form class="psearch" id="pform"><input id="pq" type="search" placeholder="상품명 예: 베베앙 물티슈 100매" autocomplete="off" value="'+esc(state.pq||"")+'"><button class="b pri" type="submit">검색</button></form>'+
    '<p class="pmsg" id="pmsg" role="status"></p>'+
    '<details class="pmart" id="pmart"><summary>🛒 마트·공구 가격도 넣으면 어디가 싼지 계산해요</summary>'+
      '<div class="pmrow"><label>가격<input id="mprice" type="number" inputmode="numeric" placeholder="예: 12900">원</label></div>'+
      '<div class="pmrow"><label>양<input id="mqty" type="number" inputmode="decimal" placeholder="예: 1000"></label><select id="munit"><option value="ea">개·매</option><option value="g">g</option><option value="ml">ml</option></select></div>'+
      '<p class="pmhelp">예) 물티슈 100매×10팩이면 1000 / 개·매, 우유 900ml×2개면 1800 / ml</p></details>'+
    '<div id="pres" class="pres"></div>'+
    '<p class="fine">쿠팡 가격은 조회 시점 기준이며 옵션·쿠폰에 따라 달라질 수 있어요. 구매 링크는 쿠팡 파트너스 제휴 링크로, 구매 시 다꾸가 수수료를 받을 수 있어요.</p></div>';
}
function parseQty(name){
  var t=String(name||"").replace(/,/g," ");
  var sh=t.match(/(\d+)\s*매/), rl=t.match(/(\d+)\s*롤/), w=t.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l|L)(?![a-zA-Z])/);
  var pk=1; (t.match(/(\d+)\s*(개|팩|입|봉|캔|병|박스|세트)(?![가-힣])/g)||[]).forEach(function(x){ var k=parseInt(x,10); if(k>pk&&k<1000) pk=k; });
  if(sh) return {total:+sh[1]*pk,unit:"ea"};
  if(rl) return {total:+rl[1]*(/팩/.test(t)?pk:1),unit:"ea"};
  if(w){ var v=parseFloat(w[1]), u=w[2].toLowerCase(); if(u==="kg"){ v*=1000; u="g"; } if(u==="l"){ v*=1000; u="ml"; } return {total:v*pk,unit:u}; }
  if(pk>1) return {total:pk,unit:"ea"};
  return null;
}
function unitLabel(u){ return u==="g"?"100g":(u==="ml"?"100ml":"1개·매"); }
function perUnit(price,q){ if(!q||!q.total) return null; var k=q.unit==="ea"?1:100; return price/q.total*k; }
function wonf(n){ return Math.round(n).toLocaleString("ko-KR")+"원"; }
function priceMsg(t){ var m=document.getElementById("pmsg"); if(m) m.innerHTML=t||""; }
function renderPrice(){
  var box=document.getElementById("pres"); if(!box) return;
  var L=PRICE.items||[]; if(!L.length){ box.innerHTML=""; return; }
  var mp=+((document.getElementById("mprice")||{}).value||0), mq=+((document.getElementById("mqty")||{}).value||0), mu=(document.getElementById("munit")||{}).value||"ea";
  var mart=(mp>0&&mq>0)?{price:mp,q:{total:mq,unit:mu}}:null, martPU=mart?perUnit(mart.price,mart.q):null;
  var rows=L.map(function(x){ var q=parseQty(x.name), pu=perUnit(+x.price,q); return {x:x,q:q,pu:pu}; });
  var best=null; rows.forEach(function(r){ if(r.pu!=null&&(!mart||r.q.unit===mart.q.unit)&&(best==null||r.pu<best)) best=r.pu; });
  box.innerHTML='<h2 class="ph2">🛒 쿠팡 검색 결과</h2>'+rows.map(function(r){
    var x=r.x, cmp="";
    if(mart&&r.pu!=null&&r.q.unit===mart.q.unit){ var d=(martPU-r.pu)/martPU*100; cmp=d>0.5?'<span class="pcmp win">쿠팡이 '+unitLabel(r.q.unit)+'당 '+Math.round(d)+'% 싸요</span>':(d<-0.5?'<span class="pcmp lose">마트가 '+Math.round(-d)+'% 더 싸요 👍</span>':'<span class="pcmp">가격이 거의 같아요</span>'); }
    var img=safeUrl(x.img);
    return '<a class="pitem" '+ext(safeUrl(x.url))+'>'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span class="pnoimg">🛒</span>')+'<span class="pinfo"><span class="pname">'+esc(x.name)+'</span><span class="pprice"><b>'+wonf(+x.price)+'</b>'+(x.rocket?' <i class="prk">로켓</i>':'')+'</span>'+(r.pu!=null?'<span class="punit'+(best!=null&&Math.abs(r.pu-best)<0.01?' best':'')+'">'+unitLabel(r.q.unit)+'당 '+wonf(r.pu)+(best!=null&&Math.abs(r.pu-best)<0.01?' · 제일 싸요':'')+'</span>':'')+cmp+'<span class="pbuy">쿠팡에서 보기 ›</span></span></a>';
  }).join("")+(mart&&martPU!=null?'<p class="pmart1">🛒 마트·공구: '+unitLabel(mu)+'당 <b>'+wonf(martPU)+'</b></p>':'');
}
function priceSearch(q){
  q=String(q||"").trim(); if(q.length<2){ priceMsg("상품명을 2글자 이상 넣어 주세요."); return; }
  var a=authCfg(); var i=document.getElementById("pq"); if(i) i.value=q;
  PRICE.q=q; PRICE.items=[]; renderPrice();
  var fallback=' <a href="https://www.coupang.com/np/search?q='+encodeURIComponent(q)+'" target="_blank" rel="noopener noreferrer">쿠팡에서 직접 보기 ›</a>';
  if(!a){ priceMsg("가격 조회 준비 중이에요."+fallback); return; }
  priceMsg("🔎 쿠팡 가격을 찾는 중…");
  fetch(a.url.replace(/\/$/,"")+"/functions/v1/coupang-search",{method:"POST",headers:{"Content-Type":"application/json",apikey:a.key},body:JSON.stringify({q:q})})
    .then(function(r){ return r.json().then(function(j){ return {ok:r.ok,j:j}; }); })
    .then(function(o){ if(!o.ok||!o.j.items){ priceMsg("😢 지금은 가격을 불러오지 못했어요."+fallback); return; }
      PRICE.items=o.j.items; priceMsg(o.j.items.length?'<b>"'+esc(q)+'"</b> 쿠팡 결과 '+o.j.items.length+'개 · 같은 상품을 골라 비교해 보세요':'검색 결과가 없어요. 이름을 짧게 바꿔 보세요.'+fallback); renderPrice(); })
    .catch(function(){ priceMsg("😢 지금은 가격을 불러오지 못했어요."+fallback); });
}
function barcodeToName(code){
  priceMsg("🔎 바코드 <b>"+esc(code)+"</b> 상품을 찾는 중…");
  return fetch("https://world.openfoodfacts.org/api/v2/product/"+encodeURIComponent(code)+".json?fields=product_name,product_name_ko,brands,quantity")
    .then(function(r){ return r.json(); }).then(function(j){ if(j&&j.status&&j.product){ var p=j.product; var n=[(p.brands||"").split(",")[0],p.product_name_ko||p.product_name,p.quantity].filter(Boolean).join(" ").trim(); if(n) return n; } return ""; }).catch(function(){ return ""; });
}
function gotBarcode(code){
  stopScan();
  barcodeToName(code).then(function(n){
    if(n) priceSearch(n);
    else { priceMsg("바코드 <b>"+esc(code)+"</b> 상품 정보가 아직 없어요 😢 포장에 적힌 <b>상품명</b>을 넣어 주세요."); var i=document.getElementById("pq"); if(i) i.focus(); }
  });
}
var QR=null;
function loadQr(cb){ if(window.Html5Qrcode){ cb(); return; } var s=document.createElement("script"); s.src="https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js"; s.onload=cb; s.onerror=function(){ priceMsg("카메라 도구를 불러오지 못했어요. 상품명으로 검색해 주세요."); }; document.head.appendChild(s); }
function qrFormats(){ var F=window.Html5QrcodeSupportedFormats; return F?[F.EAN_13,F.EAN_8,F.UPC_A,F.UPC_E,F.CODE_128]:undefined; }
function startScan(){
  loadQr(function(){
    var box=document.getElementById("pcam"); if(!box) return; box.hidden=false;
    try{ QR=new Html5Qrcode("pcamv",{formatsToSupport:qrFormats(),verbose:false}); }catch(e){ QR=new Html5Qrcode("pcamv"); }
    QR.start({facingMode:"environment"},{fps:10,qrbox:{width:260,height:140}},function(t){ gotBarcode(t); },function(){})
      .catch(function(){ box.hidden=true; priceMsg("카메라를 열 수 없어요. 카메라 권한을 허용하거나 <b>사진에서 찾기</b>를 써 주세요."); });
  });
}
function stopScan(){ var box=document.getElementById("pcam"); if(QR){ try{ QR.stop().then(function(){ QR.clear(); }).catch(function(){}); }catch(e){} QR=null; } if(box) box.hidden=true; }
function scanFile(f){
  loadQr(function(){
    var tmp=document.getElementById("pcamv"); var q=new Html5Qrcode("pcamv");
    priceMsg("🔎 사진에서 바코드를 찾는 중…");
    q.scanFile(f,false).then(function(t){ gotBarcode(t); }).catch(function(){ priceMsg("사진에서 바코드를 못 찾았어요 😢 바코드가 잘 보이게 다시 찍거나 <b>상품명</b>을 넣어 주세요."); });
  });
}
document.addEventListener("click",function(e){
  if(e.target.closest("[data-pscan]")){ e.preventDefault(); startScan(); }
  else if(e.target.closest("[data-pstop]")){ e.preventDefault(); stopScan(); }
});
document.addEventListener("change",function(e){ if(e.target.matches&&e.target.matches("[data-pfile]")&&e.target.files&&e.target.files[0]) scanFile(e.target.files[0]); });
document.addEventListener("input",function(e){ if(e.target&&/^(mprice|mqty)$/.test(e.target.id)) renderPrice(); });
document.addEventListener("change",function(e){ if(e.target&&e.target.id==="munit") renderPrice(); });
document.addEventListener("submit",function(e){ if(e.target.id==="pform"){ e.preventDefault(); priceSearch(document.getElementById("pq").value); } });
window.addEventListener("hashchange",function(){ if(state.tab!=="price") stopScan(); });

/* ---------- 회원 (Supabase · 카카오 로그인) ---------- */
var SB=null, USER=null, PROFILE=null, MYREP=null, MYSPIN=null, SBWAIT=[];
function authCfg(){ if(!PMODE&&PART_LIVE) return null; var a=seed.auth||{}; return (safeUrl(a.url)&&a.key)?a:null; }
function loadSb(cb){
  if(window.supabase&&window.supabase.createClient){ cb(); return; }
  SBWAIT.push(cb); if(SBWAIT.length>1) return;
  var sc=document.createElement("script"); sc.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
  sc.onload=function(){ var w=SBWAIT; SBWAIT=[]; w.forEach(function(f){ f(); }); };
  sc.onerror=function(){ SBWAIT=[]; };
  document.head.appendChild(sc);
}
function initAuth(){
  var a=authCfg(); paintMe(); if(!a||SB) return;
  loadSb(function(){
    if(!window.supabase||!window.supabase.createClient) return;
    SB=window.supabase.createClient(a.url,a.key,{auth:{flowType:"pkce",detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
    SB.auth.onAuthStateChange(function(ev,sess){
      var u=sess&&sess.user||null, changed=(u&&u.id)!==(USER&&USER.id);
      USER=u; paintMe();
      if(/[?&]code=/.test(location.search)) history.replaceState(null,"",location.pathname+(location.hash||""));
      if(!changed) return;
      if(u){ syncDown().then(function(){ var go=ls("dakku-after-login"); if(go){ try{ localStorage.removeItem("dakku-after-login"); }catch(e){} if(location.hash!==go){ location.hash=go; return; } } render(); }); }
      else { PROFILE=null; MYREP=null; MYSPIN=null; render(); }
    });
  });
}
function paintMe(){ var b=document.getElementById("mebtn"); if(!b) return; b.classList.toggle("in",!!USER); }
function nick(){ return (PROFILE&&PROFILE.nickname)||(USER&&USER.user_metadata&&(USER.user_metadata.name||USER.user_metadata.nickname||USER.user_metadata.full_name))||"회원"; }
function goLogin(msg){ if(msg) toast(msg); ls("dakku-after-login",location.hash||"#/"); location.hash="#/my"; }
function login(provider){
  if(!SB){ toast("잠시 후 다시 눌러 주세요"); initAuth(); return; }
  if(!ls("dakku-after-login")) ls("dakku-after-login","#/my");
  SB.auth.signInWithOAuth({provider:provider,options:{redirectTo:location.origin+location.pathname}}).then(function(r){ if(r.error) toast("로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요."); });
}
function sbErr(r){ if(r&&r.error){ console.warn("[dakku]",r.error.message); return true; } return false; }
function syncDown(){
  if(!SB||!USER) return Promise.resolve();
  var uid=USER.id, mon=ym(today()), day=ymd(today());
  return Promise.all([
    SB.from("profiles").select("*").eq("id",uid).maybeSingle(),
    SB.from("favorites").select("item_id").eq("user_id",uid),
    SB.from("views").select("item_id,viewed_at").eq("user_id",uid).order("viewed_at",{ascending:false}).limit(30),
    SB.from("reporter_apps").select("*").eq("user_id",uid).eq("month",mon).maybeSingle(),
    SB.from("spins").select("*").eq("user_id",uid).gte("day",mon+"-01").order("day",{ascending:false})
  ]).then(function(R){
    PROFILE=R[0].data||{id:uid};
    var srv=(R[1].data||[]).map(function(x){ return x.item_id; }), up=FAV.filter(function(id){ return srv.indexOf(id)<0; });
    if(up.length) SB.from("favorites").upsert(up.map(function(id){ return {user_id:uid,item_id:id}; })).then(sbErr);
    srv.forEach(function(id){ if(FAV.indexOf(id)<0) FAV.push(id); }); ls("dakku-fav",JSON.stringify(FAV)); pushFavSync();
    var sv=(R[2].data||[]).map(function(x){ return x.item_id; }), loc=SEEN.filter(function(id){ return sv.indexOf(id)<0; });
    if(loc.length) SB.from("views").upsert(loc.map(function(id){ return {user_id:uid,item_id:id}; })).then(sbErr);
    SEEN=SEEN.concat(sv.filter(function(id){ return SEEN.indexOf(id)<0; })).slice(0,30); ls("dakku-seen",JSON.stringify(SEEN));
    var P=PROFILE;
    if((P.regions&&P.regions.length)||(P.ages&&P.ages.length)||P.cat){ WANT.cat=P.cat||WANT.cat; WANT.regions=P.regions||[]; WANT.ages=P.ages||[]; ls("dakku-want",JSON.stringify(WANT)); }
    else if(WANT.cat||(WANT.regions||[]).length||(WANT.ages||[]).length) mWant();
    MYREP=R[3].data||null;
    var sp=R[4].data||[]; MYSPIN={today:sp.filter(function(x){ return x.day===day; })[0]||null, won:sp.filter(function(x){ return x.code; })[0]||null};
  }).catch(function(e){ console.warn("[dakku]",e); });
}
function mFav(id,on){ if(!SB||!USER||!id) return; if(on) SB.from("favorites").upsert({user_id:USER.id,item_id:id}).then(sbErr); else SB.from("favorites").delete().eq("user_id",USER.id).eq("item_id",id).then(sbErr); }
function mSeen(id){ if(!SB||!USER||!id) return; SB.from("views").upsert({user_id:USER.id,item_id:id,viewed_at:new Date().toISOString()}).then(sbErr); }
function mWant(){ if(!SB||!USER) return; var row={cat:WANT.cat||null,regions:WANT.regions||[],ages:WANT.ages||[],updated_at:new Date().toISOString()}; PROFILE=Object.assign(PROFILE||{},row); SB.from("profiles").update(row).eq("id",USER.id).then(sbErr); }
function serverSpin(btn){
  btn.disabled=true; btn.textContent="돌아가는 중…";
  SB.rpc("spin").then(function(r){
    if(r.error){ btn.disabled=false; btn.textContent="🎡 룰렛 돌리기"; toast(/won this month/.test(r.error.message)?"이번 달은 이미 당첨됐어요. "+nextMonthLabel()+"에 다시 만나요!":"잠시 후 다시 시도해 주세요"); return; }
    var x=r.data||{}, pick=+x.i, t=today();
    var center=pick*45+22.5+(Math.random()*24-12), rot=1800+(360-center);
    var st={d:ymd(t),i:pick,rot:rot,code:x.code||""};
    ls("dakku-spin",JSON.stringify(st)); if(st.code) ls("dakku-win",JSON.stringify({m:ym(t),code:st.code}));
    MYSPIN=MYSPIN||{}; MYSPIN.today={day:st.d,prize:pick,code:st.code}; if(st.code) MYSPIN.won=MYSPIN.today;
    var w=document.getElementById("wheel"); if(w) w.style.transform="rotate("+(x.again?rot%360:rot)+"deg)";
    var reduce=x.again||(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setTimeout(function(){ var rr=document.getElementById("rres"); if(rr) rr.innerHTML=resultHtml(st); btn.textContent=st.code?"이번 달은 끝! "+nextMonthLabel()+"에 다시 돌려요":"오늘은 끝! 내일 또 돌려요"; }, reduce?100:3400);
  });
}
function recentSection(){
  var byId={}; seed.items.forEach(function(it){ byId[it.id]=it; });
  var list=SEEN.map(function(id){ return byId[id]; }).filter(Boolean);
  if(!list.length) return "";
  return '<section class="hsec"><div class="hsh"><h2>👀 <em>최근 본</em> 상품</h2></div><div class="hs">'+list.slice(0,15).map(hcard).join("")+'</div></section>';
}
function chipChecks(name,opts,sel,radio){ return '<div class="rgbox">'+opts.map(function(o){ var v=o[0], on=(sel||[]).indexOf(v)>=0; return '<label class="rck'+(on?' on':'')+'"><input type="'+(radio?'radio':'checkbox')+'" name="'+name+'" value="'+esc(v)+'"'+(on?' checked':'')+'><span class="bx"></span>'+esc(o[1])+'</label>'; }).join("")+'</div>'; }
/* 내 블로그·인스타 주소 여러 개 등록(2026-10-21 시온님). 로그인하면 profiles.blogs/instas(supabase/profile_channels.sql), 이 기기 dakku-chs 에도 기억 */
var CH_MAX=5;
function myChs(){ var P=PROFILE||{}, l={}; try{ l=JSON.parse(ls("dakku-chs")||"{}"); }catch(e){} return {blogs:(P.blogs&&P.blogs.length?P.blogs:l.blogs)||[], instas:(P.instas&&P.instas.length?P.instas:l.instas)||[]}; }
function chNorm(k,v){ v=String(v||"").trim(); if(!v) return "";
  if(k==="instas"){ var m=v.match(/instagram\.com\/([A-Za-z0-9._]{1,30})/)||v.match(/^@?([A-Za-z0-9._]{1,30})$/); return m?"https://www.instagram.com/"+m[1]+"/":""; }
  if(/^[A-Za-z0-9_-]{3,30}$/.test(v)) return "https://blog.naver.com/"+v;
  if(!/^https?:\/\//.test(v)) v="https://"+v; return /^https?:\/\/[^\s]+\.[^\s]+/.test(v)?v:""; }
function chLabel(k,u){ var m=k==="instas"?u.match(/instagram\.com\/([^\/?#]+)/):u.match(/blog\.naver\.com\/([^\/?#]+)/); return m?(k==="instas"?"@":"")+m[1]:u.replace(/^https?:\/\//,""); }
function chList(k){ var L=myChs()[k]; return L.map(function(u,i){ return '<li><a href="'+esc(safeUrl(u))+'" target="_blank" rel="noopener noreferrer">'+esc(chLabel(k,u))+'</a><button type="button" class="lnk red" data-chdel="'+k+'" data-i="'+i+'" aria-label="삭제">삭제</button></li>'; }).join("")||'<li class="chnone">아직 등록한 주소가 없어요</li>'; }
function chSection(){
  var row=function(k,t,ph,hint){ var n=myChs()[k].length; return '<div class="chgrp"><span class="fl">'+t+' <small>('+n+'/'+CH_MAX+')</small></span><ul class="chlist">'+chList(k)+'</ul>'+(n<CH_MAX?'<div class="chadd"><input class="fi" data-chin="'+k+'" placeholder="'+ph+'" autocomplete="off" inputmode="url"><button type="button" class="b pri" data-chadd="'+k+'">추가</button></div><small class="chhint">'+hint+'</small>':'')+'</div>'; };
  return '<section class="pane mych" id="mych"><h2>📝 내 블로그·인스타 주소</h2><p class="mysub">체험단 신청할 때 쓰는 주소를 모아 두세요. 각각 '+CH_MAX+'개까지 등록할 수 있어요.</p>'+
    row("blogs","블로그","https://blog.naver.com/아이디","네이버 블로그는 아이디만 넣어도 돼요")+
    row("instas","인스타그램","@아이디 또는 instagram.com/아이디","@아이디만 넣어도 돼요")+'</section>';
}
function chSave(c){
  try{ ls("dakku-chs",JSON.stringify(c)); }catch(e){}
  PROFILE=Object.assign(PROFILE||{},{blogs:c.blogs,instas:c.instas});
  var box=document.getElementById("mych"); if(box) box.outerHTML=chSection();
  if(SB&&USER) SB.from("profiles").update({blogs:c.blogs,instas:c.instas,updated_at:new Date().toISOString()}).eq("id",USER.id).then(function(r){ if(sbErr(r)) toast("이 기기에만 저장했어요"); else toast("✅ 저장했어요"); });
}
document.addEventListener("click",function(e){
  var a=e.target.closest&&e.target.closest("[data-chadd]"), d=e.target.closest&&e.target.closest("[data-chdel]"); if(!a&&!d) return; e.preventDefault();
  var c=myChs(); c={blogs:c.blogs.slice(),instas:c.instas.slice()};
  if(d){ c[d.getAttribute("data-chdel")].splice(+d.getAttribute("data-i"),1); chSave(c); return; }
  var k=a.getAttribute("data-chadd"), inp=document.querySelector('[data-chin="'+k+'"]'), u=chNorm(k,inp&&inp.value);
  if(!u){ toast(k==="instas"?"인스타 아이디나 주소를 확인해 주세요":"블로그 주소를 확인해 주세요"); return; }
  if(c[k].indexOf(u)>=0){ toast("이미 등록한 주소예요"); return; }
  if(c[k].length>=CH_MAX){ toast(CH_MAX+"개까지 등록할 수 있어요"); return; }
  c[k].push(u); chSave(c); ga("my_channel_add",{type:k});
});
document.addEventListener("keydown",function(e){ var i=e.target.closest&&e.target.closest("[data-chin]"); if(i&&e.key==="Enter"){ e.preventDefault(); var b=document.querySelector('[data-chadd="'+i.getAttribute("data-chin")+'"]'); if(b) b.click(); } });
function myView(){
  if(PMODE) return pMyView();
  var a=authCfg(), favN=seed.items.filter(function(it){ return isFav(it.id); }).length;
  var h='<div class="pg my"><h1>마이 다꾸 🙋</h1>';
  if(!USER){
    h+='<section class="lgcard"><div class="mlogo">'+logoSvg(44)+'</div>'+(a?'<b>로그인하고 체험단을<br>더 편하게 챙기세요</b>'+
      '<ul class="lgben"><li>❤️ 찜한 체험단을 휴대폰·PC 어디서나</li><li>👀 내가 눌러본 상품 다시 보기</li><li>📍 관심 지역 · 👶 아기 나이 맞춤 체험단 알림</li><li>✍️ 다꾸 기자단 신청 · 🎡 룰렛 이벤트 참여</li></ul>':'<b>로그인 없이<br>편하게 둘러보세요</b>')+
      (a?'<button class="b kakaolg wide" data-login="kakao"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#191600" d="M12 4C7 4 3 7.2 3 11.1c0 2.5 1.7 4.7 4.2 6l-.9 3.4c-.1.3.3.6.6.4l4-2.7h1.1c5 0 9-3.2 9-7.1S17 4 12 4Z"/></svg>카카오로 3초 만에 시작하기</button>'+
         ((a.naver)?'<button class="b naverlg wide" data-login="'+esc(a.naver)+'"><b>N</b>네이버로 시작하기</button>':'')+
         '<p class="lgnote">시작하면 <a href="#/privacy">개인정보처리방침</a>에 동의하는 것으로 봐요.</p>'
       :'<p class="lgsoon">찜·최근 본 체험단은 이 기기에 저장돼요.<br>기자단 신청·원고료·수익화 클래스 같은 회원 기능은 <b>다이어리뷰</b>에서 할 수 있어요.</p><a class="b pri wide" href="'+PART_URL+'#/my">다이어리뷰 로그인 ›</a>')+'</section>';
    h+='<div class="mytiles"><a href="#/fav"><b>'+favN+'</b><span>찜</span></a><a href="#/my" data-jump="applied"><b>'+APPLIED.length+'</b><span>신청한</span></a><a href="#/fav"><b>'+SEEN.length+'</b><span>최근 본</span></a></div>';
    h+=mySites();
    h+=pushBox()+appliedSection()+recentSection();
    return h+'</div>';
  }
  var P=PROFILE||{}, mon=ym(today()), r=rep();
  var spinTxt=MYSPIN&&MYSPIN.won?'당첨 🎉':(MYSPIN&&MYSPIN.today?'오늘 완료':'참여 가능');
  h+='<div class="hello"><b>'+esc(nick())+'님, 반가워요 👋</b><button class="lnk" data-logout>로그아웃</button></div>';
  h+='<div class="mytiles"><a href="#/fav"><b>'+favN+'</b><span>찜</span></a><a href="#/my" data-jump="applied"><b>'+APPLIED.length+'</b><span>신청한</span></a><a href="#/my" data-jump="recent"><b>'+SEEN.length+'</b><span>최근 본</span></a>'+(BENEFIT_ON?'<a href="#/benefit"><b>'+spinTxt+'</b><span>룰렛</span></a>':'')+(r?'<a href="#/reporter"><b>'+(MYREP?esc(MYREP.status):'신청 전')+'</b><span>기자단</span></a>':'')+'</div>';
  h+=mySites();
  h+=pushBox();
  h+='<form class="pane mypref" id="prefform"><h2>🔔 맞춤 체험단 알림</h2><p class="mysub">고른 지역·아기 나이에 맞는 새 체험단을 먼저 보여드리고, 알림을 켜면 새로 올라올 때 알려드려요.</p>'+
    '<span class="fl">관심 분야</span>'+chipChecks("cat",[["stay","🏨 숙박"],["baby","👶 육아"],["life","🧺 생활"],["beauty","💄 뷰티"],["elec","🔌 가전/가구"],["health","💊 건강식품"],["pet","🐾 반려동물"]],WANT.cat?[WANT.cat]:[],true)+
    '<span class="fl">관심 지역</span>'+chipChecks("regions",REGIONS.map(function(x){ return [x,x]; }),WANT.regions)+
    '<span class="fl">아기 나이</span>'+chipChecks("ages",AGES.map(function(x){ return [x,x]; }),WANT.ages)+
    '<label class="ck ntf"><input type="checkbox" name="notify"'+(P.notify?' checked':'')+'><span><b>새 체험단 알림 받기</b><small>관심 분야·지역·아기 나이와 알림 동의 여부를 알림 목적으로만 써요. 언제든 끌 수 있어요.</small></span></label>'+
    '<button class="b pri wide" type="submit">저장하기</button></form>';
  if(r){
    h+='<section class="pane myrep"><h2>✍️ 다꾸 기자단 ('+(+mon.slice(5))+'월)</h2>'+(MYREP?'<p class="mysub">신청한 블로그: <a href="'+esc(safeUrl(MYREP.blog_url))+'" target="_blank" rel="noopener noreferrer">'+esc(MYREP.blog_url)+'</a></p><p class="repst">상태: <b>'+esc(MYREP.status)+'</b></p>':repForm())+'<a class="lnk" href="#/reporter">기자단 안내 보기 ›</a></section>';
  }
  h+=chSection()+pjMySection();
  h+=appliedSection()+'<div id="recent">'+recentSection()+'</div>';
  h+='<div class="myfoot"><a href="#/privacy">개인정보처리방침</a> · <button class="lnk" data-unreg>회원 탈퇴</button><br><button class="lnk myuid" data-copy="'+esc(USER.id)+'">회원 번호 복사</button></div>';
  return h+'</div>';
}
function repForm(){ return '<form id="repform" class="repf"><label class="fl" for="rp-blog">블로그 주소</label><input id="rp-blog" name="blog" class="fi" type="url" inputmode="url" placeholder="https://blog.naver.com/아이디" required><p class="ferr" id="rperr" role="alert"></p><button class="b pri wide" type="submit">이번 달 기자단 신청하기</button></form>'; }
function privacyView(){
  var a=seed.privacy||{}, owner=esc(a.owner||"다꾸 체험단 모음 운영자"), mail=esc(a.email||""), day=esc(a.date||"2026년 10월 14일");
  return '<div class="pg privacy"><a class="back" href="#/my">'+ico(I.back)+'<span>마이</span></a><h1>개인정보처리방침</h1>'+
  '<p>'+owner+'(이하 “다꾸”)는 회원의 개인정보를 소중히 다루며, 「개인정보 보호법」에 따라 아래와 같이 처리해요.</p>'+
  '<h2>1. 수집하는 항목과 방법</h2><ul><li>카카오 로그인 시: 카카오 회원번호(식별자), 닉네임, 프로필 사진, 카카오계정 이메일(동의한 경우)</li><li>서비스 이용 시 회원이 직접 입력·선택: 관심 분야·지역·아기 나이, 알림 수신 동의 여부, 기자단 신청 블로그 주소</li><li>마이페이지에 직접 등록한 경우: 블로그·인스타그램 주소</li><li>다꾸 기자단 참여 시: 신청 블로그 주소·하고 싶은 말, 제출한 글 주소, 원고료 적립·출금 내역. 원고료 출금 신청 시 원천징수 신고(소득세법 제145조)와 입금을 위해 이름·주민등록번호·은행·계좌번호·연락처를 받아요. 이 자료는 신청한 기기에서 암호화된 상태로 저장돼 운영자만 열 수 있고, 지급 후 5년 보관한 뒤 지워요</li><li>수익화 교육 수강 신청 시: 휴대폰 번호·이메일, 계약 동의 일시·과목·수강료(계약 이행·환불 처리·분쟁 대비)</li><li>서비스 이용 기록: 찜한 체험단, 눌러본 상품, 룰렛 참여 결과</li></ul>'+
  '<h2>2. 이용 목적</h2><ul><li>회원 식별과 로그인 유지</li><li>찜·최근 본 상품을 여러 기기에서 보여주기</li><li>관심 조건에 맞는 체험단 추천과(동의한 경우) 새 체험단 알림</li><li>다꾸 기자단 선정·안내와 상품권 지급</li><li>룰렛 이벤트 참여 확인(하루 1회)과 경품 지급</li></ul>'+
  '<h2>3. 보유 기간</h2><ul><li>회원 탈퇴 시 바로 지워요. 마이 다꾸 &gt; 회원 탈퇴에서 직접 할 수 있어요.</li><li>1년 동안 로그인하지 않으면 미리 알린 뒤 지워요.</li><li>법령에 보관 의무가 있는 경우 그 기간만 보관해요. 수강 계약·결제 기록은 「전자상거래법」에 따라 5년 보관해요.</li></ul>'+
  '<h2>4. 처리 위탁과 국외 이전</h2><ul><li>회원 정보 저장: Supabase Inc.(데이터베이스·로그인 서비스). 저장 위치는 서비스 설정 지역에 따라요.</li><li>로그인: 주식회사 카카오(카카오 로그인)</li></ul>'+
  '<h2>5. 제3자 제공</h2><p>회원 정보를 다른 곳에 제공하지 않아요. 체험단 신청은 각 모집처 사이트에서 회원이 직접 해요.</p>'+
  '<h2>6. 회원의 권리</h2><p>언제든 내 정보를 보고, 고치고, 알림 동의를 끄고, 탈퇴할 수 있어요. 마이 다꾸에서 직접 하거나 아래 연락처로 요청해 주세요.</p>'+
  '<h2>7. 쿠키와 브라우저 저장소, 이용 분석</h2><p>로그인 유지와 찜·최근 본 기록을 위해 브라우저 저장소를 써요. 서비스 개선을 위해 Google LLC의 Google 애널리틱스와 Microsoft Corporation의 Microsoft Clarity로 방문 화면·버튼 이용·스크롤 같은 이용 기록을 개인을 알아볼 수 없는 형태로 분석해요(쿠키 사용, 국외 이전: 미국 등 Google·Microsoft 서버). 브라우저 설정에서 쿠키를 지우거나 막을 수 있고, <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">Google 애널리틱스 차단 부가기능</a>으로 거부할 수 있어요.</p>'+
  '<h2>8. 개인정보 보호책임자</h2><p>'+owner+(mail?' · '+mail:'')+' · 카카오톡 채널 ‘다꾸체험단’</p>'+
  '<p class="pdate">시행일: '+day+'</p></div>';
}
document.addEventListener("click",function(e){
  var t=e.target.closest("[data-login],[data-logout],[data-unreg],[data-unreg-yes]"); if(!t) return;
  e.preventDefault();
  if(t.dataset.login!==undefined){ login(t.dataset.login||"kakao"); return; }
  if(t.dataset.logout!==undefined){ if(SB) SB.auth.signOut().then(function(){ toast("로그아웃했어요"); }); return; }
  if(t.dataset.unreg!==undefined){ t.outerHTML='<span class="unreg">찜·최근 본·기자단·룰렛 기록이 모두 지워져요. <button class="lnk red" data-unreg-yes>정말 탈퇴할게요</button></span>'; return; }
  if(t.dataset.unregYes!==undefined){ if(!SB) return; SB.rpc("delete_me").then(function(r){ if(sbErr(r)){ toast("탈퇴하지 못했어요. 카톡 채널로 알려주세요."); return; } SB.auth.signOut(); FAV=[]; SEEN=[]; ls("dakku-fav","[]"); ls("dakku-seen","[]"); toast("탈퇴했어요. 그동안 고마웠어요 🙏"); location.hash="#/"; }); }
});
document.addEventListener("submit",function(e){
  var f=e.target;
  if(f.id==="prefform"){ e.preventDefault();
    var vals=function(n){ return [].map.call(f.querySelectorAll('input[name="'+n+'"]:checked'),function(x){ return x.value; }); };
    var cats=vals("cat"); WANT.cat=cats[0]||""; WANT.regions=vals("regions"); WANT.ages=vals("ages"); ls("dakku-want",JSON.stringify(WANT)); ls("dakku-want-asked","1");
    var on=f.elements.notify.checked, row={cat:WANT.cat||null,regions:WANT.regions,ages:WANT.ages,notify:on,updated_at:new Date().toISOString()};
    if(on&&!(PROFILE&&PROFILE.notify)) row.notify_agreed_at=new Date().toISOString();
    PROFILE=Object.assign(PROFILE||{},row);
    if(SB&&USER) SB.from("profiles").update(row).eq("id",USER.id).then(function(r){ toast(sbErr(r)?"저장하지 못했어요. 잠시 후 다시 해 주세요":"✅ 저장했어요"); });
    return;
  }
  if(f.id==="repform"){ e.preventDefault();
    var u=String(f.elements.blog.value||"").trim(), err=document.getElementById("rperr");
    if(!/^https?:\/\/\S+\.\S+/.test(u)){ err.textContent="블로그 주소를 https:// 부터 넣어 주세요."; return; }
    if(!SB||!USER){ goLogin("로그인하고 신청할 수 있어요"); return; }
    SB.from("reporter_apps").insert({user_id:USER.id,month:ym(today()),blog_url:u}).select().maybeSingle().then(function(r){
      if(r.error){ err.textContent=/duplicate|unique/.test(r.error.message)?"이번 달은 이미 신청했어요.":"신청하지 못했어요. 잠시 후 다시 해 주세요."; return; }
      MYREP=r.data; toast("🙌 기자단 신청 완료! 선정되면 카톡으로 알려드려요"); render();
    });
  }
});

if("serviceWorker" in navigator&&!PMODE){ window.addEventListener("load",function(){ navigator.serviceWorker.register("sw.js").catch(function(){}); }); }

shell(); paintLogo(); route();
(function(){ window.kakaoAsyncInit=function(){ try{ Kakao.Channel.createAddChannelButton({container:"#kakao-talk-channel-add-button"}); }catch(e){} try{ Kakao.Channel.createChatButton({container:"#kakao-talk-channel-chat-button"}); }catch(e){} };
  if(document.getElementById("kakao-js-sdk")) return; var js=document.createElement("script"); js.id="kakao-js-sdk"; js.src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.channel.min.js"; js.integrity="sha384-8oNFBbAHWVovcMLgR+mLbxqwoucixezSAzniBcjnEoumhfIbMIg4DrVsoiPEtlnt"; js.crossOrigin="anonymous"; js.async=true; document.head.appendChild(js); })();
window.addEventListener("hashchange",route);
fetch(BASE+"data.json?v="+Date.now().toString(36).slice(0,-3),{cache:"no-cache"}).then(function(r){ return r.json(); }).then(function(d){
  seed=d||seed; if(!Array.isArray(seed.items)) seed.items=[]; setTimeout(pushRefresh,1500); /* 사업자 정보는 index.html 의 고정 footer(#sitebiz)에 있음: 네이버 검색광고 확인용, JS 없이도 보이게 */
  if(Array.isArray(seed.categories)&&seed.categories.length) CATS=seed.categories;
  UPCOMING=Array.isArray(seed.upcoming)?seed.upcoming:[]; ADS=Array.isArray(seed.ads)?seed.ads:[]; DEALS=Array.isArray(seed.deals)?seed.deals:[];
  state.loading=false; LOGO=pickLogo(); paintLogo(); setFavicon(); render();
  if(!WANT.cat&&!PMODE) setTimeout(prefPopup,40000);
  initAuth();
}).catch(function(){ state.loading=false; var v=document.getElementById("view"); if(v) v.innerHTML='<div class="empty"><b>잠시 후 다시 시도해 주세요</b>목록을 불러오지 못했어요.</div>'; });
})();

/* 컴퓨터(마우스)에서도 가로 줄(홈 메뉴 아이콘 등)을 끌어서·휠로 넘기게 — 2026-10-22 시온님 */
(function(){
  var hx=function(el){ while(el&&el!==document.body){ if(el.scrollWidth>el.clientWidth+2){ var o=getComputedStyle(el).overflowX; if(o==="auto"||o==="scroll") return el; } el=el.parentElement; } return null; };
  var dr=null, moved=false;
  document.addEventListener("mousedown",function(e){ if(e.button!==0) return; var el=hx(e.target); if(!el) return; dr={el:el,x:e.clientX,sl:el.scrollLeft,snap:el.style.scrollSnapType}; moved=false; });
  document.addEventListener("mousemove",function(e){ if(!dr) return; var dx=e.clientX-dr.x; if(!moved&&Math.abs(dx)>5){ moved=true; dr.el.style.scrollSnapType="none"; dr.el.style.cursor="grabbing"; } if(moved){ dr.el.scrollLeft=dr.sl-dx; e.preventDefault(); } });
  document.addEventListener("mouseup",function(){ if(!dr) return; dr.el.style.scrollSnapType=dr.snap; dr.el.style.cursor=""; dr=null; });
  document.addEventListener("click",function(e){ if(moved){ e.preventDefault(); e.stopPropagation(); moved=false; } },true);
  document.addEventListener("dragstart",function(e){ if(hx(e.target)) e.preventDefault(); });
  document.addEventListener("wheel",function(e){ var el=e.target.closest&&e.target.closest(".hms"); if(!el||Math.abs(e.deltaX)>Math.abs(e.deltaY)) return; var max=el.scrollWidth-el.clientWidth; if(max<=0) return; var n=Math.max(0,Math.min(max,el.scrollLeft+e.deltaY)); if(n===el.scrollLeft) return; el.scrollLeft=n; e.preventDefault(); },{passive:false});
})();

/* 최근 검색어(2026-10-23 시온님 "검색하면 내가 검색했던 기록 나오게"): 이 기기 localStorage dakku-recentq, 최대 10개. 검색칸을 누르면(비어 있을 때) 아래에 뜸 */
(function(){
  var KEY="dakku-recentq", T=null;
  function esc(x){ return String(x).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function get(){ try{ var a=JSON.parse(localStorage.getItem(KEY)||"[]"); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
  function put(a){ try{ localStorage.setItem(KEY,JSON.stringify(a.slice(0,10))); }catch(e){} }
  function add(v){ v=(v||"").trim(); if(v.length<2) return; var a=get().filter(function(x){ return x!==v; }); a.unshift(v); put(a); }
  function box(){ return document.getElementById("rqbox"); }
  function paint(){ var b=box(), q=document.getElementById("q"); if(!b||!q) return; var a=get();
    if(q.value||!a.length||document.activeElement!==q){ b.hidden=true; return; }
    b.innerHTML='<div class="rqh"><b>최근 검색</b><button type="button" data-rqclr>전체 삭제</button></div><div class="rql">'+a.map(function(x){ return '<span class="rqi"><button type="button" class="rqt" data-rq="'+esc(x)+'">'+esc(x)+'</button><button type="button" class="rqx" data-rqdel="'+esc(x)+'" aria-label="'+esc(x)+' 지우기">✕</button></span>'; }).join("")+'</div>';
    b.hidden=false; }
  function hide(){ var b=box(); if(b) b.hidden=true; }
  document.addEventListener("focusin",function(e){ if(e.target&&e.target.id==="q") paint(); });
  document.addEventListener("focusout",function(e){ if(e.target&&e.target.id==="q"){ add(e.target.value); setTimeout(function(){ var q=document.getElementById("q"); if(!q||document.activeElement!==q) hide(); },150); } });
  document.addEventListener("input",function(e){ if(e.target&&e.target.id==="q"){ paint(); clearTimeout(T); var v=e.target.value; T=setTimeout(function(){ add(v); },1800); } });
  document.addEventListener("keydown",function(e){ if(e.target&&e.target.id==="q"&&e.key==="Enter"){ add(e.target.value); e.target.blur(); } });
  document.addEventListener("mousedown",function(e){ if(e.target.closest&&e.target.closest("#rqbox")) e.preventDefault(); });
  document.addEventListener("click",function(e){ var t=e.target.closest&&e.target.closest("[data-rq],[data-rqdel],[data-rqclr]"); if(!t) return; var q=document.getElementById("q");
    if(t.hasAttribute("data-rqclr")){ put([]); hide(); return; }
    if(t.dataset.rqdel!==undefined){ put(get().filter(function(x){ return x!==t.dataset.rqdel; })); if(q) q.focus(); paint(); return; }
    if(t.dataset.rq!==undefined&&q){ q.value=t.dataset.rq; add(q.value); hide(); q.blur(); q.dispatchEvent(new Event("input",{bubbles:true})); try{ if(window.gtag) gtag("event","search",{search_term:q.value,place:"recent"}); }catch(err){} } });
})();
/* 지도 감성숙소 핀 → 매거진 글 (GA) */
document.addEventListener("click",function(e){ var a=e.target.closest&&e.target.closest("[data-mapmag]"); if(a&&window.gtag) try{ gtag("event","map_mag",{slug:a.getAttribute("data-mapmag")}); }catch(x){} });

document.addEventListener("click",function(e){ var a=e.target.closest&&e.target.closest("[data-gsim] a"); if(a&&window.gtag) try{ gtag("event","deal_click",{section:"gonggu_sim"}); }catch(x){} });

document.addEventListener("click",function(e){ var a=e.target.closest&&e.target.closest("[data-gcp]"); if(a&&window.gtag) try{ gtag("event","coupang_click",{place:"gonggu_same"}); }catch(x){} });
