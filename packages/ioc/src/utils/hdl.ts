/**
*  action handle.
*/
export type Handler<T = any, TR = any> = (ctx: T, next?: () => TR) => TR;

/**
 * sync action.
 */
export type SyncHandler<T = any> = Handler<T, void>;

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
export function chain<T, TR = void>(handlers: Handler<T, TR>[], ctx: T, next?: () => TR) {
    if (!handlers.length) return;
    let index = -1;
    function dispatch(idx: number): TR {
        if (idx <= index) {
            throw new Error('next called mutiple times.');
        }
        index = idx;
        let handle = idx < handlers.length ? handlers[idx] : null;
        if (idx === handlers.length) {
            handle = next;
        }
        if (!handle) {
            return;
        }
        try {
            return handle(ctx, dispatch.bind(null, idx + 1));
        } catch (err) {
            throw err;
        }
    }
    return dispatch(0);
}
