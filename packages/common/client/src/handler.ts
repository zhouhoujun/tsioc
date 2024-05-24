import { Abstract, tokenId } from '@tsdi/ioc';
import { ConfigableHandler, Interceptor } from '@tsdi/core';
import { TransportEvent, RequestPacket } from '@tsdi/common';
import { ClientOpts } from './options';


/**
 * Client Handler
 */
@Abstract()
export abstract class ClientHandler<TRequest extends RequestPacket = RequestPacket, TResponse extends TransportEvent = TransportEvent, TOptions extends ClientOpts = ClientOpts> extends ConfigableHandler<TRequest, TResponse, TOptions> {

}

/**
 * global client interceptors
 */
export const GLOBAL_CLIENT_INTERCEPTORS = tokenId<Interceptor<RequestPacket, TransportEvent>[]>('GLOBAL_CLIENT_INTERCEPTORS');
