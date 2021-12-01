import { ClassType, Type } from './types';
import { EMPTY, isArray, isClassType, isDefined, isFunction, isObject, isPlainObject, isString } from './utils/chk';
import { Abstract } from './metadata/fac';
import { ParameterMetadata } from './metadata/meta';
import { TypeReflect } from './metadata/type';
import { ProviderType } from './providers';
import { DestroyCallback, Destroyable } from './destroy';
import { Token } from './tokens';
import { Injector } from './injector';
import { getClassName } from './utils/lang';



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
export function composeResolver<T extends OperationArgumentResolver, TP extends Parameter = Parameter>(filter: (parameter: TP, ctx: InvocationContext) => boolean, ...resolvers: T[]): OperationArgumentResolver {
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
 * The context for the {@link OperationInvoker invocation of an operation}.
 */
export class InvocationContext<T = any> implements Destroyable {
    private _args: T;
    private _values: Map<Token, any>;
    private _dsryCbs = new Set<DestroyCallback>();
    private _destroyed = false;
    /**
     * the invocation arguments resolver.
     */
    protected resolvers: OperationArgumentResolver[];
    propertyKey?: string;

    constructor(
        readonly injector: Injector,
        readonly parent?: InvocationContext,
        readonly target?: ClassType,
        readonly method?: string,
        args?: T,
        values?: TokenValue[],
        ...argumentResolvers: ArgumentResolver[]) {
        this.resolvers = argumentResolvers.map(r => isFunction(r) ? injector.get<OperationArgumentResolver>(r) : r);
        this._args = args ?? {} as T;
        this._values = new Map(values);
        injector.onDestroy(() => this.destroy());
    }

    /**
     * the invocation arguments.
     */
    get arguments(): T {
        return this._args;
    }

    setArgument(name: string, value: any): void {
        (this._args as any)[name] = value;
    }

    protected isSelf(token: Token) {
        return token === InvocationContext;
    }

    /**
     * has value to context
     * @param token
     */
    hasValue<T>(token: Token): boolean {
        if (this.isSelf(token)) return true;
        return this._values.has(token) || this.parent?.hasValue(token) === true;
    }

    /**
     * get value to context
     * @param token
     */
    getValue<T>(token: Token): T {
        if (this.isSelf(token)) return this as any;
        return this._values.get(token) ?? this.parent?.getValue(token);
    }
    /**
     * set value
     * @param token
     * @param value 
     */
    setValue<T>(token: Token, value: T) {
        this._values.set(token, value);
        return this;
    }

    canResolve(meta: Parameter): boolean {
        return this.getMetaReolver(meta)?.canResolve(meta, this) === true
            || this.resolvers.some(r => r.canResolve(meta, this))
            || this.parent?.canResolve(meta) == true;
    }

    getMetaReolver(meta: Parameter): OperationArgumentResolver | undefined {
        if (isFunction(meta.resolver)) {
            return this.injector.get<OperationArgumentResolver>(meta.resolver);
        }
        return meta.resolver;
    }

    resolveArgument<T>(meta: Parameter<T>): T | null {
        let result: T | undefined;
        const metaRvr = this.getMetaReolver(meta);
        if (metaRvr?.canResolve(meta, this)) {
            result = metaRvr.resolve(meta, this);
            if (isDefined(result)) return result;
        }
        this.resolvers.some(r => {
            if (r.canResolve(meta, this)) {
                result = r.resolve(meta, this);
                return isDefined(result);
            }
            return false;
        });
        return result ?? this.parent?.resolveArgument(meta) ?? null;
    }

    get destroyed() {
        return this._destroyed;
    }

    destroy(): void {
        if (!this._destroyed) {
            this._destroyed = true;
            try {
                this._dsryCbs.forEach(c => isFunction(c) ? c() : c?.destroy());
            } finally {
                this._dsryCbs.clear();
                this._args = null!;
                this.resolvers = null!;
                this._values.clear();
                this.injector.destroy();
                (this as any).parent = null;
                (this as any).injector = null;
            }
        }
    }

    onDestroy(callback: DestroyCallback): void {
        this._dsryCbs.add(callback);
    }
}

/**
 * resolver of {@link Type}.
 */
export interface Resolver<T = any> {
    get type(): Type<T>;
    resolve(ctx?: InvocationContext): T;
}

/**
 * is resolver or not.
 * @param target 
 * @returns 
 */
export function isResolver(target: any): target is Resolver {
    if (!isObject(target)) return false;
    return isFunction((target as Resolver).type) && isFunction((target as Resolver).resolve);
}

/**
 * Interface to perform an operation invocation.
 */
export interface OperationInvoker {
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param callback (result: any) => void  after invoked callback.
     */
    invoke(context: InvocationContext, callback?: (result: any) => void): any;

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

/**
 * format object to string for log.
 * @param obj 
 * @returns 
 */
export function object2string(obj: any): string {
    if (isString(obj)) {
        return `"${obj}"`;
    } else if (isClassType(obj)) {
        return 'Type<' + getClassName(obj) + '>';
    } else if (isPlainObject(obj)) {
        let str: string[] = [];
        for (let n in obj) {
            let value = obj[n];
            str.push(`${n}: ${object2string(value)}`)
        }
        return `{ ${str.join(', ')} }`;
    }
    return `${obj}`;
}

/**
 * reflective operation invoker.
 * implements {@link OperationInvoker}
 */
export class ReflectiveOperationInvoker implements OperationInvoker {

    constructor(private typeRef: TypeReflect, private method: string, private instance?: any) { }

    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param callback (result: any) => void  after invoked callback.
     */
    invoke(context: InvocationContext, callback?: (result: any) => void) {
        const injector = context.injector;
        const type = this.typeRef.type;
        const instance = this.instance ?? injector.get(type, context);
        if (!instance || !isFunction(instance[this.method])) {
            throw new Error(`type: ${type} has no method ${this.method}.`);
        }
        let result = instance[this.method](...this.resolveArguments(context), context);
        if (callback) callback(result);
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
     * parent InvocationContext,
     */
    parent?: InvocationContext;
}

/**
 * invocation option.
 */
export interface InvocationOption extends InvokeOption {
    /**
     * invocation target method.
     */
    invokerMethod?: string;
}

/**
 * relective ref.
 */
@Abstract()
export abstract class ReflectiveRef<T = any> implements Destroyable {
    /**
     * injector.
     */
    abstract get injector(): Injector;
    /**
     * the type root invocation context.
     */
    abstract get root(): InvocationContext;
    /**
     * instance of target
     *
     * @readonly
     * @abstract
     * @type {T}
     */
    abstract get instance(): T;
    /**
     * target reflect.
     *
     * @readonly
     * @abstract
     */
    abstract get reflect(): TypeReflect<T>;
    /**
     * execute target type.
     *
     * @readonly
     * @abstract
     * @type {Type<T>}
     */
    abstract get type(): Type<T>;
    /**
     * invoke target method.
     * @param method 
     * @param option 
     */
    abstract invoke(method: string, option?: InvokeArguments): any;

    abstract get destroyed(): boolean;
    /**
     * Destroys the component instance and all of the data structures associated with it.
     */
    abstract destroy(): void;
    /**
     * A lifecycle hook that provides additional developer-defined cleanup
     * functionality for the component.
     * @param callback A handler function that cleans up developer-defined data
     * associated with this component. Called when the `destroy()` method is invoked.
     */
    abstract onDestroy(callback: DestroyCallback): void;
}

@Abstract()
export abstract class OperationFactory<T> {
    abstract get targetReflect(): TypeReflect<T>;
    abstract create(injector: Injector, option?: InvokeOption): ReflectiveRef<T>;
    abstract createInvoker(method: string, instance?: T): OperationInvoker;
    abstract createContext(injector: Injector, option?: InvocationOption, root?: InvocationContext): InvocationContext;
}

@Abstract()
export abstract class OperationFactoryResolver {
    abstract create<T>(type: ClassType<T> | TypeReflect<T>): OperationFactory<T>;
}

