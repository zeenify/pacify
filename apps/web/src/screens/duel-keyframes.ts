/* DUEL keyframes — copied VERBATIM from the pre-migration _duel.styles.ts
   (the component injects this string once via a <style> tag). */
export const DUEL_KEYFRAMES = `
            @keyframes dFloat{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-10px) rotate(-1deg)}}
            @keyframes dHandIn{from{opacity:0;transform:translateY(90px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}
            @keyframes dFlipIn{0%{transform:perspective(700px) rotateX(78deg) translateY(26px) scale(.86);opacity:0}60%{transform:perspective(700px) rotateX(-12deg) translateY(0) scale(1.04);opacity:1}100%{transform:perspective(700px) rotateX(0) translateY(0) scale(1)}}
            @keyframes dImpact{0%{transform:translate(0,0) rotate(0)}20%{transform:translate(-9px,5px) rotate(-1.2deg)}40%{transform:translate(8px,-6px) rotate(1deg)}60%{transform:translate(-6px,3px) rotate(-.6deg)}80%{transform:translate(4px,-2px) rotate(.4deg)}100%{transform:translate(0,0) rotate(0)}}
            @keyframes dStampIn{0%{opacity:0;transform:scale(2.6) rotate(-18deg)}55%{opacity:1;transform:scale(.92) rotate(-8deg)}75%{transform:scale(1.08) rotate(-9deg)}100%{opacity:1;transform:scale(1) rotate(-9deg)}}
            @keyframes dBubbleIn{0%{opacity:0;transform:translateX(30px) skewX(-6deg) scale(.7)}70%{transform:translateX(-4px) skewX(-6deg) scale(1.05)}100%{opacity:1;transform:translateX(0) skewX(-6deg) scale(1)}}
            @keyframes dDots{0%,100%{opacity:.25}50%{opacity:1}}
            @keyframes dStripe{from{background-position:0 0}to{background-position:84px 0}}
            @keyframes dIntroT{0%{opacity:0;transform:scale(2.4) skewX(-14deg)}35%{opacity:1;transform:scale(1) skewX(-14deg)}80%{opacity:1;transform:scale(1) skewX(-14deg)}100%{opacity:0;transform:scale(1.1) skewX(-14deg)}}
            @keyframes dIntroPanel{0%{transform:translateX(0) skewX(-14deg)}100%{transform:translateX(-130%) skewX(-14deg)}}
            @keyframes dPanelL{0%{opacity:0;transform:translateX(-60%) skewX(-12deg)}100%{opacity:1;transform:translateX(0) skewX(-12deg)}}
            @keyframes dPanelR{0%{opacity:0;transform:translateX(60%) skewX(-12deg)}100%{opacity:1;transform:translateX(0) skewX(-12deg)}}
            @keyframes dTitleSlam{0%{opacity:0;transform:scale(3) rotate(-10deg)}60%{opacity:1;transform:scale(.94) rotate(-6deg)}80%{transform:scale(1.05) rotate(-7deg)}100%{opacity:1;transform:scale(1) rotate(-7deg)}}
            @keyframes dNumSlam{0%{opacity:0;transform:scale(2.2)}100%{opacity:1;transform:scale(1)}}
            @keyframes dPulse{0%,100%{transform:skewX(-10deg) scale(1)}50%{transform:skewX(-10deg) scale(1.04)}}
            @keyframes dLunge{0%{transform:scale(1)}35%{transform:scale(1.05) translateY(-8px)}100%{transform:scale(1)}}
            @keyframes dDotBounce{0%,100%{transform:translateY(0);opacity:.35}50%{transform:translateY(-14px);opacity:1}}
            @keyframes dSwapL{0%{transform:translateX(-90px);opacity:0}30%{opacity:1}100%{transform:translateX(90px);opacity:1}}
            @keyframes dSwapR{0%{transform:translateX(90px);opacity:0}30%{opacity:1}100%{transform:translateX(-90px);opacity:1}}
            @keyframes dShard{0%{opacity:1;transform:translate(0,0) rotate(0deg)}100%{opacity:0;transform:translate(0,-90px) rotate(220deg)}}
            @keyframes dFlyYou{0%{opacity:0;transform:translate(0,0) scale(.6)}12%{opacity:1;transform:translate(0,0) scale(1.2)}78%{opacity:1;transform:translate(-540px,122px) scale(1.45)}100%{opacity:0;transform:translate(-558px,130px) scale(1.15)}}
            @keyframes dFlyKlein{0%{opacity:0;transform:translate(0,0) scale(.6)}12%{opacity:1;transform:translate(0,0) scale(1.2)}78%{opacity:1;transform:translate(547px,-44px) scale(1.45)}100%{opacity:0;transform:translate(563px,-46px) scale(1.15)}}
            @keyframes dFlipBack{0%{transform:perspective(700px) rotateY(0deg) scale(1);opacity:1}100%{transform:perspective(700px) rotateY(92deg) scale(.94);opacity:0}}
            @keyframes dFlipFace{0%{transform:perspective(700px) rotateY(-92deg) scale(.9)}70%{transform:perspective(700px) rotateY(9deg) scale(1.04)}100%{transform:perspective(700px) rotateY(0deg) scale(1)}}
            @keyframes dShieldPop{0%{opacity:0;transform:scale(.4)}70%{opacity:1;transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}
            @keyframes dNullFlash{0%{opacity:0}12%{opacity:.95}60%{opacity:.35}100%{opacity:0}}
            @keyframes dShieldWave{0%{transform:scale(.25);opacity:.95}100%{transform:scale(2.9);opacity:0}}
            @keyframes dNullSmash{0%{transform:scale(1)}25%{transform:scale(1.3)}55%{transform:scale(.9) rotate(2deg);opacity:1}100%{transform:scale(.8) rotate(4deg);opacity:.12}}
            @keyframes dTickPulse{0%{transform:scale(1)}40%{transform:scale(1.28)}100%{transform:scale(1)}}
            @keyframes dLockIn{0%{transform:scale(1)}55%{transform:scale(1.55)}100%{transform:scale(1.38)}}
            @keyframes dLockOut{0%{transform:scale(1);opacity:1}100%{transform:scale(.6);opacity:.2}}
            @keyframes dCardWinY{0%{transform:scale(1);box-shadow:5px 7px 0 rgba(0,0,0,0.7)}60%{transform:scale(1.22);box-shadow:0 0 36px rgba(252,238,33,0.85), 5px 7px 0 rgba(0,0,0,0.7)}100%{transform:scale(1.15);box-shadow:0 0 30px rgba(252,238,33,0.7), 5px 7px 0 rgba(0,0,0,0.7)}}
            @keyframes dCardWinR{0%{transform:scale(1);box-shadow:5px 7px 0 rgba(0,0,0,0.7)}60%{transform:scale(1.22);box-shadow:0 0 36px rgba(255,77,94,0.85), 5px 7px 0 rgba(0,0,0,0.7)}100%{transform:scale(1.15);box-shadow:0 0 30px rgba(255,77,94,0.7), 5px 7px 0 rgba(0,0,0,0.7)}}
            @keyframes dCardLose{0%{opacity:1;transform:scale(1)}30%{transform:scale(1.05)}100%{opacity:.45;transform:scale(.94) rotate(2.5deg)}}
            @keyframes dShardOut{0%{opacity:1;transform:translate(0,0) rotate(0deg)}100%{opacity:0;transform:translate(0,-120px) rotate(260deg)}}
            @keyframes dShieldSlam{0%{opacity:0;transform:scale(2.2) rotate(-16deg)}60%{opacity:1;transform:scale(.9) rotate(-6deg)}80%{transform:scale(1.08) rotate(-8deg)}100%{opacity:1;transform:scale(1) rotate(-8deg)}}
            @keyframes dSBAura{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:.75;transform:scale(1.18)}}
            @keyframes dCrackIn{0%{opacity:0;transform:scale(1.7)}100%{opacity:1;transform:scale(1)}}
            @keyframes dShieldBreak{0%{opacity:1;transform:scale(1)}30%{transform:scale(1.15)}100%{opacity:0;transform:scale(.65)}}
            @keyframes dInfoPop{0%{opacity:0;transform:scale(.4) rotate(-9deg)}60%{opacity:1;transform:scale(1.08) rotate(1.8deg)}80%{transform:scale(.96) rotate(-2deg)}100%{opacity:1;transform:scale(1) rotate(-1.4deg)}}
            @keyframes dInfoFade{0%{opacity:0}100%{opacity:1}}
            @keyframes dRedPulse{0%,100%{box-shadow:0 0 0 rgba(230,0,18,0), 0 6px 18px rgba(0,0,0,0.8)}50%{box-shadow:0 0 26px rgba(230,0,18,0.85), 0 6px 18px rgba(0,0,0,0.8)}}
            @keyframes dHalfL{0%,100%{transform:rotate(-6deg) translateX(0)}50%{transform:rotate(-9deg) translateX(-3px)}}
            @keyframes dHalfR{0%,100%{transform:rotate(6deg) translateX(0)}50%{transform:rotate(9deg) translateX(3px)}}
            @keyframes dMultWobble{0%,100%{transform:rotate(-4deg) scale(1)}50%{transform:rotate(4deg) scale(1.07)}}
            @keyframes dTkPanelL{0%{opacity:0;transform:translate(-700px,-260px)}100%{opacity:1;transform:translate(0,0)}}
            @keyframes dTkPanelR{0%{opacity:0;transform:translate(700px,260px)}100%{opacity:1;transform:translate(0,0)}}
            @keyframes dTkPanelOutL{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(-700px,-260px)}}
            @keyframes dTkPanelOutR{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(700px,260px)}}
            @keyframes dTkSlashIn{0%{transform:rotate(16deg) scaleY(0);opacity:0}40%{opacity:1}100%{transform:rotate(16deg) scaleY(1);opacity:1}}
            @keyframes dTkSlashOut{0%{transform:rotate(16deg) scaleY(1);opacity:1}100%{transform:rotate(16deg) scaleY(0);opacity:0}}
            @keyframes dTkFadeIn{0%{opacity:0;transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}
            @keyframes dTkFadeOut{0%{opacity:1}100%{opacity:0}}
            @keyframes dTkShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-16px,10px)}40%{transform:translate(14px,-12px)}60%{transform:translate(-10px,7px)}80%{transform:translate(8px,-5px)}}
            @keyframes dTkHalfA{0%{opacity:0}1%{opacity:1}100%{opacity:0;transform:translate(-150px,-70px) rotateX(-75deg) rotateZ(-16deg)}}
            @keyframes dTkHalfB{0%{opacity:0}1%{opacity:1}100%{opacity:0;transform:translate(130px,100px) rotateX(55deg) rotateZ(12deg)}}
            @keyframes dTkCutFlash{0%{opacity:0;transform:scaleX(.2)}25%{opacity:1;transform:scaleX(1.1)}100%{opacity:0;transform:scaleX(1.3)}}
            @keyframes dTkNumGone{to{opacity:0}}
            @keyframes dTkBladeHold{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(8px) rotate(-1.4deg)}}
            @keyframes dTkBladeDrop{to{transform:translateY(235px)}}
            @keyframes dTkBladeStrain{0%{transform:translateY(0)}22%{transform:translateY(18px) rotate(1deg)}42%{transform:translateY(5px)}62%{transform:translateY(14px) rotate(-1.2deg)}82%{transform:translateY(8px)}100%{transform:translateY(11px)}}
            @keyframes dTkRopeStrain{0%{transform:none}22%{transform:translateY(9px)}42%{transform:translateY(3px)}62%{transform:translateY(7px)}82%{transform:translateY(4px)}100%{transform:translateY(5px)}}
            @keyframes dMeterFill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
            @keyframes dZonePulse{0%,100%{filter:brightness(1)}50%{filter:brightness(2.2) saturate(1.6)}}
            @keyframes dTkRopeSlack{to{transform:translateY(28px) scaleY(.5) skewX(7deg)}}
            @keyframes dChipDrain{0%,100%{boxShadow:0 0 0 0 rgba(230,0,18,0)}50%{boxShadow:0 0 32px 7px rgba(230,0,18,0.85)}}
            @keyframes dChipTick{0%{transform:scale(1.5);opacity:.3}100%{transform:scale(1);opacity:1}}
            @keyframes dDrainPop{0%{transform:scale(2.4) translateY(0);opacity:0}12%{transform:scale(1) translateY(0);opacity:1}30%{transform:scale(1.08) translateY(-6px)}100%{transform:scale(1) translateY(-64px);opacity:0}}
            @keyframes dMuRing{0%{transform:scale(.5);opacity:.95}100%{transform:scale(1.3);opacity:0}}
            /* the chip slurves into the number along a TRUE CURVE — offset-path
               traces a quadratic bezier arc. Progress easing is smooth from 0
               (no slow crawl at the start); the chip stays FULLY VISIBLE through
               the whole curve and only fades in the final dive (78%+), landing
               exactly at the impact beat. */
            @keyframes dMultChipFlyYou{
              0%{offset-distance:0%;opacity:1}
              100%{offset-distance:100%;opacity:1}
            }
            @keyframes dMultChipFlyFadeYou{
              0%,75%{opacity:1}
              100%{opacity:0}
            }
            @keyframes dMultChipFlyKlein{
              0%{offset-distance:0%;opacity:1}
              100%{offset-distance:100%;opacity:1}
            }
            @keyframes dMultChipFlyFadeKlein{
              0%,75%{opacity:1}
              100%{opacity:0}
            }
            /* continuous spin + shrink through the whole flight */
            @keyframes dMultChipSpin{
              0%{transform:rotate(-4deg) scale(1)}
              100%{transform:rotate(430deg) scale(.55)}
            }
            /* doubling beats — base number sucked small and out, final slams big in */
            @keyframes dMultDouble{0%{transform:scale(1);opacity:1}40%{transform:scale(1.25);opacity:1}100%{transform:scale(.2) rotate(14deg);opacity:0}}
            @keyframes dMultFinIn{0%{transform:scale(2.6) rotate(-8deg);opacity:0}55%{transform:scale(.9) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
            @keyframes dMultImpact{0%{transform:scale(.3) rotate(-20deg);opacity:0}35%{transform:scale(1.15) rotate(6deg);opacity:1}100%{transform:scale(1.5) rotate(14deg);opacity:0}}
            @keyframes dLetterSlam{0%{opacity:0;transform:scale(3.4) rotate(-14deg)}55%{opacity:1;transform:scale(.88) rotate(3deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
            /* VOID — maw mutation on the felt */
            @keyframes dVdFadeIn{from{opacity:0}to{opacity:1}}
            @keyframes dVdFadeOut{from{opacity:1}to{opacity:0}}
            @keyframes dVdMutate{0%{transform:perspective(500px) rotateX(0deg) scale(1);opacity:1;filter:brightness(1)}45%{transform:perspective(500px) rotateX(-40deg) scale(.94);opacity:1;filter:brightness(1.7)}100%{transform:perspective(500px) rotateX(-86deg) scale(.68);opacity:0;filter:brightness(2.4)}}
            @keyframes dVdDevourDown{0%{transform:perspective(600px) translateY(0) rotate(0deg) scale(1);opacity:1}14%{transform:perspective(600px) translateY(24px) rotate(4deg) scale(1.05,1.12);opacity:1}60%{transform:perspective(600px) translateY(104px) rotate(150deg) scale(.6,.8);opacity:1}100%{transform:perspective(600px) translateY(178px) rotate(330deg) scale(.05);opacity:0}}
            @keyframes dVdDevourUp{0%{transform:perspective(600px) translateY(0) rotate(0deg) scale(1);opacity:1}14%{transform:perspective(600px) translateY(-24px) rotate(-4deg) scale(1.05,1.12);opacity:1}60%{transform:perspective(600px) translateY(-104px) rotate(-150deg) scale(.6,.8);opacity:1}100%{transform:perspective(600px) translateY(-178px) rotate(-330deg) scale(.05);opacity:0}}
            @keyframes dVdIris{0%{transform:scale(.18);opacity:0}55%{transform:scale(1.09);opacity:1}100%{transform:scale(1);opacity:1}}
            @keyframes dVdPortalOut{to{transform:scale(.02) rotate(120deg);opacity:0}}
            @keyframes dVdPlaqueOut{to{opacity:0;transform:scale(.86) translateY(8px)}}
            /* ECHO — clash-void rings, chip pop + lob */
            @keyframes dEsWave{0%{transform:scale(.35);opacity:.95}100%{transform:scale(4.4);opacity:0}}
            @keyframes dEsChipPop{0%{transform:scale(0) rotate(-24deg)}60%{transform:scale(1.18) rotate(6deg)}100%{transform:scale(1) rotate(0deg)}}
            @keyframes dEsChipFly{from{offset-distance:0%}to{offset-distance:100%}}
            /* WARD — victim trick: flares while the eye charges, then the clip
               erosion tracks the canvas fire front 1:1 — the fire climbs the
               card from 2650ms to 4550ms = 42.7%→73.4% of this 6200ms clock
               (58% sits exactly on that line so the ramp stays linear). The
               card stays burned — a sticky hide keeps it off the table after
               the beat. */
            @keyframes dWdBurn{
              0%{transform:none;filter:brightness(1);clip-path:inset(0 0 0% 0)}
              8%{filter:brightness(1.7) saturate(1.5);clip-path:inset(0 0 0% 0)}
              16%{transform:none;filter:brightness(1.1);clip-path:inset(0 0 0% 0)}
              42.7%{transform:none;filter:grayscale(1) brightness(.6);clip-path:inset(0 0 0% 0)}
              58%{filter:grayscale(1) brightness(.42);clip-path:inset(0 0 50% 0)}
              73.4%{filter:grayscale(1) brightness(.3);clip-path:inset(0 0 100% 0)}
              88%{filter:grayscale(1) brightness(.3);clip-path:inset(0 0 100% 0);opacity:.6}
              100%{filter:grayscale(1) brightness(.3);clip-path:inset(0 0 100% 0);opacity:0}}
            @keyframes dWdActRing{0%{opacity:0;transform:scale(.8)}8%{opacity:1;transform:scale(1)}30%{transform:scale(1.04)}39%{opacity:0;transform:scale(1.5)}100%{opacity:0}}
            @keyframes dWdEyeOpen{0%{opacity:0;transform:scaleY(.04) scaleX(1.5)}55%{opacity:1;transform:scaleY(1.16) scaleX(.94)}75%{transform:scaleY(.96) scaleX(1.02)}100%{opacity:1;transform:scaleY(1) scaleX(1)}}
            @keyframes dWdEyeFlare{0%{opacity:0;transform:scale(.5)}45%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.3)}}
            @keyframes dWdEyeFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
            @keyframes dWdAshIn{from{opacity:0;transform:scaleY(.3)}to{opacity:.9;transform:scaleY(1)}}
            /* ORACLE — star-chart beat: faces burn through the constellation, the
               docked star pops, the peek star lands on its plate */
            @keyframes dOcFace{0%{opacity:0;transform:scale(1.3);filter:brightness(3) blur(7px)}55%{opacity:1;filter:brightness(1.7) blur(1px)}100%{opacity:1;transform:scale(1);filter:brightness(1)}}
            @keyframes dOcPop{0%{opacity:0;transform:scale(0)}60%{opacity:1;transform:scale(1.3)}100%{opacity:1;transform:scale(1)}}
            @keyframes dOcDock{0%{opacity:0;transform:scale(.2)}60%{opacity:1;transform:scale(1.25)}100%{opacity:1;transform:scale(1)}}
            @keyframes dEsCrackL{0%,100%{transform:translateX(0) rotate(0deg)}30%{transform:translateX(-5px) rotate(-3deg)}65%{transform:translateX(-3px) rotate(-2deg)}}
            @keyframes dEsCrackR{0%,100%{transform:translateX(0) rotate(0deg)}30%{transform:translateX(5px) rotate(3deg)}65%{transform:translateX(3px) rotate(2deg)}}
            @keyframes dEsCrackFlash{0%{opacity:0;transform:scaleY(.2)}35%{opacity:1;transform:scaleY(1)}100%{opacity:0;transform:scaleY(1.15)}}
            /* spent-chip deaths */
            @keyframes dChipDeath{0%{transform:scale(1);opacity:1}25%{transform:scale(1.14) rotate(-3deg)}55%{transform:scale(.9) rotate(6deg);opacity:.9}100%{transform:scale(.15) rotate(14deg);opacity:0}}
            @keyframes dShieldDeathL{0%{transform:none;opacity:1}100%{transform:translateX(-26px) rotate(-14deg);opacity:0}}
            @keyframes dShieldDeathR{0%{transform:none;opacity:1}100%{transform:translateX(26px) rotate(14deg);opacity:0}}
            /* spent-chip deaths */
            @keyframes dChipDeath{0%{transform:scale(1);opacity:1}25%{transform:scale(1.14) rotate(-3deg)}55%{transform:scale(.9) rotate(6deg);opacity:.9}100%{transform:scale(.15) rotate(14deg);opacity:0}}
            @keyframes dShieldDeathL{0%{transform:none;opacity:1}100%{transform:translateX(-26px) rotate(-14deg);opacity:0}}
            @keyframes dShieldDeathR{0%{transform:none;opacity:1}100%{transform:translateX(26px) rotate(14deg);opacity:0}}
            /* ROUND WIPE — enter / hold / exit sweep (2200ms). The panel (2400px
               wide on the 1600px stage) fully covers the screen at translateX 0:
               enter from -2600, HOLD ~700ms for the slam sequence, exit to +2600.
               The lead bar leads by a beat; the dark slab lags one. */
            @keyframes dRwLead{
              0%{transform:translateX(-2800px) skewX(-14deg)}
              26%{transform:translateX(0px) skewX(-14deg)}
              66%{transform:translateX(0px) skewX(-14deg)}
              100%{transform:translateX(2800px) skewX(-14deg)}
            }
            @keyframes dRwPanel{
              0%{transform:translateX(-2600px) skewX(-14deg)}
              34%{transform:translateX(0px) skewX(-14deg)}
              66%{transform:translateX(0px) skewX(-14deg)}
              100%{transform:translateX(2600px) skewX(-14deg)}
            }
            @keyframes dRwBack{
              0%{transform:translateX(-2400px) skewX(-14deg)}
              40%{transform:translateX(0px) skewX(-14deg)}
              62%{transform:translateX(0px) skewX(-14deg)}
              100%{transform:translateX(2400px) skewX(-14deg)}
            }
            @keyframes dRwBar{0%{transform:translateX(-1700px) skewX(-24deg)}100%{transform:translateX(1700px) skewX(-24deg)}}
            @keyframes dRwBurst{0%{opacity:0;transform:scale(.2) rotate(-40deg)}60%{opacity:1;transform:scale(1.12) rotate(6deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
            @keyframes dRwBurstOut{to{opacity:0;transform:scale(1.55) rotate(14deg)}}
            @keyframes dRwNumGone{to{opacity:0}}
            @keyframes dRwHalfA{0%{transform:none;opacity:1}100%{transform:translate(-150px,-110px) rotateX(-70deg) rotateZ(-14deg);opacity:0}}
            @keyframes dRwHalfB{0%{transform:none;opacity:1}100%{transform:translate(150px,120px) rotateX(50deg) rotateZ(10deg);opacity:0}}
            @keyframes dRwNumSlam{0%{opacity:0;transform:scale(3) rotate(-12deg)}55%{opacity:1;transform:scale(.94) rotate(-6deg)}80%{transform:scale(1.06) rotate(-7deg)}100%{opacity:1;transform:scale(1) rotate(-7deg)}}

            /* trick-cinematic camera dives + FX (durations bounded by the trick
               steps: void 4800 · eclipse 4000 · exec 4400 · execfail 3700) */
            @keyframes dCameraVoid{0%,100%{transform:perspective(1300px) scale(1) rotate(0)}38%{transform:perspective(1300px) scale(.975) rotate(.5deg)}58%{transform:perspective(1300px) scale(1.04) rotate(-.8deg)}68%{transform:perspective(1300px) scale(1.01) rotate(.3deg)}}
            @keyframes dCameraEclipse{0%,100%{transform:perspective(1400px) translateY(0) rotateX(0)}45%{transform:perspective(1400px) translateY(14px) rotateX(2deg)}70%{transform:perspective(1400px) translateY(-5px) rotateX(-1deg)}}
            @keyframes dCameraExec{0%,52%,100%{transform:translate(0,0) scale(1)}58%{transform:translate(-18px,10px) scale(1.035)}62%{transform:translate(14px,-9px) scale(1.035)}68%{transform:translate(-7px,4px) scale(1.015)}}
            @keyframes dTkTargetIn{0%{opacity:0;transform:translateY(-220px) translateZ(200px) rotateX(55deg) scale(1.3)}70%{opacity:1;transform:translateY(10px) translateZ(20px) rotateX(-5deg) scale(.96)}100%{opacity:1;transform:none}}
            @keyframes dTkTargetHead{0%{opacity:1;transform:none}18%{transform:translateY(8px) rotate(2deg)}100%{opacity:0;transform:translate(-48px,145px) translateZ(100px) rotateX(65deg) rotateZ(-32deg)}}
            @keyframes dTkTargetBody{0%{opacity:1;transform:none}100%{opacity:.12;transform:translate(24px,70px) translateZ(-60px) rotateX(-35deg) rotateZ(14deg)}}
            @keyframes dEchoShockfield{0%{opacity:0;transform:scale(.65)}20%{opacity:1}65%{opacity:.7}100%{opacity:0;transform:scale(1.3)}}
            @keyframes dEchoShock{0%{opacity:.95;transform:scale(.15) rotateX(58deg)}100%{opacity:0;transform:scale(7) rotateX(58deg)}}
            @keyframes dEchoAfterimage{0%{opacity:0;transform:translate(0,0) scale(.6) rotate(0)}25%{opacity:.85}100%{opacity:0;transform:translate(150px,-45px) scale(1.8) rotate(24deg)}}
            @keyframes dEclipseNight{0%{opacity:0}18%,68%{opacity:1}100%{opacity:0}}
            @keyframes dEclipseCorona{0%{opacity:0;transform:scale(2.2) rotate(-30deg)}45%{opacity:1;transform:scale(.92) rotate(4deg)}65%{transform:scale(1.05) rotate(-2deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
            @keyframes dEclipseShield{0%{opacity:0;transform:translateY(-30px) scale(1.5) rotate(0)}25%{opacity:1;transform:translateY(0) scale(1) rotate(0)}55%{transform:translateY(0) scale(1.08) rotate(-4deg)}100%{opacity:0;transform:translateY(100px) translateZ(-100px) scale(.45) rotate(24deg);filter:brightness(.2)}}
            @keyframes dVoidReality{0%{opacity:0;transform:scale(1.5) rotateX(65deg)}30%{opacity:.8}75%{opacity:.5;transform:scale(.45) rotateX(65deg)}100%{opacity:0;transform:scale(.05) rotateX(65deg)}}
            @keyframes dVoidImplode{0%{opacity:0;transform:rotate(var(--angle)) translateY(-360px) scaleY(1.8)}18%{opacity:.95}100%{opacity:0;transform:rotate(var(--angle)) translateY(-30px) scaleY(.1) scaleX(.1)}}
            @keyframes dWardSealSlam{0%{opacity:0;transform:translateZ(300px) scale(2.4) rotate(-50deg)}48%{opacity:1;transform:translateZ(30px) scale(.86) rotate(8deg)}68%{transform:translateZ(45px) scale(1.08) rotate(-4deg)}100%{opacity:1;transform:translateZ(24px) scale(1) rotate(0)}}
            @keyframes dWardProjectileDown{0%{opacity:0;transform:translateY(-40px) scale(.5)}20%{opacity:1}85%{opacity:1}100%{opacity:0;transform:translateY(185px) scale(1.3) rotate(18deg)}}
            @keyframes dWardProjectileUp{0%{opacity:0;transform:translateY(40px) scale(.5)}20%{opacity:1}85%{opacity:1}100%{opacity:0;transform:translateY(-185px) scale(1.3) rotate(-18deg)}}
            @keyframes dWardImpact{0%{opacity:1;transform:scale(.1) rotateX(58deg)}100%{opacity:0;transform:scale(3.2) rotateX(58deg)}}
            @keyframes dOracleLens{0%{opacity:0;transform:translateZ(250px) scale(1.8) rotateX(55deg)}35%{opacity:1;transform:translateZ(40px) scale(1) rotateX(0)}70%{opacity:1;transform:translateZ(20px) scale(.94)}100%{opacity:0;transform:translateZ(-80px) scale(.55)}}
            @keyframes dOracleSpin{to{transform:rotate(360deg)}}
            @keyframes dOracleScan{0%{opacity:0;transform:translateY(0)}10%,85%{opacity:1}100%{opacity:0;transform:translateY(490px)}}
          `;
