package com.pacify.game;

import android.os.Bundle;
import android.view.View;
import android.webkit.CookieManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // The game calls the API server cross-origin from the https://localhost
    // webview origin. Android WebView blocks third-party cookies by default,
    // which would silently drop the session cookie — login would never stick.
    CookieManager.getInstance().setAcceptThirdPartyCookies(bridge.getWebView(), true);
    CookieManager.getInstance().setAcceptCookie(true);
    fullBleed();
    // re-apply once the decor view is actually attached — several OEM ROMs
    // (HONOR/MagicOS on Android 15+) ignore an insets hide issued before attach
    getWindow().getDecorView().post(this::hideBars);
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    // the system re-shows system bars whenever focus returns — hide again
    if (hasFocus) hideBars();
  }

  private void fullBleed() {
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    // FLAG_FULLSCREEN era flags below are no-ops on targetSdk 35+, but some
    // OEM ROMs still consult them; harmless to set.
    getWindow().getDecorView().setSystemUiVisibility(
        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
      | View.SYSTEM_UI_FLAG_FULLSCREEN
      | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
      | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
      | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
      | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
    );
  }

  private void hideBars() {
    WindowInsetsControllerCompat insets = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
    insets.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    insets.hide(WindowInsetsCompat.Type.systemBars());
  }
}
