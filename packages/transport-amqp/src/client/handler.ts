import { Abstract } from '@tsdi/ioc';
import { ConfigableHandler } from '@tsdi/core';
import { TransportRequest, TransportEvent } from '@tsdi/common';


/**
 * Amqp handler.
 */
@Abstract()
export abstract class AmqpHandler extends ConfigableHandler<TransportRequest, TransportEvent> {

}
