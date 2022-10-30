import { ExecptionFilter, Interceptor, RequestOptions, TransportEvent, TransportRequest } from '@tsdi/core';
import { Abstract, Injectable, Nullable, tokenId } from '@tsdi/ioc';
import { Connection, ConnectionOpts, TransportClient, TransportClientOpts } from '@tsdi/transport';
import * as amqp from 'amqplib';
import { Duplex } from 'stream';
import { from, Observable } from 'rxjs';


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
export class AmqpClient extends TransportClient<RequestOptions, AmqpClientOpts> {

    constructor(@Nullable() options: any) {
        super(options)
    }

    protected override getDefaultOptions(): AmqpClientOpts {
        return defaults;
    }

    protected createDuplex(opts: AmqpClientOpts): Observable<Duplex> {
        return from(amqp.connect(opts.connectOpts!));
    }

    protected createConnection(duplex: Duplex, opts?: ConnectionOpts | undefined): Connection {
        throw new Error('Method not implemented.');
    }
}

