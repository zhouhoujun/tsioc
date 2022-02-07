import { ClassType, Type } from './types';
import { isDefined, isFunction, isArray } from './utils/chk';
import { Abstract } from './metadata/fac';
import { ParameterMetadata } from './metadata/meta';
import { TypeReflect } from './metadata/type';
import { ProviderType } from './providers';
import { DestroyCallback, Destroyable, OnDestroy } from './destroy';
import { InjectFlags, Token, tokenId } from './tokens';
import { Injector, MethodType } from './injector';


/**
 * parameter argument of an {@link OperationArgumentResolver}.
 */
export interface Parameter<T = any> extends ParameterMetadata {
    /**
     * type.
     */
    type?: ClassType<T>;
    /**
     * provider type
     */
    provider?: Token<T>;
    /**
     * mutil provider or not.
     */
    mutil?: boolean;
}

/**
 * Resolver for an argument of an {@link OperationInvoker}.
 */
export interface OperationArgumentResolver<C = any> {
    /**
     * Return whether an argument of the given {@code parameter} can be resolved.
     * @param parameter argument type
     * @param args gave arguments
     */
    canResolve(parameter: Parameter, ctx: InvocationContext<C>): boolean;
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param args gave arguments
     */
    resolve<T>(parameter: Parameter<T>, ctx: InvocationContext<C>): T;
}

/**
 * argument resolver type.
 */
export type ArgumentResolver = OperationArgumentResolver | ClassType<OperationArgumentResolver>;

/**
 * compose resolver for an argument of an {@link OperationInvoker}.
 * @param filter compose canResolver filter.
 * @param resolvers resolves of the group.
 * @returns 
 */
export function composeResolver<T extends OperationArgumentResolver<any>, TP extends Parameter = Parameter>(filter: (parameter: TP, ctx: InvocationContext) => boolean, ...resolvers: T[]): OperationArgumentResolver {
    return {
        canResolve: (parameter: TP, ctx: InvocationContext) => filter(parameter, ctx) && resolvers.some(r => r.canResolve(parameter, ctx)),
        resolve: (parameter: TP, ctx: InvocationContext) => {
            let result: any;
            resolvers.some(r => {
                if (r.canResolve(parameter, ctx)) {
                    result = r.resolve(parameter, ctx);
                    return isDefined(result);
                }
                return false;
            });
            return result ?? null;
        }
    }
}

/**
 * default resolvers {@link OperationArgumentResolver}. 
 */
export const DEFAULT_RESOLVERS = tokenId<OperationArgumentResolver[]>('DEFAULT_RESOLVERS');

@Abstract()
export abstract class InvocationContext<T = any> implements Destroyable, OnDestroy {

    private _dsryCbs = new Set<DestroyCallback>();
    private _destroyed = false;
    /**
     * parent {@link InvocationContext}.
     */
    abstract get parent(): InvocationContext | undefined;
    /**
     * invocation static injector. 
     */
    abstract get injector(): Injector;
    /**
     * invocation target.
     */
    abstract get target(): ClassType | undefined;
    /**
     * invocation method.
     */
    abstract get method(): string | undefined;
    /**
     * add reference resolver.
     * @param resolvers the list instance of {@link Injector} or {@link InvocationContext}.
     */
    abstract addRef(...resolvers: InvocationContext[]): void;
    /**
     * remove reference resolver.
     * @param resolver instance of {@link Injector} or {@link InvocationContext}.
     */
    abstract removeRef(resolver: Injector | InvocationContext): void;
    /**
     * the invocation arguments.
     */
    abstract get arguments(): T;
    /**
     * set argument.
     * @param name 
     * @param value 
     */
    abstract setArgument(name: string, value: any): void;
    /**
     * has token in the context or not.
     * @param token the token to check.
     * @param flags inject flags, type of {@link InjectFlags}.
     * @returns boolean.
     */
    abstract has(token: Token, flags?: InjectFlags): boolean;
    /**
     * get token value.
     * @param token the token to get value.
     * @param context invcation context, type of {@link InvocationContext}.
     * @param flags inject flags, type of {@link InjectFlags}.
     * @returns the instance of token.
     */
    abstract get<T>(token: Token<T>, context?: InvocationContext<any>, flags?: InjectFlags): T;
    /**
     * has value to context
     * @param token the token to check has value.
     */
    abstract hasValue<T>(token: Token): boolean;
    /**
     * get value to context
     * @param token the token to get value.
     */
    abstract getValue<T>(token: Token<T>): T;
    /**
     * set value.
     * @param token token
     * @param value value for the token.
     */
    abstract setValue<T>(token: Token<T>, value: T): this;
    /**
     * can resolve the parameter or not.
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @returns 
     */
    abstract canResolve(meta: Parameter): boolean;
    /**
     * get resolver in the property or parameter metadata. configured in class design.
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @returns undefined or resolver of type {@link OperationArgumentResolver}.
     */
    abstract getMetaReolver(meta: Parameter): OperationArgumentResolver | undefined;
    /**
     * resolve token in context.
     * @param token 
     */
    abstract resolve<T>(token: Token<T>): T | null;
    /**
     * resolve the parameter value.
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @returns the parameter value in this context.
     */
    abstract resolveArgument<T>(meta: Parameter<T>): T | null;
    /**
     * finally clear.
     */
    protected abstract clear(): void;

    get destroyed() {
        return this._destroyed;
    }

