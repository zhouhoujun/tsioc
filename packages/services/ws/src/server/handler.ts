import { Abstract } from '@tsdi/ioc';
import { AbstractRequestHandler, RequestContext } from '@tsdi/endpoints';
import { WsServerOpts } from './options';

/**
 * ws request handler.
 */
@Abstract()
export abstract class WsRequestHandler extends AbstractRequestHandler<RequestContext, WsServerOpts> {

}
