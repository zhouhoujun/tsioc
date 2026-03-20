import { AbstractType } from '../types';
import { hasContextOptions, InvocationOptions, InvokeOptions } from '../context';
import { Invocation, InvocationFactory } from '../invocation';
import { isArray, isFunction, isPromise, isString, isSymbol } from '../utils/chk';
import { getType } from '../metadata/type';
import { DestroyCallback, OnDestroy } from '../destroy';
import { ClassRef, getClassify } from '../metadata/class';
import { createInjector, Injector, isInjector, MethodType, RECORDS } from '../injector';
import { ArgumentException, Exception } from '../exception';
import { InjectFlags, TokenOf } from '../tokens';
import { immediate } from '../utils/lang';
import { composeHandlers } from '../handlers/compose';
import { Runtime } from '../runtime';
import { Provider } from '../providers';
import { ResolveInterceptorLike } from '../resolver';
import { createRunContext, RunContext } from '../handlers/contexts';
import { ctorName } from '../metadata/define';
import { AbstractInjector, InjectUtil } from './injector';
import { createValueRecord } from './common';

/**
 * abstract invocation 
 * implements {@link Invocation}
 */
export abstract class AbstractInvocation<T = any,
    TOpts extends InvocationOptions<T> = InvocationOptions<T>,
    TInj extends Injector = Injector,
    TRes = any> extends Invocation<T, TRes, TInj> implements OnDestroy {

    private _mthCtx: Map<string | symbol, TInj | null>;
    private _instance?: T;
    private _isResolve = false;

    order?: number | undefined;

    constructor(
        private _classRef: ClassRef<T>,
        readonly injector: TInj,
        protected options?: TOpts) {
        super();
        this._isResolve = hasContextOptions(options);
        this._mthCtx = new Map();
        // Store invocation in context using records directly
        injector[RECORDS].set(Invocation, createValueRecord(this));
        injector[RECORDS].set(getType(this), createValueRecord(this));
        injector.onDestroy(this);
    }

    get bootstrap() {
        return this.options?.bootstrap != false;
    }

    get type(): AbstractType<T> {
        return this._classRef?.type;
    }

    get classRef(): ClassRef<T> {
        return this._classRef;
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.createInstance()
        }
        return this._instance;
    }

    /**
     * Invoke the underlying operation using the class given {@link InvocationContext}.
     * @param context the context to use to invoke the operation
     */
    invoke(): TRes;
    /**
     * Invoke the underlying operation using the class given {@link InvocationContext}.
     * @param args the arguments to use to invoke the operation
     */
    invoke(args: any[]): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     */
    invoke(context?: TInj): TRes;
    /**
     * Invoke the underlying operation using the given {@link RunContext}.
     * @param context the resolve context to use to invoke the operation
     */
    invoke(context: RunContext): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param option invoke arguments.
     */
    invoke(options: InvokeOptions): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     */
    invoke(method: MethodType<T>): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     * @param context the context to use to invoke the operation
     */
    invoke(method: MethodType<T>, context?: TInj): TRes;
    /**
     * Invoke the underlying operation using the given {@link RunContext}.
     * @param method method name.
     * @param context the context to use to invoke the operation
     */
    invoke(method: MethodType<T>, context?: RunContext): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     * @param options invoke arguments.
     */
    invoke(method: MethodType<T>, options?: InvokeOptions): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     * @param args the arguments to use to invoke the operation
     */
    invoke(method: MethodType<T>, args?: any[]): TRes;
    invoke(arg?: TInj | RunContext | InvokeOptions | MethodType<T> | any[], optionOrArgs?: TInj | RunContext | InvokeOptions | any[]): TRes {
        this.assertNotDestroyed();
        let name: string | symbol | undefined;
        let args: any[] | undefined;
        let rctx: RunContext | undefined;

        let context: TInj | InvokeOptions | undefined;
        if(isInjector(arg)) {
            context = arg;
        } else if (isArray(arg)) {
            args = arg;
        } else if (isString(arg) || isSymbol(arg) || isFunction(arg)) {
            name = isFunction(arg) ? this.classRef.getMethodName(arg) : arg;
            if (isArray(optionOrArgs)) {
                args = optionOrArgs;
            } else if (optionOrArgs instanceof RunContext) {
                rctx = optionOrArgs;
            } else {
                context = optionOrArgs;
            }
        } else if (arg instanceof RunContext) {
            rctx = arg;
        } else {
            context = arg;
        }

        if (!name) {
            name = this.options?.propertyKey;
        }

        if (!name) {
            return this.process(context, rctx)
        }

        return this.invokeMethod(name, context, args, rctx);
    }

    protected abstract process(context?: TInj | InvokeOptions, resolveCtx?: RunContext): any;

    protected invokeMethod(name: string | symbol, options?: TInj | InvokeOptions, args?: any[], resolveCtx?: RunContext): any {

        const [context, destroy, payload] = args ? [this.injector] : this.createInvokeContext(name, options);
        const isNetRCtx = !resolveCtx;
        if (isNetRCtx) {
            resolveCtx = createRunContext(context);
            if (payload) resolveCtx.setPayload(payload);
        } else {
            resolveCtx!.setInjector(context);
        }

        if (!args) {
            args = this.classRef.resolveArguments(name, context, resolveCtx);
        }

        const result = this.classRef.invoke(name, context, this.instance, args);

        if (destroy || isNetRCtx) {
            const act = isNetRCtx ? () => {
                destroy?.();
                resolveCtx?.onDestroy();
            } : destroy as (() => void);

            if (isPromise(result)) {
                return result.then(val => {
                    immediate(act);
                    return val;
                }) as TRes
            } else {
                immediate(act);
            }
        }
        return result;
    }

    protected createContext(parent: Injector, options?: InvokeOptions): TInj {
        return createInjector(parent, options) as TInj;
    }

    getMethodContext(propertyKey: string | symbol): TInj {
        if (propertyKey === ctorName) return this.injector;
        let ctx = this._mthCtx.get(propertyKey);
        if (ctx === undefined) {
            const opts = this.classRef.getMethodOptions(propertyKey);
            if (hasContextOptions(opts)) {
                ctx = this.createContext(this.injector, opts);
                this.injector.onDestroy(ctx);
                this._mthCtx.set(propertyKey, ctx);
            } else {
                this._mthCtx.set(propertyKey, null);
            }
        }
        return ctx ?? this.injector;
    }


    protected createInvokeContext(propertyKey: string | symbol, options?: Injector | InvokeOptions): [TInj, Function | undefined, any] {
        const ctx = this.getMethodContext(propertyKey);
        let context: TInj;
        let destroy: Function | undefined;
        let payload: any | undefined;

        if (isInjector(options)) {
            // Use the provided context directly
            context = options as any;
            // No need for ref management - context lifecycle is managed by caller
        } else if (hasContextOptions(options)) {
            // Create new context with options
            context = this.createContext(ctx, options);
            payload = options?.payload;
            destroy = () => {
                if (!context.destroyed) {
                    context.destroy()
                }
            }
        } else {
            // Use method context directly
            payload = options?.payload;
            context = ctx;
        }

        return [context, destroy, payload]
    }

    protected createInstance(context?: RunContext): T {
        this.assertNotDestroyed();
        if (this.options?.instance) {
            return isFunction(this.options.instance) ? this.options.instance(this.injector) : this.options.instance;
        }
        return this.injector.resolve(this.type, this._isResolve ? InjectFlags.Resolve : undefined, context);
    }

    equals(target: Invocation): boolean {
        if (!target || !this._classRef) return false;
        if (target === this) return true;
        if (target?.classRef !== this.classRef) return false;
        if ((target as AbstractInvocation).options?.propertyKey !== this.options?.propertyKey) return false;
        return target.instance !== this._instance;
    }

    /**
     * context destroyed or not.
     */
    get destroyed(): boolean {
        return this.injector.destroyed;
    }

    /**
     * destroy this.
     */
    destroy(): void | Promise<void> {
        if (this.destroyed) return;
        this.clean();
        return this.injector.destroy()
    }

    protected clean() {
        // this._tagPdrs = null!;
        this._classRef = null!;
        this._instance = null!;
        this._mthCtx.clear();
    }

    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    onDestroy(callback?: DestroyCallback): void | Promise<void> {
        if (!callback) {
            return this.destroy();
        }
        this.injector.onDestroy(callback);
    }

    protected assertNotDestroyed(): void {
        if (this.destroyed) {
            throw new Exception(`ReflectiveRef of ${this._classRef?.className} has already been destroyed.`)
        }
    }
}

