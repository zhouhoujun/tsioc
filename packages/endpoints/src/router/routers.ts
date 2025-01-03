import { Abstract, tokenId } from '@tsdi/ioc';
import { Protocols } from '@tsdi/common';
import { HybridRouter } from './router.hybrid';

/**
 *  service routers.
 */
export const ROUTERS = tokenId<HybridRouter[]>('ROUTERS');


/**
 * routers.
 * 
 * public api for all service routers
 */
@Abstract()
export abstract class Routers {
    /**
     * get service router
     */
    abstract get(protocol?: Protocols): HybridRouter;
}
