import { EMPTY, getClass, Injectable, isFunction, isNumber, lang, OperationInvoker, ProviderType, Type } from '@tsdi/ioc';
import { ExecptionHandlerMethodResolver } from './resolver';


@Injectable()
export class DefaultExecptionHandlerMethodResolver extends ExecptionHandlerMethodResolver {
    private maps = new Map<Type, OperationInvoker[]>();

    resolve(execption: Type<Error> | Error): OperationInvoker[] {
        return this.maps.get(isFunction(execption) ? execption : getClass(execption)) ?? EMPTY;
    }

    addHandle(execption: Type<Error>, methodInvoker: OperationInvoker, order?: number): this {
        let hds = this.maps.get(execption);
        if (isNumber(order)) {
            methodInvoker.order = order;
        }
        if (!hds) {
            hds = [methodInvoker];
            this.maps.set(execption, hds);
        } else if (!hds.some(h => h.descriptor === methodInvoker.descriptor)) {
            hds.push(methodInvoker);
        }
        return this;
    }

    removeHandle(execption: Type<Error>, methodInvoker: OperationInvoker): this {
        const hds = this.maps.get(execption);
        if (hds) lang.remove(hds, methodInvoker);
        return this;
    }
}


export const EXECPTION_PROVIDERS: ProviderType[] = [
    { provide: ExecptionHandlerMethodResolver, useClass: DefaultExecptionHandlerMethodResolver, static: true }
]

