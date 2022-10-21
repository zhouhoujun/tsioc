import { EMPTY, getClass, Injectable, isFunction, isNumber, isString, lang, OperationInvoker, ProviderType, Type } from '@tsdi/ioc';
import { Module } from '../metadata/decor';
import { EndpointHandlerMethodResolver } from './filter';


@Injectable()
export class DefaultRespondHandlerMethodResolver extends EndpointHandlerMethodResolver {
    private maps = new Map<Type | string, OperationInvoker[]>();

    resolve<T>(filter: Type<T> | T | string): OperationInvoker[] {
        return this.maps.get(isString(filter) ? filter : (isFunction(filter) ? filter : getClass(filter))) ?? EMPTY
    }

    addHandle(filter: Type | string, methodInvoker: OperationInvoker, order?: number): this {
        let hds = this.maps.get(filter);
        if (isNumber(order)) {
            methodInvoker.order = order
        }
        if (!hds) {
            hds = [methodInvoker];
            this.maps.set(filter, hds)
        } else if (!hds.some(h => h.descriptor === methodInvoker.descriptor)) {
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


export const RESPOND_PROVIDERS: ProviderType[] = [
    { provide: EndpointHandlerMethodResolver, useClass: DefaultRespondHandlerMethodResolver, static: true }
]

@Module({
    providers: [
        ...RESPOND_PROVIDERS
    ]
})
export class FilterMoudle {

}