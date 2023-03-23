import { Class, Injectable, Injector, OperationInvoker, ReflectiveFactory, ReflectiveRef, Token, Type } from '@tsdi/ioc';
import { Endpoint, FnEndpoint } from '../Endpoint';
import { Filter, getFiltersToken } from '../filters/filter';
import { FilterEndpoint } from '../filters/endpoint';
import { EndpointFactory, EndpointFactoryResolver } from '../filters/endpoint.factory';
import { CanActivate } from '../guard';
import { getInterceptorsToken, Interceptor } from '../Interceptor';
import { EndpointOptions, getGuardsToken, setOptions } from '../EndpointService';


export class OperationEndpoint<TInput = any, TOutput = any> extends FilterEndpoint<TInput, TOutput> {

    constructor(injector: Injector,
        token: Token<Interceptor<TInput, TOutput>[]>,
        private invoker: OperationInvoker,
        filterToken: Token<Filter<TInput, TOutput>[]>,
        guardsToken: Token<CanActivate[]>) {
        super(injector, token, null!, filterToken, guardsToken)
    }

    protected override getBackend(): Endpoint<TInput, TOutput> {
        return new FnEndpoint((input, ctx) => this.invoker.invoke(ctx))
    }

}

@Injectable()
export class EndpointFactoryImpl<T = any> extends EndpointFactory<T> {

    constructor(readonly typeRef: ReflectiveRef<T>) {
        super()
    }

    create(propertyKey: string, options: EndpointOptions): Endpoint<any, any> {
        const endpoint = new OperationEndpoint(this.typeRef.injector,
            getInterceptorsToken(this.typeRef.type, propertyKey),
            this.typeRef.createInvoker(propertyKey),
            getFiltersToken(this.typeRef.type, propertyKey),
            getGuardsToken(this.typeRef.type, propertyKey));
        
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