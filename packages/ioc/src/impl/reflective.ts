import { ClassType, Type } from '../types';
import { Class } from '../metadata/type';
import { isFunction, isPromise } from '../utils/chk';
import { Token } from '../tokens';
import { get } from '../metadata/refl';
import { ProviderType } from '../providers';
import { createContext, InvocationContext, InvokeArguments } from '../context';
import { ReflectiveRef, ReflectiveFactory, InvokerOptions } from '../reflective';
import { Injector, MethodType } from '../injector';
import { DestroyCallback } from '../destroy';
import { OperationInvoker } from '../operation';
import { ReflectiveOperationInvoker } from './operation';
import { getClassName, hasItem, immediate } from '../utils/lang';
import { Execption } from '../execption';


/**
 * reflective
 */
export class DefaultReflectiveRef<T> extends ReflectiveRef<T> {

    private _tagPdrs: ProviderType[] | undefined;
    private _type: Type<T>;
    private _typeName: string;
    private _instance?: T;
    private _ctx: InvocationContext;
    private _mthCtx: Map<string, InvocationContext | null>;
    constructor(private _class: Class<T>, readonly injector: Injector, options?: InvokeArguments<any>) {
        super()
        this._type = _class.type as Type<T>;
        this._typeName = getClassName(this._type);
        this._ctx = this.createContext(injector, options);
        this._mthCtx = new Map();
        this._ctx.setValue(ReflectiveRef, this);
        this._ctx.onDestroy(this)
    }

    get type(): Type<T> {
        return this._type
    }

    get class(): Class<T> {
        return this._class
    }

    getInstance(): T {
        this.assertNotDestroyed();
        if (!this._instance) {
            this._instance = this.resolve(this.type);
        }
        return this._instance;
    }


    resolve<R>(token: Token<R>): R {
        this.assertNotDestroyed();
        return this._ctx.resolveArgument({ provider: token, nullable: true })!
    }

    invoke<TArg>(method: MethodType<T>, option?: InvokeArguments<TArg> | InvocationContext, instance?: T) {
        this.assertNotDestroyed();
        const name = this.class.getMethodName(method);
        const [context, destroy] = this.createMethodContext(name, option);
        const args = this.class.resolveArguments(name, context);
        const result = this.class.invoke(name, context, instance ?? this.getInstance(), args);

        if (destroy) {
            const act = destroy as (() => void);
            if (isPromise(result)) {
                return result.then(val => {
                    immediate(act);
                    return val;
                })
            } else {
                immediate(act);
            }
        }
        return result;

    }

    resolveArguments<TArg>(method: MethodType<T>, option?: InvokeArguments<TArg> | InvocationContext) {
        this.assertNotDestroyed();
        const name = this.class.getMethodName(method);
        const [context, destroy] = this.createMethodContext(name, option);
        const args = this.class.resolveArguments(name, context);
        if (destroy) {
            destroy()
        }
        return args
    }

