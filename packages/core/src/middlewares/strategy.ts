import { Abstract } from '@tsdi/ioc';
import { Context } from './ctx';


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
    abstract send(ctx: Context, value: any): Promise<void>;
}
