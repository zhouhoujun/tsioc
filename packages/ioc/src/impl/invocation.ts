import { AbstractType } from '../types';
import { createContext, hasContextOptions, InvocationContext, InvocationOptions, InvokeArguments } from '../context';
import { Invocation, InvocationFactory } from '../invocation';
import { getType, isArray, isFunction, isPromise, isString, isSymbol } from '../utils/chk';
import { DestroyCallback, OnDestroy } from '../destroy';
import { ClassRef } from '../metadata/class';
import { Injector, MethodType } from '../injector';
import { ArgumentException, Exception } from '../exception';
import { InjectFlags, Token } from '../tokens';
import { immediate } from '../utils/lang';
import { composeHandlers } from '../handler';
import { getClassify } from '../metadata/refl';
import { Platform } from '../platform';
import { Provider } from '../providers';

/**
 * abstract invocation 
 * implements {@link Invocation}
 */
export abstract class AbstractInvocation<T = any,
    TOpts extends InvocationOptions<T> = InvocationOptions<T>,
    TC extends InvocationContext = InvocationContext,
    TRes = any> extends Invocation<T, TRes, TC> implements OnDestroy {

    private _mthCtx: Map<string | symbol, TC | null>;
    private _instance?: T;
    private _isResolve = false;

    order?: number | undefined;

    constructor(
        private _classRef: ClassRef<T>,
        readonly context: TC,
        protected options?: TOpts) {
        super();
        this._isResolve = hasContextOptions(options);
        this._mthCtx = new Map();
        context.setValue(Invocation, this);
        context.setValue(getType(this), this);
        context.onDestroy(this);
    }


    get type(): AbstractType<T> {
        return this._classRef?.type;
    }

    get classRef(): ClassRef<T> {
        return this._classRef;
    }

    get injector(): Injector {
        return this.context.injector;
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.createInstance()
        }
        return this._instance;
    }

    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     */
    invoke(): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param args the arguments to use to invoke the operation
     */
    invoke(args: any[]): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     */
    invoke(context: TC): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param options invoke arguments.
     */
    invoke(options: InvokeArguments): TRes;
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
    invoke(method: MethodType<T>, context?: TC): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     * @param options invoke arguments.
     */
    invoke(method: MethodType<T>, options?: InvokeArguments): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     * @param args the arguments to use to invoke the operation
     */
    invoke(method: MethodType<T>, args?: any[]): TRes;
    invoke(arg?: TC | InvokeArguments | MethodType<T> | any[], optionOrArgs?: TC | InvokeArguments | any[]): TRes {
        this.assertNotDestroyed();
        let name: string | symbol | undefined;
        let args: any[] | undefined;
        let option: InvokeArguments | TC | undefined;
        if (isArray(arg)) {
            args = arg;
        } else if (isString(arg) || isSymbol(arg)) {
            name = arg;
            if (isArray(optionOrArgs)) {
                args = optionOrArgs;
            } else {
                option = optionOrArgs;
            }
        } else if (isFunction(arg)) {
            name = this.classRef.getMethodName(arg);
            if (isArray(optionOrArgs)) {
                args = optionOrArgs;
            } else {
                option = optionOrArgs;
            }
        }
        if (!name) {
            name = this.options?.propertyKey;
        }

        if (!name) {
            return this.process(option, args)
        }

        return this.invokeMethod(name, option, args);
    }

    protected abstract process(option?: TC | InvokeArguments, args?: any[]): any;

    protected invokeMethod(name: string | symbol, option?: TC | InvokeArguments, args?: any[]): any {

        const [context, destroy] = args ? [this.context] : this.createInvokeContext(name, option);
        if (!args) {
            args = this.classRef.resolveArguments(name, context);
        }

        const result = this.classRef.invoke(name, context, this.instance, args);

        if (destroy) {
            const act = destroy as (() => void);
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

    protected createContext(parent: InvocationContext, options?: InvokeArguments): TC {
        return createContext(parent, options) as TC;
    }

    protected getMethodContext(propertyKey: string | symbol): TC {
        let ctx = this._mthCtx.get(propertyKey);
        if (ctx === undefined) {
            const opts = this.classRef.getMethodOptions(propertyKey);
            if (opts) {
                ctx = this.createContext(this.context, opts);
                this.context.onDestroy(ctx);
                this._mthCtx.set(propertyKey, ctx);
            } else {
                this._mthCtx.set(propertyKey, null);
            }
        }
        return ctx ?? this.context;
    }


    protected createInvokeContext(propertyKey: string | symbol, option?: InvokeArguments | TC): [TC, Function | undefined] {
        const ctx = this.getMethodContext(propertyKey);
        let context: TC;
        let destroy: Function | undefined;
        if (option instanceof InvocationContext) {
            context = option;
            const ext = ctx !== context;
            ext && context.addRef(ctx);
            destroy = () => {
                if (context.used || context.destroyed) return;
                ext && context.removeRef(ctx);
            }
        } else if (option) {
            if (option.parent && option.parent !== ctx) {
                if (hasContextOptions(option)) {
                    context = this.createContext(option.parent!, option);
                    context.addRef(ctx);
                    destroy = () => {
                        if (context.used) return;
                        context.removeRef(ctx);
                        context.destroy()
                    }
                } else {
                    context = option.parent! as TC;
                    context.addRef(ctx);
                    destroy = () => {
                        if (context.used) return;
                        context.removeRef(ctx);
                    }
                }
            } else if (hasContextOptions(option)) {
                context = this.createContext(ctx, option);
                destroy = () => {
                    if (context.used) return;
                    context.destroy()
                }
            } else {
                context = ctx;
            }
        } else {
            context = ctx;
        }

        return [context, destroy]
    }

    protected createInstance(): T {
        this.assertNotDestroyed();
        if (this.options?.instance) {
            return isFunction(this.options.instance) ? this.options.instance(this.context) : this.options.instance;
        }
        return this.resolve(this.type, this._isResolve ? InjectFlags.Resolve : undefined);
    }

    protected resolve<R>(token: Token<R>, flags?: InjectFlags): R {
        this.assertNotDestroyed();
        return this.context.resolveArgument({ provider: token, flags, nullable: true })!
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
        return this.context.destroyed;
    }

    /**
     * destroy this.
     */
    destroy(): void | Promise<void> {
        if (this.destroyed) return;
        this.clean();
        return this.context.destroy()
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
        this.context.onDestroy(callback);
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
    TC extends InvocationContext = InvocationContext,
    TRes = any> extends AbstractInvocation<T, TOpts, TC, TRes> {


    constructor(
        _classRef: ClassRef<T>,
        context: TC,
        options: TOpts = {} as TOpts) {
        super(_classRef, context, options);
    }

    protected process(option?: TC | InvokeArguments) {
        const runnables = this.classRef.runnables.filter(r => !r.auto);
        if (runnables && runnables.length) {
            const handler = composeHandlers(runnables.sort((a, b) => (a.order || 0) - (b.order || 0)).map(runnable => {
                return (option) => this.invokeMethod(runnable.propertyKey, option)
            }));
            return handler(this.context);
        } else {
            throw new ArgumentException(this.classRef.className + ' is invaild runnable, can not invocation without method param.');
        }
    }

}


export abstract class AbstractInvocationFactory<TOpts extends InvocationOptions = InvocationOptions> implements InvocationFactory<TOpts> {


    constructor(
        protected platform: Platform
    ) {

    }

    create<T>(type: AbstractType<T> | ClassRef<T>, options?: TOpts): Invocation<T> {
        const cls = getClassify(type);
        const context = this.createContext(cls, options);
        return this.createInstance(cls, context, options);
    }

    protected abstract createInstance<T>(typeRef: ClassRef<T>, context: InvocationContext, options?: TOpts): Invocation<T>;

    protected createContext<T>(typeRef: ClassRef<T>, options?: TOpts): InvocationContext {
        let resolvers = options?.resolvers;
        if (resolvers) {
            if (typeRef.resolvers) resolvers = resolvers.concat(typeRef.resolvers)
        } else {
            resolvers = typeRef.resolvers;
        }
        const providers = [this.platform.getTypeProvider(typeRef) ?? [], options?.providers ?? []];
        this.normalize(providers, options);
        return createContext(this.getInjector(typeRef, options), {
            ...options,
            providers,
            resolvers,
            targetType: typeRef.type
        }, typeRef.type);

    }

    protected normalize(providers: Provider[], options?: TOpts) {

    }

    protected getInjector<T>(typeRef: ClassRef<T>, options?: TOpts): Injector {
        return options?.injector ?? this.platform.getRegisterIn(typeRef.type)!
    }

}


export class DefaultInvocationFactory extends AbstractInvocationFactory implements InvocationFactory {

    protected override createInstance<T>(typeRef: ClassRef<T>, context: InvocationContext, options?: InvocationOptions<T>): Invocation<T> {
        return new DefaultInvocation(typeRef, context, options);
    }

}
