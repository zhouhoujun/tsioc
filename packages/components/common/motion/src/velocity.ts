export interface VelocitySample {
    value: number;
    time: number;
}

/**
 * Small sliding-window velocity tracker for drag/fling gestures. Values are the
 * host's units (pixels, rows, …); time is milliseconds.
 */
export class VelocityTracker {
    protected samples: VelocitySample[] = [];

    constructor(protected readonly size = 5) {
    }

    reset(): void {
        this.samples.length = 0;
    }

    record(value: number, time: number): void {
        this.samples.push({ value: Number(value) || 0, time: Number(time) || 0 });
        while (this.samples.length > Math.max(2, this.size)) {
            this.samples.shift();
        }
    }

    /** Units per millisecond between the oldest and newest sample. */
    velocity(now?: number): number {
        if (this.samples.length < 2) {
            return 0;
        }
        if (now != null && now !== this.samples[this.samples.length - 1].time) {
            this.record(this.samples[this.samples.length - 1].value, now);
        }
        const first = this.samples[0];
        const last = this.samples[this.samples.length - 1];
        const dt = last.time - first.time;
        return dt > 0 ? (last.value - first.value) / dt : 0;
    }
}

/** Two-dimensional pointer velocity with a fixed ring buffer (no per-sample allocation). */
export class VelocityTracker2D {
    private xs = new Float64Array(128);
    private ys = new Float64Array(128);
    private ts = new Float64Array(128);
    private start = 0;
    private count = 0;

    constructor(private readonly windowMs = 90) {
    }

    reset(): void {
        this.start = 0;
        this.count = 0;
    }

    record(x: number, y: number, time: number): void {
        if (![x, y, time].every(Number.isFinite)) {
            return;
        }
        if (this.count && time < this.ts[(this.start + this.count - 1) % 128]!) {
            this.reset();
        }
        while (this.count > 0 && time - this.ts[this.start]! > this.windowMs) {
            this.start = (this.start + 1) % 128;
            this.count -= 1;
        }
        if (this.count === 128) {
            this.start = (this.start + 1) % 128;
            this.count -= 1;
        }
        const index = (this.start + this.count) % 128;
        this.xs[index] = x;
        this.ys[index] = y;
        this.ts[index] = time;
        this.count += 1;
    }

    velocity(now?: number): { x: number; y: number } {
        if (this.count < 2) {
            return { x: 0, y: 0 };
        }
        const last = (this.start + this.count - 1) % 128;
        if (now != null && now - this.ts[last]! > this.windowMs) {
            return { x: 0, y: 0 };
        }
        const seconds = (this.ts[last]! - this.ts[this.start]!) / 1000;
        if (seconds <= 0) {
            return { x: 0, y: 0 };
        }
        return {
            x: (this.xs[last]! - this.xs[this.start]!) / seconds,
            y: (this.ys[last]! - this.ys[this.start]!) / seconds
        };
    }
}
