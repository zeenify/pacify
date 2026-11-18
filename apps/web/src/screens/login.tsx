import { IonPage } from "@ionic/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { router } from "../lib/nav";
import { unlockSfx, unlockBgm } from "../lib/sfx";
import { P5Image } from "../components/P5Image";
import s from "./login.module.css";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

declare global {
  interface Window {
    google?: any;
  }
}

type Tab = "signin" | "register";
type FieldProps = {
  tab: Tab;
  setTab: (t: Tab) => void;
  u: string;
  setU: (v: string) => void;
  p: string;
  setP: (v: string) => void;
  e: string;
  setE: (v: string) => void;
  err: string | null;
  busy: boolean;
  onSubmit: () => void;
  onGoogle: () => void;
};

/* ---- Google Identity Services loader ---- */
function useGoogleInit(onCredential: (c: string) => void) {
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential;
  useEffect(() => {
    if (!CLIENT_ID) return;
    const w = window as any;
    const init = () => {
      try {
        w.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (r: any) => cbRef.current(r.credential),
        });
      } catch {}
    };
    if (w.google?.accounts?.id) return init();
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.head.appendChild(script);
  }, []);
}

/* game-native Google button — official popup, our styling */
function GoogleNativeBtn({ onGoogle }: { onGoogle: () => void }) {
  if (!CLIENT_ID) return null;
  return (
    <div className={`press ${s.gBtn}`} onClick={onGoogle}>
      <div className={`v ${s.gBadge}`}>
        <div className={`t ${s.gBadgeTxt}`}>G</div>
      </div>
      <div className={`t ${s.gLabel}`}>CONTINUE WITH GOOGLE</div>
      <div className={`t ${s.gArrow}`}>›</div>
    </div>
  );
}

/* crimson intake CTA — same cut-polygon button language as the start screen */
function InkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <div className={`press ${s.inkBtn}`} onClick={onPress}>
      <div className={`t ${s.inkBtnTxt}`}>{label}</div>
      <div className={`t ${s.inkBtnArrow}`}>›</div>
    </div>
  );
}

/* numbered field label — "01 PREFERRED USERNAME" */
function InkLabel({ n, text, opt }: { n: string; text: string; opt?: string }) {
  return (
    <div className={`v ${s.inkLabel}`}>
      <span className={`t ${s.inkNum}`}>{n}</span>
      <span className={`t`}>{text}</span>
      {opt ? <span className={`ti ${s.optInk}`}>{opt}</span> : null}
    </div>
  );
}

/* the case-file backdrop — paper and red cuts, ink shard, halftone, hazard */
function Backdrop({ tag }: { tag: string }) {
  return (
    <>
      <div className={`v ${s.redCut}`} aria-hidden="true" />
      <div className={`v ${s.paperCut}`} aria-hidden="true" />
      <div className={`v ${s.inkShard}`} aria-hidden="true" />
      <div className={`v ${s.halftone}`} aria-hidden="true" />
      <div className={`v ${s.cutLine}`} aria-hidden="true" />
      <P5Image src="/emblems/back-crest.png" resizeMode="contain" className={s.crestMark} />
      <div className={`t ${s.registration}`} aria-hidden="true">{tag}<br />ADMISSIONS</div>
      <div className={`v ${s.hazard}`} aria-hidden="true" />
    </>
  );
}

function Hero({ tagline }: { tagline: string }) {
  return (
    <main className={`v ${s.hero}`}>
      <div className={`t ${s.kicker}`}>VERTEX INSTITUTE // ADMISSIONS OFFICE</div>
      <h1 className={`t ${s.logo}`} data-text="PACIFY">PACIFY</h1>
      <div className={`t ${s.tagline}`}>{tagline}</div>
      <div className={`v ${s.heroMeta}`}>
        <span className={`t ${s.metaChip}`}>FORM VX—01</span>
        <span className={`t ${s.metaChipHot}`}>FIRST YEAR INTAKE</span>
        <span className={`t ${s.metaChip}`}>NO APPEALS</span>
      </div>
    </main>
  );
}

