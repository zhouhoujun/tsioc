import { InvocationContext, Invocation, createContext, getType, isFunction, isPromise, isString, Injector, ClassType } from '@tsdi/ioc';
import { from, isObservable, lastValueFrom, of } from 'rxjs';
import { BackendFn } from '../ApplicationHandler';
import { InvocationHandlerOptions, Respond, TypedRespond, InvocationHandler, } from '../invocation';
import { ConfigableHandler, normalizeConfigableHandlerOptions } from '../handlers/configable.impl';
import { ResultValue } from '../handlers/ResultValue';
import { Context } from '../handlers/context';
import { getResolverToken } from '../handlers/resolver';




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
        protected propertyKey?: string | symbol) {
        super(createContext(invocation.context, options), options)
        this.limit = options.limit;

    }

    getOptions(): TOptions {
        return this.options;
    }

    get injector(): Injector {
        return this.context.injector
    }


    protected getBackend(): BackendFn<TInput, TOutput> {
        return (input: any, context?: TContext) => from(this.respond(input, context));
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
    protected async respond(input: any, context?: TContext) {
        let newCtx = false;
        if (input instanceof InvocationContext) {
            if (context) this.attchContext(input, context);
        } else {
            if (context && context instanceof InvocationContext) {
                context.setValue(getType(input), input);
                input = context;
            } else {
                newCtx = true;
                const ctx = createContext(this.context, { payload: input, resolvers: this.context.injector.get(getResolverToken(input), []) });
                ctx.setValue(getType(input), input);
                if (context) this.attchContext(ctx, context, input)
                input = ctx;
            }
        }

        await this.beforeInvoke(input);
        let res = await (this.propertyKey ? this.invocation.invoke(this.propertyKey, input) : this.invocation.invoke(input));

        if (isPromise(res)) {
            res = await res;
        }
        if (isObservable(res)) {
            res = await lastValueFrom(res);
        }
        if (res instanceof ResultValue) {
            const result = await res.sendValue(input);
            if (newCtx) (input as InvocationContext).destroy();
            return result;

        }
        const result = this.respondAs(input, res);
        if (newCtx) (input as InvocationContext).destroy();
        return result;
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
            } else {
                ctx.payload[this.options.response] = res;
            }
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

}


export function createInvocationHandler<TInput, TOutput, TClass extends InvocationHandler<TInput, TOutput>, T>(
    invocation: Invocation<T>,
    options: InvocationHandlerOptions<TInput>,
    propertyKey?: string | symbol,
    type?: ClassType<TClass>): TClass {
    const Hanlder = type ?? DefaultInvocationHandler;    
    options = normalizeConfigableHandlerOptions(options);
    return new Hanlder(invocation, options, propertyKey) as TClass;
}