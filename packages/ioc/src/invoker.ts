import { ClassType, Type } from './types';
import { getClassName, remove } from './utils/lang';
import {
    EMPTY, isClassType, isDefined, isFunction, isPlainObject,
    isArray, isPromise, isString, isTypeObject, isTypeReflect
} from './utils/chk';
import { Abstract } from './metadata/fac';
import { ParameterMetadata } from './metadata/meta';
import { TypeReflect } from './metadata/type';
import { ProviderType } from './providers';
import { DestroyCallback, Destroyable, OnDestroy } from './destroy';
import { InjectFlags, Token } from './tokens';
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
 * The context for the {@link OperationInvoker invocation of an operation}.
 */
export class InvocationContext<T = any> implements Destroyable, OnDestroy {
    private _args: T;
    private _dsryCbs = new Set<DestroyCallback>();
    private _destroyed = false;
    private _refs: Injector[];
    private _values: Map<Token, any>;
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
        injector.onDestroy(this);
        this._refs = [];
    }

    /**
     * add reference resolver.
     * @param injectors 
     */
    addRef(...injectors: Injector[]) {
        injectors.forEach(j => j && j !== this.injector && this._refs.indexOf(j) < 0 && this._refs.push(j));
    }

    /**
     * remove reference resolver.
     * @param injector 
     */
    removeRef(injector: Injector) {
        remove(this._refs, injector);
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
     * has token in the context or not.
     * @param token the token to check.
     * @param flags inject flags, type of {@link InjectFlags}.
     * @returns boolean.
     */
    has(token: Token, flags?: InjectFlags): boolean {
        if (this.isSelf(token)) return true;
        return this.injector.has(token, flags) || this._refs.some(i => i.has(token, flags)); // || this.parent?.has(token, flags) === true;
    }

    /**
     * get token value.
     * @param token the token to get value.
     * @param context invcation context, type of {@link InvocationContext}.
     * @param flags inject flags, type of {@link InjectFlags}.
     * @returns the instance of token.
     */
    get<T>(token: Token<T>, context?: InvocationContext<any>, flags?: InjectFlags): T {
        if (this.isSelf(token)) return this as any;
        return this.injector.get(token, context, flags) ?? this.getFormRef(token, context, flags)!; // ?? this.parent?.get(token, context, flags) as T;
    }

    protected getFormRef<T>(token: Token<T>, context?: InvocationContext, flags?: InjectFlags): T | undefined {
        let val: T | undefined;
        this._refs.some(r => {
            val = r.get(token, context, flags);
            return isDefined(val);
        });
        return val;
    }

    /**
     * has value to context
     * @param token the token to check has value.
     */
    hasValue<T>(token: Token): boolean {
        if (this.isSelf(token)) return true;
        return this._values.has(token) || this.parent?.hasValue(token) === true;
    }

    /**
     * get value to context
     * @param token the token to get value.
     */
    getValue<T>(token: Token<T>): T {
        if (this.isSelf(token)) return this as any;
        return this._values.get(token) ?? this.parent?.getValue(token);
    }

    /**
     * set value.
     * @param token token
     * @param value value for the token.
     */
    setValue<T>(token: Token<T>, value: T) {
        this._values.set(token, value);
        return this;
    }

    /**
     * can resolve the parameter or not.
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @returns 
     */
    canResolve(meta: Parameter): boolean {
        return this.getMetaReolver(meta)?.canResolve(meta, this) === true
            || this.resolvers.some(r => r.canResolve(meta, this))
            || this.parent?.canResolve(meta) == true;
    }

    /**
     * get resolver in the property or parameter metadata. configured in class design.
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @returns undefined or resolver of type {@link OperationArgumentResolver}.
     */
    getMetaReolver(meta: Parameter): OperationArgumentResolver | undefined {
        if (isFunction(meta.resolver)) {
            return this.injector.get<OperationArgumentResolver>(meta.resolver);
        }
        return meta.resolver;
    }

    /**
     * resolve the parameter value.
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @returns the parameter value in this context.
     */
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
                this._dsryCbs.forEach(c => isFunction(c) ? c() : c?.onDestroy());
            } finally {
                this._dsryCbs.clear();
                this._values.clear();
                this._args = null!;
                this.resolvers = null!;
                this._refs = [];
                this.injector.destroy();
                (this as any).parent = null;
                (this as any).injector = null;
            }
        }
    }

    onDestroy(callback?: DestroyCallback): void {
        if (!callback) {
            return this.destroy();
        }
        this._dsryCbs.add(callback);
    }
}


/**
 * Interface to perform an operation invocation.
 */
export interface OperationInvoker {
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param destroy try destroy the context after invoked.
     */
    invoke(context: InvocationContext, destroy?: boolean): any;

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
    invoke(context: InvocationContext, destroy?: boolean) {
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
                    context?.destroy();
                    return val;
                }) as any;
            } else {
                context.destroy();
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
 * operation factory.
 */
@Abstract()
export abstract class OperationFactory<T = any> implements OnDestroy {
    /**
     * injector.
     */
    abstract get injector(): Injector;
    /**
     * instance of target.
     */
    abstract resolve(): T;
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
    abstract invoke(method: MethodType<T>, option?: InvokeArguments, instance?: T): any;
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

    abstract onDestroy(): void;
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
     * @param option target type invoke option {@link InvokeOption}
     * @returns instance of {@link OperationFactory}
     */
    abstract resolve<T>(type: ClassType<T> | TypeReflect<T>, injector: Injector, option?: InvokeOption): OperationFactory<T>;
}

