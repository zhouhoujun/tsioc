import { Outgoing, TransportEndpoint, TransportContext } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class TcpMicroServiceEndpoint extends TransportEndpoint<TransportContext, Outgoing> {

}
