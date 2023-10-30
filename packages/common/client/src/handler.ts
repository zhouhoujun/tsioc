import { Abstract, tokenId } from '@tsdi/ioc';
import { ConfigableHandler, Interceptor } from '@tsdi/core';
import { TransportRequest, TransportEvent } from '@tsdi/common';



@Abstract()
export abstract class ClientHandler extends ConfigableHandler<TransportRequest, TransportEvent> {

}

/**
 * global client interceptors
 */
export const GLOBAL_CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('GLOBAL_CLIENT_INTERCEPTORS');
