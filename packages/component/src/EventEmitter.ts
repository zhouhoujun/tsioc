import { Subject, Subscription } from 'rxjs';

/**
 * Use in components with the `@Output` directive to emit custom events
 * synchronously or asynchronously, and register handlers for those events
 * by subscribing to an instance.
 */
export class EventEmitter<T extends any> extends Subject<T> {

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
     * @param genOrNext When supplied, a custom handler for emitted events.
     * @param error When supplied, a custom handler for an error notification
     * from this emitter.
     * @param complete When supplied, a custom handler for a completion
     * notification from this emitter.
     */
    subscribe(genOrNext?: any, error?: any, complete?: any): Subscription {
        let schedulerFn: (t: any) => any;
        let errorFn = (err: any): any => null;
        let completeFn = (): any => null;
        if (genOrNext && typeof genOrNext === 'object') {
            schedulerFn = this.async ? (value: any) => {
                setTimeout(() => genOrNext.next(value));
            } : (value: any) => { genOrNext.next(value); };

            if (genOrNext.error) {
                errorFn = this.async ? (err) => { setTimeout(() => genOrNext.error(err)); } :
                    (err) => { genOrNext.error(err); };
            }

            if (genOrNext.complete) {
                completeFn = this.async ? () => { setTimeout(() => genOrNext.complete()); } :
                    () => { genOrNext.complete(); };
            }
        } else {
            schedulerFn = this.async ? (value: any) => { setTimeout(() => genOrNext(value)); } :
                (value: any) => { genOrNext(value); };

            if (error) {
                errorFn = this.async ? (err) => { setTimeout(() => error(err)); } : (err) => { error(err); };
            }

            if (complete) {
                completeFn = this.async ? () => { setTimeout(() => complete()); } : () => { complete(); };
            }
        }

        const sink = super.subscribe(schedulerFn, errorFn, completeFn);

        if (genOrNext instanceof Subscription) {
            genOrNext.add(sink);
        }

        return sink;
    }
}
