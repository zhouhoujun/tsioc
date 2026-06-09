import { HealthController, HealthIndicator, HealthResult, HealthStatus } from '../src';
import expect = require('expect');

describe('HealthController', () => {

    class PassIndicator extends HealthIndicator {
        name = 'pass';
        async check(): Promise<HealthResult> {
            return { status: 'UP' as HealthStatus, details: { ok: true } };
        }
    }

    class FailIndicator extends HealthIndicator {
        name = 'fail';
        async check(): Promise<HealthResult> {
            return { status: 'DOWN' as HealthStatus, error: 'something wrong' };
        }
    }

    class ThrowingIndicator extends HealthIndicator {
        name = 'throw';
        async check(): Promise<HealthResult> {
            throw new Error('unexpected');
        }
    }

    it('should return UP when all indicators pass', async () => {
        const ctrl = new HealthController([new PassIndicator()]);
        const report = await ctrl.check();
        expect(report.status).toBe('UP');
        expect(report.components.pass).toBeDefined();
        expect(report.components.pass.status).toBe('UP');
        expect(report.timestamp).toBeDefined();
    });

    it('should return DOWN when any indicator fails', async () => {
        const ctrl = new HealthController([new PassIndicator(), new FailIndicator()]);
        const report = await ctrl.check();
        expect(report.status).toBe('DOWN');
        expect(report.components.pass.status).toBe('UP');
        expect(report.components.fail.status).toBe('DOWN');
    });

    it('should handle throwing indicators gracefully', async () => {
        const ctrl = new HealthController([new ThrowingIndicator()]);
        const report = await ctrl.check();
        expect(report.status).toBe('DOWN');
        expect(report.components.throw.status).toBe('DOWN');
        expect(report.components.throw.error).toBe('unexpected');
    });

    it('liveness should always return UP', () => {
        const ctrl = new HealthController([]);
        expect(ctrl.liveness()).toEqual({ status: 'UP' });
    });

    it('readiness should delegate to check()', async () => {
        const ctrl = new HealthController([new PassIndicator()]);
        const report = await ctrl.readiness();
        expect(report.status).toBe('UP');
    });

    it('checking empty indicators should return UP', async () => {
        const ctrl = new HealthController([]);
        const report = await ctrl.check();
        expect(report.status).toBe('UP');
        expect(report.components).toEqual({});
    });
});