function Stamp() {
  return (
    <div className={`v ${s.stampIdleW}`} style={{ pointerEvents: "none" }}>
      <div className={`v ${s.bStampAbs}`} style={{ animation: "p5-slam 450ms 800ms both" }}>
        <div className={`t ${s.bStampTxt}`}>TOP SECRET</div>
      </div>
    </div>
  );
}

export default function Login() {
  const [tab, setTab] = useState<Tab>("register");
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [e, setE] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needName, setNeedName] = useState(false);
  const [nu, setNu] = useState("");

  // already logged in? straight to menu — unless username still unclaimed
  useEffect(() => {
    api("/auth/me")
      .then((user: any) => (user?.username ? router.replace("/load") : setNeedName(true)))
      .catch(() => {});
  }, []);

  function afterAuth(user: any) {
    if (user?.username) router.replace("/load");
    else setNeedName(true); // Google signup — claim a class name
  }

  async function submit() {
    if (busy) return;
    unlockSfx();
    unlockBgm(); // same gesture unlocks BGM for the whole session
    setErr(null);
    setBusy(true);
    try {
      if (tab === "register") {
        const user = await api("/auth/register", { username: u.trim(), password: p, email: e.trim() || undefined });
        afterAuth(user);
      } else {
        const user = await api("/auth/login", { username: u.trim(), password: p });
        afterAuth(user);
      }
    } catch (ex: any) {
      setErr(ex?.message ?? "SOMETHING WENT WRONG");
    } finally {
      setBusy(false);
    }
  }

  async function submitGoogle(credential: string) {
    setErr(null);
    try {
      const user = await api("/auth/google", { credential });
      afterAuth(user);
    } catch (ex: any) {
      setErr(ex?.message ?? "GOOGLE FAILED");
    }
  }

  useGoogleInit(submitGoogle);

  function onGoogle() {
    unlockSfx();
    unlockBgm(); // also unlock BGM
    const w = (window as any)?.google?.accounts?.id;
    if (!w) return setErr("GOOGLE STILL LOADING — ONE SEC");
    w.prompt();
  }

  async function confirmUsername() {
    if (busy) return;
    unlockSfx();
    unlockBgm();
    setErr(null);
    setBusy(true);
    try {
      await api("/auth/username", { username: nu.trim() });
      router.replace("/load");
    } catch (ex: any) {
      setErr(ex?.message ?? "SOMETHING WENT WRONG");
    } finally {
      setBusy(false);
    }
  }

  const fp: FieldProps = { tab, setTab, u, setU, p, setP, e, setE, err, busy, onSubmit: submit, onGoogle };

  if (needName) {
    return (
      <IonPage>
        <div className={`v ${s.stage}`}>
          <Backdrop tag="VX—00" />
          <div className={`v ${s.frame}`}>
            <Hero tagline="ONE LAST STAMP." />
            <section className={`v ${s.dossier}`}>
              <form
                className={`v ${s.bCard}`}
                onSubmit={(ev) => {
                  ev.preventDefault();
                  confirmUsername();
                }}
              >
                <Stamp />
                <div className={`t ${s.formKicker}`}>IDENTITY CHECK // FORM VX—01B</div>
                <div className={`t ${s.bFormTitle}`}>CHOOSE YOUR CLASS NAME</div>
                <div className={`t ${s.bFormSub}`}>THIS IS HOW THE THIRTEEN WILL KNOW YOU</div>

                <InkLabel n="01" text="USERNAME" opt="3-20 CHARS // A-Z 0-9 _" />
                <input
                  value={nu}
                  onChange={(ev) => setNu(ev.target.value)}
                  autoCapitalize="none"
                  autoComplete="off"
                  placeholder="e.g. seat_01"
                  className={`t ${s.inkInput}`}
                />
                {err ? <div className={`t ${s.errInk}`}>{err}</div> : null}

                <div className={`v ${s.btnRow}`}>
                  <InkButton label={busy ? "..." : "CONFIRM"} onPress={confirmUsername} />
                </div>
              </form>
              <div className={`t ${s.fineprint}`}>THIS NAME IS FINAL — NO APPEALS AFTER FILING</div>
            </section>
          </div>
        </div>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <div className={`v ${s.stage}`}>
        <Backdrop tag="VX—00" />
        <SampleB {...fp} />
      </div>
    </IonPage>
  );
}

