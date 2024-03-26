import { Abstract } from '@tsdi/ioc';
import { EndpointHandler, RequestContext } from '@tsdi/endpoints';
import { WsServerOpts } from './options';

/**
 * ws endpoint handler.
 */
@Abstract()
export abstract class WsEndpointHandler extends EndpointHandler<RequestContext, WsServerOpts> {

}
