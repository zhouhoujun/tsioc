import { ClassType, Type } from '../types';
import { TypeDef } from '../metadata/type';
import { isBoolean, isFunction, isPromise } from '../utils/chk';
import { Token } from '../tokens';
import { get } from '../metadata/refl';
import { ProviderType } from '../providers';
import { createContext, InvocationContext, InvocationOption, InvokeArguments, InvokeOption } from '../context';
import { ReflectiveRef, ReflectiveFactory } from '../reflective';
import { Injector, MethodType } from '../injector';
import { DestroyCallback } from '../destroy';
import { OperationInvoker } from '../operation';
import { ReflectiveOperationInvoker } from './operation';


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

    invoke(method: MethodType<T>, option?: InvokeOption | InvocationContext, instance?: T) {
        const [context, key, destroy] = this.createMethodContext(method, option);
        return this.def.class.invoke(key, context, instance ?? this.resolve(), (args, runnable) => {
            const result = runnable(args);
            if (destroy) {
                if (isPromise(result)) {
                    return result.then(val => {
                        isFunction(destroy) ? destroy() : !context.injected && context.destroy();
                        return val;
                    })
                } else {
                    isFunction(destroy) ? destroy() : !context.injected && context.destroy();
                }
            }
            return result;
        })
    }

    resolveArguments(method: MethodType<T>, option?: InvokeOption | InvocationContext) {
        const [context, key, destroy] = this.createMethodContext(method, option);
        const args = this.def.class.resolveArguments(key, context);
        if (destroy) {
            if (isFunction(destroy)) {
                destroy()
            } else if (!context.injected) {
                context.destroy()
            }
        }
        return args
    }

    protected createMethodContext(method: MethodType<T>, option?: InvokeOption | InvocationContext): [InvocationContext, string, boolean | Function | undefined] {
        const key = isFunction(method) ? this.def.class.getPropertyName(method(this.def.class.getPropertyDescriptors() as any)) : method;
        let context: InvocationContext;
        let destroy: boolean | Function | undefined;
        if (option instanceof InvocationContext) {
            context = option;
            const refctx = this.createContext({ methodName: key });
            context.addRef(refctx);
            destroy = () => {
                context.removeRef(refctx);
                refctx.destroy()
            }
        } else {
            context = option?.context ? option.context : this.createContext({ ...option, methodName: key });
            if (option?.context) {
                const refctx = this.createContext({ ...option, methodName: key });
                context.addRef(refctx);
                destroy = () => {
                    context.removeRef(refctx);
                    refctx.destroy()
                }
            } else {
                destroy = true
            }
        }
        return [context, key, destroy]
    }

    createInvoker(method: string, instance?: boolean | T | (() => T)): OperationInvoker {
        return new ReflectiveOperationInvoker(this.def, method, isBoolean(instance) ? this.getInstance.bind(this) : instance)
    }

    createContext(parent?: Injector | InvocationContext | InvocationOption, option?: InvocationOption): InvocationContext<any> {
        let root: InvocationContext | undefined;
        let injector: Injector;
        if (parent instanceof Injector) {
            injector = parent
        } else if (parent instanceof InvocationContext) {
            injector = parent.injector;
            root = parent
        } else {
            injector = this.injector;
            root = this.context;
            option = parent
        }

        if (!this._tagPdrs) {
            this._tagPdrs = injector.platform().getTypeProvider(this.def)
        }
        let providers = option?.providers;
        let resolvers = option?.resolvers;
        if (!root) {
            providers = providers ? this._tagPdrs.concat(providers) : this._tagPdrs;
            resolvers = resolvers ? this.def.class.resolvers.concat(resolvers) : this.def.class.resolvers
        }
        const method = option?.methodName;
        if (method) {
            const mthpdrs = this.def.class.getMethodProviders(method);
            providers = (providers && mthpdrs) ? providers.concat(mthpdrs) : (providers ?? mthpdrs);

            const mthrsv = this.def.class.getMethodResolvers(method);
            resolvers = (resolvers && mthrsv) ? resolvers.concat(mthrsv) : (resolvers ?? mthrsv)
        }

        return createContext(injector, {
            ...option,
            parent: root ?? option?.parent,
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

