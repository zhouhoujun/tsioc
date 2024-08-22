import { Abstract, tokenId } from '@tsdi/ioc';
import { Transport } from '@tsdi/common';
import { Router } from './router';
import { RequestHandler } from '../RequestHandler';

/**
 * microservice router
 * 
 * public api for microservice router
 */
@Abstract()
export abstract class MicroRouter<T extends RequestHandler = RequestHandler> extends Router<T> {
    /**
     * protocol
     */
    abstract get protocol(): Transport;
}


/**
 * microservice message routers.
 */
export const MESSAGE_ROUTERS = tokenId<MicroRouter[]>('MESSAGE_ROUTERS');


/**
 * microservice routers.
 * 
 * public api for all microservice routers
 */
@Abstract()
export abstract class MicroRouters {
    /**
     * get microservice router
     */
    abstract get(protocol?: Transport): MicroRouter;
}
