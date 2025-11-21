import { Abstract, Context } from '@tsdi/ioc';
import { AbstractConfigableHandler } from '@tsdi/core';
import { ResponseEvent, AbstractRequest } from '@tsdi/common';
import { ClientConfig } from './options';


/**
 * Client Handler
 */
@Abstract()
export abstract class ClientHandler<TRequest extends AbstractRequest<any> = AbstractRequest<any>, TResponse extends ResponseEvent<any> = ResponseEvent<any>, TOptions extends ClientConfig = ClientConfig> extends AbstractConfigableHandler<TRequest, TResponse, TOptions, Context|undefined> {

}

