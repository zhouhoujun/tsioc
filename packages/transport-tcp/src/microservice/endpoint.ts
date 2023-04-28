import { Outgoing, ConfigableEndpoint, EndpointContext } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class TcpMicroServiceEndpoint extends ConfigableEndpoint<EndpointContext, Outgoing> {

}
