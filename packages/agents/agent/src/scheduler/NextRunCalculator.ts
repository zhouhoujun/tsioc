import { AgentScheduleSpec } from './ScheduleSpec';

const CRON_SEGMENT_COUNT = 6;
const MAX_CRON_SCAN_MS = 366 * 24 * 60 * 60 * 1000;

export class NextRunCalculator {
    static validateCronExpr(expr: string): void {
        this.parseCronExpr(expr);
        this.nextCronRun(expr, Date.now());
    }

    static ensureCronMeetsMinInterval(expr: string, minIntervalMs: number, now: number = Date.now()): void {
        const first = this.nextCronRun(expr, now);
        const second = this.nextCronRun(expr, first);
        if (second - first < minIntervalMs) {
            throw new Error(`cron interval must be at least ${minIntervalMs} ms.`);
        }
    }

    static nextRun(task: { runAt?: number; intervalMs?: number; cronExpr?: string }, now: number = Date.now()): number | undefined {
        if (task.cronExpr) {
            return this.nextCronRun(task.cronExpr, now);
        }
        if (task.intervalMs && task.intervalMs > 0) {
            return now + task.intervalMs;
        }
        return task.runAt;
    }

    static fromSchedule(spec: AgentScheduleSpec, now: number = Date.now()): number | undefined {
        switch (spec.type) {
            case 'cron':
                return this.nextCronRun(spec.cronExpr, now);
            case 'interval':
                return spec.runAt ?? now;
            case 'once':
                return spec.runAt;
        }
    }

    static nextCronRun(expr: string, now: number = Date.now()): number {
        const fields = this.parseCronExpr(expr);
        const start = Math.floor(now / 1000) * 1000;
        for (let ts = start + 1000; ts <= start + MAX_CRON_SCAN_MS; ts += 1000) {
            const date = new Date(ts);
            if (
                fields[0].has(date.getSeconds()) &&
                fields[1].has(date.getMinutes()) &&
                fields[2].has(date.getHours()) &&
                fields[3].has(date.getDate()) &&
                fields[4].has(date.getMonth() + 1) &&
                fields[5].has(date.getDay())
            ) {
                return ts;
            }
        }
        throw new Error(`Unable to compute next run for cron expression '${expr}'.`);
    }

    private static parseCronExpr(expr: string): Array<Set<number>> {
        const normalized = expr.trim();
        const segments = normalized.split(/\s+/);
        if (segments.length !== CRON_SEGMENT_COUNT) {
            throw new Error('Invalid cron expression: expected 6 fields (sec min hour day month weekday).');
        }
        return [
            this.parseField(segments[0], 0, 59),
            this.parseField(segments[1], 0, 59),
            this.parseField(segments[2], 0, 23),
            this.parseField(segments[3], 1, 31),
            this.parseField(segments[4], 1, 12),
            this.parseField(segments[5], 0, 6)
        ];
    }

    private static parseField(segment: string, min: number, max: number): Set<number> {
        const values = new Set<number>();
        const parts = segment.split(',');
        for (const part of parts) {
            this.addPartValues(part, min, max, values);
        }
        if (!values.size) {
            throw new Error(`Invalid cron field '${segment}'.`);
        }
        return values;
    }

    private static addPartValues(part: string, min: number, max: number, values: Set<number>): void {
        const trimmed = part.trim();
        if (!trimmed) {
            throw new Error('Invalid cron field: empty segment.');
        }

        const [base, stepText] = trimmed.split('/');
        const step = stepText == null ? 1 : Number(stepText);
        if (!Number.isInteger(step) || step <= 0) {
            throw new Error(`Invalid cron step '${trimmed}'.`);
        }

        const [start, end] = this.parseBaseRange(base, min, max);
        for (let value = start; value <= end; value += step) {
            values.add(value);
        }
    }

    private static parseBaseRange(base: string, min: number, max: number): [number, number] {
        if (base === '*') {
            return [min, max];
        }
        if (base.includes('-')) {
            const [startText, endText] = base.split('-');
            const start = Number(startText);
            const end = Number(endText);
            this.assertInRange(start, min, max, base);
            this.assertInRange(end, min, max, base);
            if (end < start) {
                throw new Error(`Invalid cron range '${base}'.`);
            }
            return [start, end];
        }
        const value = Number(base);
        this.assertInRange(value, min, max, base);
        return [value, value];
    }

    private static assertInRange(value: number, min: number, max: number, segment: string): void {
        if (!Number.isInteger(value) || value < min || value > max) {
            throw new Error(`Invalid cron value '${segment}'.`);
        }
    }
}
