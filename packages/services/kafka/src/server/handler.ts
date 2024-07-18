import { Abstract } from '@tsdi/ioc';
import { AbstractRequestHandler, RequestContext } from '@tsdi/endpoints';
import { KafkaServerOptions } from './options';



@Abstract()
export abstract class KafkaRequestHandler extends AbstractRequestHandler<RequestContext, KafkaServerOptions> {

}
