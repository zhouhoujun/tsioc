import { Class, Injectable, InvocationContext, Invocation, InvocationFactory, Type, createContext, getClass, isFunction, isNumber, isPromise, isString, lang, AbstractInvocation, Injector, StaticProvider, ProvdierOf, AbstractInvocationFactory, InvocationOptions, InvokeArguments, Exception } from '@tsdi/ioc';
import { Observable, from, isObservable, lastValueFrom, of } from 'rxjs';
import { ApplicationHandler, BackendFn } from '../ApplicationHandler';
import { InvocationHanlderOptions, Respond, TypedRespond, InvocationHanlderFactory, InvocationHandler, } from '../invocation';
import { ConfigableHandler, createHandler } from '../handlers/configable.impl';
import { ResultValue } from '../handlers/ResultValue';
import { Context, HandleContext } from '../handlers/context';
import { getResolverToken } from '../handlers/resolver';
import { PipeTransform } from '../pipes/pipe';
import { ApplicationInterceptorLike } from '../ApplicationInterceptor';
import { GuardLike } from '../guard';
import { FilterLike } from '../filters/filter';




export class InvocationHandlerImpl<
    TInput = any,
    TOutput = any,
    TOptions extends InvocationHanlderOptions<TInput> = InvocationHanlderOptions<TInput>,
    TContext = any,
    T = any
> extends AbstractInvocation<T, TOptions> implements InvocationHandler<TInput, TOutput, TOptions, TContext, T> {

    private limit?: number;
    private handler: ConfigableHandler<TInput, TOutput, TOptions, TContext>;
    constructor(
        _class: Class<T>,
        context: InvocationContext,
        options: TOptions = {} as TOptions) {
        super(_class, context, options)
        this.limit = options.limit;
        options.backend = this.getBackend();
        this.handler = createHandler(this.context, options) as ConfigableHandler<TInput, TOutput, TOptions, TContext>;

    }

    getOptions(): TOptions {
        return this.options;
    }

    get injector(): Injector {
        return this.context.injector
    }

    protected override process(option?: InvocationContext | InvokeArguments) {
        if (!this.options.propertyKey) throw new Exception('propertyKey is required.');
        return this.invoke(this.options.propertyKey, option);
    }

    handle(input: TInput, context?: TContext): Observable<TOutput> {
        if ((input as HandleContext).bootstrap && this.options.bootstrap === false) return of(null) as Observable<TOutput>
        if (isNumber(this.limit)) {
            if (this.limit < 1) return of(null) as Observable<TOutput>;
            this.limit -= 1;
        }
        return this.handler.handle(input, context);
    }

    /**
     * use pipes
     * @param pipes 
     * @returns 
     */
    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this {
        this.handler.usePipes(pipes);
        return this;
    }

    /**
     * use interceptor for the handler.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    useInterceptors(interceptor: ProvdierOf<ApplicationInterceptorLike> | ProvdierOf<ApplicationInterceptorLike>[], order?: number): this {
        this.handler.useInterceptors(interceptor);
        return this;
    }

    /**
     * use guards for the handler.
     * @param guards 
     */
    useGuards(guards: ProvdierOf<GuardLike> | ProvdierOf<GuardLike>[], order?: number): this {
        this.handler.useGuards(guards, order);
        return this;
    }

    /**
     * use filters for the handler.
     * @param filter 
     * @param order 
     * @returns 
     */
    useFilters(filter: ProvdierOf<FilterLike> | ProvdierOf<FilterLike>[], order?: number): this {
        this.handler.useFilters(filter, order);
        return this;
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
                context.setValue(getClass(input), input);
                input = context;
            } else {
                newCtx = true;
                const ctx = createContext(this.context, { payload: input, resolvers: this.context.injector.get(getResolverToken(input), []) });
                ctx.setValue(getClass(input), input);
                if (context) this.attchContext(ctx, context, input)
                input = ctx;
            }
        }

        await this.beforeInvoke(input);
        let res = await this.invoke(input);

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
        input.setValue(getClass(context), context);
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

@Injectable()
export class InvocationHandlerFactorympl extends AbstractInvocationFactory implements InvocationHanlderFactory {

    protected createInstance<T>(classRef: Class<T>, context: InvocationContext, options?: InvocationOptions<T>): Invocation<T> {
        return new InvocationHandlerImpl(classRef, context, options);
    }

}

