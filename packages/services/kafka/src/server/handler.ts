import { Abstract } from '@tsdi/ioc';
import { EndpointHandler, RequestContext } from '@tsdi/endpoints';
import { KafkaServerOptions } from './options';



@Abstract()
export abstract class KafkaEndpointHandler extends EndpointHandler<RequestContext, KafkaServerOptions> {

}
