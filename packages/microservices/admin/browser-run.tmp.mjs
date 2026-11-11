import { JSDOM } from 'jsdom';
const base = 'http://127.0.0.1:4426';
const nodeFetch = globalThis.fetch.bind(globalThis);
const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><div id="boot-status">boot</div><div id="gateway-admin-app"></div></body></html>`, { url: `${base}/admin/`, pretendToBeVisual: true, runScripts: 'outside-only' });
const win = dom.window;
for (const key of ['window','document','HTMLElement','HTMLInputElement','HTMLTextAreaElement','HTMLButtonElement','Element','Node','DocumentFragment','MutationObserver','Event','KeyboardEvent','MouseEvent','FocusEvent','CustomEvent','SVGElement','NodeFilter','XMLSerializer','DOMParser','getComputedStyle','requestAnimationFrame','cancelAnimationFrame','location','history','customElements','CSSStyleSheet','ShadowRoot','Text','Comment','DocumentType']) {
  try { globalThis[key] = win[key]; } catch { Object.defineProperty(globalThis, key, { value: win[key], configurable: true }); }
}
Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true });
globalThis.window = win; globalThis.self = win;
const wrappedFetch = (url, init) => nodeFetch(new URL(url, base), init);
win.fetch = wrappedFetch; globalThis.fetch = wrappedFetch;
if (!win.ResizeObserver) { win.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} }; globalThis.ResizeObserver = win.ResizeObserver; }
if (!win.matchMedia) { win.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }); globalThis.matchMedia = win.matchMedia; }
const errors = [];
process.on('unhandledRejection', e => errors.push('unhandled: ' + (e?.stack || e)));
try {
  await import('./web/main.js?t=' + Date.now());
  await new Promise(r => setTimeout(r, 4000));
  const doc = win.document;
  const click = (el) => el?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  console.log('SHELL', !!doc.querySelector('.ga-shell'));
  console.log('NAV_EN', doc.querySelector('.ga-nav-item')?.textContent?.trim());
  console.log('THEME0', doc.documentElement.getAttribute('data-theme'));
  click(doc.querySelectorAll('.ga-seg-btn')[1]);
  await new Promise(r => setTimeout(r, 400));
  console.log('NAV_ZH', doc.querySelector('.ga-nav-item')?.textContent?.trim());
  const select = doc.querySelector('.ga-theme-select');
  select.value = 'dark';
  select.dispatchEvent(new win.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 200));
  console.log('THEME1', doc.documentElement.getAttribute('data-theme'));
  console.log('ERRORS', errors);
} catch (e) { console.error('IMPORT_FAIL', e); }
