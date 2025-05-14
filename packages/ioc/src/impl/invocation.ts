import { Type } from '../types';
import { createContext, hasContextOptions, InvocationContext, InvocationOptions, InvokeArguments } from '../context';
import { Invocation, InvocationFactory } from '../invocation';
import { isFunction, isPromise, isString, isSymbol } from '../utils/chk';
import { DestroyCallback, OnDestroy } from '../destroy';
import { Class } from '../metadata/class';
import { Injector, MethodType } from '../injector';
import { Provider } from '../providers';
import { ArgumentException, Exception } from '../exception';
import { InjectFlags, Token } from '../tokens';
import { immediate } from '../utils/lang';
import { composeHandlers } from '../handler';
import { getClassRefify } from '../metadata/refl';
import { Platform } from '../platform';

/**
 * abstract invocation 
 * implements {@link Invocation}
 */
export abstract class AbstractInvocation<T = any, TOpts extends InvocationOptions<T> = InvocationOptions<T>, TRes = any> extends Invocation<T, TRes> implements OnDestroy {

    private _mthCtx: Map<string | symbol, InvocationContext | null>;
    private _tagPdrs?: Provider[];
    private _instance?: T;
    private _isResolve = false;

    order?: number | undefined;

    constructor(
        private _class: Class<T>,
        readonly context: InvocationContext,
        protected options: TOpts = {} as TOpts) {
        super();
        this._isResolve = hasContextOptions(options);
        this._mthCtx = new Map();
        context.setValue(Invocation, this);
        context.onDestroy(this);
    }


    get type(): Type<T> {
        return this._class?.type;
    }

    get class(): Class<T> {
        return this._class;
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
     * @param context the context to use to invoke the operation
     */
    invoke(context: InvocationContext): TRes;
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
    invoke(method: MethodType<T>, context?: InvocationContext): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     * @param options invoke arguments.
     */
    invoke(method: MethodType<T>, options?: InvokeArguments): TRes;
    invoke(arg?: InvocationContext | InvokeArguments | MethodType<T>, optionOrArgs?: InvocationContext | InvokeArguments): TRes {
        this.assertNotDestroyed();
        let name: string | symbol | undefined;
        let option: InvokeArguments | InvocationContext | undefined;
        if (isString(arg) || isSymbol(arg)) {
            name = arg;
            option = optionOrArgs;
        } else if (isFunction(arg)) {
            name = this.class.getMethodName(arg);
        }


        if (!name) {
            return this.process(option)
        }

        return this.invokeMethod(name, option);
    }

    protected abstract process(option?: InvocationContext | InvokeArguments): any;

    protected invokeMethod(name: string | symbol, option?: InvocationContext | InvokeArguments): any {

        const [context, destroy] = this.createInvokeContext(name, option);

        const args = this.class.resolveArguments(name, context);

        const result = this.class.invoke(name, context, this.instance, args);

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

    protected getMethodContext(propertyKey: string | symbol): InvocationContext {
        let ctx = this._mthCtx.get(propertyKey);
        if (ctx === undefined) {
            const opts = this.class.getMethodOptions(propertyKey);
            if (opts) {
                ctx = createContext(this.context, opts);
                this.context.onDestroy(ctx);
                this._mthCtx.set(propertyKey, ctx);
            } else {
                this._mthCtx.set(propertyKey, null);
            }
        }
        return ctx ?? this.context;
    }


    protected createInvokeContext<TArg>(propertyKey: string | symbol, option?: InvokeArguments<TArg> | InvocationContext): [InvocationContext, Function | undefined] {
        const ctx = this.getMethodContext(propertyKey);
        let context: InvocationContext;
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
                    context = createContext(option.parent!, option);
                    context.addRef(ctx);
                    destroy = () => {
                        if (context.used) return;
                        context.removeRef(ctx);
                        context.destroy()
                    }
                } else {
                    context = option.parent!;
                    context.addRef(ctx);
                    destroy = () => {
                        if (context.used) return;
                        context.removeRef(ctx);
                    }
                }
            } else if (hasContextOptions(option)) {
                context = createContext(ctx, option);
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

    protected createContext(injector: Injector, option?: InvocationOptions<T>): InvocationContext<any> {
        if (!this._tagPdrs) {
            this._tagPdrs = injector.platform().getTypeProvider(this.class)
        }

        const resolvers = option?.resolvers ? this.class.resolvers.concat(option?.resolvers) : this.class.resolvers;
        const providers = option?.providers?.length ? [this._tagPdrs, option.providers] : this._tagPdrs;

        return createContext(injector, {
            ...option,
            targetType: this.type,
            providers,
            resolvers
        }, this.type)
    }

    equals(target: Invocation): boolean {
        if (!target || !this._class) return false;
        if (target === this) return true;
        if (target?.class !== this.class) return false;
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
        this._tagPdrs = null!;
        this._class = null!;
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
            throw new Exception(`ReflectiveRef of ${this._class?.className} has already been destroyed.`)
        }
    }
}

/**
 * default invocation.
 * extends {@link AbstractInvocation}
 */
export class DefaultInvocation<T = any, TOpts extends InvocationOptions<T> = InvocationOptions<T>, TRes = any> extends AbstractInvocation<T, TOpts, TRes> {

    readonly propertyKey?: string | symbol;

    constructor(
        _class: Class<T>,
        context: InvocationContext,
        options: TOpts = {} as TOpts) {
        super(_class, context, options);
        this.propertyKey = options.propertyKey;
    }

    protected process(option?: InvocationContext | InvokeArguments) {
        if (this.propertyKey) return this.invokeMethod(this.propertyKey, option);

        const runnables = this.class.runnables.filter(r => !r.auto);
        if (runnables && runnables.length) {
            const handler = composeHandlers(runnables.sort((a, b) => (a.order || 0) - (b.order || 0)).map(runnable => {
                return (option) => this.invokeMethod(runnable.method, option)
            }));
            return handler(this.context);
        } else {
            throw new ArgumentException(this.class.className + ' is invaild runnable, can not invocation without method param.');
        }
    }

}


export abstract class AbstractInvocationFactory implements InvocationFactory {


    constructor(
        private platform: Platform
    ) {

    }

    create<T>(type: Type<T> | Class<T>, options?: InvocationOptions<T>): Invocation<T> {
        const cls = getClassRefify(type);
        const context = this.createContext(cls, options);
        return this.createInstance(cls, context, options);
    }

    protected abstract createInstance<T>(typeRef: Class<T>, context: InvocationContext, options?: InvocationOptions<T>): Invocation<T>;

    protected createContext<T>(typeRef: Class<T>, options?: InvocationOptions<T>): InvocationContext {
        return createContext(options?.injector ?? this.platform.getRegisterIn(typeRef.type)!, {
            ...options,
            targetType: typeRef.type,
        }, typeRef.type);

    }

}


export class DefaultInvocationFactory extends AbstractInvocationFactory implements InvocationFactory {

    protected override createInstance<T>(typeRef: Class<T>, context: InvocationContext, options?: InvocationOptions<T>): Invocation<T> {
        return new DefaultInvocation(typeRef, context, options);
    }

}
