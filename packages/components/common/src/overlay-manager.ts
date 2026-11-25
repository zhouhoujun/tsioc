import { Injectable, Optional } from '@tsdi/ioc';

export type OverlayKind = 'dialog' | 'drawer' | 'popover' | 'menu' | 'palette';
export type OverlayCloseReason = 'escape' | 'outside' | 'programmatic';

/** One open overlay; `close` is invoked when the manager dismisses it (not programmatic close). */
export interface OverlayEntry {
    id: string;
    kind: OverlayKind;
    /** Panel element for the default DOM focus adapter (optional in TUI). */
    element?: any;
    /** Selector for the initial focus target; defaults to the first focusable. */
    initialFocus?: string;
    /** Restore the previously focused element when this overlay closes. */
    restoreFocus?: boolean | string;
    /** Return false / reject to keep the overlay open (dirty form). */
    beforeClose?(reason: OverlayCloseReason): boolean | Promise<boolean>;
    close?(reason: OverlayCloseReason): void | Promise<void>;
}

/** Host focus adapter: DOM focus trap/restore, terminal focus layer. */
export interface OverlayFocusAdapter {
    focusInitial?(entry: OverlayEntry): void;
    restoreFocus?(entry: OverlayEntry | undefined): void;
}

export type OverlayCloseResult = 'closed' | 'blocked' | 'missing';

/**
 * Renderer-neutral overlay stack. Only the top entry receives Escape/outside
 * dismissal, `beforeClose` can veto (dirty check), and focus is restored to the
 * next overlay or the host when an entry closes.
 */
@Injectable()
export class OverlayManager {
    private readonly entries: OverlayEntry[] = [];
    private readonly closing = new Set<string>();
    private readonly previousFocus = new Map<string, any>();

    constructor(@Optional() private readonly focus?: OverlayFocusAdapter | null) {
    }

    get size(): number {
        return this.entries.length;
    }

    get active(): OverlayEntry | undefined {
        return this.entries[this.entries.length - 1];
    }

    has(id: string): boolean {
        return this.entries.some(entry => entry.id === id);
    }

    isTop(id: string): boolean {
        return this.active?.id === id;
    }

    register(entry: OverlayEntry): boolean {
        if (!entry?.id || this.has(entry.id)) {
            return false;
        }
        this.entries.push(entry);
        this.previousFocus.set(entry.id, overlayDocument(entry.element)?.activeElement || null);
        this.focus?.focusInitial?.(entry);
        if (!this.focus) {
            focusOverlay(entry);
        }
        return true;
    }

    /** Programmatic close: remove without invoking entry.close (caller already closed it). */
    close(id: string): boolean {
        const index = this.entries.findIndex(entry => entry.id === id);
        if (index < 0) {
            return false;
        }
        const entry = this.entries[index];
        this.entries.splice(index, 1);
        this.restore(entry);
        return true;
    }

    /** Dismiss the top overlay after `beforeClose`; used by Escape/outside. */
    async closeTop(reason: OverlayCloseReason = 'escape'): Promise<OverlayCloseResult> {
        const entry = this.active;
        if (!entry) {
            return 'missing';
        }
        if (this.closing.has(entry.id)) {
            return 'blocked';
        }
        this.closing.add(entry.id);
        try {
            if (entry.beforeClose && !await entry.beforeClose(reason)) {
                return 'blocked';
            }
            this.entries.pop();
            await entry.close?.(reason);
            this.restore(entry);
            return 'closed';
        } finally {
            this.closing.delete(entry.id);
        }
    }

    async escape(): Promise<OverlayCloseResult> {
        return this.closeTop('escape');
    }

    async outside(): Promise<OverlayCloseResult> {
        return this.closeTop('outside');
    }

    /** Drop all registrations (component/application teardown); entries are not re-closed. */
    clear(): void {
        this.entries.length = 0;
        this.closing.clear();
        this.previousFocus.clear();
    }

    protected restore(entry: OverlayEntry): void {
        const previous = this.previousFocus.get(entry.id);
        this.previousFocus.delete(entry.id);
        if (this.focus) {
            this.focus.restoreFocus?.(this.active);
            return;
        }
        const active = this.active;
        if (active) {
            // Nested overlays: focus the next panel instead of the underlying page.
            focusOverlay(active);
            return;
        }
        if (entry.restoreFocus !== false) {
            previous?.focus?.();
        }
    }
}

function overlayDocument(element: any): any {
    return element?.ownerDocument || element?.defaultView?.document;
}

/** Default focus adapter: only active when the panel belongs to a DOM document. */
function focusOverlay(entry: OverlayEntry): void {
    const doc = overlayDocument(entry.element);
    const root = focusRoot(entry.element);
    if (!doc?.defaultView || !root) {
        return;
    }
    const selector = entry.initialFocus || FOCUSABLE_SELECTOR;
    let target: any;
    try {
        target = root.querySelector?.(selector);
    } catch {
        target = undefined;
    }
    const first = target || root.querySelector?.(FOCUSABLE_SELECTOR);
    first?.focus?.();
}

function focusRoot(element: any): any {
    if (!element) {
        return null;
    }
    if (typeof element.matches === 'function' && element.matches('.dialog-panel')) {
        return element;
    }
    return element.querySelector?.('.dialog-panel') || element;
}

export const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
