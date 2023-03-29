import { Class, EMPTY, Injectable, Injector, OperationInvoker, ReflectiveFactory, ReflectiveRef, Type } from '@tsdi/ioc';
import { CanActivate } from '../guard';
import { getInterceptorsToken, Interceptor } from '../Interceptor';
import { EndpointContext } from '../endpoints/context';
import { getGuardsToken, setOptions } from '../EndpointService';
import { Filter, getFiltersToken } from '../filters/filter';
import { RouteEndpoint, RouteEndpointFactory, RouteEndpointFactoryResolver, RouteEndpointOptions } from '../transport/route.endpoint';
import { OperationEndpointImpl } from './operation.endpoint';


export class RouteEndpointImpl<TCtx extends EndpointContext = EndpointContext, TOutput = any> extends OperationEndpointImpl<TCtx, TOutput> implements RouteEndpoint {

    private _prefix: string;
    constructor(invoker: OperationInvoker, options: RouteEndpointOptions = {}) {
        super(invoker, options);
        this._prefix = options.prefix || '';
    }

    get prefix(): string {
        return this._prefix;
    }

    protected override getInterceptors(): Interceptor<TCtx, TOutput>[] {
        const prefixIns = this.prefix ? this.injector.get(getInterceptorsToken(this.prefix), null) : null;
        const routeIns = this.injector.get(this.token, EMPTY);
        return prefixIns ? [...prefixIns, ...routeIns] : routeIns;
    }

    protected override getGuards(): CanActivate[] | null {
        const prefixGuards = this.prefix ? this.injector.get(getGuardsToken(this.prefix), null) : null;
        const routeGuards = this.guardsToken ? this.injector.get(this.guardsToken, null) : null;
        return prefixGuards ? [...prefixGuards, ...routeGuards ?? EMPTY] : routeGuards;
    }

    protected override getFilters(): Filter<TCtx, TOutput>[] {
        const prefixFilters = this.prefix ? this.injector.get(getFiltersToken(this.prefix), null) : null;
        const routeFilters = this.filtersToken ? this.injector.get(this.filtersToken, EMPTY) : EMPTY;
        return prefixFilters ? [...prefixFilters, ...routeFilters] : routeFilters;
    }
}


@Injectable()
export class RouteEndpointFactoryImpl<T = any> extends RouteEndpointFactory<T> {

    constructor(readonly typeRef: ReflectiveRef<T>) {
        super()
    }

    create<TArg>(propertyKey: string, options?: RouteEndpointOptions<TArg>): RouteEndpoint {
        const endpoint = new RouteEndpointImpl(this.typeRef.createInvoker<TArg>(propertyKey, options), options);

        options && setOptions(endpoint, options);

        return endpoint;
    }

}

/**
 * Route factory resolver implements
 */
export class RouteEndpointFactoryResolverImpl extends RouteEndpointFactoryResolver {
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    resolve<T>(type: ReflectiveRef<T>): RouteEndpointFactory<T>;
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    resolve<T>(type: Type<T> | Class<T>, injector: Injector): RouteEndpointFactory<T>;
    resolve<T>(type: Type<T> | Class<T> | ReflectiveRef<T>, arg2?: any): RouteEndpointFactory<T> {
        let tyref: ReflectiveRef<T>;
        if (type instanceof ReflectiveRef) {
            tyref = type;
        } else {
            const injector = arg2 as Injector;
            tyref = injector.get(ReflectiveFactory).create(type, injector);
        }
        return new RouteEndpointFactoryImpl(tyref);
    }

}
