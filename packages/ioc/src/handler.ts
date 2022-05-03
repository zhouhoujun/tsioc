

/**
 * dispatch handle function.
 */
export type Handler<T = any, TR = any> = (ctx: T, next: () => TR) => TR;

/**
 * compose async handlers in chain.
 * @param handlers 
 */
export function chain<T>(handlers: Handler<T, Promise<void>>[]): Handler<T, Promise<void>> {
    return async (ctx: T, next: () => Promise<void>) => {
        await runChain(handlers, ctx);
        if (next) await next();
    }
}

/**
 * compose sync handlers in chain.
 * @param handlers 
 */
export function syncChain<T>(handlers: Handler<T, void>[]): Handler<T, void> {
    return (ctx: T, next: () => void) => {
        runChain(handlers, ctx);
        next && next();
    }
}

/**
 * run handlers in chain.
 *
 * @export
 * @template T input context type.
 * @template TR returnning type.
 * @param {Handler<T>[]} handlers to run handlers in chain. array of {@link Handler}.
 * @param {T} ctx input context.
 * @param {() => TR} [next] the next step.
 */
export function runChain<T, TR = void>(handlers: Handler<T, TR>[], ctx: T, next?: () => TR): TR {
    if (!handlers.length) return null!;
    let index = -1;
    function dispatch(idx: number): TR {
        if (idx <= index) {
            throw new Error('next called mutiple times.');
        }
        index = idx;
        let handle: Handler<T, TR> | undefined;
        if (idx < handlers.length) {
            handle = handlers[idx];
        } else if (idx === handlers.length) {
            handle = next!;
        }
        if (!handle) {
            return null!;
        }
        const gnext = dispatch.bind(null, idx + 1);
        return handle(ctx, gnext);
    }
    return dispatch(0);
}
