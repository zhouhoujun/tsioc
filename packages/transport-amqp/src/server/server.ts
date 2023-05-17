import { ExecptionFilter, Interceptor, Server, TransportEvent, TransportRequest } from '@tsdi/core';
import { Abstract, Inject, Injectable, tokenId } from '@tsdi/ioc';
import * as amqp from 'amqplib';
import { AMQP_SERV_EXECPTION_FILTERS, AMQP_SERV_INTERCEPTORS, AMQP_SERV_OPTS, AmqpServerOpts } from './options';
import { AmqpContext } from './context';
import { AmqpEndpoint } from './endpoint';



const defaultQueue = 'default';
const defaults = {
    queue: defaultQueue,
    interceptorsToken: AMQP_SERV_INTERCEPTORS,
    execptionsToken: AMQP_SERV_EXECPTION_FILTERS,
} as AmqpServerOpts;

@Injectable()
export class AmqpServer extends Server<AmqpContext> {

    constructor(
        readonly endpoint: AmqpEndpoint,
        @Inject(AMQP_SERV_OPTS) private options: AmqpServerOpts) {
        super();
    }

    
    protected onStartup(): Promise<any> {
        throw new Error('Method not implemented.');
    }
    protected onStart(): Promise<any> {
        throw new Error('Method not implemented.');
    }
    protected onShutdown(): Promise<any> {
        throw new Error('Method not implemented.');
    }

}
