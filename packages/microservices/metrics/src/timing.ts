import { MetricsCollector } from './collector';

/**
 * Record a duration in both milliseconds and seconds during the unit
 * migration window.
 *
 * `name` is expected to end with `_ms`; the seconds metric is emitted with
 * the same labels so dashboards can switch without losing history. Names that
 * do not end in `_ms` are recorded once, unchanged.
 */
export function recordDuration(
    collector: MetricsCollector,
    name: string,
    durationMs: number,
    labels?: Record<string, string>
): void {
    collector.timing(name, durationMs, labels);
    if (name.endsWith('_ms')) {
        collector.timing(`${name.slice(0, -3)}_seconds`, durationMs / 1000, labels);
    }
}
