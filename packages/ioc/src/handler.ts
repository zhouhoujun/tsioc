import { Execption } from './execption';


/**
 * dispatch handle function.
 */
export type Handler<T = any, TR = any> = (ctx: T, next: () => TR) => TR;

/**
 * compose handlers in chain.
 * @param handlers 
 */
export function chain<T, TR>(handlers: Handler<T, TR>[]): Handler<T, TR> {
    return (ctx: T, next: () => TR) => {
        return runChain(handlers, ctx, next);
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
    function dispatch(i: number): TR {
        if (i <= index) {
            throw new Execption('next called mutiple times.');
        }
        index = i;
        let handle = handlers[i];
        if (i === handlers.length) {
            handle = next!
        }
        if (!handle) {
            return next?.() as TR;
        }
        const gnext = dispatch.bind(null, i + 1);
        return handle(ctx, gnext)
    }
    return dispatch(0)
}
