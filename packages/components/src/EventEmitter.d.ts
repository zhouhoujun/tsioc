import { Subject, Subscription } from 'rxjs';
/**
 * Use emit custom events
 * synchronously or asynchronously, and register handlers for those events
 * by subscribing to an instance.
 */
export declare class EventEmitter<T = any> extends Subject<T | undefined> {
    async: boolean;
    constructor(async?: boolean);
    /**
     * Emits an event containing a given value.
     * @param value The value to emit.
     */
    emit(value?: T): void;
    /**
     * Registers handlers for events emitted by this instance.
     * @param next When supplied, a custom handler for emitted events.
     * @param error When supplied, a custom handler for an error notification from this emitter.
     * @param complete When supplied, a custom handler for a completion notification from this
     *     emitter.
     */
    subscribe(next?: (value: T) => void, error?: (error: any) => void, complete?: () => void): Subscription;
    /**
    * Registers handlers for events emitted by this instance.
    * @param observerOrNext When supplied, a custom handler for emitted events, or an observer
    *     object.
    * @param error When supplied, a custom handler for an error notification from this emitter.
    * @param complete When supplied, a custom handler for a completion notification from this
    *     emitter.
    */
    subscribe(observerOrNext?: any, error?: any, complete?: any): Subscription;
}
