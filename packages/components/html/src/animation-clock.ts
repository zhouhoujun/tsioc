import { Injectable } from '@tsdi/ioc';
import { AnimationClock } from '@tsdi/components';

type BrowserAnimationHost = {
    requestAnimationFrame?: (callback: (timestamp: number) => void) => number;
    cancelAnimationFrame?: (handle: number) => void;
};

@Injectable()
export class BrowserAnimationClock extends AnimationClock {
    protected listeners = new Set<() => void>();
    protected frame?: number;
    protected readonly host = globalThis as BrowserAnimationHost;

    subscribe(listener: () => void): void {
        this.listeners.add(listener);
        this.schedule();
    }

    unsubscribe(listener: () => void): void {
        this.listeners.delete(listener);
        if (!this.listeners.size) this.cancel();
    }

    onDestroy(): void {
        this.listeners.clear();
        this.cancel();
    }

    protected schedule(): void {
        if (this.frame !== undefined || !this.listeners.size || !this.host.requestAnimationFrame) return;
        this.frame = this.host.requestAnimationFrame(() => {
            this.frame = undefined;
            this.listeners.forEach(listener => listener());
            this.schedule();
        });
    }

    protected cancel(): void {
        if (this.frame === undefined) return;
        this.host.cancelAnimationFrame?.(this.frame);
        this.frame = undefined;
    }
}
