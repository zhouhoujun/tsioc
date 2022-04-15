import { Endpoint, Publisher, RequestBase, WritableResponse } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import * as amqp from 'amqplib';

export type amqpURL = string | amqp.Options.Connect;

export interface AmqpOptions {
    url: amqpURL;
    queue?: string;
    queueOptions?: amqp.Options.AssertQueue
}

const defaultQueue = 'default';

@Injectable()
export class AmqpPublisher extends Publisher<RequestBase, WritableResponse> {
    private connection?: amqp.Connection;
    private channel?: amqp.Channel;
    private queue: string;
    constructor(private options: AmqpOptions) {
        super();
        this.queue = this.options.queue ?? defaultQueue;
    }

    async startup(): Promise<void> {
        const connection = this.connection = await amqp.connect(this.options.url);
        const channel = this.channel = await connection.createChannel();
        const astQueue = await channel.assertQueue(this.queue, this.options.queueOptions);

    }

    getEndpoint(): Endpoint<RequestBase<any>, WritableResponse<any>> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}
