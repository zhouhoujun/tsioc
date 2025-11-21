import { Invocation, isFunction, isString, Type, invokeTails, HandleResult } from '@tsdi/ioc';
import { HandlerFn, RunableContext } from '../handler';
import { InvocationHandlerOptions, Respond, TypedRespond, InvocationHandler, } from '../invocation';
import { ConfigableHandler, normalizeConfigableHandlerOptions } from '../handlers/configable.impl';
import { ResultValue } from '../handlers/ResultValue';


export class DefaultInvocationHandler<
    TInput = any,
    TOutput = any,
    TOptions extends InvocationHandlerOptions<TInput> = InvocationHandlerOptions<TInput>,
    TContext extends RunableContext = RunableContext,
    T = any
> extends ConfigableHandler<TInput, TOutput, TOptions, TContext> implements InvocationHandler<TInput, TOutput, TOptions, TContext, T> {

    private limit?: number;
    constructor(
        readonly invocation: Invocation<T>,
        options: TOptions,
        readonly propertyKey?: string | symbol) {
        super(propertyKey? invocation.getMethodContext(propertyKey) : invocation.context, options)
        this.limit = options.limit;

    }

    getOptions(): TOptions {
        return this.options;
    }

    protected getBackend(): HandlerFn<TInput, TOutput, TContext> {
        return (input: TInput, context: TContext) => this.respond(input, context);
    }


    /**
     * before `Invocation` invoke 
     * @param ctx 
     */
    protected beforeInvoke(ctx: TInput): any { }
    /**
     * respond.
     * @param input 
     * @returns 
     */
    protected respond(input: TInput, context: TContext): HandleResult<TOutput> {

        return invokeTails(
            () => this.beforeInvoke(input),
            () => this.propertyKey ? this.invocation.invoke(this.propertyKey, { payload: input }) : this.invocation.invoke({ payload: input }),
            {
                next: (res) => {
                    if (res instanceof ResultValue) {
                        return res.sendValue(context);
                    }
                    return this.respondAs(input, res, context);
                }
            })

    }

    /**
     * respond as
     * @param ctx 
     * @param res 
     * @returns 
     */
    protected respondAs(input: TInput, res: any, context: TContext): HandleResult<TOutput> {
        if (isString(this.options.response)) {
            const trespond = this.context.get(TypedRespond);
            if (trespond) {
                trespond.respond(input, res, this.options.response, context);
            }
        } else if (this.options.response) {
            const respond = this.context.get(this.options.response) ?? this.options.response;
            if (isFunction(respond)) {
                respond(input, res, context);
            } else if (respond) {
                (respond as Respond).respond(input, res, context);
            }
        } else {
            this.defaultRespond(input, res, context);
        }
        return res;
    }

    protected defaultRespond(input: TInput, res: any, context: TContext): void { }

    equals(other: InvocationHandler): boolean {
        return this.invocation.type === other.invocation.type
            && this.context === other.context
            && this.options.response === (other as DefaultInvocationHandler).options.response
            && this.propertyKey === (other as DefaultInvocationHandler).propertyKey;
    }

}


export function createInvocationHandler<TInput, TOutput, TClass extends InvocationHandler<TInput, TOutput>, T>(
    invocation: Invocation<T>,
    options: InvocationHandlerOptions<TInput>,
    propertyKey?: string | symbol,
    type?: Type<TClass>): TClass {
    const Hanlder = type ?? DefaultInvocationHandler;
    options = normalizeConfigableHandlerOptions(options);
    return new Hanlder(invocation, options, propertyKey) as TClass;
}