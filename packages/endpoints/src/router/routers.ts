import { Abstract, tokenId } from '@tsdi/ioc';
import { Transport } from '@tsdi/common';
import { RequestHandler } from '../RequestHandler';
import { Router } from './router';

/**
 * Protocol router
 * 
 * public api for protocol router
 */
@Abstract()
export abstract class ProtocolRouter<T = RequestHandler> extends Router<T> {
    /**
     * protocol
     */
    abstract get protocol(): Transport;
}


/**
 * message routers.
 */
export const MESSAGE_ROUTERS = tokenId<ProtocolRouter[]>('MESSAGE_ROUTERS');


/**
 * protocol routers.
 * 
 * public api for all routers
 */
@Abstract()
export abstract class ProtocolRouters {
    /**
     * get protocol router
     */
    abstract get<T = RequestHandler>(protocol?: Transport): ProtocolRouter<T>;
}
