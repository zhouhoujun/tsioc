import { Class, Injectable, Injector, OperationInvoker, ReflectiveFactory, ReflectiveRef, Token, Type } from '@tsdi/ioc';
import { CanActivate } from '../guard';
import { Endpoint } from '../Endpoint';
import { Filter, getFiltersToken } from '../filters/filter';
import { FilterEndpoint } from '../filters/endpoint';
import { EndpointFactory, EndpointFactoryResolver } from '../filters/endpoint.factory';
import { getInterceptorsToken, Interceptor } from '../Interceptor';
import { EndpointOptions, getGuardsToken, setOptions } from '../EndpointService';
import { EndpointContext } from '../endpoints/context';
import { FnEndpoint } from '../endpoints/fn.endpoint';


export class OperationEndpoint<TCtx extends EndpointContext = EndpointContext, TOutput = any> extends FilterEndpoint<TCtx, TOutput> {

    constructor(injector: Injector,
        token: Token<Interceptor<TCtx, TOutput>[]>,
        private invoker: OperationInvoker,
        guardsToken: Token<CanActivate[]>,
        filterToken?: Token<Filter<TCtx, TOutput>[]>) {
        super(injector, token, null!, guardsToken, filterToken)
    }

    protected override getBackend(): Endpoint<TCtx, TOutput> {
        return new FnEndpoint((ctx) => this.invoker.invoke(ctx))
    }

}

@Injectable()
export class EndpointFactoryImpl<T = any> extends EndpointFactory<T> {

    constructor(readonly typeRef: ReflectiveRef<T>) {
        super()
    }

    create<TArg>(propertyKey: string, options: EndpointOptions<TArg>): Endpoint<any, any> {
        const endpoint = new OperationEndpoint(this.typeRef.injector,
            getInterceptorsToken(this.typeRef.type, propertyKey),
            this.typeRef.createInvoker(propertyKey),
            getGuardsToken(this.typeRef.type, propertyKey),
            getFiltersToken(this.typeRef.type, propertyKey));

        setOptions(endpoint, options);
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
    resolve<T>(type: ReflectiveRef<T>, categare?: 'event' | 'filter' | 'runnable' | 'route'): EndpointFactory<T>;
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    resolve<T>(type: Type<T> | Class<T>, injector: Injector, categare?: 'event' | 'filter' | 'runnable' | 'route'): EndpointFactory<T>;
    resolve<T>(type: Type<T> | Class<T> | ReflectiveRef<T>, arg2: any, categare?: 'event' | 'filter' | 'route'): EndpointFactory<T> {
        let tyref: ReflectiveRef<T>;
        if (type instanceof ReflectiveRef) {
            tyref = type;
            categare = arg2;
        } else {
            const injector = arg2 as Injector;
            tyref = injector.get(ReflectiveFactory).create(type, injector);
        }

        // switch (categare) {
        //     case 'event':
        //         break;

        //     case 'filter':
        //         break;

        //     case 'route':
        //         break;

        //     default:
        //         break;
        // }
        return new EndpointFactoryImpl(tyref);
    }

}