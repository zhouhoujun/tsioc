import { Abstract } from '@tsdi/ioc';
import { ConfigableHandler } from '@tsdi/core';
import { TransportRequest, TransportEvent } from '@tsdi/common';


/**
 * WS handler.
 */
@Abstract()
export abstract class WsHandler extends ConfigableHandler<TransportRequest, TransportEvent> {

}
