import { Abstract } from '@tsdi/ioc';
import { TransportEndpoint, TransportContext } from '@tsdi/endpoints';
import { Outgoing } from '@tsdi/common';

@Abstract()
export abstract class WsEndpoint extends TransportEndpoint<TransportContext, Outgoing> {

}
