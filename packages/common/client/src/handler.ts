import { Abstract } from '@tsdi/ioc';
import { ConfigableHandler } from '@tsdi/core';
import { TransportRequest, TransportEvent } from '@tsdi/common';



@Abstract()
export abstract class ClientHandler extends ConfigableHandler<TransportRequest, TransportEvent> {

}
