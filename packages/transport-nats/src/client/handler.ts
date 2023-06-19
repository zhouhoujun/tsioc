import { Abstract } from '@tsdi/ioc';
import { AbstractGuardHandler, TransportEvent, TransportRequest } from '@tsdi/core';


@Abstract()
export abstract class NatsHandler extends AbstractGuardHandler<TransportRequest, TransportEvent> {

}
