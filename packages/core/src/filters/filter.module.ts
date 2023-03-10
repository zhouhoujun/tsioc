import { Module, EMPTY, getClass, Injectable, InvokerLike, isFunction, isNumber, isString, lang, OperationInvoker, ProviderType, Type } from '@tsdi/ioc';
import { ExecptionHandlerBackend } from './execption.filter';
import { FilterHandlerResolver, InOutInterceptorFilter } from './filter';

/**
 * endpoint hanlders resolver.
 */
@Injectable()
export class DefaultEndpointHandlerMethodResolver extends FilterHandlerResolver {
    private maps = new Map<Type | string, InvokerLike[]>();

    resolve<T>(filter: Type<T> | T | string): InvokerLike[] {
        return this.maps.get(isString(filter) ? filter : (isFunction(filter) ? filter : getClass(filter))) ?? EMPTY
    }

    addHandle(filter: Type | string, methodInvoker: InvokerLike, order?: number): this {
        let hds = this.maps.get(filter);
        if (!isFunction(methodInvoker) && isNumber(order)) {
            methodInvoker.order = order
        }
        if (!hds) {
            hds = [methodInvoker];
            this.maps.set(filter, hds)
        } else if (!isFunction(methodInvoker) && !hds.some(h => !isFunction(h) && h.descriptor === methodInvoker.descriptor)) {
            hds.push(methodInvoker)
        }
        return this
    }

    removeHandle(filter: Type | string, methodInvoker: OperationInvoker): this {
        const hds = this.maps.get(filter);
        if (hds) lang.remove(hds, methodInvoker);
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