/**
 * default invocation.
 * extends {@link AbstractInvocation}
 */
export class DefaultInvocation<T = any,
    TOpts extends InvocationOptions<T> = InvocationOptions<T>,
    TInj extends Injector = Injector,
    TRes = any> extends AbstractInvocation<T, TOpts, TInj, TRes> {


    constructor(
        _classRef: ClassRef<T>,
        injector: TInj,
        options: TOpts = {} as TOpts) {
        super(_classRef, injector, options);
    }

    protected process(option?: TInj | InvokeOptions, resolveCtx?: RunContext) {
        const runnables = this.classRef.runnables.filter(r => !r.auto);
        if (runnables && runnables.length) {
            const handler = composeHandlers(runnables.sort((a, b) => (a.order || 0) - (b.order || 0)).map(runnable => {
                return (option) => this.invokeMethod(runnable.propertyKey, option, undefined, resolveCtx)
            }));
            return handler(this.injector, resolveCtx);
        } else {
            throw new ArgumentException(this.classRef.className + ' is invaild runnable, can not invocation without method param.');
        }
    }

}


export abstract class AbstractInvocationFactory<TOpts extends InvocationOptions = InvocationOptions> implements InvocationFactory<TOpts> {


    constructor(
        protected runtime: Runtime
    ) {

    }

