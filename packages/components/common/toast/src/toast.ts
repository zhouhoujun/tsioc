import { Injectable, OnDestroy, Optional } from '@tsdi/ioc';
import { AnimationClock } from '@tsdi/components';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';
export type ToastPriority = 'normal' | 'high';

export interface ToastOptions {
    tone?: ToastTone;
    /** Milliseconds before auto-dismiss; `0` keeps the toast until dismissed. */
    durationMs?: number;
    /** Optional inline action (for example Undo); hosts dismiss explicitly. */
    actionLabel?: string;
    action?: () => void;
    /** High-priority entries sort ahead of normal ones in `current`. */
    priority?: ToastPriority;
}

export interface ToastEntry {
    id: string;
    message: string;
    tone: ToastTone;
    createdAt: number;
    priority?: ToastPriority;
    actionLabel?: string;
    action?: () => void;
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
    protected readonly paused = new Set<string>();
    protected readonly remaining = new Map<string, number>();
    protected sequence = 0;
    protected ticking = false;

    constructor(@Optional() protected clock?: AnimationClock) { }

    get current(): readonly ToastEntry[] {
        // Stable priority order: high entries first, insertion order preserved.
        return [...this.entries].sort((left, right) =>
            (right.priority === 'high' ? 1 : 0) - (left.priority === 'high' ? 1 : 0));
    }

    show(message: string, options: ToastOptions = {}): string {
        const text = String(message || '').trim();
        if (!text) {
            return '';
        }
        const id = `toast-${++this.sequence}`;
        const actionLabel = String(options.actionLabel ?? '').trim();
        const entry: ToastEntry = {
            id,
            message: text,
            tone: options.tone || 'info',
            createdAt: Date.now(),
            priority: options.priority === 'high' ? 'high' : 'normal',
            ...(actionLabel ? {
                actionLabel,
                action: typeof options.action === 'function' ? options.action : undefined
            } : {})
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

    /** Run an entry's action without dismissing; the action may call `dismiss`. */
    invoke(id: string): void {
        this.entries.find(entry => entry.id === id)?.action?.();
    }

    /** Freeze auto-dismiss for one entry (hover intent); resumes on `resume`. */
    pause(id: string): void {
        if (this.paused.has(id)) {
            return;
        }
        const deadline = this.deadlines.get(id);
        if (deadline == null) {
            return;
        }
        this.remaining.set(id, Math.max(0, deadline - Date.now()));
        this.deadlines.delete(id);
        this.paused.add(id);
        this.stopTickIfIdle();
    }

    /** Continue an auto-dismiss countdown after a pause. */
    resume(id: string): void {
        if (!this.paused.delete(id)) {
            return;
        }
        const remaining = this.remaining.get(id) ?? 0;
        this.remaining.delete(id);
        if (this.entries.some(entry => entry.id === id)) {
            this.deadlines.set(id, Date.now() + remaining);
            this.startTick();
        }
    }

    dismiss(id: string): void {
        this.deadlines.delete(id);
        this.paused.delete(id);
        this.remaining.delete(id);
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
        this.paused.clear();
        this.remaining.clear();
        this.stopTickIfIdle();
        if (!this.entries.length) {
            return;
        }
        this.entries = [];
        this.emit();
    }

    subscribe(listener: ToastListener): () => void {
        this.listeners.add(listener);
        listener(this.current);
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
        const snapshot = this.current;
        for (const listener of [...this.listeners]) {
            listener(snapshot);
        }
    }
}
