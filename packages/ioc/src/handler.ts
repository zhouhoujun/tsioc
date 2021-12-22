import { isFunction } from './utils/chk';

/**
 * handler
 */
export interface DispatchHandler<T = any, TR = any> {
    /**
     * dispatch invoke handle.
     * @param ctx invoke context.
     * @param next next step.
     */
    handle(ctx: T, next: () => TR): TR;
}

/**
 * dispatch invoke handle.
 */
export type Hanlde<T = any, TR = any> = (ctx: T, next: () => TR) => TR;

/**
*  handler.
*/
export type Handler<T = any, TR = any> = DispatchHandler<T, TR> | Hanlde<T, TR>;

/**
 * async action.
 */
export type AsyncHandler<T = any> = Handler<T, Promise<void>>;

/**
 * execute action in chain.
 *
 * @export
 * @template T
 * @template TR
 * @param {ActionHandle<T>[]} handlers
 * @param {T} ctx
 * @param {() => TR} [next]
 */
export function chain<T, TR = void>(handlers: Handler<T, TR>[], ctx: T, next?: () => TR): TR {
    if (!handlers.length) return null!;
    let index = -1;
    function dispatch(idx: number): TR {
        if (idx <= index) {
            throw new Error('next called mutiple times.');
        }
        index = idx;
        let handle = idx < handlers.length ? handlers[idx] : null;
        if (idx === handlers.length) {
            handle = next!;
        }
        if (!handle) {
            return null!;
        }
        const gnext = dispatch.bind(null, idx + 1);
        return isFunction(handle) ? handle(ctx,gnext) : handle.handle(ctx,gnext);
    }
    return dispatch(0);
}
