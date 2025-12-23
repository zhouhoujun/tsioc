import { catchError, finalize, from, isObservable, lastValueFrom, mergeMap, Observable, of, throwError } from 'rxjs';
import { Handler, HandlerFn, HandlerLike } from './handler';
import { isDefined, isFunction, isPromise } from '../utils/chk';
import { Interceptor, InterceptorFn, InterceptorLike } from './interceptor';
import { HandleResult, NextOpter, TailNext } from './handler';



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

export function composeToHanlderFn(handler: HandlerLike, interceptors: InterceptorLike[]): HandlerFn {
    const interceptorFn = composeInterceptors(interceptors);
    const handlerFn = isFunction(handler) ? handler : toHandlerFn(handler);
    return (req, context) => interceptorFn(req, handlerFn, context);
}


export function chainEndFn(req: any, finalHandlerFn: HandlerFn, context: any) {
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
    return (initialRequest, finalHandlerFn, context: any) =>
        interceptorFn(
            initialRequest,
            (downstreamRequest, ctx) => chainTailFn(downstreamRequest, finalHandlerFn, ctx ?? context),
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

function toHandler(handle: HandlerFn & { [owner]?: Handler }): Handler {
    if (handle[owner]) {
        return handle[owner];
    }
    const handler = { handle };
    handle[owner] = handler;
    return handler;
}


const interceptorFn = Symbol('__interceptorFn');
function toInterceptorFn(interceptor: Interceptor & { [interceptorFn]?: InterceptorFn }): InterceptorFn {
    if (interceptor[interceptorFn]) {
        return interceptor[interceptorFn];
    }
    const fn = (input: any, next: HandlerFn, context?: any) => interceptor.intercept(input, toHandler(next), context);
    interceptor[interceptorFn] = fn;
    // fn[owner] = interceptor;
    return fn;
}

/**
 * parse handle result to `Observable`
 */
export function toObservable<T>(res: HandleResult<T>): Observable<T> {
    if (isObservable(res)) {
        return res as Observable<T>;
    }
    return isPromise(res) ? from(res) : of(res);
}

/**
 * parse handle result to `Promise`
 */
export function toPromise<T>(res: HandleResult<T>): Promise<T> {
    if (isObservable(res)) {
        return lastValueFrom(res);
    }
    return isPromise(res) ? res : Promise.resolve(res);
}


export function invokeTail<T, TContext = any>(invoke: (arg1?: any, arg2?: any, arg3?: any) => HandleResult<T>, tail: TailNext<T, TContext>, arg1?: any, arg2?: any, arg3?: any): HandleResult<T> {
    const opter = isFunction(tail) ? { next: tail } : tail;

    try {
        const res$ = invoke(arg1, arg2, arg3);
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

/**
 * 处理多个连续的invoke调用
 */
export function invokeTails<T, TContext = any>(invoke: (res?: any, context?: TContext) => HandleResult<any>, next: TailNext<T, TContext>, ...nexts: (TailNext<T, TContext> | undefined)[]): HandleResult<T>;
export function invokeTails<T, TContext = any>(invoke: (res?: any, context?: TContext) => HandleResult<any>, ...nexts: (TailNext<T, TContext> | undefined)[]): HandleResult<T>;
export function invokeTails<T, TContext = any>(...invokes: ((res?: any, context?: TContext) => HandleResult<any>)[]): HandleResult<T>
export function invokeTails<T, TContext = any>(invoke: (res?: any, context?: TContext) => HandleResult<any>, ...nexts: (TailNext<T, TContext> | undefined)[]): HandleResult<T> {
    const fn = nexts.reduceRight<(res?: T, context?: TContext) => Observable<T> | Promise<T> | T>((invoke, next) => next ? (res, context) => invokeTail(invoke, next, res, context) : invoke, invoke);
    return fn();
}


function processObservable<T>(obs$: Observable<T>, opter: NextOpter<T>): Observable<T> {
    if (opter.next) {
        obs$ = obs$.pipe(
            mergeMap(res => {
                const n$ = opter.next!(res);
                return (isObservable(n$) || isPromise(n$)) ? n$ : of(n$);
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
    if (!interceptor && hanlders.length === 1) return parseToHandlerFn(hanlders[0]);
    return hanlders.reduceRight((next, handler) => {
        const invok = parseToHandlerFn(handler);
        const nextFn = isFunction(next) ? next : (input: any, context?: any) => next.handle(input, context);
        if (interceptor) {
            return (input: any, context?: any) => invokeTail(invok, (res) => interceptor(res, nextFn, input, context), input, context);
        }
        return (input: any, context?: any) => invokeTail(invok, (res) => nextFn(res ?? input, context), input, context);
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

