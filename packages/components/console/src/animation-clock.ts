import { Injectable } from '@tsdi/ioc';
import { AnimationClock } from '@tsdi/components';

type TimerHandle = ReturnType<typeof setInterval> & { unref?: () => void };

@Injectable()
export class ConsoleAnimationClock extends AnimationClock {
    protected readonly interval = 100;
    protected listeners = new Set<() => void>();
    protected timer?: TimerHandle;

    subscribe(listener: () => void): void {
        this.listeners.add(listener);
        if (this.timer) return;
        this.timer = setInterval(() => this.listeners.forEach(fn => fn()), this.interval) as TimerHandle;
        this.timer.unref?.();
    }

    unsubscribe(listener: () => void): void {
        this.listeners.delete(listener);
        if (!this.listeners.size) this.stop();
    }

    onDestroy(): void {
        this.listeners.clear();
        this.stop();
    }

    protected stop(): void {
        if (!this.timer) return;
        clearInterval(this.timer);
        this.timer = undefined;
    }
}
