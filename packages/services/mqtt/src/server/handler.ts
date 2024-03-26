import { Abstract } from '@tsdi/ioc';
import { RequestContext, EndpointHandler } from '@tsdi/endpoints';
import { MqttServiceOpts } from './options';

@Abstract()
export abstract class MqttEndpointHandler extends EndpointHandler<RequestContext, MqttServiceOpts> {
    
}
