import { Class, EMPTY_OBJ, Injectable, Injector, InvocationContext, OperationInvoker, ReflectiveFactory, ReflectiveRef, Type, createContext, getClass, isDefined, isFunction, isNumber, isPromise, isString, lang } from '@tsdi/ioc';
import { Observable, isObservable, lastValueFrom, of } from 'rxjs';
import { Backend } from '../Handler';
import { FnHandler } from '../handlers/handler';
import { ConfigableHandler } from '../handlers/configable.impl';
import { ResultValue } from '../handlers/ResultValue';
import { Context, HandlerContext } from '../handlers/context';
import {
    InvocationOptions, Respond, TypedRespond, InvocationFactory, OPERA_FILTERS, OPERA_GUARDS,
    InvocationFactoryResolver, OPERA_INTERCEPTORS, InvocationHandler,
} from '../invocation';
import { getResolverToken } from '../handlers';



export class InvocationHandlerImpl<
    TInput = any,
    TOutput = any,
    TOptions extends InvocationOptions<TInput> = InvocationOptions<TInput>,
    TContext = any
> extends ConfigableHandler<TInput, TOutput, TOptions, TContext> implements InvocationHandler<TInput, TOutput, TOptions, TContext> {

    private limit?: number;
    constructor(
        public readonly invoker: OperationInvoker, options: TOptions) {
        super(invoker.context, options)
        this.limit = options.limit;
        invoker.context.onDestroy(this);

    }

    protected override initOptions(options: TOptions): TOptions {
        return {
            interceptorsToken: OPERA_INTERCEPTORS,
            guardsToken: OPERA_GUARDS,
            filtersToken: OPERA_FILTERS,
            ...options
        }
    }

    override handle(input: TInput, context?: TContext): Observable<TOutput> {
        if ((input as HandlerContext).bootstrap && this.options.bootstrap === false) return of(null) as Observable<TOutput>
        if (isNumber(this.limit)) {
            if (this.limit < 1) return of(null) as Observable<TOutput>;
            this.limit -= 1;
        }
        return super.handle(input, context);
    }

    equals(target: InvocationHandler): boolean {
        if (target === this) return true;
        return this.invoker.equals(target.invoker);
    }

    protected override getBackend(): Backend<TInput, TOutput> {
        return new FnHandler(this.respond.bind(this));
    }

    /**
     * before `OperationInvoker` invoke 
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
                const ctx = createContext(this.context, { args: input, resolvers: this.injector.get(getResolverToken(input), []) });
                ctx.setValue(getClass(input), input);
                if (context) this.attchContext(ctx, context, input)
                input = ctx;
            }
        }

        await this.beforeInvoke(input);
        let res = await this.invoker.invoke(input);

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
            isDefined(nextData) && context.next(nextData);
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
                ctx.args[this.options.response] = res;
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
export class InvocationFactorympl<T = any> extends InvocationFactory<T> {

    constructor(readonly typeRef: ReflectiveRef<T>) {
        super()
    }

    create<TArg>(propertyKey: string, options?: InvocationOptions<TArg>): InvocationHandler {
        return new InvocationHandlerImpl(this.typeRef.createInvoker<TArg>(propertyKey, options), options ?? EMPTY_OBJ as any);
    }

}

/**
 * factory resolver implements
 */
export class InvocationFactoryResolverImpl extends InvocationFactoryResolver {
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    resolve<T>(type: ReflectiveRef<T>): InvocationFactory<T>;
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    resolve<T>(type: Type<T> | Class<T>, injector: Injector): InvocationFactory<T>;
    resolve<T>(type: Type<T> | Class<T> | ReflectiveRef<T>, arg2?: any): InvocationFactory<T> {
        let tyref: ReflectiveRef<T>;
        if (type instanceof ReflectiveRef) {
            tyref = type;
        } else {
            const injector = arg2 as Injector;
            tyref = injector.get(ReflectiveFactory).create(type, injector);
        }
        return new InvocationFactorympl(tyref);
    }

}