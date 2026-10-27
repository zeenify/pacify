export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#0A0A0A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        {/* Touch devices: fullscreen + landscape lock on the first tap. Browsers
            require a user gesture for requestFullscreen, so this cannot fire on
            load. Tries again on every tap until it succeeds (Android supports
            both APIs; iPhone ignores them — the portrait overlay covers it). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
        (function () {
          if (!window.matchMedia("(pointer: coarse)").matches) return;
          var done = false;
          document.addEventListener("pointerdown", function () {
            if (done) return;
            try {
              var el = document.documentElement;
              if (!el.requestFullscreen) return;
              var p = el.requestFullscreen();
              if (p && p.then) p.then(function () {
                done = true;
                try { screen.orientation && screen.orientation.lock("landscape").catch(function () {}); } catch (e) {}
              }).catch(function () {});
            } catch (e) {}
          }, true);
        })();
      `,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
        #pacify-rotate { display: none; position: fixed; inset: 0; z-index: 9999;
          background: #0A0A0A; color: #E8E4DA; align-items: center; justify-content: center;
          text-align: center; font-family: system-ui, sans-serif; padding: 24px; }
        #pacify-rotate .glyph { font-size: 44px; margin-bottom: 12px; }
        #pacify-rotate .title { font-size: 22px; letter-spacing: 4px; margin-bottom: 8px; }
        #pacify-rotate .hint { font-size: 15px; opacity: 0.75; }
        @media (orientation: portrait) and (pointer: coarse) {
          #pacify-rotate { display: flex; }
        }
      `,
          }}
        />
      </head>
      <body>
        {children}
        <div id="pacify-rotate">
          <div>
            <div className="glyph">🔄</div>
            <div className="title">PACIFY</div>
            <div className="hint">Plays in landscape — rotate your phone</div>
          </div>
        </div>
      </body>
    </html>
  );
}
