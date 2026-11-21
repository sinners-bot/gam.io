const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const G=(await import("../src/cards.ts")).default({shuffle});
function play(id,levels,verbose){
  const m=G[id], s=m.init(levels.length); let steps=0;
  for(;;){
    if(++steps>200000) throw new Error(id+" stuck");
    let t=m.turn(s); if(t==null && m.pending){const p=m.pending(s); if(p.length) t=p[0];}
    if(t==null){ if(!s.deadline) throw new Error(id+" no actor no deadline "+s.phase); const r=m.tick(s); if(r.done) return {r,s,steps}; continue; }
    const v=m.view(s,t); JSON.stringify(v);
    const mv=m.bot(s,t,levels[t]); const r=m.move(s,t,mv);
    if(r.err) throw new Error(id+" bot err "+r.err+" "+JSON.stringify(mv)+" phase "+s.phase);
    if(r.done) return {r,s,steps};
  }
}
const N=+process.argv[2]||40;
for(const [id,n] of [["clash",4],["clash",2],["hearts",4],["spades",4],["poker",2],["poker",6]]){
  let t0=Date.now(), wins={};
  for(let k=0;k<N;k++){
    const lv=Array.from({length:n},(_,i)=>i%2?"hard":"easy");
    const {r}=play(id,lv); for(const w of (r.winners||[r.winner])) if(w!=null) wins[lv[w]]=(wins[lv[w]]||0)+1;
  }
  console.log(id,n,"games",N,"wins by level",JSON.stringify(wins),"ms/game",Math.round((Date.now()-t0)/N));
}
