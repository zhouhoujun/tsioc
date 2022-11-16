import { ClassType } from './types';
import { InjectFlags, Token } from './tokens';
import { Abstract } from './metadata/fac';
import { DestroyCallback, Destroyable, OnDestroy } from './destroy';
import { Injector } from './injector';
import { ArgumentResolver, Parameter } from './resolver';
import { ProviderType } from './providers';
import { Execption } from './execption';
import { OperationInvoker } from './operation';


/**
 * The context for the {@link OperationInvoker invocation of an operation}.
 */
@Abstract()
export abstract class InvocationContext<T = any> implements Destroyable, OnDestroy {

    /**
     * is this context injected in object or not.
     */
    abstract get injected(): boolean;
    /**
     * invocation static injector. 
     */
    abstract get injector(): Injector;
    /**
     * invocation target.
     */
    abstract get targetType(): ClassType | undefined;
    /**
     * named of invocation method.
     */
    abstract get methodName(): string | undefined;
    /**
     * add reference resolver.
     * @param resolvers the list instance of {@link InvocationContext}.
     */
    abstract addRef(...resolvers: InvocationContext[]): void;
    /**
     * remove reference resolver.
     * @param resolver instance of {@link InvocationContext}.
     */
    abstract removeRef(resolver: InvocationContext): void;
    /**
     * has ref or not.
     * @param ctx 
     */
    abstract hasRef(ctx: InvocationContext): boolean;
    /**
     * the invocation arguments.
     */
    abstract get arguments(): T;
    /**
     * get value ify create by factory and register the value for the token.
     * @param token the token to get value.
     * @param factory the factory to create value for token.
     * @returns the instance of token.
     */
    abstract getValueify<T>(token: Token<T>, factory: () => T): T;
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
     * set value.
     * @param token token
     * @param value value for the token.
     */
    abstract setValue<T>(token: Token<T>, value: T): this;
    /**
     * resolve token in context.
     * @param token 
     */
    abstract resolve<T>(token: Token<T>): T;
    /**
     * resolve the parameter value.
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @param target resolve parameter for target type. 
     * @returns the parameter value in this context.
     */
    abstract resolveArgument<T>(meta: Parameter<T>, target?: ClassType, failed?: (target: ClassType, propertyKey: string) => void): T | null;
    /**
     * context destroyed or not.
     */
    abstract get destroyed(): boolean;
    /**
     * destroy this.
     */
    abstract destroy(): void | Promise<void>;
    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    abstract onDestroy(callback?: DestroyCallback): void | Promise<void>;
}


/**
 * create invocation context.
 * @param parent 
 * @param options 
 * @returns 
 */
export function createContext(parent: Injector | InvocationContext, options?: InvocationOption): InvocationContext {
    return INVOCATION_CONTEXT_IMPL.create(parent, options)
}

/**
 * invocation context factory implement.
 */
export const INVOCATION_CONTEXT_IMPL = {
    /**
     * create invocation context
     * @param parent parent context or parent injector. 
     * @param options invocation options.
     */
    create(parent: Injector | InvocationContext, options?: InvocationOption): InvocationContext {
        throw new Execption('not implemented.')
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
     * invocation invoke target type.
     */
    targetType?: ClassType;
    /**
     * named of invocation target method.
     */
    methodName?: string;
}
