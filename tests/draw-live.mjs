import { browser, player } from "./live_sim.mjs";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ann=await player("Ann","call6"), bob=await player("Bob","call6");
// count full re-renders on Bob's side
await bob.evaluate(()=>{ window.__renders=0; new MutationObserver(m=>{ if(m.some(x=>x.target.id==="app")) window.__renders++; }).observe(document.getElementById("app"),{childList:true}); });
await ann.click('[data-act="nav"][data-view="games"]'); await sleep(150); await ann.click('[data-act="pick"][data-game="draw"]'); await sleep(400);
await bob.click('.gx-iv [data-gx="tjoin"]'); await sleep(300); await ann.click('[data-act="start"]'); await sleep(500);
// whoever is drawer picks a word
let drawer=null, guesser=null;
for (const p of [ann,bob]) if (await p.$('[data-act="dpick"]')) { drawer=p; guesser=p===ann?bob:ann; }
await drawer.click('[data-act="dpick"]'); await sleep(500);
const box=await (await drawer.$("#dgc")).boundingBox();
const r0=await guesser.evaluate(()=>window.__renders||0);
// draw a spiral-ish line
await drawer.mouse.move(box.x+80, box.y+80); await drawer.mouse.down();
const t0=Date.now();
for (let i=0;i<120;i++){ const a=i/10; await drawer.mouse.move(box.x+box.width/2+Math.cos(a)*(20+i*1.5), box.y+box.height/2+Math.sin(a)*(20+i*1.2)); }
await drawer.mouse.up(); const dt=Date.now()-t0; await sleep(300);
// second stroke in red
await drawer.click('.tools .sw:nth-child(3)'); await sleep(100);
await drawer.mouse.move(box.x+40, box.y+box.height-40); await drawer.mouse.down(); await drawer.mouse.move(box.x+box.width-40, box.y+40,{steps:30}); await drawer.mouse.up(); await sleep(400);
const r1=await guesser.evaluate(()=>window.__renders||0);
await drawer.screenshot({path:"../sk/d_drawer.png"}); await guesser.screenshot({path:"../sk/d_guesser.png"});
const px=async(p)=>p.evaluate(()=>{const c=document.getElementById("dgc"),d=c.getContext("2d").getImageData(0,0,1000,700).data;let ink=0,white=0;for(let i=0;i<d.length;i+=16){ if(d[i]>245&&d[i+1]>245&&d[i+2]>245) white++; else ink++;} return {ink,white};});
console.log("draw 120 moves took", dt, "ms | guesser full re-renders during drawing:", r1-r0);
console.log("drawer pixels", JSON.stringify(await px(drawer)), "guesser pixels", JSON.stringify(await px(guesser)));
// undo removes the whole red stroke
await drawer.click('[data-act="dundo"]'); await sleep(400);
console.log("after undo drawer", JSON.stringify(await px(drawer)), "guesser", JSON.stringify(await px(guesser)));
// a guess re-renders but canvas keeps content
await guesser.fill("#dg-in","banana"); await guesser.press("#dg-in","Enter"); await sleep(400);
console.log("after chat guesser", JSON.stringify(await px(guesser)));
console.log("errors:", ann.errs.concat(bob.errs).join(" | ")||"none");
await browser.close(); process.exit(0);
