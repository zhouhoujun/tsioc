import { AssetContext, Outgoing, TransportEndpoint } from '@tsdi/transport';
import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class CoapMicroEndpoint extends TransportEndpoint<AssetContext, Outgoing> {

}

@Abstract()
export abstract class CoapEndpoint extends TransportEndpoint<AssetContext, Outgoing> {

}
