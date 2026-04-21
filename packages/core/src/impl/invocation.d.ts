import { Invocation, Type, RunContext } from '@tsdi/ioc';
import { HandlerFn } from '../handler';
import { InvocationHandlerOptions, InvocationHandler } from '../invocation';
import { ConfigableHandler } from '../handlers/configable.impl';
export declare class DefaultInvocationHandler<TInput = any, TOutput = any, TContext extends RunContext = RunContext, T = any> extends ConfigableHandler<TInput, TOutput, TContext> implements InvocationHandler<TInput, TOutput, TContext, T> {
    readonly invocation: Invocation<T>;
    protected options: InvocationHandlerOptions<TInput>;
    readonly propertyKey?: string | symbol | undefined;
    private limit?;
    constructor(invocation: Invocation<T>, options: InvocationHandlerOptions<TInput>, propertyKey?: string | symbol | undefined);
    protected getBackend(): HandlerFn<TInput, TOutput, TContext>;
    /**
     * before `Invocation` invoke
     * @param ctx
     */
    protected beforeInvoke(ctx: TInput): any;
    /**
     * respond.
     * @param input
     * @returns
     */
    protected respond(input: TInput, context: TContext): TOutput;
    /**
     * respond as
     * @param ctx
     * @param res
     * @returns
     */
    protected respondAs(input: TInput, res: any, context: TContext): TOutput;
    equals(other: InvocationHandler): boolean;
}
export declare function createInvocationHandler<TInput, TOutput, TClass extends InvocationHandler<TInput, TOutput>, T>(invocation: Invocation<T>, options: InvocationHandlerOptions<TInput>, propertyKey?: string | symbol, type?: Type<TClass>): TClass;
