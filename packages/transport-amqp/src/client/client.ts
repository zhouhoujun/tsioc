import { ExecptionFilter, Interceptor } from '@tsdi/core';
import { Abstract, Injectable, Nullable, tokenId } from '@tsdi/ioc';
import { TransportClient, TransportClientOpts, TransportEvent, TransportRequest } from '@tsdi/transport';
import * as amqp from 'amqplib';


@Abstract()
export abstract class AmqpClientOpts extends TransportClientOpts {
    connectOpts?: amqp.Options.Connect;
}

/**
 * Amqp client interceptors.
 */
export const AMQP_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('AMQP_INTERCEPTORS');

/**
 * Amqp client interceptors.
 */
export const AMQP_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('AMQP_EXECPTIONFILTERS');


const defaults = {
    encoding: 'utf8',
    interceptorsToken: AMQP_INTERCEPTORS,
    execptionsToken: AMQP_EXECPTIONFILTERS,
} as AmqpClientOpts


@Injectable()
export class AmqpClient extends TransportClient {
    constructor(@Nullable() options: any) {
        super(options)
    }

    protected override getDefaultOptions(): AmqpClientOpts {
        return defaults;
    }

}

