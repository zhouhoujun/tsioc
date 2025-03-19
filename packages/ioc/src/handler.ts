import { catchError, finalize, isObservable, lastValueFrom, mergeMap, Observable, of, throwError } from 'rxjs';
import { isDefined, isFunction, isNumber, isPromise } from './utils/chk';
import { Token } from './tokens';

/**
 * `Handler` is the fundamental building block of handle.
 * 
 * 处理器基本构建块。
 */
export interface Handler<TInput = any, TOutput = any, TContext = any> {
    /**
     * handle.
     * 
     * 处理句柄
     * @param input handle input.
     * @param context handle with context.
     */
    handle(input: TInput, context?: TContext): TOutput;

    /**
     * is this equals to target or not
     * 
     * 该实例等于目标与否？
     * @param target 
     */
    equals?(target: any): boolean;
}

/**
 * handler fn.
 * 处理器基本构建块。
 */
export interface HandlerFn<TInput = any, TOutput = any, TContext = any> extends Function {
    (input: TInput, context?: TContext): TOutput;
    owner?: Handler<TInput, TOutput, TContext>;
}

/**
 * hanlder like
 */
export type HanlderLike<TInput = any, TOutput = any, TContext = any> = HandlerFn<TInput, TOutput, TContext> | Handler<TInput, TOutput, TContext>;

/**
 * Interceptor is a chainable behavior modifier for `hanlders`.
 * 
 * 拦截器，用于链接多个处理器，组合成处理器串。
 */
export interface Interceptor<TInput = any, TOutput = any, TContext = any> {
    /**
     * the method to implemet interceptor.
     * 
     * 实现拦截处理的方法
     * @param input  request input.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @param context interceptor with context.
     * @returns An observable of the event stream.
     */
    intercept(input: TInput, next: Handler<any, TOutput, TContext>, context?: TContext): TOutput;

    /**
     * is this equals to target or not
     * 
     * 该实例等于目标与否？
     * @param target 
     */
    equals?(target: any): boolean;
}

/**
 * interceptor fn.
 * 拦截方法，用于链接多个处理器，组合成处理器串。
 */
export interface InterceptorFn<TInput = any, TOutput = any, TContext = any> extends Function {
    (input: TInput, next: HandlerFn<any, TOutput, TContext>, context?: TContext): TOutput;
    owner?: Interceptor<TInput, TOutput, TContext>;
}

/**
 * interceptor like.
 */
export type InterceptorLike<TInput = any, TOutput = any, TContext = any> = Interceptor<TInput, TOutput, TContext> | InterceptorFn<TInput, TOutput, TContext>;



/**
 * compose chain interceptor.
 * @param interceptors 
 * @returns 
 */
export function composeInterceptors(interceptors: InterceptorLike[]): InterceptorFn {
    return interceptors.reduceRight((next, interceptorFn) => chainedInterceptorFn(next, interceptorFn), chainEndFn);
}


export function chainEndFn(req: any, finalHandlerFn: HandlerFn, context?: any) {
    return finalHandlerFn(req, context);
}

/**
 * Constructs a `ChainedInterceptorFn` which wraps and invokes a functional interceptor.
 */
function chainedInterceptorFn(
    chainTailLike: InterceptorLike, interceptorLike: InterceptorLike,
): InterceptorFn {

    const chainTailFn = isFunction(chainTailLike) ? chainTailLike : toInterceptorFn(chainTailLike);
    const interceptorFn = isFunction(interceptorLike) ? interceptorLike : toInterceptorFn(interceptorLike);

    return chainFactory(chainTailFn, interceptorFn)
}

export function chainFactory(chainTailFn: InterceptorFn, interceptorFn: InterceptorFn): InterceptorFn {
    return (initialRequest, finalHandlerFn, context?: any) =>
        interceptorFn(
            initialRequest,
            (downstreamRequest, ctx?: any) => chainTailFn(downstreamRequest, finalHandlerFn, ctx ?? context),
            context
        )
}

export function toHandlerFn(handler: Handler): HandlerFn {
    const fn = (input: any, context?: any) => handler.handle(input, context);
    fn.owner = handler;
    return fn;
}

export function toHandler(handle: HandlerFn) {
    if (handle.owner) return handle.owner;
    const hanlder = { handle };
    handle.owner = hanlder;
    return hanlder;
}

export function toInterceptorFn(interceptor: Interceptor): InterceptorFn {
    const fn = (input: any, next: HandlerFn, context?: any) => interceptor.intercept(input, toHandler(next), context);
    fn.owner = interceptor;
    return fn;
}

export class BaseChain<TInput = any, TOutput = any, TContext = any> {

    private _chain?: InterceptorFn<TInput, TOutput, TContext> | null;
    private interceptors: InterceptorLike<TInput>[];
    constructor(
        interceptors: InterceptorLike<TInput>[] = []
    ) {
        this.interceptors = interceptors.slice(0);
    }

    /**
     * use interceptor for the handler.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    use(interceptors: InterceptorLike | InterceptorLike[], order?: number): this {
        const iterceps = Array.isArray(interceptors) ? interceptors : [interceptors]
        if (isNumber(order)) {
            this.interceptors.splice(order, 0, ...iterceps)
        } else {
            this.interceptors.push(...iterceps);
        }
        this.reset();
        return this;
    }

    getIndexOf(interceptor: InterceptorLike) {
        return this.interceptors.indexOf(interceptor)
    }

    protected getChain(): InterceptorFn<TInput, TOutput, TContext> {
        if (!this._chain) {
            this._chain = this.compose();
        }
        return this._chain;
    }

    protected reset(): void {
        this._chain = null;
    }

    /**
     * compose iterceptors and filters in chain.
     * @returns 
     */
    protected compose(): InterceptorFn {
        return composeInterceptors(this.interceptors)
    }

}

