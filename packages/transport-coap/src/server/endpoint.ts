import { AssetContext, AssetEndpoint, Outgoing } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class CoapEndpoint extends AssetEndpoint<AssetContext, Outgoing> {

}
