const N = (id: string) => ({ kind: id === "void" || id === "echo" || id === "oracle" ? "trick" : "number", id, name: id, power: id === "void" || id === "echo" ? null : 5, align: "good" });
const view = {
  myHand: ["paladin","knight","angel","vampire","demon","seraph","void"].map(N),
  oppHand: ["bandit","ogre","witch","wizard","valkyrie","leviathan","oracle"].map(N),
  myScore: 0, oppScore: 0, round: 1, echoNext: false, shieldOff: 0,
  burned: [], peeked: [], rngState: 1, studentId: 2, phase: "commit",
};
const res = await fetch("http://localhost:3001/ai-pick", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ view, characterId: 2 }),
});
const data = await res.json();
console.log("status:", res.status);
console.log("has prompt:", typeof data.prompt === "string" && data.prompt.length > 0);
console.log("has neurons:", typeof data.neurons === "number");
console.log("has latencyMs:", typeof data.latencyMs === "number");
console.log("has reasoningContent:", typeof data.reasoningContent === "string");
console.log("picked:", data.picked?.id, "poolSize:", Array.isArray(data.pool) ? data.pool.length : "n/a");
console.log("vFinite:", Array.isArray(data.pool) ? data.pool.every((p: any) => Number.isFinite(p.v)) : "n/a");
