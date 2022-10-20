import { EMPTY, getClass, Injectable, isFunction, isNumber, lang, OperationInvoker, ProviderType, Type } from '@tsdi/ioc';
import { Module } from '../metadata/decor';
import { EndpointHandlerMethodResolver } from './filter';
import { Status } from './status';



@Injectable()
export class DefaultRespondHandlerMethodResolver extends EndpointHandlerMethodResolver {
    private maps = new Map<Type, OperationInvoker[]>();

    resolve(execption: Type<Status> | Status): OperationInvoker[] {
        return this.maps.get(isFunction(execption) ? execption : getClass(execption)) ?? EMPTY
    }

    addHandle(execption: Type<Status>, methodInvoker: OperationInvoker, order?: number): this {
        let hds = this.maps.get(execption);
        if (isNumber(order)) {
            methodInvoker.order = order
        }
        if (!hds) {
            hds = [methodInvoker];
            this.maps.set(execption, hds)
        } else if (!hds.some(h => h.descriptor === methodInvoker.descriptor)) {
            hds.push(methodInvoker)
        }
        return this
    }

    removeHandle(execption: Type<Status>, methodInvoker: OperationInvoker): this {
        const hds = this.maps.get(execption);
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
export class RespondMoudle {

}