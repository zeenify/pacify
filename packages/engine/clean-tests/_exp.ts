import { resolveRound, TOTAL_ROUNDS, SCORE_THRESHOLD, CATALOGUE } from "../src/index.js";

function makeSearch(oppSkill:number){
  const T=1.5;
  const memo=new Map<string,number>(); const smemo=new Map<string,Map<any,number>>();
  function key(s:any){ return [s.round,s.kScore,s.oScore,s.echoNext?1:0,s.shieldOff,s.klein.map((c:any)=>c.id).sort().join(","),s.opp.map((c:any)=>c.id).sort().join(",")].join("|"); }
  function out(k:number,o:number){ if(k>=SCORE_THRESHOLD&&k>o)return 1; if(o>=SCORE_THRESHOLD&&o>k)return 0; if(k>o)return 1; if(k<o)return 0; return 0.5; }
  function term(s:any){ return s.round>TOTAL_ROUNDS||s.kScore>=SCORE_THRESHOLD||s.oScore>=SCORE_THRESHOLD; }
  function nxt(s:any,kc:any,oc:any){ const r=resolveRound({p1Card:oc,p2Card:kc,p1Score:s.oScore,p2Score:s.kScore,round:s.round,echoNext:s.echoNext,shieldOff:s.shieldOff}); return {round:s.round+1, klein:s.klein.filter((c:any)=>c.id!==kc.id), opp:s.opp.filter((c:any)=>c.id!==oc.id), kScore:r.p2Score, oScore:r.p1Score, echoNext:r.echoNext, shieldOff:r.shieldOffAfter}; }
  function strat(s:any){ const k=key(s); const h=smemo.get(k); if(h)return h; const vals=s.opp.map((oc:any)=>{ let t=0; for(const kc of s.klein){ const r=resolveRound({p1Card:oc,p2Card:kc,p1Score:s.oScore,p2Score:s.kScore,round:s.round,echoNext:s.echoNext,shieldOff:s.shieldOff}); t+=r.p1Score-s.oScore; } return t/s.klein.length; }); const mx=Math.max(...vals); const sw=vals.map((v:number)=>Math.exp((v-mx)*T)); const su=sw.reduce((a:number,b:number)=>a+b,0); const d=new Map<any,number>(); s.opp.forEach((oc:any,i:number)=>{ const u=1/s.opp.length; const se=sw[i]/su; d.set(oc,(1-oppSkill)*u+oppSkill*se); }); smemo.set(k,d); return d; }
  function kbest(s:any){ if(term(s))return out(s.kScore,s.oScore); const k=key(s); const h=memo.get(k); if(h!==undefined)return h; const st=strat(s); let b=-1e9; for(const kc of s.klein) b=Math.max(b, hmove(s,kc,st)); memo.set(k,b); return b; }
  function hmove(s:any,kc:any,st:any){ let e=0; for(const oc of s.opp) e+=(st.get(oc)??0)*kbest(nxt(s,kc,oc)); return e; }
  function best(view:any){ const root={round:view.round, klein:view.myHand, opp:view.peeked||view.oppHand, kScore:view.myScore, oScore:view.oppScore, echoNext:view.echoNext, shieldOff:view.shieldOff}; memo.clear(); smemo.clear(); const st=strat(root); let bc=null,bv=-1e9; for(const kc of root.klein){ const v=hmove(root,kc,st); if(v>bv){bv=v;bc=kc;} } return bc; }
  return {best};
}
// fast sensible opponent: 1-ply, maximizes own expected score with full vision of Klein's hand
function sensibleCard(oHand:any[], kHand:any[], oScore:number, kScore:number, round:number, en:boolean, sh:number){
  let bestC=null,bv=-1e9;
  for(const oc of oHand){ let t=0; for(const kc of kHand){ const r=resolveRound({p1Card:oc,p2Card:kc,p1Score:oScore,p2Score:kScore,round,echoNext:en,shieldOff:sh}); t+=r.p1Score-oScore; } const v=t/kHand.length; if(v>bv){bv=v;bestC=oc;} }
  return bestC;
}
function makeRng(seed:number){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
function deal(rng:any){ const ids=CATALOGUE.map((c:any)=>c.id); for(let i=ids.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); const t=ids[i]; ids[i]=ids[j]; ids[j]=t; } return [ids.slice(0,7), ids.slice(7,14)]; }
function play(kSkill:number, oppRandom:boolean, seed:number){
  const rng=makeRng(seed); const [kIds,oIds]=deal(rng);
  let kHand=kIds.map((id:string)=>CATALOGUE.find((c:any)=>c.id===id));
  let oHand=oIds.map((id:string)=>CATALOGUE.find((c:any)=>c.id===id));
  const K=makeSearch(kSkill);
  let kS=0,oS=0,en=false,sh=0;
  for(let r=1;r<=7;r++){
    const kc=K.best({round:r, myHand:kHand, myScore:kS, oppScore:oS, echoNext:en, shieldOff:sh, peeked:oHand});
    let oc:any;
    if(oppRandom){ oc=oHand[Math.floor(rng()*oHand.length)]; }
    else { oc=sensibleCard(oHand,kHand,oS,kS,r,en,sh); }
    const rr=resolveRound({p1Card:oc, p2Card:kc, p1Score:oS, p2Score:kS, round:r, echoNext:en, shieldOff:sh});
    kS=rr.p2Score; oS=rr.p1Score; en=rr.echoNext; sh=rr.shieldOffAfter;
    kHand=kHand.filter((c:any)=>c.id!==kc.id); oHand=oHand.filter((c:any)=>c.id!==oc.id);
  }
  return kS>oS?1:(kS<oS?0:0.5);
}
const N=20;
for(const xs of [0,0.5,1.0]){
  let wp=0, wr=0;
  for(let s=1;s<=N;s++){ wp+=play(xs,false,s*131+7); wr+=play(xs,true,s*977+3); }
  console.log("Klein OPP_SKILL="+xs.toFixed(1)+"  vs SENSIBLE opp winRate="+(wp/N).toFixed(3)+"   vs RANDOM opp winRate="+(wr/N).toFixed(3));
}
