import fs from "fs"; import crypto from "crypto";
const hash=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))|0;return h>>>0;};
let servers=[]; globalThis.Bun={env:{ASSETS_URLS:"https://ui1.x,https://ui2.x,https://ui3.x,https://ui4.x,https://ui5.x",PLUGIN_URLS:"https://ui2.x,https://ui3.x,https://ui4.x,https://ui5.x"},write:async(f,t)=>fs.writeFileSync(f,t),build:async()=>({success:true,outputs:[{text:async()=>""}]}),serve(o){servers.push(o);return{}},hash,
 CryptoHasher:class{constructor(){this.h=crypto.createHash("sha256")}update(t){this.h.update(t);return this}digest(e){return this.h.digest(e)}}};
await import("./ui.ts"); await import("./ui2.ts"); await import("./ui3.ts"); await import("./ui4.ts"); await import("./ui5.ts"); const [u1,u2,u3,u4,u5]=servers;
const FAST=fs.readFileSync("cards_fast.ts","utf8"), FAST4=fs.readFileSync("extra_fast.ts","utf8"), FAST5=fs.readFileSync("bluff_fast.ts","utf8");
globalThis.fetch=async(u)=>{u=String(u); if(u==="https://ui3.x/games.ts") return new Response(FAST); if(u==="https://ui4.x/games.ts") return new Response(FAST4); if(u==="https://ui5.x/games.ts") return new Response(FAST5); for(const [p,s] of [["https://ui1.x",u1],["https://ui2.x",u2],["https://ui3.x",u3],["https://ui4.x",u4],["https://ui5.x",u5]]) if(u.startsWith(p)) return s.fetch(new Request(u)); throw new Error("offline "+u)};
await import("./server_c.ts"); const srv=servers[5], W=srv.websocket;
const h=await (await srv.fetch(new Request("http://x/health"),{})).json(); console.log("games:", h.games.length, h.games.slice(-4).join(","));
fs.writeFileSync("combined.js", await (await srv.fetch(new Request("http://x/client.js"),{})).text());
const mk=(id,name,room)=>({data:{user:{id,name,avatar:null},room},inbox:[],send(m){this.inbox.push(JSON.parse(m))}});
const lastOf=(c)=>[...c.inbox].reverse().find(m=>m.t==="state"); const say=(c,m)=>W.message(c,JSON.stringify(m));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const last=(c,t)=>[...c.inbox].reverse().find(m=>m.t===t);
const a=mk("a","Ann","c1"), b=mk("b","Bob","c1"), c=mk("c","Cat","c1"), d=mk("d","Dan","c1");
for (const x of [a,b,c,d]) { await W.open(x); say(x,{t:"meta",guild:"123456789012"}); }
await sleep(50);
let me=last(a,"me").profile;
console.log("daily:", me.daily.map(x=>x.id+" "+x.have+"/"+x.n).join(", "), "| achievements:", me.achievements.length, "| cosmetics:", me.cosmetics.items.length, "| emotes:", me.emotes.length);
// Ann opens a table: lobby options
say(a,{t:"pick",game:"connect4"}); let g=lastOf(a).game;
console.log("opt schema:", JSON.stringify(g.optSchema), "opts:", JSON.stringify(g.opts));
say(a,{t:"opts",o:{turn:"fast",ranked:true,bogus:1}}); g=lastOf(a).game; console.log("after opts:", JSON.stringify(g.opts));
say(b,{t:"opts",o:{turn:"off"}}); console.log("non-host blocked:", lastOf(a).game.opts.turn==="fast");
// Bob joins, ranked match, Ann resigns -> Bob wins, ratings change
say(b,{t:"jointable",room:lastOf(a).table,sit:true}); say(a,{t:"start"}); g=lastOf(a).game;
console.log("ranked:", g.ranked, "turnTotal(fast c4=12000):", g.turnTotal);
say(a,{t:"resign"}); await sleep(150);
console.log("rank msgs:", JSON.stringify(last(a,"rank")), JSON.stringify(last(b,"rank")));
console.log("Bob notes:", b.inbox.filter(m=>m.t==="note").map(n=>n.title).join(" | "));
me=last(b,"me").profile; console.log("Bob xp", me.xp, "level", me.level, "daily", me.daily.map(x=>x.id+" "+x.have+"/"+x.n+(x.done?"✓":"")).join(", "), "ranks", JSON.stringify(me.ranks));
say(b,{t:"ladder",game:"connect4"}); await sleep(30); console.log("ladder:", JSON.stringify(last(b,"ladder").rows.map(r=>r.name+":"+r.rating+" "+r.tier)));
// equip: locked + owned
say(b,{t:"equip",kind:"frame",id:"crown"}); await sleep(30); console.log("locked equip:", last(b,"err")?.msg);
say(b,{t:"equip",kind:"back",id:"classic"}); await sleep(30); console.log("equipped:", JSON.stringify(last(b,"me").profile.cosmetics.eq));
// emote from locked pack ignored, base ok
const n0=a.inbox.filter(m=>m.t==="emote").length; say(b,{t:"emote",e:15}); await sleep(900); say(b,{t:"emote",e:0}); await sleep(30);
console.log("emotes delivered:", a.inbox.filter(m=>m.t==="emote").slice(n0).map(m=>m.e).join(","));
for (const x of [a,b]) say(x,{t:"leavetable"});
// tournament with 4 players (tic-tac-toe), resolved by resigns
say(a,{t:"tcreate",game:"ttt",size:4,name:"Friday Cup"}); await sleep(30);
let tl=last(b,"tours").list; console.log("tour created, Bob sees:", tl.map(t=>t.name+"/"+t.status+"/"+t.players.length).join(","), "| note:", b.inbox.filter(m=>m.t==="note").slice(-1)[0]?.title);
const tid=tl[0].id; for (const x of [b,c,d]) say(x,{t:"tjoin",id:tid}); await sleep(20);
say(a,{t:"tstart",id:tid}); await sleep(50);
const T=()=>last(a,"tours").list.find(t=>t.id===tid);
console.log("round1:", JSON.stringify(T().rounds[0].map(m=>[m.a,m.b])), "| match notes:", [a,b,c,d].map(x=>x.inbox.filter(m=>m.t==="tmatch").length).join(","));
const byId={a,b,c,d};
async function playRound(ri){ for (const m of T().rounds[ri]) { if (m.w) continue; const A=byId[m.a],B=byId[m.b]; say(A,{t:"tplay",id:tid}); say(B,{t:"tplay",id:tid}); await sleep(30);
  const st=lastOf(A); console.log("  match", m.a,"v",m.b,"phase", st.game&&st.game.phase, "room", st.match); say(A,{t:"resign"}); await sleep(60); say(A,{t:"home"}); say(B,{t:"home"}); await sleep(20);} }
await playRound(0); console.log("after r1:", JSON.stringify(T().rounds.map(r=>r.map(m=>m.w))));
await playRound(1); const t2=T(); console.log("status:", t2.status, "champion:", t2.champion, "| champion note:", [a,b,c,d].map(x=>x.inbox.filter(m=>m.t==="note"&&/won Friday Cup/.test(m.title)).length).join(","));
await sleep(100); const champ=byId[t2.champion]; console.log("champ achievements:", champ.inbox.filter(m=>m.t==="note"&&m.kind==="ach").map(m=>m.title).join(", "));
process.exit(0);
