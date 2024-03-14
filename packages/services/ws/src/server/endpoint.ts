import { Abstract } from '@tsdi/ioc';
import { EndpointHandler, TransportContext } from '@tsdi/endpoints';

/**
 * ws endpoint.
 */
@Abstract()
export abstract class WsEndpoint extends EndpointHandler<TransportContext> {

}
