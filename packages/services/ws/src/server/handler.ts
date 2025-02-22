import { Abstract } from '@tsdi/ioc';
import { AbstractRequestHandler, RequestContext } from '@tsdi/endpoints';
import { WsServConfig } from './options';

/**
 * ws request handler.
 */
@Abstract()
export abstract class WsRequestHandler extends AbstractRequestHandler<RequestContext, WsServConfig> {

}
