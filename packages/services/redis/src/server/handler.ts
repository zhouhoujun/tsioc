import { Abstract } from '@tsdi/ioc';
import { AbstractRequestHandler, RequestContext } from '@tsdi/endpoints';
import { RedisServerOpts } from './options';

@Abstract()
export abstract class RedisRequestHandler extends AbstractRequestHandler<RequestContext, RedisServerOpts> {

}
