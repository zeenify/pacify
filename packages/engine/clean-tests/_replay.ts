import { resolveRound, TOTAL_ROUNDS, SCORE_THRESHOLD, CATALOGUE } from "../src/index.js";
import * as fs from "fs";

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
const byName=(n:string)=>CATALOGUE.find((c:any)=>c.name.toLowerCase()===n.toLowerCase());
const txt=fs.readFileSync("duel-live-log.txt","utf8");
const blocks=txt.split("=== DUEL seed:").slice(1);
const matches:any[]=[];
for(const b of blocks){
  const lines=b.split("\n").map((l:string)=>l.trim()).filter(Boolean);
  const seedNum=(b.match(/(\d+)/)||[])[1];
  const handLine=lines.find((l:string)=>l.startsWith("Klein hand:"));
  const mm=handLine.match(/Klein hand:\s*([^|]+)\|\s*Klein locked:\s*(\w+)/);
  const ko:string[]=[mm[2]];
  for(const l of lines){ const x=l.match(/R\d+ Klein locked:\s*(\w+)/); if(x) ko.push(x[1]); }
  const yo:string[]=[];
  for(const l of lines){ const x=l.match(/R(\d+): You (\w+) vs Klein/); if(x) yo[parseInt(x[1])-1]=x[2]; }
  matches.push({seed:seedNum, ko, yo, actual:lines.find((l:string)=>l.startsWith("FINAL"))||""});
}
// validation: replay with LOG's actual Klein cards (ko) forced; must match actual FINAL
let bad=0;
for(const m of matches){
  let kS=0,oS=0,en=false,sh=0;
  for(let r=1;r<=7;r++){
    const kc=byName(m.ko[r-1]); const oc=byName(m.yo[r-1]);
    const rr=resolveRound({p1Card:oc,p2Card:kc,p1Score:oS,p2Score:kS,round:r,echoNext:en,shieldOff:sh});
    kS=rr.p2Score; oS=rr.p1Score; en=rr.echoNext; sh=rr.shieldOffAfter;
  }
  const num=m.actual.match(/(\d+)-(\d+)/); const youA=parseInt(num[1]), kleinA=parseInt(num[2]);
  if(kS!==kleinA||oS!==youA){ bad++; console.log("  MISMATCH seed "+m.seed+": forced replay Klein="+kS+" You="+oS+" but log says Klein="+kleinA+" You="+youA); }
}
console.log("VALIDATION forced(log cards) vs actual log: "+(matches.length-bad)+"/"+matches.length+" matched\n");

function replay(m:any, oppSkill:number){
  const K=makeSearch(oppSkill);
  let kleinHand=m.ko.map(byName);
  const youAll=m.yo.map(byName);
  let kS=0,oS=0,en=false,sh=0;
  for(let r=1;r<=7;r++){
    const played=m.yo.slice(0,r-1).map((n:string)=>n.toLowerCase());
    const youRem=youAll.filter((c:any)=>!played.includes(c.name.toLowerCase()));
    if(kleinHand.length===0) break;
    const kc=K.best({round:r, myHand:kleinHand, myScore:kS, oppScore:oS, echoNext:en, shieldOff:sh, peeked:youRem});
    const oc=byName(m.yo[r-1]);
    const rr=resolveRound({p1Card:oc, p2Card:kc, p1Score:oS, p2Score:kS, round:r, echoNext:en, shieldOff:sh});
    kS=rr.p2Score; oS=rr.p1Score; en=rr.echoNext; sh=rr.shieldOffAfter;
    kleinHand=kleinHand.filter((c:any)=>c.id!==kc.id);
  }
  return {kS, oS, win:kS>oS?1:(kS<oS?0:0.5)};
}
for(const sk of [0,0.1,0.2,0.3,0.5,1.0]){
  let w=0, tot=0; const rows:string[]=[];
  for(const m of matches){ const r=replay(m, sk); w+=r.win; tot+=(r.kS-r.oS); rows.push(m.seed+":"+(r.kS>=r.oS?"+":"")+(r.kS-r.oS)); }
  console.log("OPP_SKILL="+sk.toFixed(1)+"  Klein W/L="+w+"/"+(matches.length-w)+"  avgMargin="+(tot/matches.length).toFixed(2));
  console.log("   "+rows.join("  "));
}
