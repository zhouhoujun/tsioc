import { Outgoing, AssetEndpoint } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { NatsContext } from './context';

@Abstract()
export abstract class NatsEndpoint extends AssetEndpoint<NatsContext, Outgoing> {

}
