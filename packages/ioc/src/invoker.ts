import { ClassType, Type } from './types';
import { getClassName, remove } from './utils/lang';
import {
    EMPTY, isClassType, isDefined, isFunction, isPlainObject,
    isArray, isPromise, isString, isTypeObject, isTypeReflect, EMPTY_OBJ
} from './utils/chk';
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
     * finally clear.
     */
    protected abstract clear(): void;

    /**
     * create invocation context.
     * @param injector 
     * @param options 
     * @returns 
     */
    static create(injector: Injector, options?: InvocationOption): InvocationContext {
        return INVOCATIONCONTEXT_IMPL.create(injector, options);
    }
}

/**
 * injector factory implement.
 */
export const INVOCATIONCONTEXT_IMPL = {
    /**
     * create injector
     * @param providers 
     * @param parent 
     * @param scope 
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
 * Missing argument errror.
 */
export class MissingParameterError extends Error {
    constructor(parameters: Parameter[], type: ClassType, method: string) {
        super(`ailed to invoke operation because the following required parameters were missing: [ ${parameters.map(p => object2string(p)).join(',\n')} ], method ${method} of class ${object2string(type)}`);
        Object.setPrototypeOf(this, MissingParameterError.prototype);
        Error.captureStackTrace(this);
    }
}

const deft = {
    typeInst: true,
    fun: true
}
/**
 * format object to string for log.
 * @param obj 
 * @returns 
 */
export function object2string(obj: any, options?: { typeInst?: boolean; fun?: boolean; }): string {
    options = { ...deft, ...options };
    if (isArray(obj)) {
        return `[${obj.map(v => object2string(v, options)).join(', ')}]`;
    } else if (isString(obj)) {
        return `"${obj}"`;
    } else if (isClassType(obj)) {
        return 'Type<' + getClassName(obj) + '>';
    } else if (isTypeReflect(obj)) {
        return `[${obj.class.className} TypeReflect]`;
    } else if (isPlainObject(obj)) {
        let str: string[] = [];
        for (let n in obj) {
            let value = obj[n];
            str.push(`${n}: ${object2string(value, options)}`)
        }
        return `{ ${str.join(', ')} }`;
    } else if (options.typeInst && isTypeObject(obj)) {
        let fileds = Object.keys(obj).filter(k => k).map(k => `${k}: ${object2string(obj[k], { typeInst: false, fun: false })}`);
        return `[${getClassName(obj)} {${fileds.join(', ')}} ]`;
    }
    if (!options.fun && isFunction(obj)) {
        return 'Function';
    }
    return `${obj}`;
}

/**
 * reflective operation invoker.
 * implements {@link OperationInvoker}
 */
export class ReflectiveOperationInvoker implements OperationInvoker {

    constructor(private typeRef: TypeReflect, private method: string, private instance?: any) {

    }

    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param destroy destroy the context after invoked.
     */
    invoke(context: InvocationContext, destroy?: boolean | Function) {
        const type = this.typeRef.type;
        const instance = this.instance ?? context.get(type, context);
        if (!instance || !isFunction(instance[this.method])) {
            throw new Error(`type: ${type} has no method ${this.method}.`);
        }
        const hasPointcut = instance[this.method]['_proxy'] == true;
        const args = this.resolveArguments(context);
        if (hasPointcut) {
            args.push(context);
        }
        let result = instance[this.method](...args);
        if (destroy && !hasPointcut) {
            if (isPromise(result)) {
                return result.then(val => {
                    isFunction(destroy) ? destroy() : context?.destroy();
                    return val;
                }) as any;
            } else {
                isFunction(destroy) ? destroy() : context?.destroy();
            }
        }
        return result;
    }

    /**
     * resolve args.
     * @param context 
     */
    resolveArguments(context: InvocationContext): any[] {
        const parameters = this.getParameters();
        this.validate(context, parameters);
        return parameters.map(p => this.resolveArgument(p, context));
    }

    protected resolveArgument(parameter: Parameter, context: InvocationContext) {
        return context.resolveArgument(parameter);
    }

    protected getParameters(): Parameter[] {
        return this.typeRef.class.getParameters(this.method) as Parameter[] ?? EMPTY;
    }

    protected validate(context: InvocationContext, parameters: Parameter[]) {
        const missings = parameters.filter(p => this.isisMissing(context, p));
        if (missings.length) {
            throw new MissingParameterError(missings, this.typeRef.type, this.method);
        }
    }

    protected isisMissing(context: InvocationContext, parameter: Parameter) {
        return !context.canResolve(parameter);
    }
}

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

