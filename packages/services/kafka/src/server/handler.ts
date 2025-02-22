import { Abstract } from '@tsdi/ioc';
import { AbstractRequestHandler, RequestContext } from '@tsdi/endpoints';
import { KafkaServConfig } from './options';



@Abstract()
export abstract class KafkaRequestHandler extends AbstractRequestHandler<RequestContext, KafkaServConfig> {

}
