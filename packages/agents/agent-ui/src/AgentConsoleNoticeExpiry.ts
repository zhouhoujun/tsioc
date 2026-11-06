import type { AnimationClock } from '@tsdi/components';

/**
 * Short-lived notices use the renderer's shared animation clock instead of a
 * business-component timer. The clock only runs while a listener is
 * subscribed, and disposal unsubscribes immediately.
 */
export class AgentConsoleNoticeExpiry {
    protected expiresAt = 0;
    protected listener?: () => void;

    constructor(
        protected readonly clearNotice: () => void,
        protected readonly clock?: AnimationClock | null
    ) {
    }

    schedule(duration?: number): void {
        const ms = Number(duration);
        if (!Number.isFinite(ms) || ms <= 0 || !this.clock) {
            this.cancel();
            return;
        }
        this.expiresAt = Date.now() + ms;
        if (this.listener) {
            return;
        }
        const listener = (): void => {
            if (Date.now() < this.expiresAt) {
                return;
            }
            this.listener = undefined;
            this.expiresAt = 0;
            this.clock?.unsubscribe(listener);
            this.clearNotice();
        };
        this.listener = listener;
        this.clock.subscribe(listener);
    }

    cancel(): void {
        if (!this.listener) {
            this.expiresAt = 0;
            return;
        }
        const listener = this.listener;
        this.listener = undefined;
        this.expiresAt = 0;
        this.clock?.unsubscribe(listener);
    }

    dispose(): void {
        this.cancel();
    }
}
