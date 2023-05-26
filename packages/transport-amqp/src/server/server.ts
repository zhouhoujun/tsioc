import { MicroService } from '@tsdi/core';
import { Inject, Injectable } from '@tsdi/ioc';
import * as amqp from 'amqplib';
import { AMQP_SERV_OPTS, AmqpMicroServiceOpts } from './options';
import { AmqpContext } from './context';
import { AmqpEndpoint } from './endpoint';




@Injectable()
export class AmqpServer extends MicroService<AmqpContext> {

    constructor(
        readonly endpoint: AmqpEndpoint,
        @Inject(AMQP_SERV_OPTS) private options: AmqpMicroServiceOpts) {
        super();
    }


    protected async onStartup(): Promise<any> {
        const conn = await amqp.connect(this.options.connectOpts!);

    }
    protected async onStart(): Promise<any> {
        throw new Error('Method not implemented.');
    }
    protected async onShutdown(): Promise<any> {
        throw new Error('Method not implemented.');
    }

}
