import { Injectable, Optional } from '@tsdi/ioc';

export type OverlayKind = 'dialog' | 'drawer' | 'popover' | 'menu' | 'palette';
export type OverlayCloseReason = 'escape' | 'outside' | 'programmatic';

/** One open overlay; `close` is invoked when the manager dismisses it (not programmatic close). */
export interface OverlayEntry {
    id: string;
    kind: OverlayKind;
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
        this.focus?.focusInitial?.(entry);
        return true;
    }

    /** Programmatic close: remove without invoking entry.close (caller already closed it). */
    close(id: string): boolean {
        const index = this.entries.findIndex(entry => entry.id === id);
        if (index < 0) {
            return false;
        }
        this.entries.splice(index, 1);
        this.focus?.restoreFocus?.(this.active);
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
            this.focus?.restoreFocus?.(this.active);
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
    }
}
