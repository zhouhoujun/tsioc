export type FrameJob = (dtMs: number) => boolean;
export type FrameRead = () => void;

export interface FrameScheduler {
    request(callback: (time: number) => void): number;
    cancel(id: number): void;
}

interface FrameEntry {
    job: FrameJob;
    read?: FrameRead;
    active: boolean;
    next?: FrameEntry;
}

/**
 * Allocation-free frame loop. Hosts supply the scheduler: DOM uses rAF and TUI
 * uses the shared AnimationClock. `read` callbacks run before `job` writes so
 * layout reads never interleave with mutations.
 */
export function createFrameLoop(scheduler: FrameScheduler) {
    let head: FrameEntry | undefined;
    let tail: FrameEntry | undefined;
    let pending: number | undefined;
    let previous = 0;
    let hasPrevious = false;
    let running = false;
    let dirty = false;

    const compact = () => {
        dirty = false;
        let node = head;
        let last: FrameEntry | undefined;
        head = undefined;
        while (node) {
            if (node.active) {
                if (last) last.next = node;
                head ??= node;
                last = node;
            }
            node = node.next;
        }
        if (last) last.next = undefined;
        tail = last;
    };

    const wake = () => {
        if (pending === undefined && !running && head) {
            pending = scheduler.request(tick);
        }
    };

    const tick = (now: number) => {
        pending = undefined;
        running = true;
        const dt = hasPrevious ? Math.max(0, Math.min(100, now - previous)) : 1000 / 60;
        previous = now;
        hasPrevious = true;
        const end = tail;
        try {
            for (let node = head; node; node = node.next) {
                if (node.active && node.read) {
                    try {
                        node.read();
                    } catch (error) {
                        node.active = false;
                        dirty = true;
                        throw error;
                    }
                }
                if (node === end) break;
            }
            for (let node = head; node; node = node.next) {
                if (node.active) {
                    try {
                        if (!node.job(dt)) {
                            node.active = false;
                            dirty = true;
                        }
                    } catch (error) {
                        node.active = false;
                        dirty = true;
                        throw error;
                    }
                }
                if (node === end) break;
            }
        } finally {
            running = false;
            if (dirty) compact();
            if (!head) hasPrevious = false;
            wake();
        }
    };

    return {
        add(job: FrameJob, read?: FrameRead): () => void {
            const entry: FrameEntry = { job, read, active: true };
            if (tail) tail.next = entry;
            head ??= entry;
            tail = entry;
            wake();
            return () => {
                if (!entry.active) return;
                entry.active = false;
                dirty = true;
                if (running) return;
                compact();
                if (!head) {
                    if (pending !== undefined) scheduler.cancel(pending);
                    pending = undefined;
                    hasPrevious = false;
                }
            };
        },
        addMeasured(read: FrameRead, job: FrameJob): () => void {
            return this.add(job, read);
        },
        get size(): number {
            let count = 0;
            for (let node = head; node; node = node.next) {
                if (node.active) count += 1;
            }
            return count;
        }
    };
}
