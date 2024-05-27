import { Abstract, tokenId } from '@tsdi/ioc';
import { ConfigableHandler, Interceptor } from '@tsdi/core';
import { ResponseEvent, AbstractRequest } from '@tsdi/common';
import { ClientOpts } from './options';


/**
 * Client Handler
 */
@Abstract()
export abstract class ClientHandler<TRequest extends AbstractRequest = AbstractRequest, TResponse extends ResponseEvent = ResponseEvent, TOptions extends ClientOpts = ClientOpts> extends ConfigableHandler<TRequest, TResponse, TOptions> {

}

/**
 * global client interceptors
 */
export const GLOBAL_CLIENT_INTERCEPTORS = tokenId<Interceptor<AbstractRequest, ResponseEvent>[]>('GLOBAL_CLIENT_INTERCEPTORS');
