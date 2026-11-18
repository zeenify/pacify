package com.pacify.game;

import android.os.Bundle;
import android.webkit.CookieManager;

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
  }
}
