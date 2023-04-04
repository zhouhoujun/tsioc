import { Class, Injectable, Injector, OperationInvoker, ReflectiveFactory, ReflectiveRef, Type, isFunction, isObservable, isPromise, isString } from '@tsdi/ioc';
import { Backend } from '../Handler';
import { getInterceptorsToken } from '../Interceptor';
import { getFiltersToken } from '../filters/filter';
import { EndpointContext } from '../endpoints/context';
import { FnHandler } from '../handlers/handler';
import { GuardHandler } from '../handlers/guards';
import { EndpointOptions, Respond, TypedRespond, getGuardsToken, setOptions } from '../endpoints/endpoint.service';
import { EndpointFactory, EndpointFactoryResolver, OperationEndpoint } from '../endpoints/endpoint.factory';
import { mergeMap } from 'rxjs';


export class OperationEndpointImpl<TCtx extends EndpointContext = EndpointContext, TOutput = any> extends GuardHandler<TCtx, TOutput> implements OperationEndpointImpl<TCtx, TOutput> {

    constructor(
        public readonly invoker: OperationInvoker, private options: EndpointOptions = {}) {
        super(invoker.typeRef.injector,
            getInterceptorsToken(invoker.typeRef.type, invoker.method),
            null!,
            getGuardsToken(invoker.typeRef.type, invoker.method),
            getFiltersToken(invoker.typeRef.type, invoker.method))
        invoker.typeRef.onDestroy(this);

    }

    protected override getBackend(): Backend<TCtx, TOutput> {
        return new FnHandler(this.respond.bind(this));
    }

    /**
     * before `OperationInvoker` invoke 
     * @param ctx 
     */
    protected beforeInvoke(ctx: TCtx): void { }

    /**
     * respond.
     * @param ctx 
     * @returns 
     */
    protected respond(ctx: TCtx) {
        this.beforeInvoke(ctx);
        const res = this.invoker.invoke(ctx);
        if (!this.options.response) return res;

        if (isPromise(res)) {
            return res.then(r => this.respondAs(ctx, r))
        } else if (isObservable(res)) {
            return res.pipe(
                mergeMap(r => this.respondAs(ctx, r))
            )
        } else {
            return this.respondAs(ctx, res);
        }
    }

    /**
     * respond as
     * @param ctx 
     * @param res 
     * @returns 
     */
    protected respondAs(ctx: TCtx, res: any): Promise<TOutput> {
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
        }
        return res;
    }

}

@Injectable()
export class EndpointFactoryImpl<T = any> extends EndpointFactory<T> {

    constructor(readonly typeRef: ReflectiveRef<T>) {
        super()
    }

    create<TArg>(propertyKey: string, options?: EndpointOptions<TArg>): OperationEndpoint {
        const endpoint = new OperationEndpointImpl(this.typeRef.createInvoker<TArg>(propertyKey, options), options);

        options && setOptions(endpoint, options);

        return endpoint;
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