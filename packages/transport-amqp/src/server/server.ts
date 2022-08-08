import { ExecptionFilter, Interceptor } from '@tsdi/core';
import { Abstract, Injectable, tokenId } from '@tsdi/ioc';
import { ProtocolServer, ProtocolServerOpts, ServerRequest, ServerResponse } from '@tsdi/transport';
import * as amqp from 'amqplib';

export type amqpURL = string | amqp.Options.Connect;

@Abstract()
export abstract class AmqpServerOpts extends ProtocolServerOpts {
    url?: amqpURL;
    queue?: string;
    queueOptions?: amqp.Options.AssertQueue;
}

/**
 * Amqp server interceptors.
 */
export const AMQP_SERV_INTERCEPTORS = tokenId<Interceptor<ServerRequest, ServerResponse>[]>('AMQP_SERV_INTERCEPTORS');

/**
 * Amqp server execption filters.
 */
export const AMQP_SERV_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('AMQP_SERV_EXECPTION_FILTERS');



const defaultQueue = 'default';
const defaults = {
    queue: defaultQueue,
    interceptorsToken: AMQP_SERV_INTERCEPTORS,
    execptionsToken: AMQP_SERV_EXECPTION_FILTERS,
} as AmqpServerOpts;

@Injectable()
export class AmqpServer extends ProtocolServer {

    constructor(options: AmqpServerOpts) {
        super(options);
    }

    protected override getDefaultOptions() {
        return defaults;
    }

}
