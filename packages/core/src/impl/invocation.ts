import { Class, EMPTY_OBJ, Injectable, Injector, OperationInvoker, ReflectiveFactory, ReflectiveRef, Type, isFunction, isNumber, isPromise, isString } from '@tsdi/ioc';
import { Observable, isObservable, lastValueFrom, of } from 'rxjs';
import { Backend } from '../Handler';
import { FnHandler } from '../handlers/handler';
import { ConfigableHandler } from '../handlers/configable';
import { ResultValue } from '../handlers/ResultValue';
import { HandlerContext } from '../handlers/context';
import {
    InvocationOptions, Respond, TypedRespond, InvocationFactory, OPERA_FILTERS, OPERA_GUARDS,
    InvocationFactoryResolver, OPERA_INTERCEPTORS, InvocationHandler
} from '../invocation';



export class InvocationHandlerImpl<
    TInput extends HandlerContext = HandlerContext,
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
        if (input.bootstrap && this.options.bootstrap === false) return of(null) as Observable<TOutput>
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
    protected async respond(input: TInput, context?: TContext) {
        await this.beforeInvoke(input);
        let res = await this.invoker.invoke(input);

        if (isPromise(res)) {
            res = await res;
        }
        if (isObservable(res)) {
            res = await lastValueFrom(res);
        }
        if (res instanceof ResultValue) return await res.sendValue(input);
        return this.respondAs(input, res)
    }

    /**
     * respond as
     * @param ctx 
     * @param res 
     * @returns 
     */
    protected respondAs(ctx: TInput, res: any): TOutput {
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

    protected defaultRespond(ctx: TInput, res: any): void { }

}

@Injectable()
export class InvocationFactorympl<T = any> extends InvocationFactory<T> {

    constructor(readonly typeRef: ReflectiveRef<T>) {
        super()
    }

    create<TArg>(propertyKey: string, options?: InvocationOptions<TArg>): InvocationHandler {
        return new InvocationHandlerImpl(this.typeRef.createInvoker<TArg>(propertyKey, options), options ?? EMPTY_OBJ as InvocationOptions);
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