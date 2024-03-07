import { Class, EMPTY_OBJ, Injectable, Injector, OperationInvoker, ReflectiveFactory, ReflectiveRef, Type, isFunction, isNumber, isPromise, isString } from '@tsdi/ioc';
import { Observable, isObservable, lastValueFrom, of } from 'rxjs';
import { Backend } from '../Handler';
import { FnHandler } from '../handlers/handler';
import { ConfigableHandler } from '../handlers/configable';
import { ResultValue } from '../endpoints/ResultValue';
import { EndpointContext } from '../endpoints/context';
import { EndpointOptions, Respond, TypedRespond } from '../endpoints/endpoint.service';
import { EndpointFactory, EndpointFactoryResolver, OPERA_FILTERS, OPERA_GUARDS, OPERA_INTERCEPTORS, OperationEndpoint } from '../endpoints/endpoint.factory';





export class OperationEndpointImpl<TInput extends EndpointContext = EndpointContext, TOutput = any> extends ConfigableHandler<TInput, TOutput, EndpointOptions<TInput>> implements OperationEndpoint<TInput, TOutput> {

    private limit?: number;
    constructor(
        public readonly invoker: OperationInvoker, options: EndpointOptions) {
        super(invoker.context, options)
        this.limit = options.limit;
        invoker.context.onDestroy(this);

    }

    protected override initOptions(options: EndpointOptions): EndpointOptions {
        return {
            interceptorsToken: OPERA_INTERCEPTORS,
            guardsToken: OPERA_GUARDS,
            filtersToken: OPERA_FILTERS,
            ...options
        }
    }

    override handle(input: TInput): Observable<TOutput> {
        if (input.bootstrap && this.options.bootstrap === false) return of(null) as Observable<TOutput>
        if (isNumber(this.limit)) {
            if (this.limit < 1) return of(null) as Observable<TOutput>;
            this.limit -= 1;
        }
        return super.handle(input);
    }

    equals(target: OperationEndpoint): boolean {
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
     * @param ctx 
     * @returns 
     */
    protected async respond(ctx: TInput) {
        await this.beforeInvoke(ctx);
        let res = await this.invoker.invoke(ctx);

        if (isPromise(res)) {
            res = await res;
        }
        if (isObservable(res)) {
            res = await lastValueFrom(res);
        }
        if (res instanceof ResultValue) return await res.sendValue(ctx);
        return this.respondAs(ctx, res)
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
export class EndpointFactoryImpl<T = any> extends EndpointFactory<T> {

    constructor(readonly typeRef: ReflectiveRef<T>) {
        super()
    }

    create<TArg>(propertyKey: string, options?: EndpointOptions<TArg>): OperationEndpoint {
        return new OperationEndpointImpl(this.typeRef.createInvoker<TArg>(propertyKey, options), options ?? EMPTY_OBJ);
    }

}

/**
 * factory resolver implements
 */
export class EndpointFactoryResolverImpl extends EndpointFactoryResolver {
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    resolve<T>(type: ReflectiveRef<T>): EndpointFactory<T>;
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    resolve<T>(type: Type<T> | Class<T>, injector: Injector): EndpointFactory<T>;
    resolve<T>(type: Type<T> | Class<T> | ReflectiveRef<T>, arg2?: any): EndpointFactory<T> {
        let tyref: ReflectiveRef<T>;
        if (type instanceof ReflectiveRef) {
            tyref = type;
        } else {
            const injector = arg2 as Injector;
            tyref = injector.get(ReflectiveFactory).create(type, injector);
        }
        return new EndpointFactoryImpl(tyref);
    }

}