import { Abstract } from '@tsdi/ioc';
import { StreamTransportStrategy } from '@tsdi/transport';

@Abstract()
export abstract class WsTransportStrategy extends StreamTransportStrategy {

}
