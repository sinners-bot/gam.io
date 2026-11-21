import fs from "fs"; import { chromium } from "/home/claude/.npm-global/lib/node_modules/playwright/index.mjs";
const src=fs.readFileSync("../icons.js","utf8"), css=fs.readFileSync("../look.css","utf8");
const logo="data:image/png;base64,"+fs.readFileSync("../logo512.png").toString("base64");
const b=await chromium.launch(); const p=await b.newPage();
const init=()=>p.evaluate(([src])=>{ var S={}, GAMES=[]; new Function("S","GAMES","art","sidebar","page","gcard","esc","render",src)(S,GAMES,function(){return""},function(){return""},function(){return""},function(){return""},function(x){return x},function(){}); },[src]);
const tile=(ids,size,ic)=>"document.getElementById('g').innerHTML="+JSON.stringify(ids)+".map(id=>{const t=window.__gxTile[id];return '<div class=\"art gx-art\" style=\"width:"+size+"px;height:"+size+"px;--ta:'+t[0]+';--tb:'+t[1]+';--tg:'+t[2]+'\">'+window.__gxLogo(id)+'</div>'}).join('')";
const BASE='*{margin:0;box-sizing:border-box}body{overflow:hidden;font-family:Inter,"Segoe UI",system-ui,sans-serif;color:#fff;background:radial-gradient(600px 400px at 70% 20%,#8b5cff55,transparent 65%),radial-gradient(700px 500px at 100% 100%,#ff4d8d38,transparent 60%),radial-gradient(500px 400px at 0% 0%,#3d8bff30,transparent 60%),linear-gradient(120deg,#170d45,#24136b 45%,#140b3a)}'+css+
 '.art{border-radius:22%;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;box-shadow:0 14px 30px #0009,inset 0 0 0 1px #ffffff22}.art .gx-ic{height:88%;max-height:none}h1{font-weight:900;letter-spacing:4px}h1 span{color:#b28bff}p em{font-style:normal;background:linear-gradient(90deg,#ffd84d,#ff8ad8 60%,#b28bff);-webkit-background-clip:text;color:transparent}';
// 1) app / profile banner 1360x480 (17:6). Bottom-left kept clear for the avatar.
await p.setViewportSize({width:1360,height:480});
await p.setContent('<style>'+BASE+
 '.w{position:absolute;left:400px;top:70px;display:flex;align-items:center;gap:26px}.w img{width:120px;height:120px;border-radius:30px;box-shadow:0 16px 40px #7c4dff99}h1{font-size:80px}p{position:absolute;left:406px;top:222px;font-size:32px;font-weight:800;color:#e4dcff}'+
 '.g{position:absolute;right:-70px;top:-40px;display:grid;grid-template-columns:repeat(3,150px);gap:18px;transform:rotate(-10deg)}.g2{position:absolute;left:-70px;top:-60px;display:grid;grid-template-columns:repeat(2,130px);gap:16px;transform:rotate(12deg);opacity:.55}'+
 '.chips{position:absolute;left:406px;top:300px;display:flex;gap:12px}.chips b{font-size:20px;background:#ffffff14;border:1px solid #ffffff26;border-radius:99px;padding:8px 18px}</style>'+
 '<div class="g2" id="g2"></div><div class="g" id="g"></div><div class="w"><img src="'+logo+'"><h1>GAM<span>.IO</span></h1></div><p>25 games. <em>One voice call.</em></p><div class="chips"><b>🃏 Cards</b><b>♟️ Board</b><b>🎉 Party</b><b>🤖 Bots</b></div>');
await init(); await p.evaluate(tile(["clash","chess","pool","draw","trivia","hearts","battleship","connect4","ludo"],150));
await p.evaluate(()=>{const g=document.getElementById("g2"); g.innerHTML=["dice","mafia","spades","reversi","liars","checkers"].map(id=>{const t=window.__gxTile[id];return '<div class="art gx-art" style="width:130px;height:130px;--ta:'+t[0]+';--tb:'+t[1]+';--tg:'+t[2]+'">'+window.__gxLogo(id)+'</div>'}).join("")});
await p.waitForTimeout(200); await p.screenshot({path:"../promo/gamio-banner-1360x480.png"});
// 2) server banner 960x540 (16:9)
await p.setViewportSize({width:1920,height:1080});
await p.setContent('<style>'+BASE+'.c{position:absolute;left:0;right:0;top:250px;display:flex;flex-direction:column;align-items:center;gap:18px}.c .r{display:flex;align-items:center;gap:36px}.c img{width:200px;height:200px;border-radius:48px;box-shadow:0 24px 60px #7c4dff99}h1{font-size:170px}p{font-size:60px;font-weight:800;color:#e4dcff}'+
 '.g{position:absolute;left:-60px;right:-60px;bottom:40px;display:flex;justify-content:center;gap:28px}.g .art:nth-child(odd){transform:translateY(40px) rotate(-6deg)}.g .art:nth-child(even){transform:rotate(6deg)}.t{position:absolute;left:-60px;right:-60px;top:-70px;display:flex;justify-content:center;gap:28px;opacity:.4}</style>'+
 '<div class="t" id="t"></div><div class="c"><div class="r"><img src="'+logo+'"><h1>GAM<span>.IO</span></h1></div><p>25 games. <em>One voice call.</em></p></div><div class="g" id="g"></div>');
await init(); await p.evaluate(tile(["dice","clash","chess","pool","draw","trivia","hearts","battleship","ludo","mafia"],180));
await p.evaluate(()=>{const g=document.getElementById("t"); g.innerHTML=["spades","reversi","liars","checkers","poker","connect4","wordhunt","spy","crazy8","dots"].map(id=>{const t=window.__gxTile[id];return '<div class="art gx-art" style="width:180px;height:180px;--ta:'+t[0]+';--tb:'+t[1]+';--tg:'+t[2]+'">'+window.__gxLogo(id)+'</div>'}).join("")});
await p.waitForTimeout(200); await p.screenshot({path:"../promo/gamio-server-banner-1920x1080.png"});
await b.close(); console.log("ok");
