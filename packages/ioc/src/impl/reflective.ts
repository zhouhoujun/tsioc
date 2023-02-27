import { ClassType, Type } from '../types';
import { Class } from '../metadata/type';
import { isBoolean, isFunction, isPromise } from '../utils/chk';
import { Token } from '../tokens';
import { get } from '../metadata/refl';
import { ProviderType } from '../providers';
import { createContext, InvocationContext, InvokeArguments, } from '../context';
import { ReflectiveRef, ReflectiveFactory } from '../reflective';
import { Injector, MethodType } from '../injector';
import { DestroyCallback } from '../destroy';
import { OperationInvoker, Proceed } from '../operation';
import { ReflectiveOperationInvoker } from './operation';
import { hasItem, immediate } from '../utils/lang';


/**
 * reflective
 */
export class DefaultReflectiveRef<T> extends ReflectiveRef<T> {

    private _tagPdrs: ProviderType[] | undefined;
    private _type: Type<T>;
    private _instance?: T;
    private _ctx: InvocationContext;
    private _mthCtx: Map<string, InvocationContext | null>;
    constructor(private _class: Class<T>, readonly injector: Injector, options?: InvokeArguments) {
        super()
        this._type = _class.type as Type<T>;
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
        if (!this._instance) {
            this._instance = this.resolve(this.type);
        }
        return this._instance;
    }


    resolve<R>(token: Token<R>): R {
        return this._ctx.resolveArgument({ provider: token, nullable: true })!
    }

    invoke(method: MethodType<T>, option?: InvokeArguments | InvocationContext, instance?: T) {
        const [context, key, destroy] = this.createMethodContext(method, option);
        return this.class.invoke(key, context, instance ?? this.getInstance(), (ctx, run) => {
            const result = run(ctx);
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
        })
    }

    resolveArguments(method: MethodType<T>, option?: InvokeArguments | InvocationContext) {
        const [context, key, destroy] = this.createMethodContext(method, option);
        const args = this.class.resolveArguments(key, context);
        if (destroy) {
            destroy()
        }
        return args
    }

    protected createMethodContext(method: MethodType<T>, option?: InvokeArguments | InvocationContext): [InvocationContext, string, Function | undefined] {
        const key = isFunction(method) ? this.class.getPropertyName(method(this.class.getPropertyDescriptors() as any)) : method;
        const ctx = this.getContext(key);
        let context: InvocationContext;
        let destroy: Function | undefined;
        if (option instanceof InvocationContext) {
            context = option;
            const ext = ctx !== context;
            ext && context.addRef(ctx);
            destroy = () => {
                if (context.injected) return;
                ext && context.removeRef(ctx);
            }
        } else if (option) {
            if (option.parent && option.parent !== ctx) {
                if (hasContext(option)) {
                    context = createContext(option.parent!, option);
                    context.addRef(ctx);
                    destroy = () => {
                        if (context.injected) return;
                        context.removeRef(ctx);
                        context.destroy()
                    }
                } else {
                    context = option.parent!;
                    context.addRef(ctx);
                    destroy = () => {
                        if (context.injected) return;
                        context.removeRef(ctx);
                    }
                }
            } else if (hasContext(option)) {
                context = createContext(ctx, option);
                destroy = () => {
                    if (context.injected) return;
                    context.destroy()
                }
            } else {
                context = ctx;
            }
        } else {
            context = ctx;
        }

        return [context, key, destroy]
    }

    getContext(method?: string) {
        if (!method) return this._ctx;
        let ctx = this._mthCtx.get(method);
        if (ctx === undefined) {
            const opts = this.class.getMethodOptions(method);
            if (opts) {
                ctx = createContext(this._ctx, opts);
                this._ctx.onDestroy(ctx);
                this._mthCtx.set(method, ctx);
            } else {
                this._mthCtx.set(method, null);
            }
        }
        return ctx ?? this._ctx;
    }

    createInvoker(method: string, instance?: boolean | T | (() => T), proceeding?: Proceed<T>): OperationInvoker {
        return new ReflectiveOperationInvoker(this.class, method, isBoolean(instance) ? this.getInstance.bind(this) : instance, proceeding)
    }

    protected createContext(injector: Injector, option?: InvokeArguments): InvocationContext<any> {
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
}

export function hasContext(option: InvokeArguments) {
    return option && (hasItem(option.providers) || hasItem(option.resolvers) || hasItem(option.values) || option.arguments)
}

export class DefaultReflectiveFactory extends ReflectiveFactory {
    protected maps: Map<ClassType, ReflectiveRef>;
    constructor() {
        super()
        this.maps = new Map();
    }
    create<T>(type: ClassType<T> | Class<T>, injector: Injector, option?: InvokeArguments): ReflectiveRef<T> {
        const cltype = isFunction(type) ? type : type.type;
        let refle = this.maps.get(cltype);
        if (!refle) {
            refle = new DefaultReflectiveRef<T>(isFunction(type) ? get(type) : type, injector, option);
            injector.onDestroy(() => this.maps.delete(cltype));
            this.maps.set(cltype, refle);
        }
        return refle
    }

    destroy(): void {
        this.maps.forEach(ref => {
            ref.destroy?.();
        });
        this.maps.clear();
    }
}

