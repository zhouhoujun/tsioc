export interface AgentConsoleClipboardHost {
    document: Document;
    mount: HTMLElement;
    toast: { show(message: string, options?: { tone?: string; durationMs?: number }): void };
    isZh(): boolean;
}

/**
 * Browser-native selection copy: right-click copies the current selection to
 * the clipboard and reports through the shared toast queue. DOM-only chrome;
 * console state is never mutated.
 */
export function bindContextMenuCopy(host: AgentConsoleClipboardHost): () => void {
    const doc = host.document;
    const onContextMenu = (event: MouseEvent): void => {
        const text = doc.defaultView?.getSelection?.()?.toString()?.trim() || '';
        if (!text) {
            return;
        }
        event.preventDefault();
        const clipboard = doc.defaultView?.navigator?.clipboard;
        const copied = host.isZh() ? '已复制' : 'Copied';
        const done = (): void => { host.toast.show(copied, { tone: 'success', durationMs: 1800 }); };
        if (clipboard?.writeText) {
            void clipboard.writeText(text).then(done).catch(done);
            return;
        }
        // Last-resort copy path for browsers without the async clipboard API.
        const area = doc.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.className = 'console-clipboard-fallback';
        doc.body.appendChild(area);
        area.select();
        try { doc.execCommand('copy'); } catch { /* ignore */ }
        area.remove();
        done();
    };
    host.mount.addEventListener('contextmenu', onContextMenu);
    return () => host.mount.removeEventListener('contextmenu', onContextMenu);
}
