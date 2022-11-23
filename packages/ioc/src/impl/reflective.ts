import { ClassType, Type } from '../types';
import { TypeDef } from '../metadata/type';
import { isArray, isBoolean, isFunction, isPromise } from '../utils/chk';
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


export class DefaultReflectiveRef<T> extends ReflectiveRef<T> {

    private _tagPdrs: ProviderType[] | undefined;
    private _type: Type<T>;
    private _instance?: T;
    readonly context: InvocationContext;
    constructor(readonly def: TypeDef<T>, readonly injector: Injector, options?: InvokeArguments) {
        super()
        this._type = def.type as Type<T>;
        this.context = this.createContext(injector, options);
        this.context.setValue(ReflectiveRef, this);
        this.context.onDestroy(this)
    }

    get type(): Type<T> {
        return this._type
    }

    getInstance(): T {
        if (!this._instance) {
            this._instance = this.resolve();
        }
        return this._instance;
    }

    resolve(): T;
    resolve<R>(token: Token<R>): R;
    resolve(token?: Token<any>): any {
        return this.context.resolveArgument({ provider: token ?? this.type, nullable: true })
    }

    invoke(method: MethodType<T>, option?: InvokeArguments | InvocationContext, instance?: T) {
        const [context, key, destroy] = this.createMethodContext(method, option);
        return this.def.class.invoke(key, context, instance ?? this.resolve(), (ctx, run) => {
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
        const args = this.def.class.resolveArguments(key, context);
        if (destroy) {
            destroy()
        }
        return args
    }

    protected createMethodContext(method: MethodType<T>, option?: InvokeArguments | InvocationContext): [InvocationContext, string, Function | undefined] {
        const key = isFunction(method) ? this.def.class.getPropertyName(method(this.def.class.getPropertyDescriptors() as any)) : method;
        const methodOptions = this.def.class.getMethodOptions(key);
        let context: InvocationContext;
        let destroy: Function | undefined;
        if (option instanceof InvocationContext) {
            context = option;
            const ext = this.context !== context;
            if (methodOptions) {
                context = createContext(context, methodOptions);
            }
            ext && context.addRef(this.context);
            destroy = () => {
                if (context.injected) return;
                ext && context.removeRef(this.context);
                if (methodOptions) context.destroy()
            }
        } else if (option) {
            if (methodOptions) {
                if (hasItem(methodOptions.providers)) {
                    option.providers = option.providers ? [...option.providers, ...methodOptions.providers!] : methodOptions.providers!
                }
                if (hasItem(methodOptions.resolvers)) {
                    option.resolvers = option.resolvers ? [...option.resolvers!, ...methodOptions.resolvers!] : methodOptions.resolvers
                }
                if (hasItem(methodOptions.values)) {
                    option.values = option.values ? [...option.values!, ...methodOptions.values!] : methodOptions.values
                }
            }
            if (this.chkContext(option.parent)) {
                if (hasItem(option.providers) || hasItem(option.resolvers) || hasItem(option.values) || option.arguments) {
                    context = createContext(option.parent!, option);
                    context.addRef(this.context);
                    destroy = () => {
                        if (context.injected) return;
                        context.removeRef(this.context);
                        context.destroy()
                    }
                } else {
                    context = option.parent!;
                    context.addRef(this.context);
                    destroy = () => {
                        if (context.injected) return;
                        context.removeRef(this.context);
                    }
                }
            } else if (hasItem(option.providers) || hasItem(option.resolvers) || hasItem(option.values) || option.arguments) {
                context = createContext(this.context, option);
                destroy = () => {
                    if (context.injected) return;
                    context.destroy()
                }
            } else {
                context = this.context;
            }
        } else if (methodOptions) {
            context = createContext(this.context, methodOptions);
            destroy = () => {
                if (context.injected) return;
                context.destroy()
            }
        } else {
            context = this.context;
        }

        return [context, key, destroy]
    }

    private chkContext(context?: InvocationContext) {
        return context && context !== this.context;
    }

    createInvoker(method: string, instance?: boolean | T | (() => T), proceeding?: Proceed<T>): OperationInvoker {
        return new ReflectiveOperationInvoker(this.def, method, isBoolean(instance) ? this.getInstance.bind(this) : instance, proceeding)
    }

    protected createContext(injector: Injector, option?: InvokeArguments): InvocationContext<any> {
        if (!this._tagPdrs) {
            this._tagPdrs = injector.platform().getTypeProvider(this.def)
        }
        let providers = option?.providers;
        let resolvers = option?.resolvers;
        providers = providers ? this._tagPdrs.concat(providers) : this._tagPdrs;
        resolvers = resolvers ? this.def.class.resolvers.concat(resolvers) : this.def.class.resolvers

        return createContext(injector, {
            ...option,
            targetType: this.def.type,
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
        (this as any).def = null!;
        this._destroyed = true;
        return this.context.destroy()
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
}

export class DefaultReflectiveFactory extends ReflectiveFactory {
    create<T>(type: ClassType<T> | TypeDef<T>, injector: Injector, option?: InvokeArguments): ReflectiveRef<T> {
        return new DefaultReflectiveRef<T>(isFunction(type) ? get(type) : type, injector, option)
    }
}

