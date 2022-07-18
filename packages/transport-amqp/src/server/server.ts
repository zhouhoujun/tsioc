import { TransportServer, TransportContext } from '@tsdi/core';
import { Inject, Injectable, InvocationContext } from '@tsdi/ioc';
import * as amqp from 'amqplib';
import { Subscription } from 'rxjs';
import { AmqpOptions } from './options';


const defaultQueue = 'default';

@Injectable()
export class AmqpServer extends TransportServer {

    private connection?: amqp.Connection;
    channel?: amqp.Channel;
    private queue: string;
    constructor(@Inject() context: InvocationContext, private options: AmqpOptions) {
        super(context, options);
        this.queue = this.options.queue ?? defaultQueue;
    }

    async start(): Promise<void> {
        const connection = this.connection = await amqp.connect(this.options.url);
        const channel = this.channel = await connection.createChannel();
        const astQueue = await channel.assertQueue(this.queue, this.options.queueOptions);

    }

    async close(): Promise<void> {
        await this.channel?.close();
        await this.connection?.close();
    }
    
    protected createContext(request: any, response: any): TransportContext<any, any> {
        throw new Error('Method not implemented.');
    }
    protected bindEvent(ctx: TransportContext<any, any>, cancel: Subscription): void {
        throw new Error('Method not implemented.');
    }

}
