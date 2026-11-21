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
const a=mk("a","Ann","call1"), b=mk("b","Bob","call1"), c=mk("c","Cat","call1");
await W.open(a); await W.open(b); await W.open(c);
say(a,{t:"pick",game:"chess"});
let sa=lastOf(a), sb=lastOf(b);
console.log("Ann at table:", sa.table, sa.game&&sa.game.type, "| Bob still in hub:", sb.table==="", "game shown to Bob:", !!sb.game, "Bob sees tables:", sb.tables.map(t=>t.type+"/"+t.phase).join(","));
console.log("Bob got invite:", b.inbox.some(m=>m.t==="invite"&&m.game==="chess"), "members in call for Bob:", sb.members.length);
// Bob opens a second chess table at the same time
say(b,{t:"pick",game:"chess"}); sb=lastOf(b); sa=lastOf(a);
console.log("two chess tables:", sa.tables.filter(t=>t.type==="chess").length, "Bob table != Ann table:", sb.table!==sa.table);
// Cat joins Ann's table and they play; Bob plays a bot
const annT=sa.table; say(c,{t:"jointable",room:annT,sit:true}); let sc=lastOf(c);
console.log("Cat seated at Ann's table:", sc.table===annT, sc.game.seats.length);
say(a,{t:"start"}); say(b,{t:"addbot",level:"easy"}); say(b,{t:"start"});
sa=lastOf(a); sb=lastOf(b);
console.log("both playing:", sa.game.phase, sb.game.phase, "Ann yourTurn:", sa.game.yourTurn, "Cat yourTurn:", lastOf(c).game.yourTurn, "turnTotal:", sa.game.turnTotal);
// Cat leaves mid-game -> bot takes over
say(c,{t:"leavetable"}); sc=lastOf(c); sa=lastOf(a);
console.log("Cat back in hub:", sc.table==="", "Ann's seat 2 now:", sa.game.seats[1].name, sa.game.seats[1].bot, "Ann notified:", a.inbox.some(m=>m.t==="err"&&/took over/.test(m.msg)));
// Ann leaves with only a bot -> table removed
say(a,{t:"leavetable"}); await sleep(30); sa=lastOf(a);
console.log("Ann home:", sa.table==="", "tables left:", sa.tables.map(t=>t.type+"/"+t.phase).join(","));
// reconnect into a playing table
const bt=lastOf(b).table, gid=lastOf(b).game.id; W.close(b); await sleep(20);
const b2=mk("b","Bob","call1"); await W.open(b2); const sb2=lastOf(b2);
console.log("Bob reconnected to his table:", sb2.table===bt, sb2.game&&sb2.game.id===gid);
// lobby host leaves while someone watches: table closes, watcher sent home
say(a,{t:"pick",game:"ttt"}); const tt=lastOf(a).table; say(c,{t:"jointable",room:tt}); say(a,{t:"leavetable"});
console.log("watcher sent home when lobby closed:", lastOf(c).table==="", "ttt table gone:", !lastOf(c).tables.some(t=>t.room===tt));
// different call can't join
const z=mk("z","Zed","call2"); await W.open(z); say(z,{t:"jointable",room:bt}); console.log("other call blocked:", z.inbox.some(m=>m.t==="err"));
process.exit(0);
