import { AssetContext, MiddlewareEndpoint, Outgoing } from '@tsdi/transport';
import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class RedisEndpoint extends MiddlewareEndpoint<AssetContext, Outgoing> {

}
