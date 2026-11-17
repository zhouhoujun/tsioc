import { EventEmitter } from '../EventEmitter';

/**
 * Live list of query results. `changes` fires whenever the underlying view
 * structure changes; the list itself is mutated in place so `@ViewChildren`
 * properties stay stable.
 */
export class QueryList<T> implements Iterable<T> {
    private items: T[] = [];
    private notifyScheduled = false;
    private destroyed = false;
    readonly changes = new EventEmitter<QueryList<T>>();

    get length(): number {
        return this.items.length;
    }

    get first(): T | undefined {
        return this.items[0];
    }

    get last(): T | undefined {
        return this.items[this.items.length - 1];
    }

    get(index: number): T | undefined {
        return this.items[index];
    }

    toArray(): T[] {
        return this.items.slice();
    }

    reset(items: T[]): void {
        if (this.destroyed) {
            return;
        }
        this.items = items;
        // Coalesce structural churn into one notification per microtask while
        // the list contents stay immediately readable.
        this.scheduleNotify();
    }

    /** Complete the change stream when the owning component is destroyed. */
    destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.items = [];
        if (!this.changes.closed) {
            this.changes.complete();
        }
    }

    private scheduleNotify(): void {
        if (this.destroyed || this.notifyScheduled) {
            return;
        }
        this.notifyScheduled = true;
        Promise.resolve().then(() => {
            this.notifyScheduled = false;
            if (!this.destroyed) {
                this.changes.emit(this);
            }
        });
    }

    [Symbol.iterator](): Iterator<T> {
        return this.items[Symbol.iterator]();
    }
}
