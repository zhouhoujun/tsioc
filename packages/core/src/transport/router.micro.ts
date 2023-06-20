import { Abstract, tokenId } from '@tsdi/ioc';
import { Endpoint } from '../endpoints/endpoint';
import { Router } from './router';
import { Protocol } from './protocols';

/**
 * microserivce router
 * 
 * public api for microserivce router
 */
@Abstract()
export abstract class MircoServRouter<T = Endpoint> extends Router<T> {
    /**
     * protocol
     */
    abstract get protocol(): Protocol;
}


/**
 * message routers.
 */
export const MESSAGE_ROUTERS = tokenId<MircoServRouter[]>('MESSAGE_ROUTERS');


/**
 * microserivce routers.
 * 
 * public api for all microserivce routers
 */
@Abstract()
export abstract class MircoServRouters {
    /**
     * get microserivce router
     */
    abstract get<T = Endpoint>(protocol?: Protocol): MircoServRouter<T>;
}
