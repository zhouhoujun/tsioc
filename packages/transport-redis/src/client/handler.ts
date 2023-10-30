import { Abstract } from '@tsdi/ioc';
import { ConfigableHandler } from '@tsdi/core';
import { TransportRequest, TransportEvent } from '@tsdi/common';


/**
 * Redis handler.
 */
@Abstract()
export abstract class RedisHandler extends ConfigableHandler<TransportRequest, TransportEvent> {

}
