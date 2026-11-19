import { Injectable, OnDestroy, Optional } from '@tsdi/ioc';
import { AnimationClock } from '@tsdi/components';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
    tone?: ToastTone;
    /** Milliseconds before auto-dismiss; `0` keeps the toast until dismissed. */
    durationMs?: number;
}

export interface ToastEntry {
    id: string;
    message: string;
    tone: ToastTone;
    createdAt: number;
}

export type ToastListener = (entries: readonly ToastEntry[]) => void;

/**
 * Renderer-neutral toast queue. Hosts read `current` (reactive hosts pick up
 * the `subscribe` contract automatically) or subscribe explicitly; the
 * service owns ids, ordering and auto-dismiss timing.
 *
 * Auto-dismiss is driven by the shared {@link AnimationClock}, so the terminal
 * and browser hosts use the same lifecycle clock and no business timer runs
 * while the toast strip is idle. Without a clock (plain unit usage) entries
 * stay until they are dismissed explicitly.
 */
@Injectable()
export class ToastService implements OnDestroy {
    protected entries: ToastEntry[] = [];
    protected readonly listeners = new Set<ToastListener>();
    protected readonly deadlines = new Map<string, number>();
    protected sequence = 0;
    protected ticking = false;

    constructor(@Optional() protected clock?: AnimationClock) { }

    get current(): readonly ToastEntry[] {
        return this.entries;
    }

    show(message: string, options: ToastOptions = {}): string {
        const text = String(message || '').trim();
        if (!text) {
            return '';
        }
        const id = `toast-${++this.sequence}`;
        const entry: ToastEntry = {
            id,
            message: text,
            tone: options.tone || 'info',
            createdAt: Date.now()
        };
        this.entries = [...this.entries, entry];
        const duration = Number(options.durationMs ?? 2200);
        if (Number.isFinite(duration) && duration > 0) {
            this.deadlines.set(id, entry.createdAt + duration);
            this.startTick();
        }
        this.emit();
        return id;
    }

    dismiss(id: string): void {
        this.deadlines.delete(id);
        const next = this.entries.filter(entry => entry.id !== id);
        if (next.length === this.entries.length) {
            this.stopTickIfIdle();
            return;
        }
        this.entries = next;
        this.stopTickIfIdle();
        this.emit();
    }

    clear(): void {
        this.deadlines.clear();
        this.stopTickIfIdle();
        if (!this.entries.length) {
            return;
        }
        this.entries = [];
        this.emit();
    }

    subscribe(listener: ToastListener): () => void {
        this.listeners.add(listener);
        listener(this.entries);
        return () => this.listeners.delete(listener);
    }

    onDestroy(): void {
        this.clear();
        this.listeners.clear();
    }

    /**
     * Drop every entry whose deadline has passed. Exposed for hosts/tests that
     * already own a clock tick; the clock subscription calls it automatically.
     */
    tick(): void {
        if (!this.deadlines.size) {
            this.stopTickIfIdle();
            return;
        }
        const now = Date.now();
        const expired: string[] = [];
        for (const [id, deadline] of this.deadlines) {
            if (deadline <= now) {
                expired.push(id);
            }
        }
        if (!expired.length) {
            return;
        }
        for (const id of expired) {
            this.deadlines.delete(id);
        }
        const expiredSet = new Set(expired);
        this.entries = this.entries.filter(entry => !expiredSet.has(entry.id));
        this.stopTickIfIdle();
        this.emit();
    }

    protected readonly onClockTick = (): void => this.tick();

    protected startTick(): void {
        if (this.ticking || !this.clock || !this.deadlines.size) {
            return;
        }
        this.ticking = true;
        this.clock.subscribe(this.onClockTick);
    }

    protected stopTickIfIdle(): void {
        if (!this.ticking || this.deadlines.size) {
            return;
        }
        this.ticking = false;
        this.clock?.unsubscribe(this.onClockTick);
    }

    protected emit(): void {
        for (const listener of [...this.listeners]) {
            listener(this.entries);
        }
    }
}
