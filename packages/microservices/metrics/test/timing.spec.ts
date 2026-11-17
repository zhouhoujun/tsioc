import expect = require('expect');
import { MetricsCollector } from '../src/collector';
import { recordDuration } from '../src/timing';

describe('recordDuration', () => {
    function createCollector() {
        const timings: Array<{ name: string; value: number; labels?: Record<string, string> }> = [];
        const collector = {
            timings,
            timing(name: string, value: number, labels?: Record<string, string>) {
                timings.push({ name, value, labels });
            }
        } as unknown as MetricsCollector;
        return { collector, timings };
    }

    it('emits millisecond and second metrics with identical labels', () => {
        const { collector, timings } = createCollector();
        recordDuration(collector, 'http_request_duration_ms', 1500, { method: 'GET' });

        expect(timings).toEqual([
            { name: 'http_request_duration_ms', value: 1500, labels: { method: 'GET' } },
            { name: 'http_request_duration_seconds', value: 1.5, labels: { method: 'GET' } }
        ]);
    });

    it('records non-ms names once', () => {
        const { collector, timings } = createCollector();
        recordDuration(collector, 'queue_size', 7);

        expect(timings).toEqual([{ name: 'queue_size', value: 7, labels: undefined }]);
    });

    it('keeps gateway and client metric prefixes', () => {
        const { collector, timings } = createCollector();
        recordDuration(collector, 'gateway_request_duration_ms', 25);
        recordDuration(collector, 'client_request_duration_ms', 5);

        expect(timings.map(entry => entry.name)).toEqual([
            'gateway_request_duration_ms',
            'gateway_request_duration_seconds',
            'client_request_duration_ms',
            'client_request_duration_seconds'
        ]);
        expect(timings[1].value).toBe(0.025);
        expect(timings[3].value).toBe(0.005);
    });
});
