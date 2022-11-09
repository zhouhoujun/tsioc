import { ClassType } from '../types';
import { TypeDef } from '../metadata/type';
import { InvocationContext } from '../context';
import { AsyncLike, OperationInvoker } from '../operation';
import { isTypeObject } from '../utils/obj';
import { from, Observable } from 'rxjs';
import { Handler, runChain } from '../handler';
import { Defer, defer, step, pomiseOf } from '../utils/lang';
import { isFunction, isNil, isObservable } from '../utils/chk';



/**
 * reflective operation invoker.
 * implements {@link OperationInvoker}
 */
export class ReflectiveOperationInvoker<T = any> implements OperationInvoker<T> {

    private _returnType!: ClassType;
    constructor(
        private typeRef: TypeDef,
        private method: string,
        private instance?: any | (() => any)) {
    }

    get descriptor(): TypedPropertyDescriptor<T> {
        return this.typeRef.class.getDescriptor(this.method)
    }

    get returnType(): ClassType {
        if (!this._returnType) {
            this._returnType = this.typeRef.class.getReturnning(this.method) ?? Object
        }
        return this._returnType
    }

    private _befores?: ((context: InvocationContext, args: any[]) => AsyncLike<void | any[]>)[];
    /**
    * before invoke.
    * @param hook 
    */
    before(hook: (context: InvocationContext, args: any[]) => AsyncLike<void | any[]>): void {
        if (!this._befores) {
            this._befores = []
        }
        this._befores.push(hook)
    }

    private _afters?: ((context: InvocationContext, returnning: T) => AsyncLike<void>)[];
    /**
     * after invoke.
     * @param hook 
     */
    after(hook: (context: InvocationContext, returnning: T) => AsyncLike<void>): void {
        if (!this._afters) {
            this._afters = []
        }
        this._afters.push(hook)
    }

    private _afterReturnnings?: ((ctx: InvocationContext, returnning: T) => AsyncLike<any>)[];
    /**
     * after returning hooks.
     */
    afterReturnning(hook: (context: InvocationContext, returnning: T) => AsyncLike<any>): void {
        if (!this._afterReturnnings) {
            this._afterReturnnings = []
        }
        this._afterReturnnings.push(hook)
    }

    private _afterThrowings?: ((context: InvocationContext, throwing: Error) => AsyncLike<void>)[];
    /**
     * after throwing hooks.
     */
    afterThrowing(hook: (context: InvocationContext, throwing: Error) => AsyncLike<void>): void {
        if (!this._afterThrowings) {
            this._afterThrowings = []
        }
        this._afterThrowings.push(hook)
    }

    private _finallies?: ((context: InvocationContext) => AsyncLike<void>)[];
    /**
     * finally hooks.
     */
    finally(hook: (context: InvocationContext) => AsyncLike<void>): void {
        if (!this._finallies) {
            this._finallies = []
        }
        this._finallies.push(hook)
    }

    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param proceeding proceeding invoke with hooks
     */
    invoke(context: InvocationContext, proceeding?: (args: any[], runnable: (args: any[]) => any) => any): T
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param proceeding proceeding invoke with hooks
     */
    invoke(context: InvocationContext, instance: object, proceeding?: (args: any[], runnable: (args: any[]) => any) => any): T;
    invoke(context: InvocationContext, arg?: object | Function, proceeding?: (args: any[], runnable: (args: any[]) => any) => any): T {
        let instance;
        if (arg && isTypeObject(arg)) {
            instance = arg;
        } else if (this.instance) {
            instance = isFunction(this.instance) ? this.instance() : this.instance;
        }

        if (this._befores || this._afters || this._finallies || this._afterReturnnings || this._afterThrowings) {
            const oldprcd = proceeding;
            const isAsync = this.returnType === Observable || this.returnType === Promise;
            proceeding = (args: any[], runnable: (args: any[]) => void) => {
                const chians: Handler[] = [];
                if (this._befores) chians.push((ctx, next) => runHooks(ctx, this._befores!, next, isAsync, '__args', args))

                let result: any;
                chians.push((ctx, next) => {
                    if (!ctx.__throwing) {
                        try {
                            result = oldprcd ? oldprcd(ctx.__args ?? args, runnable) : runnable(ctx.__args ?? args)
                        } catch (err) {
                            ctx.__throwing = err;
                        }
                    }
                    next();
                })

                if (this._afters) chians.push((ctx, next) => !ctx.__throwing && runHooks(ctx, this._afters!, next, isAsync, '', result))

                if (this._afterReturnnings) chians.push((ctx, next) => !ctx.__throwing && runHooks(ctx, this._afterReturnnings!, next, isAsync, '__returnning', result))

                if (this._afterThrowings) chians.push((ctx, next) => ctx.__throwing && runHooks(ctx, this._afterThrowings!, next, isAsync, '', args))

                if (this._finallies) chians.push((ctx, next) => runHooks(ctx, this._finallies!, next, isAsync, '', result))


                const ctx = context as any;
                let returning: any;
                let returnDefer: Defer<any> | undefined;
                let throwing: Error | undefined;
                runChain(chians, ctx, () => {
                    returnDefer = ctx.__returnDefer;
                    returning = ctx.__returnning ?? result;
                    throwing = ctx.__throwing;
                    if (returnDefer) {
                        if (throwing) {
                            returnDefer.reject(throwing);
                        } else {
                            returnDefer.resolve(returning);
                        }
                    }
                    clean(ctx);
                });

                if (returnDefer) {
                    return isObservable(result) ?
                        from(returnDefer.promise)
                        : returnDefer.promise
                } else {
                    if (throwing) {
                        throw throwing;
                    }
                    return returning
                }
            }

        }

        return this.typeRef.class.invoke(this.method, context, instance, proceeding)
    }

    /**
     * resolve args.
     * @param context 
     */
    resolveArguments(context: InvocationContext): any[] {
        return this.typeRef.class.resolveArguments(this.method, context)
    }
}

function clean(ctx: any) {
    if (!ctx) return;
    ctx.__returnDefer = null;
    ctx.__throwing = null;
    ctx.__args = null;
    ctx.__returnning = null;
}

function runHooks(ctx: InvocationContext & Record<string, any>, hooks: ((joinPoint: InvocationContext, ...args: any[]) => any)[], next: () => void, isAsync: boolean, field: '__args' | '__returnning' | '', arg: any) {
    if (isAsync) {
        if (!ctx.__returnDefer) {
            ctx.__returnDefer = defer()
        }
        return step(hooks.map(h => (a) => pomiseOf(h(ctx, a ?? arg))), arg)
            .then(value => {
                if (!isNil(value) && field) {
                    ctx[field] = value;
                }
                next()
            })
            .catch(err => {
                ctx.__throwing = err;
            })
    } else {
        try {
            let ps: any;
            hooks.forEach(hook => {
                ps = hook(ctx, ...ps ?? arg)
            });
            if (!isNil(ps) && field) {
                ctx[field] = ps;
            }
            return next()
        } catch (err) {
            ctx.__throwing = err
        }
    }
}
