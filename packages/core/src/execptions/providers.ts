import { EMPTY, Injectable, isNumber, OperationInvoker, ProviderType, Type } from '@tsdi/ioc';
import { ExecptionHandlerMethodResolver } from './resolver';


@Injectable()
export class DefaultExecptionHandlerMethodResolver extends ExecptionHandlerMethodResolver {
    private maps = new Map<Type, OperationInvoker[]>();

    resolve(execption: Type<Error>): OperationInvoker[] {
        return this.maps.get(execption) ?? EMPTY;
    }
    addHandle(execption: Type<Error>, methodInvoker: OperationInvoker, order?: number): void {
        let hds = this.maps.get(execption);
        if (isNumber(order)) {
            methodInvoker.order = order;
        }
        if (!hds) {
            hds = [methodInvoker];
        } else {
            hds.push(methodInvoker);
        }
    }
}


export const EXECPTION_PROVIDERS: ProviderType[] = [
    { provide: ExecptionHandlerMethodResolver, useClass: DefaultExecptionHandlerMethodResolver }
]

