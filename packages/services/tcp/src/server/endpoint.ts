import { Abstract } from '@tsdi/ioc';
import { TransportEndpoint, TransportContext } from '@tsdi/endpoints';


@Abstract()
export abstract class TcpEndpoint extends TransportEndpoint<TransportContext> {

}

