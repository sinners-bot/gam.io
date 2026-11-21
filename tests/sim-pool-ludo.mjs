const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const G=(await import("../src/extra.ts")).default({shuffle});
function play(id,levels){
  const m=G[id], s=m.init(levels.length); let steps=0, shots=0, maxFrames=0, botMs=0;
  for(;;){
    if(++steps>20000) throw new Error(id+" stuck");
    const t=m.turn(s);
    if(t==null){ const r=m.tick(s); if(r.done) return {r,steps,shots,maxFrames,botMs}; continue; }
    JSON.stringify(m.view(s,t));
    const t0=performance.now(); const mv=m.bot(s,t,levels[t]); botMs=Math.max(botMs,performance.now()-t0);
    const r=m.move(s,t,mv); if(mv.action==="shoot"){shots++; maxFrames=Math.max(maxFrames,s.replay?s.replay.frames.length:0);}
    if(r.err) throw new Error(id+" err "+r.err+" "+JSON.stringify(mv));
    if(r.done) return {r,steps,shots,maxFrames,botMs};
  }
}
const N=+process.argv[2]||20;
for(const [id,lv] of [["pool",["hard","easy"]],["pool",["easy","hard"]],["pool",["medium","medium"]],["ludo",["hard","easy"]],["ludo",["hard","easy","medium","easy"]]]){
  const wins={}; let sh=0,mf=0,bm=0;
  for(let k=0;k<N;k++){const {r,shots,maxFrames,botMs}=play(id,lv); const w=r.winner; if(w!=null) wins[lv[w]+w]=(wins[lv[w]+w]||0)+1; sh+=shots; mf=Math.max(mf,maxFrames); bm=Math.max(bm,botMs);}
  console.log(id,lv.join("/"),JSON.stringify(wins),"avg shots",(sh/N).toFixed(1),"max frames",mf,"max bot ms",bm.toFixed(0));
}
