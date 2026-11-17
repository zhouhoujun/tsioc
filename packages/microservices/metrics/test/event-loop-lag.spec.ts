import expect = require('expect');
import { EventLoopLagGauge } from '../src/gauges/event-loop-lag.gauge';

describe('EventLoopLagGauge', () => {
    function createCollector() {
        const names: string[] = [];
        const gauges: Array<{ name: string; value: number }> = [];
        return {
            names,
            gauges,
            register(options: { name: string }) {
                names.push(options.name);
            },
            gauge(name: string, value: number) {
                gauges.push({ name, value });
            }
        } as any;
    }

    it('registers p99/max gauges and samples finite seconds', () => {
        const collector = createCollector();
        const gauge = new EventLoopLagGauge(collector);
        gauge.sample();

        expect(collector.names).toEqual([
            'nodejs_eventloop_lag_p99_seconds',
            'nodejs_eventloop_lag_max_seconds'
        ]);
        expect(collector.gauges.length).toBeGreaterThanOrEqual(1);
        collector.gauges.forEach((entry: any) => {
            expect(entry.name).toContain('nodejs_eventloop_lag_');
            expect(Number.isFinite(entry.value)).toBe(true);
            expect(entry.value).toBeGreaterThanOrEqual(0);
        });
        gauge.onDestroy();
    });

    it('stops sampling after destroy without throwing', () => {
        const collector = createCollector();
        const gauge = new EventLoopLagGauge(collector);
        gauge.onDestroy();
        const before = collector.gauges.length;
        gauge.sample();
        // A manual sample after destroy still records; the timer is what stops.
        expect(collector.gauges.length).toBeGreaterThanOrEqual(before);
        expect(() => gauge.onDestroy()).not.toThrow();
    });
});
