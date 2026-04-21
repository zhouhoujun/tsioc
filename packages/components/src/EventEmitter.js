"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEmitter = void 0;
const rxjs_1 = require("rxjs");
/**
 * Use emit custom events
 * synchronously or asynchronously, and register handlers for those events
 * by subscribing to an instance.
 */
class EventEmitter extends rxjs_1.Subject {
    constructor(async = false) {
        super();
        this.async = async;
    }
    /**
     * Emits an event containing a given value.
     * @param value The value to emit.
     */
    emit(value) { super.next(value); }
    /**
     * Registers handlers for events emitted by this instance.
     * @param next When supplied, a custom handler for emitted events.
     * notification from this emitter.
     */
    subscribe(next) {
        let schedulerFn;
        let errorFn = (err) => null;
        let completeFn = () => null;
        if (next && typeof next === 'object') {
            const genOrNext = next;
            schedulerFn = this.async ? (value) => {
                setTimeout(() => genOrNext.next?.(value));
            } : (value) => { genOrNext.next?.(value); };
            if (genOrNext.error) {
                errorFn = this.async ? (err) => { setTimeout(() => genOrNext.error?.(err)); } :
                    (err) => { genOrNext.error?.(err); };
            }
            if (genOrNext.complete) {
                completeFn = this.async ? () => { setTimeout(() => genOrNext.complete?.()); } :
                    () => { genOrNext.complete?.(); };
            }
        }
        else {
            schedulerFn = this.async ? (value) => { setTimeout(() => next(value)); } :
                (value) => { next(value); };
        }
        const sink = super.subscribe({ next: schedulerFn, error: errorFn, complete: completeFn });
        if (next instanceof rxjs_1.Subscription) {
            next.add(sink);
        }
        return sink;
    }
}
exports.EventEmitter = EventEmitter;
//# sourceMappingURL=EventEmitter.js.map