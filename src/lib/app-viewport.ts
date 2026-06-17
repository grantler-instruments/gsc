/** Keep shell layout in sync with the actual webview size (Tauri/WKWebView can lag on dvh). */
export function syncAppViewportSize(): void {
  const root = document.documentElement;
  root.style.setProperty("--app-vh", `${window.innerHeight}px`);
  root.style.setProperty("--app-vw", `${window.innerWidth}px`);
}
