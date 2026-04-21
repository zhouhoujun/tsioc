"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeInterceptors = composeInterceptors;
exports.chainEndFn = chainEndFn;
exports.chainFactory = chainFactory;
exports.toHandlerFn = toHandlerFn;
exports.toObservable = toObservable;
exports.toPromise = toPromise;
exports.invokeTail = invokeTail;
exports.invokeTails = invokeTails;
exports.composeHandlers = composeHandlers;
const rxjs_1 = require("rxjs");
const chk_1 = require("../utils/chk");
/**
 * compose chain interceptor.
 * @param interceptors
 * @returns
 */
function composeInterceptors(interceptors) {
    if (!interceptors.length) {
        return chainEndFn;
    }
    if (interceptors.length === 1) {
        return (0, chk_1.isFunction)(interceptors[0]) ? interceptors[0] : toInterceptorFn(interceptors[0]);
    }
    return interceptors.reduceRight((next, interceptorFn) => chainedInterceptorFn(next, interceptorFn), chainEndFn);
}
function chainEndFn(req, finalHandlerFn, context) {
    return finalHandlerFn(req, context);
}
/**
 * Constructs a `ChainedInterceptorFn` which wraps and invokes a functional interceptor.
 */
function chainedInterceptorFn(chainTailLike, interceptorLike) {
    const chainTailFn = (0, chk_1.isFunction)(chainTailLike) ? chainTailLike : toInterceptorFn(chainTailLike);
    const interceptorFn = (0, chk_1.isFunction)(interceptorLike) ? interceptorLike : toInterceptorFn(interceptorLike);
    return chainFactory(chainTailFn, interceptorFn);
}
function chainFactory(chainTailFn, interceptorFn) {
    return (initialRequest, finalHandlerFn, context) => interceptorFn(initialRequest, (downstreamRequest, ctx) => chainTailFn(downstreamRequest, finalHandlerFn, ctx ?? context), context);
}
const handleFn = Symbol('__handlerFn');
const owner = Symbol('__owner');
function toHandlerFn(handler) {
    // 优先返回结果
    if (handler[handleFn]) {
        return handler[handleFn];
    }
    // 创建标准化函数
    const fn = (input, context) => handler.handle(input, context);
    fn[owner] = handler;
    handler[handleFn] = fn;
    return fn;
}
function toHandler(handle) {
    if (handle[owner]) {
        return handle[owner];
    }
    const handler = { handle };
    handle[owner] = handler;
    return handler;
}
const interceptorFn = Symbol('__interceptorFn');
function toInterceptorFn(interceptor) {
    if (interceptor[interceptorFn]) {
        return interceptor[interceptorFn];
    }
    const fn = (input, next, context) => interceptor.intercept(input, toHandler(next), context);
    interceptor[interceptorFn] = fn;
    // fn[owner] = interceptor;
    return fn;
}
/**
 * parse handle result to `Observable`
 */
function toObservable(res) {
    if ((0, rxjs_1.isObservable)(res)) {
        return res;
    }
    return (0, chk_1.isPromise)(res) ? (0, rxjs_1.from)(res) : (0, rxjs_1.of)(res);
}
/**
 * parse  target to `Promise`
 */
