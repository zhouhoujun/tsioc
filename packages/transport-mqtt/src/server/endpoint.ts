import { Abstract } from '@tsdi/ioc';
import { Outgoing, TransportEndpoint } from '@tsdi/transport';
import { MqttContext } from './context';

@Abstract()
export abstract class MqttEndpoint extends TransportEndpoint<MqttContext, Outgoing> {
    
}
