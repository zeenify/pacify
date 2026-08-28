import { resolveRound, TOTAL_ROUNDS, SCORE_THRESHOLD, CATALOGUE } from "../src/index.js";
import * as fs from "fs";
const byName=(n:string)=>{ const c=CATALOGUE.find((x:any)=>x.name.toLowerCase()===n.toLowerCase()); return c; };
const isEcho=(c:any)=>c && (c.kind==="echo"||c.name.toLowerCase()==="echo");
const isEclipse=(c:any)=>c && (c.kind==="eclipse"||c.name.toLowerCase()==="eclipse");
const txt=fs.readFileSync("duel-live-log.txt","utf8");
const blocks=txt.split("=== DUEL seed:").slice(1);
console.log("total games in log:", blocks.length);
blocks.forEach((b:string, idx:number)=>{
  const lines=b.split("\n").map((l:string)=>l.trim()).filter(Boolean);
  const seedNum=(b.match(/(\d+)/)||[])[1]; if(!seedNum) return;
  const handLine=lines.find((l:string)=>l.startsWith("Klein hand:")); if(!handLine) return;
  const mm=handLine.match(/Klein hand:\s*([^|]+)\|\s*Klein locked:\s*(\w+)/); if(!mm) return;
  const ko:string[]=[mm[2]];
  for(const l of lines){ const x=l.match(/R\d+ Klein locked:\s*(\w+)/); if(x) ko.push(x[1]); }
  const yo:string[]=[];
  for(const l of lines){ const x=l.match(/R(\d+): You (\w+) vs Klein/); if(x) yo[parseInt(x[1])-1]=x[2]; }
  if(ko.length<7||yo.length<7) return;
  const half = idx<15 ? "mimo" : "hy3";
  let kS=0,oS=0,en=false,sh=0;
  for(let r=1;r<=7;r++){
    const kc=byName(ko[r-1]); const oc=byName(yo[r-1]); if(!kc||!oc) return;
    const rr=resolveRound({p1Card:oc,p2Card:kc,p1Score:oS,p2Score:kS,round:r,echoNext:en,shieldOff:sh});
    kS=rr.p2Score; oS=rr.p1Score; en=rr.echoNext; sh=rr.shieldOffAfter;
  }
  for(let r=1;r<=6;r++){
    const kc=byName(ko[r-1]);
    if(isEcho(kc)||isEclipse(kc)){
      const nextName=ko[r]; const nextCard=byName(nextName);
      const youNext=byName(yo[r]);
      const low = (nextCard.power??0) <= 4;
      const tag = (nextName.toLowerCase()==="ogre")?" [OGRE]":(low?" [LOW]":"");
      const reversalNext = youNext && (youNext.name.toLowerCase()==="reversal");
      console.log(`[${half}] seed ${seedNum}  R${r} Klein=${kc.name} -> R${r+1} Klein=${nextName}${tag} (pow ${nextCard.power??0}) | You@R${r+1}=${youNext?youNext.name:"?"} ${reversalNext?"<REVERSAL STEAL>":""}`);
    }
  }
});
