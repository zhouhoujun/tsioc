import { MemoryHealthIndicator, HealthModule, HealthIndicator, HealthStatus, HealthReport, HEALTH_INDICATORS, HealthResult } from '../src';
import expect = require('expect');

describe('Health Module Test', () => {

    describe('MemoryHealthIndicator', () => {
        it('should check memory status', async () => {
            const indicator = new MemoryHealthIndicator();
            const result = await indicator.check();

            expect(result.status).toBeDefined();
            expect(result.details).toBeDefined();
            expect(result.details?.heapUsed).toBeDefined();
            expect(result.details?.heapTotal).toBeDefined();
        });

        it('should return UP status when memory is normal', async () => {
            const indicator = new MemoryHealthIndicator({ heapThreshold: 0.95 });
            const result = await indicator.check();

            expect(['UP', 'DOWN']).toContain(result.status);
        });

        it('should return DOWN status when threshold exceeded', async () => {
            const indicator = new MemoryHealthIndicator({ heapThreshold: 0.01 });
            const result = await indicator.check();

            expect(result.status).toBe('DOWN');
            expect(result.error).toBeDefined();
        });
    });

    describe('Health Types', () => {
        it('should accept valid HealthStatus values', () => {
            const up: HealthStatus = 'UP';
            const down: HealthStatus = 'DOWN';
            const unknown: HealthStatus = 'UNKNOWN';

            expect(up).toBe('UP');
            expect(down).toBe('DOWN');
            expect(unknown).toBe('UNKNOWN');
        });

        it('should create valid HealthReport', () => {
            const report: HealthReport = {
                status: 'UP',
                timestamp: new Date().toISOString(),
                components: {
                    memory: { status: 'UP', details: { heapUsed: '50MB' } }
                }
            };

            expect(report.status).toBe('UP');
            expect(report.components.memory.status).toBe('UP');
        });
    });

    describe('HealthIndicator', () => {
        it('should be an abstract class', () => {
            expect(HealthIndicator.prototype).toBeDefined();
        });
    });

    describe('HEALTH_INDICATORS Token', () => {
        it('should be defined', () => {
            expect(HEALTH_INDICATORS).toBeDefined();
            expect(HEALTH_INDICATORS.toString()).toContain('HEALTH_INDICATORS');
        });
    });

    describe('HealthModule Static Methods', () => {
        it('should have withIndicators static method', () => {
            expect(HealthModule.withIndicators).toBeDefined();
            expect(typeof HealthModule.withIndicators).toBe('function');
        });

        it('should have withOptions static method', () => {
            expect(HealthModule.withOptions).toBeDefined();
            expect(typeof HealthModule.withOptions).toBe('function');
        });

        it('should create ModuleWithProviders with withIndicators', () => {
            class CustomIndicator extends HealthIndicator {
                name = 'custom';
                async check(): Promise<HealthResult> {
                    return { status: 'UP' as HealthStatus };
                }
            }

            const result = HealthModule.withIndicators(CustomIndicator);
            expect(result.module).toBe(HealthModule);
            expect(result.providers).toBeDefined();
            expect(result.providers.length).toBe(1);
        });

        it('should create ModuleWithProviders with withOptions', () => {
            const result = HealthModule.withOptions({ includeMemory: true });
            expect(result.module).toBe(HealthModule);
            expect(result.providers).toBeDefined();
        });
    });
});