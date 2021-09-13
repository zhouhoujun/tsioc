import { Abstract } from '@tsdi/ioc';
import { MessageContext } from './ctx';


/**
 * mapping controller result
 */
@Abstract()
export abstract class ResultStrategy {
    /**
     * send result.
     * @param ctx 
     * @param value 
     */
    abstract send(ctx: MessageContext, value: any): Promise<void>;
}
