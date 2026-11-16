import expect = require('expect');
import { HealthController } from '../src/health.controller';
import { HealthIndicator } from '../src/indicator';
import { HealthResult } from '../src/health';
import { ReadinessStateService } from '@tsdi/service';

class UpIndicator extends HealthIndicator {
    name = 'up';
    checks = 0;

    async check(): Promise<HealthResult> {
        this.checks++;
        return { status: 'UP' };
    }
}

function adapter(): { status: number | undefined; setStatus(value: number): void } {
    return {
        status: undefined,
        setStatus(value: number) { this.status = value; }
    };
}

describe('HealthController readiness lifecycle', () => {
    it('returns 503 while the service is STARTING', async () => {
        const state = new ReadinessStateService();
        const indicator = new UpIndicator();
        const ctrl = new HealthController([indicator], undefined, state);
        const status = adapter();

        const report = await ctrl.readiness(status as any);

        expect(report.status).toBe('DOWN');
        expect(report.components.lifecycle).toEqual({ status: 'DOWN', error: 'service is STARTING' });
        expect(indicator.checks).toBe(0);
        expect(status.status).toBe(503);
    });

    it('returns 503 while the service is DRAINING', async () => {
        const state = new ReadinessStateService();
        state.markDraining();
        const ctrl = new HealthController([new UpIndicator()], undefined, state);
        const status = adapter();

        const report = await ctrl.readiness(status as any);

        expect(report.status).toBe('DOWN');
        expect(status.status).toBe(503);
    });

    it('runs indicators once the service is UP', async () => {
        const state = new ReadinessStateService();
        state.markUp();
        const indicator = new UpIndicator();
        const ctrl = new HealthController([indicator], undefined, state);
        const status = adapter();

        const report = await ctrl.readiness(status as any);

        expect(report.status).toBe('UP');
        expect(report.components.up.status).toBe('UP');
        expect(indicator.checks).toBe(1);
        expect(status.status).toBe(200);
    });

    it('keeps indicator-only behaviour when no readiness provider is present', async () => {
        const ctrl = new HealthController([new UpIndicator()]);

        const report = await ctrl.readiness();

        expect(report.status).toBe('UP');
    });
});
