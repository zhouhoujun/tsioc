import { Class, Injectable, Injector, OperationInvoker, ReflectiveFactory, ReflectiveRef, Type } from '@tsdi/ioc';
import { Endpoint } from '../Endpoint';
import { getFiltersToken } from '../filters/filter';
import { GuardsEndpoint } from '../endpoints/guards.endpoint';
import { EndpointFactory, EndpointFactoryResolver } from '../endpoints/endpoint.factory';
import { getInterceptorsToken } from '../Interceptor';
import { EndpointOptions, getGuardsToken, setOptions } from '../EndpointService';
import { EndpointContext } from '../endpoints/context';
import { FnEndpoint } from '../endpoints/fn.endpoint';


export class OperationEndpoint<TCtx extends EndpointContext = EndpointContext, TOutput = any> extends GuardsEndpoint<TCtx, TOutput> implements OperationEndpoint<TCtx, TOutput> {

    constructor(
        public readonly invoker: OperationInvoker, private options: EndpointOptions = {}) {
        super(invoker.typeRef.injector,
            getInterceptorsToken(invoker.typeRef.type, invoker.method),
            null!,
            getGuardsToken(invoker.typeRef.type, invoker.method),
            getFiltersToken(invoker.typeRef.type, invoker.method))

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

    create<TArg>(propertyKey: string, options?: EndpointOptions<TArg>): OperationEndpoint {
        const endpoint = new OperationEndpoint(this.typeRef.createInvoker<TArg>(propertyKey, options), options);

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