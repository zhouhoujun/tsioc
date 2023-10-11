import { TransportEvent, TransportRequest } from '@tsdi/common';
import { ConfigableHandler } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';


@Abstract()
export abstract class KafkaHandler extends ConfigableHandler<TransportRequest, TransportEvent> {

}
