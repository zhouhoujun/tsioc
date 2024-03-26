import { Abstract, tokenId } from '@tsdi/ioc';
import { ConfigableHandler, Interceptor } from '@tsdi/core';
import { TransportRequest, TransportEvent } from '@tsdi/common';


/**
 * Client Handler
 */
@Abstract()
export abstract class ClientHandler<TRequest extends TransportRequest = TransportRequest, TResponse extends TransportEvent = TransportEvent> extends ConfigableHandler<TRequest, TResponse> {

}

/**
 * global client interceptors
 */
export const GLOBAL_CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('GLOBAL_CLIENT_INTERCEPTORS');
