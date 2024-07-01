import { Abstract } from '@tsdi/ioc';
import { ConfigableHandler } from '@tsdi/core';
import { ResponseEvent, AbstractRequest } from '@tsdi/common';
import { ClientOpts } from './options';


/**
 * Client Handler
 */
@Abstract()
export abstract class ClientHandler<TRequest extends AbstractRequest<any> = AbstractRequest<any>, TResponse extends ResponseEvent<any> = ResponseEvent<any>, TOptions extends ClientOpts = ClientOpts> extends ConfigableHandler<TRequest, TResponse, TOptions> {

}

