import { Abstract } from '@tsdi/ioc';
import { RequestContext, EndpointHandler } from '@tsdi/endpoints';

@Abstract()
export abstract class MqttEndpointHandler extends EndpointHandler<RequestContext> {
    
}
