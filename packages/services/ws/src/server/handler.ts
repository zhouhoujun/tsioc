import { Abstract } from '@tsdi/ioc';
import { EndpointHandler, RequestContext } from '@tsdi/endpoints';

/**
 * ws endpoint handler.
 */
@Abstract()
export abstract class WsEndpointHandler extends EndpointHandler<RequestContext> {

}
