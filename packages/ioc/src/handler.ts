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
export type HandlerFn<TInput = any, TOutput = any, TContext = any> = (input: TInput, context?: TContext) => TOutput;


/**
 * handler like
 */
export type HandlerLike<TInput = any, TOutput = any, TContext = any> = HandlerFn<TInput, TOutput, TContext> | Handler<TInput, TOutput, TContext>;

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
export type InterceptorFn<TInput = any, TOutput = any, TContext = any> = (input: TInput, next: HandlerFn<any, TOutput, TContext>, context?: TContext) => TOutput;


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
    if (!interceptors.length) {
        return chainEndFn;
    }
    if (interceptors.length === 1) {
        return isFunction(interceptors[0]) ? interceptors[0] : toInterceptorFn(interceptors[0]);
    }
    return interceptors.reduceRight((next, interceptorFn) => chainedInterceptorFn(next, interceptorFn), chainEndFn) as InterceptorFn;
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

const handleFn = Symbol('__handlerFn');
const owner = Symbol('__owner');

export function toHandlerFn(handler: Handler & { [handleFn]?: HandlerFn }): HandlerFn {
    // 优先返回结果
    if (handler[handleFn]) {
        return handler[handleFn];
    }

    // 创建标准化函数
    const fn = (input: any, context?: any) => handler.handle(input, context);
    fn[owner] = handler;
    handler[handleFn] = fn;

    return fn;
}

export function toHandler(handle: HandlerFn & { [owner]?: Handler }): Handler {
    if (handle[owner]) {
        return handle[owner];
    }
    const handler = { handle };
    handle[owner] = handler;
    return handler;
}


const interceptorFn = Symbol('__interceptorFn');
export function toInterceptorFn(interceptor: Interceptor & { [interceptorFn]?: InterceptorFn }): InterceptorFn {
    if (interceptor[interceptorFn]) {
        return interceptor[interceptorFn];
    }
    const fn = (input: any, next: HandlerFn, context?: any) => interceptor.intercept(input, toHandler(next), context);
    interceptor[interceptorFn] = fn;
    // fn[owner] = interceptor;
    return fn;
}

export class BaseChain<TInput = any, TOutput = any, TContext = any> {

    private _chain?: InterceptorFn<TInput, TOutput, TContext> | null;

    constructor(
        private interceptors: InterceptorLike<TInput>[] = []
    ) {
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


export interface NextOpter<T> {
    next?: (res: T, context?: any) => any;
    error?: (error: any) => any;
    finally?: () => any;
}

export function invokeTail<T>(invoker: () => Observable<T> | Promise<T> | T, nextOpter?: NextOpter<T> | ((res: T, context?: any) => any)): Observable<T> | Promise<T> | T {
    const opter = nextOpter ? (isFunction(nextOpter) ? { next: nextOpter } : nextOpter) : null;

    try {
        const res$ = invoker();
        if (!opter) return res$;

        if (isObservable(res$)) {
            return processObservable(res$, opter);
        } else if (isPromise(res$)) {
            return processPromise(res$, opter);
        }
        return processSync(res$, opter);
    } catch (err) {
        return handleError(err, opter!);
    }
}

function processObservable<T>(obs$: Observable<T>, opter: NextOpter<T>): Observable<T> {
    if (opter.next) {
        obs$ = obs$.pipe(
            mergeMap(res => {
                const n$ = opter.next!(res);
                return (isObservable(n$) || isPromise(n$)) ? n$ : of(res);
            })
        );
    }

    if (opter.finally) {
        obs$ = obs$.pipe(finalize(opter.finally));
    }

    if (opter.error) {
        obs$ = obs$.pipe(
            catchError(err => handleOperatorError(opter.error?.(err), err) as Observable<T>)
        );
    }

    return obs$;
}

function processPromise<T>(pr$: Promise<T>, opter: NextOpter<T>): Promise<T> {
    if (opter.next) {
        pr$ = pr$.then(opter.next);
    }

    if (opter.error) {
        pr$ = pr$.catch(err => handlePromiseError(opter.error?.(err), err));
    }

    if (opter.finally) {
        pr$ = pr$.finally(opter.finally);
    }

    return pr$;
}

function processSync<T>(result: T, opter: NextOpter<T>): T {
    if (opter.next) {
        result = opter.next(result);
    }

    if (opter.finally) {
        opter.finally();
    }

    return result;
}

function handleError<T>(err: any, opter?: NextOpter<T>): T {
    if (opter?.error) {
        const ct = opter.error(err);
        if (isDefined(ct)) return ct;
    }
    throw err;
}

function handleOperatorError<T>(ct: any, err: any) {
    if (isObservable(ct) || isPromise(ct)) return ct;
    if (isDefined(ct)) return of(ct);
    return throwError(() => err);
}

function handlePromiseError<T>(ct: any, err: any): T | Promise<T> {
    if (isObservable(ct)) return lastValueFrom(ct) as Promise<T>;
    if (isDefined(ct)) return ct;
    throw err;
}

const endHandler: HandlerFn = (res, context?: any) => res;

/**
 * compose chain handlers.
 * @param hanlders 
 * @param interceptor 
 * @returns 
 */
export function composeHandlers(hanlders: HandlerLike[], interceptor?: (res: any, nextFn: HandlerFn, input: any, context?: any) => any): HandlerFn {
    if(!interceptor && hanlders.length === 1) return parseToHandlerFn(hanlders[0]);
    return hanlders.reduceRight((next, handler) => {
        const invok = parseToHandlerFn(handler);
        const nextFn = isFunction(next) ? next : (input: any, context?: any) => next.handle(input, context);
        return (input: any, context?: any) => invokeTail(() => invok(input, context), (res) => interceptor ? interceptor(res, nextFn, input, context) : nextFn(res ?? input, context));
    }, endHandler) as HandlerFn;
}

function parseToHandlerFn(handler: HandlerLike): HandlerFn {
    if (isFunction(handler)) {
        return handler;
    } else if (handler) {
        return toHandlerFn(handler);
    } else {
        throw new Error('Invalid handler');
    }
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
