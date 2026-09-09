import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DeterministicAgentClock, SystemAgentClock } from '../src/runtime/Clock';
import { retryAfterMs } from '../src/model/RetryPolicy';

@Suite('AgentClock port (v19-A2)')
export class AgentClockSpec {
    @Test('system clock delegates to Date.now')
    systemClock() {
        const clock = new SystemAgentClock();
        expect(Math.abs(clock.now() - Date.now()) < 1000).toBe(true);
    }

    @Test('deterministic clock advances and freezes time')
    deterministicClock() {
        const clock = new DeterministicAgentClock(1000);
        expect(clock.now()).toBe(1000);
        clock.advance(250);
        expect(clock.now()).toBe(1250);
        clock.advance(-500);
        expect(clock.now()).toBe(1250);
    }

    @Test('deterministic sleep advances the clock deterministically')
    async deterministicSleep() {
        const clock = new DeterministicAgentClock(0);
        await clock.sleep(300);
        expect(clock.now()).toBe(300);
    }

    @Test('retryAfterMs accepts an injected clock now')
    retryAfterUsesInjectedClock() {
        expect(retryAfterMs('2', 5000)).toBe(2000);
        expect(retryAfterMs('2020-01-01T00:00:00Z', 1577836800000)).toBe(0);
    }
}
