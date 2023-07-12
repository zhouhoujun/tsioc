import { Outgoing, TransportEndpoint } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { TcpContext } from './context';

@Abstract()
export abstract class TcpMicroEndpoint extends TransportEndpoint<TcpContext, Outgoing> {

}


@Abstract()
export abstract class TcpEndpoint extends TransportEndpoint<TcpContext, Outgoing> {

}
