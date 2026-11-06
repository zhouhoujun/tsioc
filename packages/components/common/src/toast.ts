import { Injectable } from '@tsdi/ioc';

export type CommonToastTone = 'info' | 'success' | 'warning' | 'error';

export interface CommonToastOptions {
    tone?: CommonToastTone;
    /** Milliseconds before auto-dismiss; `0` keeps the toast until dismissed. */
    durationMs?: number;
}

export interface CommonToastEntry {
    id: string;
    message: string;
    tone: CommonToastTone;
    createdAt: number;
}

export type CommonToastListener = (entries: readonly CommonToastEntry[]) => void;

/**
 * Renderer-neutral toast queue. Hosts subscribe and paint the current entries;
 * the service owns ids, ordering and auto-dismiss timing.
 */
@Injectable()
export class CommonToastService {
    protected entries: CommonToastEntry[] = [];
    protected readonly listeners = new Set<CommonToastListener>();
    protected sequence = 0;
    protected readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

    get current(): readonly CommonToastEntry[] {
        return this.entries;
    }

    show(message: string, options: CommonToastOptions = {}): string {
        const text = String(message || '').trim();
        if (!text) {
            return '';
        }
        const id = `toast-${++this.sequence}`;
        const entry: CommonToastEntry = {
            id,
            message: text,
            tone: options.tone || 'info',
            createdAt: Date.now()
        };
        this.entries = [...this.entries, entry];
        this.emit();
        const duration = Number(options.durationMs ?? 2200);
        if (Number.isFinite(duration) && duration > 0) {
            const timer = setTimeout(() => this.dismiss(id), duration);
            (timer as { unref?: () => void }).unref?.();
            this.timers.set(id, timer);
        }
        return id;
    }

    dismiss(id: string): void {
        const timer = this.timers.get(id);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(id);
        }
        const next = this.entries.filter(entry => entry.id !== id);
        if (next.length === this.entries.length) {
            return;
        }
        this.entries = next;
        this.emit();
    }

    clear(): void {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
        if (!this.entries.length) {
            return;
        }
        this.entries = [];
        this.emit();
    }

    subscribe(listener: CommonToastListener): () => void {
        this.listeners.add(listener);
        listener(this.entries);
        return () => this.listeners.delete(listener);
    }

    onDestroy(): void {
        this.clear();
        this.listeners.clear();
    }

    protected emit(): void {
        for (const listener of [...this.listeners]) {
            listener(this.entries);
        }
    }
}
