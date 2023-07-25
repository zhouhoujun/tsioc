import { Abstract } from '@tsdi/ioc';
import { ConfigableHandler } from '@tsdi/core';
import { TransportEvent, TransportRequest } from '@tsdi/common';


/**
 * Coap handler.
 */
@Abstract()
export abstract class CoapHandler extends ConfigableHandler<TransportRequest, TransportEvent> {

}
