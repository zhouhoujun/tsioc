import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleNoticeExpiry } from '../src/AgentConsoleNoticeExpiry';

class FakeClock {
    listeners = new Set<() => void>();
    subscribe(listener: () => void): void { this.listeners.add(listener); }
    unsubscribe(listener: () => void): void { this.listeners.delete(listener); }
    tick(): void { for (const listener of [...this.listeners]) listener(); }
}

@Suite('console notice expiry')
export class NoticeExpiryTest {
    @Test('short notice clears on the shared clock and unsubscribes')
    async shortNoticeClearsOnClock() {
        const clock = new FakeClock();
        const cleared: number[] = [];
        const expiry = new AgentConsoleNoticeExpiry(() => cleared.push(Date.now()), clock as any);
        const realNow = Date.now;
        let now = 1000;
        Date.now = () => now;
        try {
            expiry.schedule(4000);
            expect(clock.listeners.size).toEqual(1);
            now += 3999;
            clock.tick();
            expect(cleared).toEqual([]);
            now += 1;
            clock.tick();
            expect(cleared).toEqual([now]);
            expect(clock.listeners.size).toEqual(0);
        } finally {
            Date.now = realNow;
        }
    }

    @Test('a notice without duration cancels an earlier expiry')
    async noDurationCancelsExpiry() {
        const clock = new FakeClock();
        const cleared: number[] = [];
        const expiry = new AgentConsoleNoticeExpiry(() => cleared.push(1), clock as any);
        expiry.schedule(4000);
        expiry.schedule(undefined);
        expect(clock.listeners.size).toEqual(0);
        clock.tick();
        expect(cleared).toEqual([]);
    }
}
