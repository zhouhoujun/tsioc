import { ClassType, Type } from './types';
import { EMPTY, isDefined, isFunction } from './utils/chk';
import { Injector } from './injector';
import { Abstract } from './metadata/fac';
import { ParameterMetadata } from './metadata/meta';
import { TypeReflect } from './metadata/type';
import { ProviderType } from './providers';
import { Destroyable } from './destroy';
import { Token } from './tokens';
import { cleanObj } from './utils/lang';


/**
 * parameter argument of an {@link OperationArgumentResolver}.
 */
export interface Parameter<T = any> extends ParameterMetadata {
    /**
     * type.
     */
    type: ClassType<T>;
    /**
     * param name.
     */
    paramName: string;
    /**
     * provider type
     */
    provider?: Type;
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
 * compose resolver for an argument of an {@link OperationInvoker}.
 * @param filter compose fiter
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

    private _argumentResolvers: OperationArgumentResolver[];
    private _arguments: T;
    private _values: Map<Token, any>;
    private destroyCbs = new Set<() => void>();
    private _destroyed = false;
    constructor(readonly injector: Injector, readonly parent?: InvocationContext, readonly target?: ClassType, readonly method?: string, args?: T, ...argumentResolvers: OperationArgumentResolver[]) {
        this._argumentResolvers = argumentResolvers;
        this._arguments = args ?? {} as T;
        this._values = new Map();
    }

    /**
     * the invocation arguments.
     */
    get arguments(): T {
        return this._arguments;
    }

    setArgument(name: string, value: any): void {
        (this.arguments as any)[name] = value;
    }

    setValue<T>(token: Token, value: T) {
        this._values.set(token, value);
        return this;
    }

    getValue<T>(token: Token): T {
        return this._values.get(token);
    }

    /**
     * the invocation arguments resolver.
     */
    protected get argumentResolvers(): OperationArgumentResolver[] {
        return this._argumentResolvers;
    }


    canResolve(type: Parameter): boolean {
        return this.argumentResolvers.some(r => r.canResolve(type, this)) || (this.parent?.canResolve(type) || false);
    }

    resolveArgument<T>(argumentType: Parameter<T>): T | null {
        let result: T | undefined;
        this.argumentResolvers.some(r => {
            if (r.canResolve(argumentType, this)) {
                result = r.resolve(argumentType, this);
                return isDefined(result);
            }
            return false;
        });
        return result ?? this.parent?.resolveArgument(argumentType) ?? null;
    }

    get destroyed() {
        return this._destroyed;
    }

    destroy(): void {
        if (!this._destroyed) {
            this._destroyed = true;
            this.destroyCbs.forEach(c => c && c());
            this.destroyCbs.clear();
            cleanObj(this._arguments);
            this._arguments = null!;
            this._argumentResolvers = null!;
            if (!this.injector.destroyed && this.injector.scope === 'parameter') {
                this.injector.destroy();
            }
            (this as any).injector = null;
        }
    }

    onDestroy(callback: () => void): void {
        this.destroyCbs.add(callback);
    }
}

/**
 * Interface to perform an operation invocation.
 */
export interface OperationInvoker {
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     */
    invoke(context: InvocationContext): any;

    /**
     * resolve args.
     * @param context 
     */
    resolveArguments(context: InvocationContext): any[];
}


/**
 * Missing argument errror.
 */
export class MissingParameterError extends Error {
    constructor(parameters: Parameter[], type: ClassType, method: string) {
        super(`ailed to invoke operation because the following required parameters were missing: ${parameters.map(p => JSON.stringify(p)).join('\n')}, method ${method} of class type ${type}`);
        Object.setPrototypeOf(this, MissingParameterError.prototype);
        Error.captureStackTrace(this);
    }
}

/**
 * reflective operation invoker.
 */
export class ReflectiveOperationInvoker implements OperationInvoker {

    constructor(private typeRef: TypeReflect, private method: string, private instance?: any) { }

    invoke(context: InvocationContext) {
        const injector = context.injector;
        const type = this.typeRef.type;
        const instance = this.instance ?? injector.resolve(type);
        if (!instance || !isFunction(instance[this.method])) {
            throw new Error(`type: ${type} has no method ${this.method}.`);
        }
        return instance[this.method](...this.resolveArguments(context), context);
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
        return this.typeRef.methodParams?.get(this.method) ?? EMPTY;
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


@Abstract()
export abstract class OperationInvokerFactory {
    abstract create<T>(type: ClassType<T> | TypeReflect<T>, method: string, instance?: T): OperationInvoker;
    abstract createContext<T>(target: ClassType<T> | TypeReflect<T>, method: string, injector: Injector, option?: {
        args?: Record<string, any>,
        resolvers?: OperationArgumentResolver[] | ((injector: Injector, typeRef?: TypeReflect, method?: string) => OperationArgumentResolver[]),
        providers?: ProviderType[]
    }): InvocationContext;
}


