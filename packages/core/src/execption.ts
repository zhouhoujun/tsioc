import { InvocationContext } from '@tsdi/ioc';


export interface ExecptionFilter<T extends Error = Error> {
    /**
     * handle execption.
     * @param ctx 
     * @param execption 
     */
    handle(ctx: InvocationContext, execption: T): any;
}
