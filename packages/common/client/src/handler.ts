import { Abstract } from '@tsdi/ioc';
import { AbstractConfigableHandler } from '@tsdi/core';
import { ResponseEvent, AbstractRequest } from '@tsdi/common';
import { ClientOpts } from './options';


/**
 * Client Handler
 */
@Abstract()
export abstract class ClientHandler<TRequest extends AbstractRequest<any> = AbstractRequest<any>, TResponse extends ResponseEvent<any> = ResponseEvent<any>, TOptions extends ClientOpts = ClientOpts> extends AbstractConfigableHandler<TRequest, TResponse, TOptions> {

}

