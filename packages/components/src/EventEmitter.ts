import { _tyobj } from '@tsdi/ioc';
import { PartialObserver, Subject, Subscription } from 'rxjs';

/**
 * Use in components with the `@Output` directive to emit custom events
 * synchronously or asynchronously, and register handlers for those events
 * by subscribing to an instance.
 */
export class EventEmitter<T = any> extends Subject<T | undefined> {

    constructor(public async = false) {
        super();
    }

    /**
     * Emits an event containing a given value.
     * @param value The value to emit.
     */
    emit(value?: T) { super.next(value); }

    /**
     * Registers handlers for events emitted by this instance.
     * @param next When supplied, a custom handler for emitted events.
     * notification from this emitter.
     */
    override subscribe(next?: any): Subscription {
        let schedulerFn: (t: any) => any;
        let errorFn = (err: any): any => null;
        let completeFn = (): any => null;
        if (next && typeof next === _tyobj) {
            const genOrNext = next as PartialObserver<T>;
            schedulerFn = this.async ? (value: any) => {
                setTimeout(() => genOrNext.next?.(value));
            } : (value: any) => { genOrNext.next?.(value); };

            if (genOrNext.error) {
                errorFn = this.async ? (err) => { setTimeout(() => genOrNext.error?.(err)); } :
                    (err) => { genOrNext.error?.(err); };
            }

            if (genOrNext.complete) {
                completeFn = this.async ? () => { setTimeout(() => genOrNext.complete?.()); } :
                    () => { genOrNext.complete?.(); };
            }
        } else {
            schedulerFn = this.async ? (value: any) => { setTimeout(() => next(value)); } :
                (value: any) => { next(value); };
        }

        const sink = super.subscribe({next: schedulerFn, error: errorFn, complete: completeFn});

        if (next instanceof Subscription) {
            next.add(sink);
        }

        return sink;
    }
}
