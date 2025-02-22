import { Abstract } from '@tsdi/ioc';
import { AbstractRequestHandler, RequestContext } from '@tsdi/endpoints';
import { RedisServConfig } from './options';

@Abstract()
export abstract class RedisRequestHandler extends AbstractRequestHandler<RequestContext, RedisServConfig> {

}
