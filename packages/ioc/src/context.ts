import { ClassType } from './types';
import { InjectFlags, Token } from './tokens';
import { isFunction } from './utils/chk';
import { Abstract } from './metadata/fac';
import { DestroyCallback, Destroyable, OnDestroy } from './destroy';
import { Injector } from './injector';
import { ArgumentResolver, Parameter } from './resolver';
import { ProviderType } from './providers';


/**
 * The context for the {@link OperationInvoker invocation of an operation}.
 */
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
     * @param flags inject flags, type of {@link InjectFlags}.
     * @returns the instance of token.
     */
    abstract get<T>(token: Token<T>, flags?: InjectFlags): T
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
    arguments?: any;
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
