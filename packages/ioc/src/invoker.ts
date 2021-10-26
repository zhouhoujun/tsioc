import { Injector, ProviderType } from './injector';
import { Abstract } from './metadata/fac';
import { ParameterMetadata } from './metadata/meta';
import { TypeReflect } from './metadata/type';
import { ClassType } from './types';
import { EMPTY, isDefined, isFunction } from './utils/chk';



/**
 * parameter.
 */
export interface Parameter<T = any> extends ParameterMetadata {
    type?: ClassType<T>;
}

/**
 * Resolver for an argument of an {@link OperationInvoker}.
 */
export interface OperationArgumentResolver {
    /**
     * Return whether an argument of the given {@code parameter} can be resolved.
     * @param parameter argument type
     * @param args gave arguments
     */
    canResolve(parameter: Parameter, args: Record<string, any>): boolean;
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param args gave arguments
     */
    resolve<T>(parameter: Parameter<T>, args: Record<string, any>): T;
}

/**
 * The context for the {@link OperationInvoker invocation of an operation}.
 */
export class InvocationContext {

    private _argumentResolvers: OperationArgumentResolver[];
    private _arguments: Record<string, any>;
    constructor(readonly injector: Injector, args?: Record<string, any>, ...argumentResolvers: OperationArgumentResolver[]) {
        this._argumentResolvers = argumentResolvers;
        this._arguments = args ?? {};

    }
    /**
     * the invocation arguments.
     */
    get arguments(): Record<string, any> {
        return this._arguments;
    }
    /**
     * the invocation arguments resolver.
     */
    get argumentResolvers(): OperationArgumentResolver[] {
        return this._argumentResolvers;
    }


    canResolve(type: Parameter): boolean {
        return this.argumentResolvers.some(r => r.canResolve(type, this.arguments));
    }

    resolveArgument<T>(argumentType: Parameter<T>): T | null {
        let result: T | undefined;
        this.argumentResolvers.some(r => {
            if (r.canResolve(argumentType, this.arguments)) {
                result = r.resolve(argumentType, this.arguments);
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