    create<T>(type: AbstractType<T> | ClassRef<T>, options?: TOpts): Invocation<T> {
        const cls = getClassify(type);
        const resolvers = this.mergeResolvers(cls, options);
        const providers = this.mergeProviders(cls, options);
        const context = this.createInjector(cls, this.getInjector(cls, options), {
            ...options,
            providers,
            resolvers,
            targetType: cls.type
        } as TOpts);
        return this.createInstance(cls, context, options);
    }

    protected abstract createInstance<T>(typeRef: ClassRef<T>, injector: Injector, options?: TOpts): Invocation<T>;

    protected createInjector<T>(typeRef: ClassRef<T>, injector: Injector, options: TOpts): Injector {
        return createInjector(injector, options, typeRef.type);
    }
    protected mergeProviders<T>(typeRef: ClassRef<T>, options?: TOpts): Provider[] {
        const providers: Provider[] = [];
        const typeProviders = this.runtime.getTypeProvider(typeRef);
        if (typeProviders) {
            providers.push(...typeProviders);
        }
        if (options?.providers) {
            providers.push(...options.providers);
        }
        return providers;
    }

    protected mergeResolvers<T>(typeRef: ClassRef<T>, options?: TOpts): TokenOf<ResolveInterceptorLike>[] {
        let resolvers = options?.resolvers;
        if (resolvers) {
            if (typeRef.resolvers) resolvers = resolvers.concat(typeRef.resolvers)
        } else {
            resolvers = typeRef.resolvers.slice(0);
        }
        return resolvers;
    }

    protected getInjector<T>(typeRef: ClassRef<T>, options?: TOpts): Injector {
        return options?.injector ?? this.runtime.getRegisterIn(typeRef.type)!
    }

}


export class DefaultInvocationFactory extends AbstractInvocationFactory implements InvocationFactory {

    protected override createInstance<T>(typeRef: ClassRef<T>, context: Injector, options?: InvocationOptions<T>): Invocation<T> {
        return new DefaultInvocation(typeRef, context, options);
    }

}
