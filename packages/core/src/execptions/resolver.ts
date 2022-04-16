import { Abstract, OperationInvoker, Type } from '@tsdi/ioc';


/**
 * execption handler method resolver.
 */
@Abstract()
export abstract class ExecptionHandlerMethodResolver {
    /**
     * resolve execption hanlde.
     * @param execption 
     */
    abstract resolve(execption: Type<Error>): OperationInvoker[];
    /**
     * add execption handle.
     * @param execption execption type
     * @param methodInvoker execption handle invoker.
     * @param order order.
     */
    abstract addHandle(execption: Type<Error>, methodInvoker: OperationInvoker, order?: number): this;
    /**
     * remove execption handle.
     * @param execption execption type.
     * @param methodInvoker execption handle.
     */
    abstract removeHandle(execption: Type<Error>, methodInvoker: OperationInvoker): this;
}
