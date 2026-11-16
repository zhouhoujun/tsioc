import { Injectable } from '@tsdi/ioc';

/**
 * Tracks requests currently being processed by a service.
 *
 * Used by graceful shutdown to wait for in-flight work before the transport is
 * closed. The count is incremented by `InFlightInterceptor` for every request
 * that enters the service handler and released on completion/error/unsubscribe.
 *
 * @publicApi
 */
@Injectable()
export class InFlightTracker {
    private active = 0;
    private readonly idle = new Set<() => void>();

    /**
     * Number of requests currently in flight.
     */
    get size(): number {
        return this.active;
    }

    /**
     * Mark one request as started. The returned function is idempotent and must
     * be called when the request completes.
     */
    enter(): () => void {
        this.active++;
        let released = false;
        return () => {
            if (released) {
                return;
            }
            released = true;
            this.active--;
            if (this.active === 0 && this.idle.size) {
                const waiters = [...this.idle];
                this.idle.clear();
                waiters.forEach(resolve => resolve());
            }
        };
    }

    /**
     * Wait until no request is in flight, or `timeoutMs` elapses.
     *
     * @param timeoutMs maximum time to wait. Non-positive values wait forever.
     * @returns `true` when the tracker became idle, `false` on timeout.
     */
    drain(timeoutMs?: number): Promise<boolean> {
        if (this.active === 0) {
            return Promise.resolve(true);
        }
        return new Promise<boolean>(resolve => {
            let timer: ReturnType<typeof setTimeout> | undefined;
            let settled = false;
            const done = (idle: boolean) => {
                if (settled) {
                    return;
                }
                settled = true;
                if (timer) {
                    clearTimeout(timer);
                }
                this.idle.delete(finish);
                resolve(idle);
            };
            // Registered as a waiter: resolves with `true` when the counter hits 0.
            const finish = () => done(true);
            this.idle.add(finish);
            if (timeoutMs != null && timeoutMs > 0) {
                timer = setTimeout(() => done(false), timeoutMs);
                if (typeof (timer as any).unref === 'function') {
                    (timer as any).unref();
                }
            }
        });
    }
}
