import { resolveRound, TOTAL_ROUNDS, SCORE_THRESHOLD, CATALOGUE } from "../src/index.js";
import * as fs from "fs";
const SK=0.5;
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
  function rank(view:any){ const root={round:view.round, klein:view.myHand, opp:view.peeked||view.oppHand, kScore:view.myScore, oScore:view.oppScore, echoNext:view.echoNext, shieldOff:view.shieldOff}; memo.clear(); smemo.clear(); const st=strat(root); const arr=root.klein.map((kc:any)=>({card:kc, val:hmove(root,kc,st)})); arr.sort((a:any,b:any)=>b.val-a.val); return arr; }
  return {rank};
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
  matches.push({seed:seedNum, ko, yo, finalLine:lines.find((l:string)=>l.startsWith("FINAL"))||""});
}
let totalMatch=0, totalRounds=0, mismatches:string[]=[];
for(const m of matches){
  const K=makeSearch(SK);
  let kS=0,oS=0,en=false,sh=0; const recon:any[]=[];
  // reconstruct round-by-round and capture brain rank vs actual
  let linesOut:string[]=[];
  let gameMatch=0;
  for(let r=1;r<=7;r++){
    const kc=byName(m.ko[r-1]); const oc=byName(m.yo[r-1]);
    const played=m.yo.slice(0,r-1).map((n:string)=>n.toLowerCase());
    const youRem=m.yo.slice(r-1).map(byName).filter((c:any)=>!played.includes(c.name.toLowerCase()));
    const view={round:r, myHand:m.ko.slice(r-1).map(byName), myScore:kS, oppScore:oS, echoNext:en, shieldOff:sh, peeked:youRem};
    const ranked=K.rank(view);
    const bestName=ranked[0].card.name;
    const actualName=m.ko[r-1];
    const actualVal=(ranked.find((x:any)=>x.card.name.toLowerCase()===actualName.toLowerCase())||{val:NaN}).val;
    const match=bestName.toLowerCase()===actualName.toLowerCase();
    if(match) gameMatch++; else mismatches.push("seed "+m.seed+" R"+r+" Klein played "+actualName+" but brain best="+bestName+" (?"+(ranked[0].val-actualVal).toFixed(3)+")");
    const top3=ranked.slice(0,3).map((x:any)=>x.card.name+"("+x.val.toFixed(2)+")").join(", ");
    linesOut.push("  R"+r+" Klein="+actualName.padEnd(11)+(match?"?":"? BEST="+bestName)+"  | top: "+top3);
    const rr=resolveRound({p1Card:oc,p2Card:kc,p1Score:oS,p2Score:kS,round:r,echoNext:en,shieldOff:sh});
    kS=rr.p2Score; oS=rr.p1Score; en=rr.echoNext; sh=rr.shieldOffAfter;
  }
  totalMatch+=gameMatch; totalRounds+=7;
  console.log("=== seed "+m.seed+"  "+m.finalLine.replace("FINAL ","")+"  (brain@0.5 matched "+gameMatch+"/7) ===");
  linesOut.forEach((l:string)=>console.log(l));
}
console.log("\n=== QA SUMMARY ===");
console.log("Klein moves matched full-vision brain@0.5: "+totalMatch+"/"+totalRounds+" ("+(100*totalMatch/totalRounds).toFixed(1)+"%)");
if(mismatches.length===0) console.log("NO MISMATCHES — every Klein move equals the brain's deterministic best. Live loop passes full vision correctly.");
else { console.log(mismatches.length+" MISMATCH(ES):"); mismatches.forEach((x:string)=>console.log("  "+x)); }
