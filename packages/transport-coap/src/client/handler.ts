import { Abstract } from '@tsdi/ioc';
import { ConfigableHandler, TransportEvent, TransportRequest } from '@tsdi/core';


/**
 * Coap handler.
 */
@Abstract()
export abstract class CoapHandler extends ConfigableHandler<TransportRequest, TransportEvent> {

}
