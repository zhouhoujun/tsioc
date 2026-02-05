import { Invocation, isFunction, isString, Type, invokeTails, RunContext, isNumber } from '@tsdi/ioc';
import { HandlerFn } from '../handler';
import { InvocationHandlerOptions, Respond, TypedRespond, InvocationHandler, } from '../invocation';
import { ConfigableHandler, normalizeConfigableHandlerOptions } from '../handlers/configable.impl';
import { ResultValue } from '../handlers/ResultValue';


export class DefaultInvocationHandler<
    TInput = any,
    TOutput = any,
    TContext extends RunContext = RunContext,
    T = any
> extends ConfigableHandler<TInput, TOutput, TContext> implements InvocationHandler<TInput, TOutput, TContext, T> {

    private limit?: number;
    constructor(
        readonly invocation: Invocation<T>,
        protected options: InvocationHandlerOptions<TInput>,
        readonly propertyKey?: string | symbol) {
        super(propertyKey ? invocation.getMethodContext(propertyKey) : invocation.context, options)
        this.limit = options.limit;

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
    protected respond(input: TInput, context: TContext): TOutput {
        if (isNumber(this.limit)) {
            if (this.limit < 1) return null!;
            this.limit -= 1;
        }

        return invokeTails(
            () => this.beforeInvoke(input),
            () => {
                const ctx = context.setPayload(input);
                return this.propertyKey ? this.invocation.invoke(this.propertyKey, ctx) : this.invocation.invoke(ctx);
            },
            (res) => {
                if (res instanceof ResultValue) {
                    return res.sendValue(context);
                }
                return this.respondAs(input, res, context);
            }
        )

    }

    /**
     * respond as
     * @param ctx 
     * @param res 
     * @returns 
     */
    protected respondAs(input: TInput, res: any, context: TContext): TOutput {
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
    normalizeConfigableHandlerOptions(options);
    return new Hanlder(invocation, options, propertyKey) as TClass;
}