    protected createMethodContext<TArg>(method: string, option?: InvokeArguments<TArg> | InvocationContext): [InvocationContext, Function | undefined] {
        const ctx = this.getContext(method);
        let context: InvocationContext;
        let destroy: Function | undefined;
        if (option instanceof InvocationContext) {
            context = option;
            const ext = ctx !== context;
            ext && context.addRef(ctx);
            destroy = () => {
                if (context.used) return;
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

    getContext<TArg>(method?: string, options?: InvokeArguments<TArg>) {
        this.assertNotDestroyed();
        if (!method) return this._ctx;
        let ctx = this._mthCtx.get(method);
        if (ctx === undefined) {
            const opts = this.class.getMethodOptions(method);
            if (opts) {
                ctx = createContext(this._ctx, options ? { ...opts, ...options } : opts);
                this._ctx.onDestroy(ctx);
                this._mthCtx.set(method, ctx);
            } else if (options) {
                ctx = createContext(this._ctx, options);
                this._ctx.onDestroy(ctx);
                this._mthCtx.set(method, ctx);
            } else {
                this._mthCtx.set(method, null);
            }
        }
        return ctx ?? this._ctx;
    }

    /**
     * create method invoker of target type.
     * @param method the method name of target.
     * @returns instance of {@link OperationInvoker}.
     */
    createInvoker(method: string): OperationInvoker;
    /**
     * create method invoker of target type.
     * @param method the method name of target.
     * @param options invoker options.
     * @returns instance of {@link OperationInvoker}.
     */
    createInvoker<TArg>(method: string, options?: InvokerOptions<T, TArg>): OperationInvoker {
        this.assertNotDestroyed();
        return new ReflectiveOperationInvoker(this, method, { instance: this.getInstance.bind(this), ...options })
    }

    protected createContext<TArg>(injector: Injector, option?: InvokeArguments<TArg>): InvocationContext<any> {
        if (!this._tagPdrs) {
            this._tagPdrs = injector.platform().getTypeProvider(this.class)
        }
        let providers = option?.providers;
        let resolvers = option?.resolvers;
        providers = providers ? this._tagPdrs.concat(providers) : this._tagPdrs;
        resolvers = resolvers ? this.class.resolvers.concat(resolvers) : this.class.resolvers

        return createContext(injector, {
            ...option,
            targetType: this.class.type,
            providers,
            resolvers
        })
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
        this._type = null!;
        this._tagPdrs = null!;
        (this as any).injector = null!;
        this._class = null!;
        this._instance = null!;
        this._destroyed = true;
        return this._ctx.destroy()
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
            throw new Execption(`ReflectiveRef of ${this._typeName} has already been destroyed.`)
        }
    }
}

export function hasContext<TArg>(option: InvokeArguments<TArg>) {
    return option && (hasItem(option.providers) || hasItem(option.resolvers) || hasItem(option.values) || option.payload)
}

export class ReflectiveResolverImpl extends ReflectiveFactory {

    create<T, TArg>(type: ClassType<T> | Class<T>, injector: Injector, option?: InvokeArguments<TArg>): ReflectiveRef<T> {
        return new DefaultReflectiveRef<T>(isFunction(type) ? get(type) : type, injector, option);
    }

    // protected maps: Map<ClassType, ReflectiveRef>;
    // constructor() {
    //     super()
    //     this.maps = new Map();
    // }
    
    // resolve<T, TArg>(type: ClassType<T> | Class<T>, injector: Injector, option?: InvokeArguments<TArg>): ReflectiveRef<T> {
    //     const cltype = isFunction(type) ? type : type.type;
    //     let refle = this.maps.get(cltype);
    //     if (!refle) {
    //         refle = new DefaultReflectiveRef<T>(isFunction(type) ? get(type) : type, injector, option);
    //         injector.onDestroy(() => this.maps.delete(cltype));
    //         this.maps.set(cltype, refle);
    //     }
    //     return refle
    // }

    // onDestroy(): void {
    //     this.maps.forEach(ref => {
    //         ref.destroy?.();
    //     });
    //     this.maps.clear();
    // }

    // resolve<T, TArg>(type: ClassType<T> | Class<T>, injector: Injector, option?: InvokeArguments<TArg>): ReflectiveRef<T> {
    //     const clst = isFunction(type) ? get(type) : type;
    //     let refle: ReflectiveRef | null;
    //     if (option) {
    //         refle = this.create(clst, injector, option)
    //     } else {
    //         refle = injector.get(clst.refToken, null);
    //         if (!refle) {
    //             refle = this.create(clst, injector, option)
    //         }
    //     }
    //     return refle
    // }

    // create<T, TArg>(type: ClassType<T> | Class<T>, injector: Injector, option?: InvokeArguments<TArg>): ReflectiveRef<T> {
    //     const clst = isFunction(type) ? get(type) : type;
    //     const refle = new DefaultReflectiveRef<T>(clst, injector, option);
    //     injector.onDestroy(refle);
    //     injector.setValue(clst.refToken, refle);
    //     return refle;
    // }

}

