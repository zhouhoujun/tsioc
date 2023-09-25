import { Abstract } from '@tsdi/ioc';
import { ConfigableHandler } from '@tsdi/core';
import { TransportRequest, TransportEvent, RequestPacket, ResponsePacket } from '@tsdi/common';


@Abstract()
export abstract class MicroClientHandler extends ConfigableHandler<RequestPacket, ResponsePacket> {

}


@Abstract()
export abstract class ClientHandler extends ConfigableHandler<TransportRequest, TransportEvent> {

}
