// Runs the real server in-process and drives real browser pages against it (WebSocket bridged through Playwright).
import fs from "fs"; import crypto from "crypto";
import { chromium } from "/home/claude/.npm-global/lib/node_modules/playwright/index.mjs";
const hash=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))|0;return h>>>0;};
const U=["ui1","ui2","ui3","ui4","ui5","ui6","ui7"].map(x=>"https://"+x+".x");
let servers=[]; globalThis.Bun={env:{AFK_SECONDS:process.env.AFK||"60",ASSETS_URLS:U.join(","),PLUGIN_URLS:U.slice(1,5).join(",")},write:async(f,t)=>fs.writeFileSync(f,t),build:async()=>({success:true,outputs:[{text:async()=>""}]}),serve(o){servers.push(o);return{}},hash,
 CryptoHasher:class{constructor(){this.h=crypto.createHash("sha256")}update(t){this.h.update(t);return this}digest(e){return this.h.digest(e)}}};
for (const f of ["ui","ui2","ui3","ui4","ui5","ui6","ui7"]) await import("./"+f+".ts");
const FAST={"https://ui3.x/games.ts":"cards_fast.ts","https://ui4.x/games.ts":"extra_fast.ts","https://ui5.x/games.ts":"bluff_fast.ts"};
globalThis.fetch=async(u)=>{u=String(u); if(FAST[u]) return new Response(fs.readFileSync(FAST[u],"utf8")); const i=U.findIndex(p=>u.startsWith(p)); if(i>=0) return servers[i].fetch(new Request(u)); return new Response("offline",{status:503})};
await import("./server_c.ts"); const srv=servers[7], W=srv.websocket;
const js=await (await srv.fetch(new Request("http://x/client.js"),{})).text();
const html=await (await srv.fetch(new Request("http://x/"),{})).text();
const css=html.match(/<style>([\s\S]*)<\/style>/)[1];
export const browser=await chromium.launch();
export async function player(name, room, vp){
  const p=await browser.newPage({viewport:vp||{width:1280,height:860}}); const errs=[]; p.on("pageerror",e=>errs.push(e.message)); p.on("console",m=>{if(m.type()==="error")errs.push(m.text())});
  const socks={};
  await p.exposeFunction("__wsOpen", async (id,url)=>{
    let data=null; await srv.fetch(new Request("http://x"+url.replace(/^wss?:\/\/[^/]+/,"")),{upgrade:(r,o)=>{data=o.data;return true}});
    const ws={data,send:(m)=>p.evaluate(([id,m])=>window.__wsDeliver(id,m),[id,m]).catch(()=>{})}; socks[id]=ws; await W.open(ws);
  });
  await p.exposeFunction("__wsSend",(id,m)=>W.message(socks[id],m));
  await p.addInitScript(([name])=>{
    try{localStorage.setItem("gn_name",name); localStorage.setItem("gn_gid",name.toLowerCase());}catch(e){}
    let n=0; const all={}; window.__wsDeliver=(id,m)=>{const w=all[id]; if(w&&w.onmessage) w.onmessage({data:m});};
    window.WebSocket=function(url){const id=++n; all[id]=this; this.readyState=0; const L=[]; this.addEventListener=(t,f)=>{if(t==="open")L.push(f)}; this.send=(m)=>window.__wsSend(id,m); this.close=()=>{};
      window.__wsOpen(id,url).then(()=>{this.readyState=1; this.onopen&&this.onopen(); L.forEach(f=>f());});};
    window.WebSocket.OPEN=1;
  },[name]);
  await p.route("http://gam.test/**", async (r)=>{ const u=new URL(r.request().url()); const res=await srv.fetch(new Request("http://x"+u.pathname+u.search),{}); r.fulfill({status:res.status,headers:{"content-type":res.headers.get("content-type")||"text/plain"},body:await res.text()}); });
  await p.goto("http://gam.test/?room="+room);
  await p.waitForTimeout(400);
  p.errs=errs; return p;
}
