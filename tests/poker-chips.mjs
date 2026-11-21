const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const G=(await import("../src/cards.ts")).default({shuffle}); const m=G.poker;
let max=0,tot=0,n=0;
for(let g=0;g<5;g++){const s=m.init(8);
 for(;;){ const t=m.turn(s); if(t==null){const r=m.tick(s); if(r.done)break; const sum=s.stacks.reduce((a,b)=>a+b,0)+s.contrib.reduce((a,b)=>a+b,0); if(sum!==8000) throw new Error("chips "+sum); continue;}
  const t0=performance.now(); const mv=m.bot(s,t,"hard"); const d=performance.now()-t0; max=Math.max(max,d); tot+=d; n++;
  const r=m.move(s,t,mv); if(r.err) throw new Error(r.err); if(r.done)break; }}
console.log("decisions",n,"avg ms",(tot/n).toFixed(1),"max ms",max.toFixed(1));
