import { Abstract } from '@tsdi/ioc';
import { AbstractGuardHandler, TransportEvent, TransportRequest } from '@tsdi/core';


@Abstract()
export abstract class TcpHandler extends AbstractGuardHandler<TransportRequest, TransportEvent> {

}
