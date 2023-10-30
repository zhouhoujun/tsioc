import { Abstract } from '@tsdi/ioc';
import { TransportEndpoint, TransportContext } from '@tsdi/endpoints';

/**
 * ws endpoint.
 */
@Abstract()
export abstract class WsEndpoint extends TransportEndpoint<TransportContext> {

}
