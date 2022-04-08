import { Injectable, OperationInvoker, ProviderType, Type } from '@tsdi/ioc';
import { ExecptionHandlerMethodResolver } from './resolver';


@Injectable()
export class DefaultExecptionHandlerMethodResolver extends ExecptionHandlerMethodResolver {
    resolve(execption: Type<Error>): OperationInvoker[] {
        throw new Error('Method not implemented.');
    }
    addHandle(execption: Type<Error>, methodInvoker: OperationInvoker, order?: number): void {
        throw new Error('Method not implemented.');
    }

}


export const EXECPTION_PROVIDERS: ProviderType[] = [
    { provide: ExecptionHandlerMethodResolver, useClass: DefaultExecptionHandlerMethodResolver }
]