/* ---- folder tabs — active merges into the dossier ---- */
function Tabs({ f }: { f: FieldProps }) {
  return (
    <div className={`v ${s.folderTabs}`}>
      {(["register", "signin"] as const).map((k) => (
        <div
          key={k}
          onClick={() => f.setTab(k)}
          className={`press ${f.tab === k ? s.tabFolderOn : s.tabFolderOff}`}
        >
          <div className={`t ${s.tabTxtInk} ${f.tab === k ? s.tabTxtOn : ""}`}>
            {k === "register" ? "NEW STUDENT" : "SIGN IN"}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================= ENROLLMENT DOSSIER ================= */
function SampleB(f: FieldProps) {
  let fieldIdx = 0;
  const stagger = () => ({ animation: `p5-entrance 500ms ${250 + fieldIdx++ * 90}ms both` });
  return (
    <div className={`v ${s.frame}`}>
      <Hero tagline={f.tab === "register" ? "FILE YOUR ENTRY." : "REPORT TO THE TABLE."} />

      <section className={`v ${s.dossier}`}>
        <Tabs f={f} />

        {/* keyed by tab → remount slides content in the swap direction */}
        <div
          key={f.tab}
          className={`v ${s.cardSwap}`}
          style={{ animation: `${f.tab === "register" ? "p5-tabL" : "p5-tabR"} 340ms cubic-bezier(0.16,1,0.3,1) both` }}
        >
          <form
            className={`v ${s.bCard}`}
            onSubmit={(ev) => {
              ev.preventDefault();
              f.onSubmit();
            }}
          >
            <Stamp />

            <div className={`t ${s.formKicker}`}>
              {f.tab === "register" ? "INTAKE DOSSIER // FORM VX—01" : "RE-ENTRY SLIP // FORM VX—02"}
            </div>
            <div className={`t ${s.bFormTitle}`}>
              {f.tab === "register" ? "STUDENT ENROLLMENT" : "CLASS RE-ENTRY"}
            </div>
            <div className={`t ${s.bFormSub}`}>
              {f.tab === "register" ? "CREATE YOUR ACCOUNT" : "WELCOME BACK"}
            </div>

            <div className={`v`} style={stagger()}>
              <InkLabel n="01" text={f.tab === "register" ? "PREFERRED USERNAME" : "USERNAME ON RECORD"} />
              <input
                value={f.u}
                onChange={(ev) => f.setU(ev.target.value)}
                autoCapitalize="none"
                placeholder={f.tab === "register" ? "e.g. seat_01" : "your handle"}
                className={`t ${s.inkInput}`}
              />
            </div>

            <div className={`v`} style={stagger()}>
              <InkLabel n="02" text="SECRET PHRASE" opt="PASSWORD" />
              <input
                value={f.p}
                onChange={(ev) => f.setP(ev.target.value)}
                type="password"
                placeholder="min. 6 characters"
                className={`t ${s.inkInput}`}
              />
            </div>

            {f.tab === "register" && (
              <div className={`v`} style={stagger()}>
                <InkLabel n="03" text="EMAIL" opt="OPTIONAL" />
                <input
                  value={f.e}
                  onChange={(ev) => f.setE(ev.target.value)}
                  autoCapitalize="none"
                  type="email"
                  placeholder="for password recovery"
                  className={`t ${s.inkInput}`}
                />
              </div>
            )}

            {f.err ? <div className={`t ${s.errInk}`}>{f.err}</div> : null}

            <div className={`v ${s.btnRow}`} style={stagger()}>
              <InkButton label={f.busy ? "..." : f.tab === "register" ? "SUBMIT FORM" : "ENTER CLASS"} onPress={f.onSubmit} />
            </div>
            <GoogleNativeBtn onGoogle={f.onGoogle} />
          </form>
        </div>

        <div className={`t ${s.fineprint}`}>ALL FILINGS ARE FINAL — THE TABLE KEEPS NO SECRETS</div>
      </section>
    </div>
  );
}
