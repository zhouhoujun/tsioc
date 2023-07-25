import { Abstract } from '@tsdi/ioc';
import { ConfigableHandler } from '@tsdi/core';
import { TransportRequest, TransportEvent } from '@tsdi/common';


/**
 * UDP handler.
 */
@Abstract()
export abstract class UdpHandler extends ConfigableHandler<TransportRequest, TransportEvent> {

}
