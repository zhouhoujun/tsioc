import { Module, EMPTY, getClass, Injectable, isFunction, isString, lang, ProviderType, Type, ArgumentExecption } from '@tsdi/ioc';
import { Endpoint } from '../Endpoint';
import { ExecptionHandlerBackend } from './execption.filter';
import { FilterHandlerResolver, InOutInterceptorFilter } from './filter';

/**
 * endpoint hanlders resolver.
 */
@Injectable()
export class DefaultEndpointHandlerMethodResolver extends FilterHandlerResolver {
    private maps = new Map<Type | string, Endpoint[]>();

    resolve<T>(filter: Type<T> | T | string): Endpoint[] {
        return this.maps.get(isString(filter) ? filter : (isFunction(filter) ? filter : getClass(filter))) ?? EMPTY
    }

    addHandle(filter: Type | string, endpoint: Endpoint, order?: number): this {
        if (!endpoint) {
            throw new ArgumentExecption('endpoint missing');
        }
        let hds = this.maps.get(filter);
        if (!hds) {
            hds = [endpoint];
            this.maps.set(filter, hds)
        } else if (!hds.some(h => h && h.equals(endpoint))) {
            hds.push(endpoint)
        }
        return this
    }

    removeHandle(filter: Type | string, endpoint: Endpoint): this {
        const hds = this.maps.get(filter);
        if (hds) lang.remove(hds, endpoint);
        return this
    }
}


/**
 * filter providers.
 */
export const FILTER_PROVIDERS: ProviderType[] = [
    // PathHanlderFilter,
    // StatusInterceptorFilter,
    ExecptionHandlerBackend,
    InOutInterceptorFilter,
    { provide: FilterHandlerResolver, useClass: DefaultEndpointHandlerMethodResolver, static: true }
]

@Module({
    providers: [
        ...FILTER_PROVIDERS
    ]
})
export class FilterMoudle {

}