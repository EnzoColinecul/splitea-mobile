import * as WebBrowser from 'expo-web-browser';

/**
 * Opens a URL for an auth/payment flow using SFSafariViewController (iOS) /
 * Custom Tabs (Android). Works with both HTTP and HTTPS URLs.
 * Resolves when the user dismisses the browser (or the deep link redirects back).
 * Outcome is determined by checking server state after the call returns — not by
 * inspecting the redirect URL — so no ASWebAuthenticationSession HTTPS requirement.
 */
export async function openAuthUrl(url: string): Promise<WebBrowser.WebBrowserResult> {
  return WebBrowser.openBrowserAsync(url, { showTitle: false });
}