export class InterceptorChina<TInput = any, TOutput = any, TContext = any> extends BaseChain<TInput, TOutput, TContext> implements Interceptor<TInput, TOutput, TContext> {
    intercept(input: TInput, next: Handler, context?: TContext): TOutput {
        return this.getChain()(input, toHandlerFn(next), context);
    }
}

export interface NextOpter<T> {
    next?: (res: T, context?: any) => any;
    error?: (error: any) => any;
    finally?: () => any;
}

export function invokeTail<T>(invoker: () => Observable<T> | Promise<T> | T, nextOpter?: NextOpter<T> | ((res: T, context?: any) => any)): Observable<T> | Promise<T> | T {

    const opter = nextOpter ? (isFunction(nextOpter) ? { next: nextOpter } : nextOpter) : null;

    let res$: Observable<T> | Promise<T> | T;
    try {
        res$ = invoker();
    } catch (err) {
        if (opter?.error) {
            const ct = opter?.error(err);
            if (isDefined(ct)) {
                return ct;
            }
        }
        throw err;
    }

    if (!opter) return res$;

    if (isObservable(res$)) {
        let ob$ = res$;
        if (opter.next) {
            ob$ = ob$.pipe(
                mergeMap(res => {
                    const n$ = opter.next!(res);
                    if (isObservable(n$) || isPromise(n$)) return n$;
                    return of(res);
                }),
            )
        }
        if (opter.finally) {
            ob$ = ob$.pipe(
                finalize(() => {
                    opter.finally!()
                }));
        }
        if (opter.error) {
            ob$ = ob$.pipe(
                catchError((err, caught) => {
                    const ct = opter.error!(err);
                    if (isObservable(ct) || isPromise(ct)) return ct;
                    if (isDefined(ct)) return of(ct);

                    return throwError(() => err);
                })
            )
        }
        return ob$;
    } else if (isPromise(res$)) {
        let pr$ = res$;
        if (opter.next) {
            pr$ = pr$.then(res => opter.next!(res))
        }
        if (opter.error) {
            pr$ = pr$.catch(err => {
                const ct = opter.error!(err);
                if (isObservable(ct)) return lastValueFrom(ct)
                // if (isPromise(ct)) return ct;
                if (isDefined(ct)) return ct;

                throw err;
            })
        }
        if (opter.finally) {
            pr$ = pr$.finally(opter.finally)
        }
        return pr$;
    } else {
        if (opter.next) {
            res$ = opter.next(res$);
        }
        if (opter.finally) {
            opter.finally()
        }

        return res$;
    }

}

const endHandler: HandlerFn = (res, context?: any) => res;

export function composeHandlers(hanlders: HanlderLike[], interceptor?: (res: any, input: any, nextFn: HandlerFn, context?: any) => any): HandlerFn {
    return hanlders.reduceRight((next, handler) => {
        const invok = isFunction(handler) ? handler : (input: any, context?: any) => handler.handle(input, context);
        const nextFn = isFunction(next) ? next : (input: any, context?: any) => next.handle(input, context);
        return (input: any, context?: any) => invokeTail(() => invok(input, context), (res) => interceptor ? interceptor(res, input, nextFn, context) : nextFn(res ?? input, context));
    }, endHandler) as HandlerFn;
}


/**
 * context token.
 */
export class ContextToken<T = any> {
    constructor(readonly defaultValue: () => T) { }
}


/**
 * custom context.
 */
export class Context {

    private map: Map<Token | ContextToken, any>;

    constructor(entries?: readonly (readonly [Token | ContextToken, any])[] | null) {
        this.map = new Map(entries);
    }

    /**
     * Store a value in the context. If a value is already present it will be overwritten.
     *
     * @param token The reference to an instance of `Token`.
     * @param value The value to store.
     *
     * @returns A reference to itself for easy chaining.
     */
    set<T>(token: Token<T> | ContextToken<T>, value: T) {
        this.map.set(token, value);
        return this;
    }
    /**
     * Retrieve the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns The stored value or default if one is defined.
     */
    get<T>(token: ContextToken<T>): T;
    /**
     * Retrieve the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns The stored value or default if one is defined.
     */
    get<T>(token: Token<T>): T;
    /**
     * Retrieve the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns The stored value or default if one is defined.
     */
    get<T>(token: Token<T> | ContextToken<T>): T {
        if (token instanceof ContextToken && !this.map.has(token)) {
            this.map.set(token, token.defaultValue());
        }
        return this.map.get(token) ?? null;
    }
    /**
     * Delete the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns A reference to itself for easy chaining.
     */
    delete<T>(token: Token<T> | ContextToken<T>) {
        this.map.delete(token);
        return this;
    }
    /**
     * Checks for existence of a given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns True if the token exists, false otherwise.
     */
    has<T>(token: Token<T> | ContextToken<T>): boolean {
        return this.map.has(token);
    }
    /**
     * @returns a list of tokens currently stored in the context.
     */
    keys(): Iterator<Token | ContextToken> {
        return this.map.keys();
    }

    onDestroy(): void {
        this.map.clear();
    }

}
