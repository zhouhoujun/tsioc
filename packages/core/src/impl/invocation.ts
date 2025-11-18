import { InvocationContext, Invocation, createContext, getType, isFunction, isString, Injector, Type, Context, invokeTail, isInvocationContext, ArgumentException, createResolveContext } from '@tsdi/ioc';
import { ApplicationHandlerFn, RunableContext } from '../ApplicationHandler';
import { InvocationHandlerOptions, Respond, TypedRespond, InvocationHandler, } from '../invocation';
import { ConfigableHandler, normalizeConfigableHandlerOptions } from '../handlers/configable.impl';
import { ResultValue } from '../handlers/ResultValue';
import { toObservable } from '../handlers';




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
        super(createContext(invocation.context, options), options)
        this.limit = options.limit;

    }

    getOptions(): TOptions {
        return this.options;
    }

    protected getBackend(): ApplicationHandlerFn<TInput, TOutput, TContext> {
        return (input: TInput, context: TContext) => toObservable(this.respond(input, context));
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
    protected respond(input: TInput, context: TContext) {

        // let newCtx = false;
        // if (isInvocationContext(input)) {
        //     if (context) this.attchContext(input, context);
        // } else {
        //     if (isInvocationContext(context)) {
        //         context.setValue(getType(input), input);
        //         input = context;
        //     } else {
        //         newCtx = true;
        //         const ctx = createContext(this.context, { resolvers: this.context.get(getResolveHandlerToken(input), []) });
        //         ctx.setValue(getType(input), input);
        //         if (context) this.attchContext(ctx, context, input)
        //         input = ctx;
        //     }
        // }

        const rctx = createResolveContext(this.invocation.context, this.invocation.type);
        rctx.setPayload(input);

        return invokeTail(() => this.beforeInvoke(input),
            () => invokeTail(() => this.propertyKey ? this.invocation.invoke(this.propertyKey, rctx) : this.invocation.invoke(rctx),
                {
                    next: (res) => {
                        if (res instanceof ResultValue) {
                            return res.sendValue(context);
                        }
                        return this.respondAs(input, res, context);
                    },
                    finally: () => {
                        rctx.onDestroy();
                        // if (newCtx) (input as InvocationContext).destroy();
                    }
                }));

    }

    protected attchContext(input: InvocationContext, context: TContext, nextData?: any) {
        if (context instanceof Context) {
            input.setValue(Context, context);
        }
        input.setValue(getType(context), context);
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
    options = normalizeConfigableHandlerOptions(options);
    return new Hanlder(invocation, options, propertyKey) as TClass;
}