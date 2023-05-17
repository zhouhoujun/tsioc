import { Outgoing, AssetEndpoint } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { AmqpContext } from './context';

@Abstract()
export abstract class AmqpEndpoint extends AssetEndpoint<AmqpContext, Outgoing> {

}
