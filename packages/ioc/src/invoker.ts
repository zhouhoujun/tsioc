import { Injector, ProviderType } from './injector';
import { Abstract } from './metadata/fac';
import { ParameterMetadata } from './metadata/meta';
import { get } from './metadata/refl';
import { ClassType, Type } from './types';
import { EMPTY, isDefined, isFunction, isNil } from './utils/chk';




export interface Parameter<T = any> extends ParameterMetadata {
    type?: ClassType<T>;
}

/**
 * Resolver for an argument of an {@link OperationInvoker}.
 */
export interface OperationArgumentResolver {
    /**
     * Return whether an argument of the given {@code type} can be resolved.
     * @param type argument type
     */
    canResolve(type: Parameter): boolean;

    /**
     * Resolves an argument of the given {@code type}.
     * @param type argument type
     */
    resolve<T>(type: Parameter<T>): T;
}

/**
 * The context for the {@link OperationInvoker invocation of an operation}.
 */
export class InvocationContext {

    private _argumentResolvers: OperationArgumentResolver[];
    private _arguments: Map<string, any>;
    constructor(readonly injector: Injector, args: Record<string, any> | Map<string, any>, ...argumentResolvers: OperationArgumentResolver[]) {
        this._argumentResolvers = argumentResolvers;
        if (args instanceof Map) {
            this._arguments = args;
        } else {
            this._arguments = new Map(Object.keys(args).map(k => [k, args[k]]));
        }
    }
    /**
     * the invocation arguments.
     */
    get arguments(): Map<string, any> {
        return this._arguments;
    }
    /**
     * the invocation arguments resolver.
     */
    get argumentResolvers(): OperationArgumentResolver[] {
        return this._argumentResolvers;
    }


    canResolve(type: Parameter): boolean {
        return this.argumentResolvers.some(r => r.canResolve(type));
    }

    resolveArgument<T>(argumentType: Parameter<T>): T | null {
        let result: T | undefined;
        this.argumentResolvers.some(r => {
            if (r.canResolve(argumentType)) {
                result = r.resolve(argumentType);
                return isDefined(result);
            }
            return false;
        });
        return result ?? null;
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
    constructor(parameters: Parameter[]) {
        super(`ailed to invoke operation because the following required parameters were missing: ${parameters}`);
    }
}

/**
 * reflective operation invoker.
 */
export class ReflectiveOperationInvoker implements OperationInvoker {

    constructor(private type: Type, private method: string, private instance?: any) { }

    invoke(context: InvocationContext) {
        const injector = context.injector;
        const instance = this.instance ?? injector.resolve(this.type);
        if (!instance || !isFunction(instance[this.method])) {
            throw new Error(`type: ${this.type} has no method ${this.method}.`);
        }
        const val = instance[this.method](...this.resolveArguments(context), injector.scope === 'invoked' ? injector : undefined);
        if (injector.scope === 'parameter') {
            injector.destroy();
        }
        return val;
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
        let arg = context.resolveArgument(parameter);
        if (isDefined(arg)) return arg;
        return context.arguments.get(parameter.paramName!);
    }

    protected getParameters(): Parameter[] {
        return get(this.type).methodParams?.get(this.method) ?? EMPTY;
    }

    protected validate(context: InvocationContext, parameters: Parameter[]) {
        const missings = parameters.filter(p => this.isisMissing(context, p));
        if (missings.length) {
            throw new MissingParameterError(missings);
        }
    }

    protected isisMissing(context: InvocationContext, parameter: Parameter) {
        if (context.canResolve(parameter)) return false;
        return !parameter.paramName || isNil(context.arguments.get(parameter.paramName));
    }
}


@Abstract()
export abstract class OperationInvokerFactory {
    abstract create<T>(type: Type<T>, method: string, instance?: T): OperationInvoker;
    abstract createContext<T>(target: Type<T>, method: string, injector: Injector, option?: {
        args?: Record<string, any> | Map<string, any>,
        resolvers?: OperationArgumentResolver[],
        providers?: ProviderType[]
    }): InvocationContext;
}


