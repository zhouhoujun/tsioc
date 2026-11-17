import { Injectable, OnDestroy } from '@tsdi/ioc';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { MetricsCollector } from '../collector';

/**
 * Event loop lag gauge.
 *
 * Samples Node's event-loop delay histogram and exposes p99/max in seconds
 * (matching the Prometheus `nodejs_eventloop_lag_*_seconds` convention).
 * The sampling timer is unref'd and disabled on destroy.
 */
@Injectable()
export class EventLoopLagGauge implements OnDestroy {
    private histogram = monitorEventLoopDelay({ resolution: 10 });
    private intervalId?: ReturnType<typeof setInterval>;

    constructor(private collector: MetricsCollector) {
        this.collector.register({
            name: 'nodejs_eventloop_lag_p99_seconds',
            description: 'Event loop delay p99 in seconds'
        });
        this.collector.register({
            name: 'nodejs_eventloop_lag_max_seconds',
            description: 'Event loop delay maximum in seconds'
        });
        this.histogram.enable();
        this.intervalId = setInterval(() => this.sample(), 5000);
        if (typeof (this.intervalId as any).unref === 'function') {
            (this.intervalId as any).unref();
        }
    }

    /** Sample the histogram and record both gauges. */
    sample(): void {
        const p99 = this.histogram.percentile(99) / 1e9;
        const max = this.histogram.max / 1e9;
        if (Number.isFinite(p99)) {
            this.collector.gauge('nodejs_eventloop_lag_p99_seconds', p99);
        }
        if (Number.isFinite(max)) {
            this.collector.gauge('nodejs_eventloop_lag_max_seconds', max);
        }
        this.histogram.reset();
    }

    onDestroy(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        this.histogram.disable();
    }
}
