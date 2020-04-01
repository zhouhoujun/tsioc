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
     * @param generatorOrNext When supplied, a custom handler for emitted events.
     * @param error When supplied, a custom handler for an error notification
     * from this emitter.
     * @param complete When supplied, a custom handler for a completion
     * notification from this emitter.
     */
    subscribe(generatorOrNext?: any, error?: any, complete?: any): Subscription {
        let schedulerFn: (t: any) => any;
        let errorFn = (err: any): any => null;
        let completeFn = (): any => null;
        if (generatorOrNext && typeof generatorOrNext === 'object') {
            schedulerFn = this.async ? (value: any) => {
                setTimeout(() => generatorOrNext.next(value));
            } : (value: any) => { generatorOrNext.next(value); };

            if (generatorOrNext.error) {
                errorFn = this.async ? (err) => { setTimeout(() => generatorOrNext.error(err)); } :
                    (err) => { generatorOrNext.error(err); };
            }

            if (generatorOrNext.complete) {
                completeFn = this.async ? () => { setTimeout(() => generatorOrNext.complete()); } :
                    () => { generatorOrNext.complete(); };
            }
        } else {
            schedulerFn = this.async ? (value: any) => { setTimeout(() => generatorOrNext(value)); } :
                (value: any) => { generatorOrNext(value); };

            if (error) {
                errorFn = this.async ? (err) => { setTimeout(() => error(err)); } : (err) => { error(err); };
            }

            if (complete) {
                completeFn = this.async ? () => { setTimeout(() => complete()); } : () => { complete(); };
            }
        }

        const sink = super.subscribe(schedulerFn, errorFn, completeFn);

        if (generatorOrNext instanceof Subscription) {
            generatorOrNext.add(sink);
        }

        return sink;
    }
}
