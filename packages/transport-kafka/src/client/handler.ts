import { ConfigableHandler, TransportEvent, TransportRequest } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';


@Abstract()
export abstract class KafkaHandler extends ConfigableHandler<TransportRequest, TransportEvent> {

}
