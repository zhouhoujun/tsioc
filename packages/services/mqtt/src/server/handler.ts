import { Abstract } from '@tsdi/ioc';
import { RequestContext, AbstractRequestHandler } from '@tsdi/endpoints';
import { MqttServiceOpts } from './options';

@Abstract()
export abstract class MqttRequestHandler extends AbstractRequestHandler<RequestContext, MqttServiceOpts> {
    
}
