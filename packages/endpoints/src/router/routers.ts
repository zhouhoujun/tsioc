import { Abstract, tokenId } from '@tsdi/ioc';
import { Transport } from '@tsdi/common';
import { RequestHandler } from '../RequestHandler';
import { Router } from './router';

/**
 * microservice router
 * 
 * public api for microservice router
 */
@Abstract()
export abstract class MircoRouter<T = RequestHandler> extends Router<T> {
    /**
     * protocol
     */
    abstract get protocol(): Transport;
}


/**
 * microservice message routers.
 */
export const MESSAGE_ROUTERS = tokenId<MircoRouter[]>('MESSAGE_ROUTERS');


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
    abstract get<T = RequestHandler>(protocol?: Transport): MircoRouter<T>;
}
