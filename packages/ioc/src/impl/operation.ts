import { Type } from '../types';
import { createContext, InvocationContext, InvokeArguments } from '../context';
import { InvokerOptions, InvocationInvoker, InvocationFactory } from '../operation';
import { isFunction, isPromise, isString, isSymbol } from '../utils/chk';
import { DestroyCallback, OnDestroy } from '../destroy';
import { Class } from '../metadata/class';
import { Injector, MethodType } from '../injector';
import { Provider } from '../providers';
import { ArgumentExecption, Execption } from '../execption';
import { InjectFlags, Token } from '../tokens';
import { hasItem, immediate } from '../utils/lang';
import { composeHandlers } from '../handler';
import { get } from '../metadata/refl';


/**
 * abstract invocation invoker 
 * implements {@link InvocationInvoker}
 */
export abstract class AbstractInvocationInvoker<T, TRes> extends InvocationInvoker<T, TRes> implements OnDestroy {

    private _ctx!: InvocationContext;
    private _tagPdrs?: Provider[];
    private _instance?: T;
    private _isResolve = false;

    order?: number | undefined;

    constructor(
        private _class: Class<T>,
        injector: Injector,
        private options?: InvokerOptions) {
        super();
        this._ctx = this.createContext(injector, options);
        this._isResolve = hasContext(options);
        this._ctx.setValue(InvocationInvoker, this);
        injector.onDestroy(this);
    }


    get type(): Type<T> {
        return this._class?.type;
    }

    get class(): Class<T> {
        return this._class;
    }

    get context() {
        return this._ctx;
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.createInstance()
        }
        return this._instance;
    }

    protected createInstance(): T {
        this.assertNotDestroyed();
        if (this.options?.instance) {
            return isFunction(this.options.instance) ? this.options.instance(this._ctx) : this.options.instance;
        }
        return this.resolve(this.type, this._isResolve ? InjectFlags.Resolve : undefined);
    }

    protected resolve<R>(token: Token<R>, flags?: InjectFlags): R {
        this.assertNotDestroyed();
        return this._ctx.resolveArgument({ provider: token, flags, nullable: true })!
    }

    protected createContext(injector: Injector, option?: InvokerOptions<T>): InvocationContext<any> {
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

    equals(target: InvocationInvoker): boolean {
        if (!target || !this._class) return false;
        if (target === this) return true;
        if (target?.class !== this.class) return false;
        return target.instance !== this._instance;
    }


    private _destroyed = false;
    /**
     * context destroyed or not.
     */
    get destroyed(): boolean {
        return this._destroyed;
    }

    /**
     * destroy this.
     */
    destroy(): void | Promise<void> {
        if (this.destroyed) return;
        this.clean();
        this._destroyed = true;
        return this._ctx.destroy()
    }

    protected clean() {
        this._tagPdrs = null!;
        this._class = null!;
        this._instance = null!;
    }

    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    onDestroy(callback?: DestroyCallback): void | Promise<void> {
        if (!callback) {
            return this.destroy();
        }
        this._ctx.onDestroy(callback);
    }

    protected assertNotDestroyed(): void {
        if (this.destroyed) {
            throw new Execption(`ReflectiveRef of ${this._class?.className} has already been destroyed.`)
        }
    }
}

export function hasContext(option?: InvokerOptions) {
    return option && (hasItem(option.providers) || hasItem(option.resolvers) || hasItem(option.values) || option.args)
}

/**
 * default invocation invoker.
 * extends {@link AbstractInvocationInvoker}
 */
export class DefaultInvocationInvoker<T = any, TRes = any> extends AbstractInvocationInvoker<T, TRes> {

    private _mthCtx: Map<string | symbol, InvocationContext | null>;
    // private _returnType!: Type;
    readonly propertyKey?: string | symbol;

    constructor(
        _class: Class<T>,
        injector: Injector,
        options?: InvokerOptions<T>) {
        super(_class, injector, options);
        this.propertyKey = options?.propertyKey;
        this._mthCtx = new Map();
    }

    equals(target: InvocationInvoker): boolean {
        if ((target as DefaultInvocationInvoker).propertyKey !== this.propertyKey) return false;
        return super.equals(target);
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
     * @param option invoke arguments.
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
    invoke(method: MethodType<T>, context: InvocationContext): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     * @param option invoke arguments.
     */
    invoke(method: MethodType<T>, context: InvokeArguments): TRes;
    invoke(arg?: InvocationContext | InvokeArguments | MethodType<T>, optionOrArgs?: InvocationContext | InvokeArguments): TRes {
        this.assertNotDestroyed();
        let name: string | symbol;
        let option: InvokeArguments | InvocationContext | undefined;
        if (isString(arg) || isSymbol(arg)) {
            name = arg;
            option = optionOrArgs;
        } else if (isFunction(arg)) {
            name = this.class.getMethodName(arg);
        } else {
            name = this.propertyKey!;
            option = arg
        }


        if (!name) {
            const runnables = this.class.runnables.filter(r => !r.auto);
            if (runnables && runnables.length) {
                const handler = composeHandlers(runnables.sort((a, b) => (a.order || 0) - (b.order || 0)).map(runnable => {
                    return (option) => this.invokeMethod(runnable.method, runnable.args)
                }));
                return handler(this.context);
            } else {
                throw new ArgumentExecption(this.class.className + ' is invaild runnable, can not invocation without method param.');
            }

        }

        return this.invokeMethod(name, option);
    }

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

    protected override clean(): void {
        super.clean();
        this._mthCtx.clear();
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
                if (hasContext(option)) {
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
            } else if (hasContext(option)) {
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

}


export class DefaultInvocationFactory implements InvocationFactory {

    create<T>(type: Type<T> | Class<T>,  option?: InvokerOptions<T>): InvocationInvoker<T> {
        type = type instanceof Class ? type : get(type)
        return new DefaultInvocationInvoker<T>(type, injector, option);
    }

}

