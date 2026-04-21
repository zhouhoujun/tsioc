import { Exception } from '../exception';
import { RunContext } from '../handlers/contexts';
import { HandlerLike } from '../handlers/handler';
import { InterceptorLike } from '../handlers/interceptor';
import { Injector } from '../injector';
import { RuntimeHandler } from '../lifescope/handler';
import { Parameter, ResolveHandler, Resolver } from '../resolver';
import { Runtime } from '../runtime';
import { AbstractType } from '../types';
export declare class DefaultResolver implements Resolver {
    readonly handler: ResolveHandler;
    constructor(handler: ResolveHandler);
    resolve<T>(parameter: Parameter<T>, context: RunContext): T;
    resolveParams(injector: Injector, params: Parameter[], context?: RunContext): any[];
    protected missingException(missings: Partial<Parameter>[], type: AbstractType<any>, method: string): Exception;
}
/**
 * Missing argument execption.
 */
export declare class MissingParameterException extends Exception {
    constructor(parameters: Partial<Parameter>[], type: AbstractType, method: string);
}
/**
 * format object to string for log.
 * @param obj
 * @returns
 */
export declare function object2string(obj: any, options?: {
    typeInst?: boolean;
    fun?: boolean;
}): string;
export declare const UNRESOLVED: {};
export declare function isResolved(value: any): boolean;
export declare function createResolveHandler<TInput, TOutput = any, TContext extends RunContext = RunContext>(interceptors?: InterceptorLike<TInput, TOutput, TContext>[], backend?: HandlerLike<TInput, TOutput, TContext> | null): RuntimeHandler<TInput, TOutput, TContext>;
export declare function getParameterResolveHanlder(runtime: Runtime): RuntimeHandler<Parameter, any, RunContext>;
