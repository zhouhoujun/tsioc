import { Abstract } from '@tsdi/ioc';
import { AbstractGuardHandler } from '@tsdi/core';
import { TransportRequest, TransportEvent } from '@tsdi/common';


@Abstract()
export abstract class TcpHandler extends AbstractGuardHandler<TransportRequest, TransportEvent> {

}
