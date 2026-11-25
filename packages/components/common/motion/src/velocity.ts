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

/** Host-provided reduced-motion preference; absent hosts keep motion on. */
export function prefersReducedMotion(host?: { matchMedia?: (query: string) => { matches?: boolean } } | null): boolean {
    try {
        return !!host?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    } catch {
        return false;
    }
}