    destroy(): void | Promise<void> {
        if (!this._destroyed) {
            this._destroyed = true;
            try {
                this._dsryCbs.forEach(c => isFunction(c) ? c() : c?.onDestroy());
            } finally {
                this._dsryCbs.clear();
                this.clear();
                const injector = this.injector;
                (this as any).parent = null;
                (this as any).injector = null;
                return injector.destroy();
            }
        }
    }

    onDestroy(callback?: DestroyCallback): void | Promise<void> {
        if (!callback) {
            return this.destroy();
        }
        this._dsryCbs.add(callback);
    }

    /**
     * create invocation context.
     * @param injector 
     * @param options 
     * @returns 
     */
    static create(injector: Injector, options?: InvocationOption): InvocationContext {
        return INVOCATION_CONTEXT_IMPL.create(injector, options);
    }
}

/**
 * invocation context factory implement.
 */
export const INVOCATION_CONTEXT_IMPL = {
    /**
     * create invocation context
     * @param injector parent injector of context. 
     * @param options invocation options.
     */
    create(injector: Injector, options?: InvocationOption): InvocationContext {
        throw new Error('not implemented.');
    }
};



/**
 * Interface to perform an operation invocation.
 */
export interface OperationInvoker {
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param destroy try destroy the context after invoked.
     */
    invoke(context: InvocationContext, destroy?: boolean | Function): any;

    /**
     * resolve args. 
     * @param context 
     */
    resolveArguments(context: InvocationContext): any[];
}

/**
 * argument errror.
 */
export class ArgumentError extends Error {
    constructor(message?: string | string[]) {
        super(isArray(message) ? message.join('\n') : message || '');
        Object.setPrototypeOf(this, ArgumentError.prototype);
        Error.captureStackTrace(this);
    }
}

/**
 * token value pair.
 */
export type TokenValue<T = any> = [Token<T>, T];

/**
 * invoke arguments.
 */
export interface InvokeArguments {
    /**
     * parent InvocationContext,
     */
    parent?: InvocationContext;
    /**
     * invocation arguments data.
     */
    arguments?: Record<string, any>;
    /**
     * token values.
     */
    values?: TokenValue[];
    /**
     * custom resolvers.
     */
    resolvers?: ArgumentResolver[];
    /**
     * custom providers.
     */
    providers?: ProviderType[];
}

/**
 * invoke option.
 */
export interface InvokeOption extends InvokeArguments {
    /**
     * main context
     */
    context?: InvocationContext;
}

/**
 * invocation option.
 */
export interface InvocationOption extends InvokeArguments {
    /**
     * invocation invoker target.
     */
    invokerTarget?: ClassType;
    /**
     * invocation target method.
     */
    invokerMethod?: string;
}

/**
 * operation factory.
 */
@Abstract()
export abstract class OperationFactory<T = any> implements OnDestroy {
    /**
     * injector.
     */
    abstract get injector(): Injector;
    /**
     * instance of this target type.
     */
    abstract resolve(): T;
    /**
     * resolve token in this invcation context.
     */
    abstract resolve<R>(token: Token<R>): R;
    /**
     * target reflect.
     */
    abstract get reflect(): TypeReflect<T>;
    /**
     * execute target type.
     */
    abstract get type(): Type<T>;
    /**
     * the invcation context of target type.
     */
    abstract get context(): InvocationContext;
    /**
     * invoke target method.
     * @param method method name.
     * @param option invoke arguments.
     * @param instance target instance.
     */
    abstract invoke(method: MethodType<T>, option?: InvokeOption, instance?: T): any;
    /**
     * invoke target method.
     * @param method method name.
     * @param option invoke arguments.
     * @param instance target instance.
     */
    abstract invoke(method: MethodType<T>, context?: InvocationContext, instance?: T): any;
    /**
     * create method invoker of target type.
     * @param method the method name of target.
     * @param instance instance of target type.
     * @returns instance of {@link OperationInvoker}.
     */
    abstract createInvoker(method: string, instance?: T): OperationInvoker;
    /**
     * create invocation context of target.
     * @param option ext option. type of {@link InvocationOption}.
     * @returns instance of {@link InvocationContext}.
     */
    abstract createContext(option?: InvocationOption): InvocationContext;
    /**
     * create invocation context of target.
     * @param injector to resolver the type. type of {@link Injector}.
     * @param option ext option. type of {@link InvocationOption}.
     * @returns instance of {@link InvocationContext}.
     */
    abstract createContext(injector: Injector, option?: InvocationOption): InvocationContext;
    /**
     * create invocation context of target.
     * @param parant parent invocation context. type of {@link InvocationContext}.
     * @param option ext option. type of {@link InvocationOption}.
     * @returns instance of {@link InvocationContext}.
     */
    abstract createContext(parant: InvocationContext, option?: InvocationOption): InvocationContext;
    /**
     * destroy invocation context.
     */
    abstract onDestroy(): void | Promise<void>;
}

/**
 * operation factory resolver.
 */
@Abstract()
export abstract class OperationFactoryResolver {
    /**
     * resolve operation factory of target type
     * @param type target type or target type reflect.
     * @param injector injector.
     * @param option target type invoke option {@link InvokeArguments}
     * @returns instance of {@link OperationFactory}
     */
    abstract resolve<T>(type: ClassType<T> | TypeReflect<T>, injector: Injector, option?: InvokeArguments): OperationFactory<T>;
}

