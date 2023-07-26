import { Outgoing, TransportEndpoint, TransportContext } from '@tsdi/transport';
import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class WsEndpoint extends TransportEndpoint<TransportContext, Outgoing> {

}
