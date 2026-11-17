/**
 * Install a renderer-neutral stylesheet once per document.
 *
 * Every widget skin used to repeat the same `getElementById` / `createElement`
 * / `head.appendChild` sequence. Keeping it here makes the installers
 * idempotent and guarantees they stay no-ops on renderers without a DOM
 * document (console/xml).
 */
export function installStyleSheet(doc: Document | null | undefined, id: string, css: string): void {
    if (!doc || typeof (doc as any).createElement !== 'function' || !doc.head) {
        return;
    }
    if (typeof doc.getElementById === 'function' && doc.getElementById(id)) {
        return;
    }
    const style = doc.createElement('style');
    style.setAttribute('id', id);
    style.textContent = css;
    doc.head.appendChild(style);
}