function toPromise(res) {
    if ((0, rxjs_1.isObservable)(res)) {
        return (0, rxjs_1.lastValueFrom)(res);
    }
    return (0, chk_1.isPromise)(res) ? res : Promise.resolve(res);
}
function invokeTail(invoke, tail, input, arg2, arg3) {
    let isSync = true;
    try {
        const res$ = invoke(input, arg2, arg3);
        if ((0, rxjs_1.isObservable)(res$)) {
            isSync = false;
            return processObservable(input, res$, tail, arg3 ?? arg2);
        }
        else if ((0, chk_1.isPromise)(res$)) {
            isSync = false;
            return processPromise(input, res$, tail, arg3 ?? arg2);
        }
        return processSync(input, res$, tail, arg3 ?? arg2);
    }
    catch (err) {
        if (isSync && !(0, chk_1.isFunction)(tail) && (0, chk_1.isFunction)(tail.error))
            return handleError(err, tail);
        throw err;
    }
    finally {
        if (isSync && !(0, chk_1.isFunction)(tail) && (0, chk_1.isFunction)(tail.finally)) {
            tail.finally();
        }
    }
}
function invokeTails(invoke, ...nexts) {
    const fn = nexts.reduceRight((invoke, next) => next ? (res, context) => invokeTail(invoke, next, res, context) : invoke, invoke);
    return fn();
}
function processObservableFn(input, obs$, next, context) {
    return obs$.pipe((0, rxjs_1.mergeMap)(res => {
        const n$ = next(res ?? input, context);
        return ((0, rxjs_1.isObservable)(n$) || (0, chk_1.isPromise)(n$)) ? n$ : Promise.resolve(n$);
    }));
}
function processObservable(input, obs$, opter, context) {
    if ((0, chk_1.isFunction)(opter))
        return processObservableFn(input, obs$, opter, context);
    if (opter.next) {
        obs$ = processObservableFn(input, obs$, opter.next, context);
    }
    if (opter.finally) {
        obs$ = obs$.pipe((0, rxjs_1.finalize)(opter.finally));
    }
    if (opter.error) {
        obs$ = obs$.pipe((0, rxjs_1.catchError)(err => handleOperatorError(opter.error?.(err), err)));
    }
    return obs$;
}
function toPromiseLiken(res) {
    if ((0, rxjs_1.isObservable)(res)) {
        return (0, rxjs_1.lastValueFrom)(res);
    }
    return res;
}
function processPromise(input, pr$, opter, context) {
    if ((0, chk_1.isFunction)(opter))
        return pr$.then((r) => toPromiseLiken(opter(r ?? input, context)));
    if (opter.next) {
        pr$ = pr$.then((r) => toPromiseLiken(opter.next(r ?? input, context)));
    }
    if (opter.error) {
        pr$ = pr$.catch(err => handlePromiseError(opter.error?.(err), err));
    }
    if (opter.finally) {
        pr$ = pr$.finally(opter.finally);
    }
    return pr$;
}
function processSync(input, result, opter, context) {
    if ((0, chk_1.isFunction)(opter))
        return opter(result ?? input, context);
    if (opter.next) {
        result = opter.next(result ?? input, context);
    }
    return result ?? input;
}
function handleError(err, opter) {
    const ct = opter.error?.(err);
    if ((0, chk_1.isDefined)(ct))
        return ct;
    throw err;
}
function handleOperatorError(ct, err) {
    if ((0, rxjs_1.isObservable)(ct) || (0, chk_1.isPromise)(ct))
        return ct;
    if ((0, chk_1.isDefined)(ct))
        return (0, rxjs_1.of)(ct);
    return (0, rxjs_1.throwError)(() => err);
}
function handlePromiseError(ct, err) {
    if ((0, rxjs_1.isObservable)(ct))
        return (0, rxjs_1.lastValueFrom)(ct);
    if ((0, chk_1.isDefined)(ct))
        return ct;
    throw err;
}
const endHandler = (res, context) => {
    return res;
};
/**
 * compose chain handlers.
 * @param hanlders
 * @param interceptor
 * @returns
 */
function composeHandlers(hanlders, interceptor) {
    if (!interceptor && hanlders.length === 1)
        return parseToHandlerFn(hanlders[0]);
    return hanlders.reduceRight((next, handler) => {
        const invok = parseToHandlerFn(handler);
        const nextFn = (0, chk_1.isFunction)(next) ? next : (input, context) => next.handle(input, context);
        if (interceptor) {
            return (input, context) => invokeTail(invok, (res) => interceptor(res, nextFn, input, context), input, context);
        }
        return (input, context) => invokeTail(invok, nextFn, input, context);
    }, endHandler);
}
function parseToHandlerFn(handler) {
    if ((0, chk_1.isFunction)(handler)) {
        return handler;
    }
    else if (handler) {
        return toHandlerFn(handler);
    }
    else {
        throw new Error('Invalid handler');
    }
}
//# sourceMappingURL=compose.js.map