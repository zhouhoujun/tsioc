import { Channel, EndpointBackend, ExecptionFilter, InterceptorInst, MiddlewareInst, Publisher, PublisherOptions, RequestBase, ResponseBase, TransportContext } from '@tsdi/core';
import { Abstract, Inject, Injectable, InvocationContext, Token } from '@tsdi/ioc';
import * as amqp from 'amqplib';
import { Subscription } from 'rxjs';

export type amqpURL = string | amqp.Options.Connect;

@Abstract()
export abstract class AmqpOptions extends PublisherOptions<any, any> {
    abstract url: amqpURL;
    queue?: string;
    queueOptions?: amqp.Options.AssertQueue;
}

const defaultQueue = 'default';

@Injectable()
export class AmqpPublisher extends Publisher<RequestBase, ResponseBase> {

    private connection?: amqp.Connection;
    private _channel?: amqp.Channel;
    private queue: string;
    constructor(@Inject() context: InvocationContext, private options: AmqpOptions) {
        super(context, options);
        this.queue = this.options.queue ?? defaultQueue;
    }

    get channel(): Channel {
        return this._channel as Channel;
    }

    async start(): Promise<void> {
        const connection = this.connection = await amqp.connect(this.options.url);
        const channel = this._channel = await connection.createChannel();
        const astQueue = await channel.assertQueue(this.queue, this.options.queueOptions);

    }

    async close(): Promise<void> {
        await this._channel?.close();
        await this.connection?.close();
    }

    getExecptionsToken(): Token<ExecptionFilter[]> {
        throw new Error('Method not implemented.');
    }

    protected getInterceptorsToken(): Token<InterceptorInst<RequestBase<any>, ResponseBase<any>>[]> {
        throw new Error('Method not implemented.');
    }
    protected getMiddlewaresToken(): Token<MiddlewareInst<TransportContext<any, any>>[]> {
        throw new Error('Method not implemented.');
    }
    protected getBackend(): EndpointBackend<RequestBase<any>, ResponseBase<any>> {
        throw new Error('Method not implemented.');
    }
    protected createContext(request: RequestBase<any>, response: ResponseBase<any>): TransportContext<any, any> {
        throw new Error('Method not implemented.');
    }
    protected bindEvent(ctx: TransportContext<any, any>, cancel: Subscription): void {
        throw new Error('Method not implemented.');
    }

}
