import { Abstract } from '@tsdi/ioc';
import { TransportContext, TransportEndpoint } from '@tsdi/endpoints';

@Abstract()
export abstract class MqttEndpoint extends TransportEndpoint<TransportContext> {
    
}
