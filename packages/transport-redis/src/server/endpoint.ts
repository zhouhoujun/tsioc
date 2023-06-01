import { AssetContext, MiddlewareEndpoint, Outgoing } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class RedisEndpoint extends MiddlewareEndpoint<AssetContext, Outgoing> {

}
