import { Abstract } from '@tsdi/ioc';
import { AbstractGuardHandler, TransportEvent, TransportRequest } from '@tsdi/core';


@Abstract()
export abstract class TcpGuardHandler extends AbstractGuardHandler<TransportRequest, TransportEvent> {

}
