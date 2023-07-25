import { Abstract } from '@tsdi/ioc';
import { AbstractGuardHandler } from '@tsdi/core';
import { TransportEvent, TransportRequest } from '@tsdi/common';


@Abstract()
export abstract class NatsHandler extends AbstractGuardHandler<TransportRequest, TransportEvent> {

}
