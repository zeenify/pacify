import { resolveRound, TOTAL_ROUNDS, SCORE_THRESHOLD, CATALOGUE } from "../src/index.js";
import * as fs from "fs";

const T = 1.5, SK = 0.0;
type St = any;
const memo = new Map<string, number>();
const smemo = new Map<string, Map<any, number>>();
function key(s: any){ return [s.round,s.kScore,s.oScore,s.echoNext?1:0,s.shieldOff,s.klein.map((c:any)=>c.id).sort().join(","),s.opp.map((c:any)=>c.id).sort().join(",")].join("|"); }
function out(k:number,o:number){ if(k>=SCORE_THRESHOLD&&k>o)return 1; if(o>=SCORE_THRESHOLD&&o>k)return 0; if(k>o)return 1; if(k<o)return 0; return 0.5; }
function term(s:any){ return s.round>TOTAL_ROUNDS||s.kScore>=SCORE_THRESHOLD||s.oScore>=SCORE_THRESHOLD; }
function nxt(s:any,kc:any,oc:any){ const r=resolveRound({p1Card:oc,p2Card:kc,p1Score:s.oScore,p2Score:s.kScore,round:s.round,echoNext:s.echoNext,shieldOff:s.shieldOff}); return {round:s.round+1, klein:s.klein.filter((c:any)=>c.id!==kc.id), opp:s.opp.filter((c:any)=>c.id!==oc.id), kScore:r.p2Score, oScore:r.p1Score, echoNext:r.echoNext, shieldOff:r.shieldOffAfter}; }
function strat(s:any){ const k=key(s); const h=smemo.get(k); if(h)return h; const vals=s.opp.map((oc:any)=>{ let t=0; for(const kc of s.klein){ const r=resolveRound({p1Card:oc,p2Card:kc,p1Score:s.oScore,p2Score:s.kScore,round:s.round,echoNext:s.echoNext,shieldOff:s.shieldOff}); t+=r.p1Score-s.oScore; } return t/s.klein.length; }); const mx=Math.max(...vals); const sw=vals.map((v:number)=>Math.exp((v-mx)*T)); const su=sw.reduce((a:number,b:number)=>a+b,0); const d=new Map<any,number>(); s.opp.forEach((oc:any,i:number)=>{ const u=1/s.opp.length; const se=sw[i]/su; d.set(oc,(1-SK)*u+SK*se); }); smemo.set(k,d); return d; }
function kbest(s:any){ if(term(s))return out(s.kScore,s.oScore); const k=key(s); const h=memo.get(k); if(h!==undefined)return h; const st=strat(s); let b=-1e9; for(const kc of s.klein) b=Math.max(b, hmove(s,kc,st)); memo.set(k,b); return b; }
function hmove(s:any,kc:any,st:any){ let e=0; for(const oc of s.opp) e+=(st.get(oc)??0)*kbest(nxt(s,kc,oc)); return e; }
function win(root:any){ memo.clear(); smemo.clear(); return kbest(root); }
function rootS(kh:any,oh:any){ return {round:1, klein:kh, opp:oh, kScore:0, oScore:0, echoNext:false, shieldOff:0}; }
function stateAt(ko:any,yo:any,r:number){ let kS=0,oS=0,en=false,sh=0; for(let i=1;i<r;i++){ const rr=resolveRound({p1Card:CATALOGUE.find((c:any)=>c.name.toLowerCase()===yo[i-1].toLowerCase()), p2Card:CATALOGUE.find((c:any)=>c.name.toLowerCase()===ko[i-1].toLowerCase()), p1Score:oS,p2Score:kS,round:i,echoNext:en,shieldOff:sh}); kS=rr.p2Score; oS=rr.p1Score; en=rr.echoNext; sh=rr.shieldOffAfter; } return {round:r, klein:ko.slice(r-1).map((n:string)=>CATALOGUE.find((c:any)=>c.name.toLowerCase()===n.toLowerCase())), opp:yo.slice(r-1).map((n:string)=>CATALOGUE.find((c:any)=>c.name.toLowerCase()===n.toLowerCase())), kScore:kS, oScore:oS, echoNext:en, shieldOff:sh}; }
const byName=(n:string)=>CATALOGUE.find((c:any)=>c.name.toLowerCase()===n.toLowerCase());
const txt=fs.readFileSync("duel-live-log.txt","utf8");
const blocks=txt.split("=== DUEL seed:").slice(1);
console.log("seed        kleinWin  youWin(handed)  diff     result");
for(const b of blocks){
  const lines=b.split("\n").map((l:string)=>l.trim()).filter(Boolean);
  const seedNum=(b.match(/(\d+)/)||[])[1];
  const handLine=lines.find((l:string)=>l.startsWith("Klein hand:"));
  const mm=handLine.match(/Klein hand:\s*([^|]+)\|\s*Klein locked:\s*(\w+)/);
  const first=mm[2];
  const ko:string[]=[first];
  for(const l of lines){ const x=l.match(/R\d+ Klein locked:\s*(\w+)/); if(x) ko.push(x[1]); }
  const yo:string[]=[];
  for(const l of lines){ const x=l.match(/R(\d+): You (\w+) vs Klein/); if(x) yo[parseInt(x[1])-1]=x[2]; }
  const kh=ko.map(byName), yh=yo.map(byName);
  const kw=win(rootS(kh,yh));
  const yw=win(rootS(yh,kh));
  const fin=lines.find((l:string)=>l.startsWith("FINAL"))||"";
  console.log(seedNum.padEnd(11), kw.toFixed(3).padStart(7), yw.toFixed(3).padStart(11), (kw-yw).toFixed(3).padStart(9), "  ", fin.replace("FINAL ",""));
  if(seedNum==="487029"){
    for(const r of [3,4]){
      const st=stateAt(ko,yo,r);
      memo.clear(); smemo.clear();
      const sm=strat(st);
      const vals=st.klein.map((kc:any)=>({name:kc.name, v:hmove(st,kc,sm)}));
      vals.sort((a:any,b:any)=>b.v-a.v);
      console.log("   seed 487029 R"+r+" (score "+st.kScore+"-"+st.oScore+") per-move win-prob:");
      for(const x of vals) console.log("      ", x.name.padEnd(11), x.v.toFixed(4), x.name===ko[r-1]?"<-- ACTUAL":"");
    }
  }
}
