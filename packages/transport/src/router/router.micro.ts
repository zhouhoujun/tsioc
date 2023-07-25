import { Abstract, tokenId } from '@tsdi/ioc';
import { Protocol } from '@tsdi/common';
import { Endpoint } from '@tsdi/core';
import { Router } from './router';

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
