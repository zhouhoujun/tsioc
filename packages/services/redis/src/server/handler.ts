import { Abstract } from '@tsdi/ioc';
import { EndpointHandler, RequestContext } from '@tsdi/endpoints';
import { RedisServerOpts } from './options';

@Abstract()
export abstract class RedisEndpointHandler extends EndpointHandler<RequestContext, RedisServerOpts> {

}
