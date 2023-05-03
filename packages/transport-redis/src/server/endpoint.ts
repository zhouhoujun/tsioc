import { AssetContext, AssetEndpoint, Outgoing } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class RedisEndpoint extends AssetEndpoint<AssetContext, Outgoing> {

}
