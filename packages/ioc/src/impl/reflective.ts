import { ClassType, Type } from '../types';
import { TypeReflect } from '../metadata/type';
import { isFunction } from '../utils/chk';
import { Token } from '../tokens';
import { get } from '../metadata/refl';
import { ProviderType } from '../providers';
import { createContext, InvocationContext, InvocationOption, InvokeArguments, InvokeOption } from '../context';
import { ReflectiveRef, ReflectiveResolver } from '../reflective';
import { Injector, MethodType } from '../injector';
import { DestroyCallback } from '../destroy';
import { OperationInvoker } from '../operation';
import { ReflectiveOperationInvoker } from './operation';


export class DefaultReflectiveRef<T> extends ReflectiveRef<T> {

    private _tagPdrs: ProviderType[] | undefined;
    private _type: Type<T>;
    readonly context: InvocationContext;
    constructor(readonly reflect: TypeReflect<T>, readonly injector: Injector, options?: InvokeArguments) {
        super()
        this._type = reflect.type as Type<T>;
        this.context = this.createContext(injector, options);
        this.context.setValue(ReflectiveRef, this);
        this.context.onDestroy(this)
    }

    get type(): Type<T> {
        return this._type
    }

    resolve(): T;
    resolve<R>(token: Token<R>): R;
    resolve(token?: Token<any>): any {
        return this.context.resolveArgument({ provider: token ?? this.type, nullable: true })
    }

    invoke(method: MethodType<T>, option?: InvokeOption | InvocationContext, instance?: T) {
        const [context, key, destroy] = this.createMethodContext(method, option);
        return this.reflect.class.invoke(key, context, instance ?? this.resolve(), destroy)
    }

    resolveArguments(method: MethodType<T>, option?: InvokeOption | InvocationContext) {
        const [context, key, destroy] = this.createMethodContext(method, option);
        const args = this.reflect.class.resolveArguments(key, context);
        if (destroy) {
            if (isFunction(destroy)) {
                destroy()
            } else {
                context.destroy()
            }
        }
        return args
    }

    protected createMethodContext(method: MethodType<T>, option?: InvokeOption | InvocationContext): [InvocationContext, string, boolean | Function | undefined] {
        const key = isFunction(method) ? this.reflect.class.getPropertyName(method(this.reflect.class.getPropertyDescriptors() as any)) : method;
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

    createInvoker(method: string, instance?: T): OperationInvoker {
        return new ReflectiveOperationInvoker(this.reflect, method, instance)
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
            this._tagPdrs = injector.platform().getTypeProvider(this.reflect)
        }
        let providers = option?.providers;
        let resolvers = option?.resolvers;
        if (!root) {
            providers = providers ? this._tagPdrs.concat(providers) : this._tagPdrs;
            resolvers = resolvers ? this.reflect.class.resolvers.concat(resolvers) : this.reflect.class.resolvers
        }
        const method = option?.methodName;
        if (method) {
            const mthpdrs = this.reflect.class.getMethodProviders(method);
            providers = (providers && mthpdrs) ? providers.concat(mthpdrs) : (providers ?? mthpdrs);

            const mthrsv = this.reflect.class.getMethodResolvers(method);
            resolvers = (resolvers && mthrsv) ? resolvers.concat(mthrsv) : (resolvers ?? mthrsv)
        }

        return createContext(injector, {
            ...option,
            parent: root ?? option?.parent,
            targetType: this.reflect.type,
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
        (this as any).reflect = null!;
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

export class DefaultReflectiveResolver extends ReflectiveResolver {
    resolve<T>(type: ClassType<T> | TypeReflect<T>, injector: Injector, option?: InvokeArguments): ReflectiveRef<T> {
        return new DefaultReflectiveRef(isFunction(type) ? get(type) : type, injector, option)
    }
}

