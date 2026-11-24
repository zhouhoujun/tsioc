import type { ActivityContext } from '../../activities/Activity';

export async function pause(ms: number, cancelled?: () => boolean): Promise<boolean> {
    const total = Math.max(0, ms);
    if (!cancelled) {
        if (total > 0) {
            await new Promise(resolve => setTimeout(resolve, total));
        }
        return true;
    }
    const step = 50;
    let remaining = total;
    while (remaining > 0) {
        if (cancelled()) {
            return false;
        }
        const slice = Math.min(step, remaining);
        await new Promise(resolve => setTimeout(resolve, slice));
        remaining -= slice;
    }
    return !cancelled();
}

export async function waitForWorkflowEvent(context: ActivityContext, event: string, timeoutMs: number): Promise<any> {
    const bus = (context as any).eventBus || (context as any).events;
    if (bus && typeof bus.wait === 'function') {
        return bus.wait(event, timeoutMs);
    }
    if (typeof (context as any).waitEvent === 'function') {
        const waiting = Promise.resolve((context as any).waitEvent(event));
        if (!timeoutMs) {
            return waiting;
        }
        return Promise.race([
            waiting,
            new Promise(resolve => setTimeout(() => resolve(undefined), timeoutMs))
        ]);
    }
    throw new Error(`Event injection requires an event bus for "${event}"`);
}
