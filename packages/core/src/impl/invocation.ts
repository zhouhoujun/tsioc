import { InvocationContext, Invocation, createContext, getType, isFunction, isString, Injector, Type, Context, invokeTail, InvocationRequest } from '@tsdi/ioc';
import { BackendFn } from '../ApplicationHandler';
import { InvocationHandlerOptions, Respond, TypedRespond, InvocationHandler, } from '../invocation';
import { ConfigableHandler, normalizeConfigableHandlerOptions } from '../handlers/configable.impl';
import { ResultValue } from '../handlers/ResultValue';
import { getResolverToken } from '../handlers/resolver';
import { HandleContext, toObservable } from '../handlers';




export class DefaultInvocationHandler<
    TInput = any,
    TOutput = any,
    TOptions extends InvocationHandlerOptions<TInput> = InvocationHandlerOptions<TInput>,
    TContext = any,
    T = any
> extends ConfigableHandler<TInput, TOutput, TOptions, TContext> implements InvocationHandler<TInput, TOutput, TOptions, TContext, T> {

    private limit?: number;
    constructor(
        readonly invocation: Invocation<T>,
        options: TOptions,
        readonly propertyKey?: string | symbol) {
        super(createContext(invocation.injector, options), options)
        this.limit = options.limit;

    }

    getOptions(): TOptions {
        return this.options;
    }

    protected getBackend(): BackendFn<TInput, TOutput> {
        return (input: any, context?: TContext) => toObservable(this.respond(input, context));
    }


    /**
     * before `Invocation` invoke 
     * @param ctx 
     */
    protected beforeInvoke(ctx: TInput | InvocationContext): any { }
    /**
     * respond.
     * @param input 
     * @returns 
     */
    protected respond(input: TInput | InvocationContext, context?: TContext) {
        let newCtx = false;
        if (input instanceof InvocationContext) {
            if (context) this.attchContext(input, context);
        } else {
            if (context && context instanceof InvocationContext) {
                context.setValue(getType(input), input);
                input = context;
            } else {
                newCtx = true;
                const ctx = createContext(this.context, { request: input as InvocationRequest, resolvers: this.context.get(getResolverToken(input), []) });
                ctx.setValue(getType(input), input);
                if (context) this.attchContext(ctx, context, input)
                input = ctx;
            }
        }

        return invokeTail(() => this.beforeInvoke(input),
            () => invokeTail(() => this.propertyKey ? this.invocation.invoke(this.propertyKey, input) : this.invocation.invoke(input),
                {
                    next: (res) => {
                        if (res instanceof ResultValue) {
                            return res.sendValue(input as HandleContext);
                        }
                        return this.respondAs(input, res);
                    },
                    finally: () => {
                        if (newCtx) (input as InvocationContext).destroy();
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
    protected respondAs(ctx: InvocationContext, res: any): TOutput {
        if (isString(this.options.response)) {
            const trespond = ctx.get(TypedRespond);
            if (trespond) {
                trespond.respond(ctx, res, this.options.response);
            }
            // else {
            //     ctx.request[this.options.response] = res;
            // }
        } else if (this.options.response) {
            const respond = ctx.get(this.options.response) ?? this.options.response;
            if (isFunction(respond)) {
                respond(ctx, res);
            } else if (respond) {
                (respond as Respond).respond(ctx, res);
            }
        } else {
            this.defaultRespond(ctx, res);
        }
        return res;
    }

    protected defaultRespond(ctx: InvocationContext, res: any): void { }

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