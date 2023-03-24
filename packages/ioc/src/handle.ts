import { Execption } from './execption';


/**
 * dispatch handle function.
 */
export type Handle<T = any, TR = any> = (ctx: T, next: () => TR) => TR;

/**
 * compose handlers in chain.
 * @param handlers 
 */
export function chain<T, TR>(handlers: Handle<T, TR>[]): Handle<T, TR> {
    return (ctx: T, next: () => TR) => {
        return runChain(handlers, ctx, next);
    }
}

/**
 * run handles in chain.
 *
 * @export
 * @template T input context type.
 * @template TR returnning type.
 * @param {Handle<T>[]} handles to run handles in chain. array of {@link Handle}.
 * @param {T} ctx input context.
 * @param {() => TR} [next] the next step.
 */
export function runChain<T, TR = void>(handles: Handle<T, TR>[], ctx: T, next?: () => TR): TR {
    if (!handles.length) return null!;
    let index = -1;
    function dispatch(i: number): TR {
        if (i <= index) {
            throw new Execption('next called mutiple times.');
        }
        index = i;
        let handle = handles[i];
        if (i === handles.length) {
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
