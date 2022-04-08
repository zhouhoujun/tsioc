import { Abstract, OperationInvoker, Type } from '@tsdi/ioc';


/**
 * execption handler method resolver.
 */
@Abstract()
export abstract class ExecptionHandlerMethodResolver {
    abstract resolve(execption: Type<Error>): OperationInvoker[];
    abstract addHandle(execption: Type<Error>, methodInvoker: OperationInvoker, order?: number): void;
}
